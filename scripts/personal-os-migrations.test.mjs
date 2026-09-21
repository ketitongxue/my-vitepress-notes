import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { normalizePersonalOsConfig } from '../shared/personal-os-config.mjs'
import { createPersonalOsAdminHandler, handlePublicPersonalOsConfig } from '../worker/personal-os-config.mjs'
import { canvasUsableViewport, computeWorldBounds, fitWorldBounds } from '../docs/.vitepress/theme/components/canvasGeometry.mjs'

const migrationDirectory = new URL('../migrations/', import.meta.url)
const repairName = '0014_repair_personal_os_connections.sql'
const repair = await readFile(new URL(repairName, migrationDirectory), 'utf8')
const compactName = '0016_compact_personal_os_layout.sql'
const compact = await readFile(new URL(compactName, migrationDirectory), 'utf8')

async function migratedDatabase(t, stopBefore = repairName) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const name of (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort()) {
    if (name === stopBefore) break
    db.exec(await readFile(new URL(name, migrationDirectory), 'utf8'))
  }
  return db
}

function d1Binding(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql)
      let values = []
      return {
        bind(...parameters) { values = parameters; return this },
        async first() { return statement.get(...values) ?? null },
        async all() { return { results: statement.all(...values) } },
        async run() {
          const result = statement.run(...values)
          return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }
        },
      }
    },
  }
}

test('migration chain repairs the published graph without rewriting history or homepage', async (t) => {
  const db = await migratedDatabase(t)
  const history = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
  const home = db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all()
  const broken = JSON.parse(history.at(-1).config_json)
  assert.throws(() => normalizePersonalOsConfig(broken), /references an unknown card/)

  db.exec(repair)
  const repaired = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision DESC LIMIT 1').get()
  const config = JSON.parse(repaired.config_json)
  assert.doesNotThrow(() => normalizePersonalOsConfig(config))
  assert.deepEqual(config, {
    ...broken,
    connections: broken.connections.filter((edge) => edge.from !== 'knowledge-products' && edge.to !== 'knowledge-products'),
  })
  assert.equal(repaired.revision, history.at(-1).revision + 1)
  assert.ok(repaired.published_at)
  assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions WHERE revision < ? ORDER BY revision').all(repaired.revision), history)
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all(), home)
  db.exec(repair)
  assert.equal(db.prepare('SELECT count(*) AS count FROM personal_os_config_versions').get().count, history.length + 1)

  const env = { PERSONAL_OS_DB: d1Binding(db) }
  const publicResponse = await handlePublicPersonalOsConfig(new Request('https://example.com/api/personal-os/config'), env)
  assert.equal(publicResponse.status, 200)
  assert.equal((await publicResponse.json()).revision, repaired.revision)
  const admin = createPersonalOsAdminHandler({ authenticate: async () => ({ ok: true, identity: 'owner@example.com' }) })
  const adminResponse = await admin(new Request('https://example.com/api/admin/personal-os/config'), env)
  assert.equal(adminResponse.status, 200)
  const payload = await adminResponse.json()
  assert.equal(payload.versions[0].revision, repaired.revision)
  assert.equal(payload.versions[1].config, null)
  assert.ok(payload.versions[1].validationError)
  assert.ok(payload.versions[2].config)

  const mutate = (path, body) => admin(new Request(`https://example.com/api/admin/personal-os/${path}`, {
    method: 'POST',
    headers: { origin: 'https://example.com', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), { ...env, ALLOWED_ORIGIN: 'https://example.com' })
  const rejected = await mutate('rollback', { revision: history.at(-1).revision })
  assert.equal(rejected.status, 400)
  assert.equal((await rejected.json()).error, 'INVALID_CONFIG')
  assert.equal(db.prepare('SELECT count(*) AS count FROM personal_os_config_versions').get().count, history.length + 1)
  assert.equal((await mutate('publish', { revision: repaired.revision })).status, 200)
  const rollback = await mutate('rollback', { revision: repaired.revision })
  assert.equal(rollback.status, 201)
  const restored = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision DESC LIMIT 1').get()
  assert.equal(restored.config_json, repaired.config_json)
  assert.ok(restored.published_at)
})

test('repair does not supersede a newer administrator draft or publication', async (t) => {
  for (const publishedAt of [null, '2026-09-12T00:00:00.000Z']) {
    const db = await migratedDatabase(t)
    const valid = db.prepare('SELECT config_json FROM personal_os_config_versions WHERE revision = 1').get()
    db.prepare('INSERT INTO personal_os_config_versions (config_json, note, created_by, published_at) VALUES (?, ?, ?, ?)')
      .run(valid.config_json, 'Administrator changes', 'owner@example.com', publishedAt)
    const before = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
    db.exec(repair)
    assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all(), before)
  }
})

const compactPositions = {
  identity: { x: 120, y: 320 },
  'growth-devops': { x: 600, y: 220 },
  'growth-pm': { x: 1000, y: 220 },
  'core-story': { x: 550, y: 480 },
  'next-direction': { x: 980, y: 490 },
}

function legacyFiveCardConfig() {
  const cards = [
    ['identity', 'identity', 120, 360, 360, 260, 300, 220],
    ['growth-devops', 'timeline', 860, 280, 240, 160, 220, 140],
    ['growth-pm', 'timeline', 1500, 270, 260, 170, 220, 140],
    ['core-story', 'principle', 780, 570, 340, 190, 280, 160],
    ['next-direction', 'next', 1900, 240, 300, 150, 250, 140],
  ].map(([id, type, x, y, width, height, minWidth, minHeight]) => ({
    id, type, x, y, width, height, minWidth, minHeight,
    title: `Fixture ${id}`, kicker: 'FIXTURE', body: 'Preserve administrator content.',
    visible: true, accent: 'blue', items: ['Fixture item'],
    links: [{ label: 'Fixture link', href: '/fixture/' }],
  }))
  return normalizePersonalOsConfig({
    cards,
    connections: [
      { from: 'identity', to: 'growth-devops' },
      { from: 'growth-devops', to: 'growth-pm' },
      { from: 'growth-devops', to: 'core-story' },
      { from: 'growth-pm', to: 'next-direction' },
    ],
  })
}

async function fiveCardDatabase(t, config = legacyFiveCardConfig(), publishedAt = '2026-09-20T17:36:19.642Z') {
  const db = await migratedDatabase(t, compactName)
  db.prepare('INSERT INTO personal_os_config_versions (revision, config_json, note, created_by, published_at) VALUES (?, ?, ?, ?, ?)')
    .run(5, JSON.stringify(config), 'Administrator content fixture', 'owner@example.com', publishedAt)
  return db
}

test('compact layout publishes only new positions and preserves content, ordering, history and homepage', async (t) => {
  const original = legacyFiveCardConfig()
  // The migration must preserve administrator ordering, including noncanonical order.
  original.cards.reverse()
  original.cards[0].visible = false
  const db = await fiveCardDatabase(t, original)
  const history = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
  const home = db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all()

  db.exec(compact)
  const published = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision DESC LIMIT 1').get()
  const config = JSON.parse(published.config_json)
  assert.equal(published.revision, 6)
  assert.equal(published.created_by, 'migration')
  assert.ok(published.published_at)
  assert.deepEqual(normalizePersonalOsConfig(config), config)
  assert.deepEqual(config, {
    ...original,
    cards: original.cards.map((card) => ({ ...card, ...compactPositions[card.id] })),
  })
  assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions WHERE revision < 6 ORDER BY revision').all(), history)
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all(), home)

  const afterFirstRun = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
  db.exec(compact)
  assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all(), afterFirstRun)

  const response = await handlePublicPersonalOsConfig(new Request('https://example.com/api/personal-os/config'), {
    PERSONAL_OS_DB: d1Binding(db),
  })
  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.revision, 6)
  assert.deepEqual(payload.config, config)
})

test('compact layout does not supersede newer drafts or publications, or publish an unpublished revision 5', async (t) => {
  for (const publishedAt of [null, '2026-09-21T00:00:00.000Z']) {
    const db = await fiveCardDatabase(t)
    db.prepare('INSERT INTO personal_os_config_versions (config_json, note, created_by, published_at) VALUES (?, ?, ?, ?)')
      .run(JSON.stringify(legacyFiveCardConfig()), 'Newer administrator changes', 'owner@example.com', publishedAt)
    const before = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
    db.exec(compact)
    assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all(), before)
  }

  const db = await fiveCardDatabase(t, legacyFiveCardConfig(), null)
  const before = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
  db.exec(compact)
  assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all(), before)
})

test('compact layout requires exactly the known five cards and all their legacy geometry', async (t) => {
  const variants = [
    (config) => config.cards.pop(),
    (config) => config.cards.push({ ...config.cards[0], id: 'extra-card' }),
    (config) => { config.cards[0] = { ...config.cards[1] } },
    (config) => { config.cards[0].id = 'renamed-identity' },
  ]
  for (let index = 0; index < 5; index += 1) {
    for (const key of ['x', 'y', 'width', 'height']) {
      variants.push((config) => { config.cards[index][key] += 1 })
    }
  }
  for (const mutate of variants) {
    const config = legacyFiveCardConfig()
    mutate(config)
    const db = await fiveCardDatabase(t, config)
    const before = db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all()
    db.exec(compact)
    assert.deepEqual(db.prepare('SELECT * FROM personal_os_config_versions ORDER BY revision').all(), before)
  }
})

test('published compact cards do not overlap and fit above desktop controls at a readable scale', async (t) => {
  const db = await fiveCardDatabase(t)
  db.exec(compact)
  const { config_json } = db.prepare('SELECT config_json FROM personal_os_config_versions ORDER BY revision DESC LIMIT 1').get()
  const { cards } = JSON.parse(config_json)
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]
    for (const other of cards.slice(index + 1)) {
      const separated = card.x + card.width <= other.x || other.x + other.width <= card.x
        || card.y + card.height <= other.y || other.y + other.height <= card.y
      assert.ok(separated, `${card.id} must not overlap ${other.id}`)
    }
  }

  const viewport = { width: 1440, height: 900 }
  const usable = canvasUsableViewport(viewport, false)
  const bounds = computeWorldBounds(cards, {}, 48)
  const transform = fitWorldBounds(bounds, usable, 24)
  assert.ok(transform.scale >= .9, 'all five cards should remain readable together on desktop')
  for (const card of cards) {
    const left = card.x * transform.scale + transform.panX
    const top = card.y * transform.scale + transform.panY
    const right = (card.x + card.width) * transform.scale + transform.panX
    const bottom = (card.y + card.height) * transform.scale + transform.panY
    assert.ok(left >= usable.x && right <= usable.x + usable.width, `${card.id} should fit horizontally`)
    assert.ok(top >= 202, `${card.id} should clear the introduction and layer toggle`)
    assert.ok(bottom <= viewport.height - 108, `${card.id} should clear the bottom controls`)
  }
})
