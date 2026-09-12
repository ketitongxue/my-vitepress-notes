import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { DEFAULT_HOME_CONFIG, normalizeHomeConfig } from '../shared/home-config.mjs'
import { createHomeAdminHandler, handlePublicHomeConfig } from '../worker/home-config.mjs'

test('migrated home history remains readable and invalid history cannot be published or rolled back', async (t) => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  const directory = new URL('../migrations/', import.meta.url)
  for (const name of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
    db.exec(await readFile(new URL(name, directory), 'utf8'))
  }
  const history = db.prepare('SELECT * FROM home_config_versions ORDER BY revision DESC').all()
  const invalidRevisions = history.filter((row) => {
    try { normalizeHomeConfig(JSON.parse(row.config_json)); return false } catch { return true }
  }).map((row) => row.revision)
  assert.ok(invalidRevisions.length > 0)
  assert.doesNotThrow(() => normalizeHomeConfig(JSON.parse(history[0].config_json)))
  assert.deepEqual(JSON.parse(history[0].config_json).desktop.entries.map(({ id, position }) => ({ id, position })), [
    { id: 'projects', position: { x: 80, y: 84 } },
    { id: 'html-knowledge', position: { x: 80, y: 192 } },
    { id: 'about', position: { x: 80, y: 300 } },
  ])

  const env = {
    ALLOWED_ORIGIN: 'https://example.com',
    PERSONAL_OS_DB: {
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
    },
  }
  const admin = createHomeAdminHandler({ authenticate: async () => ({ ok: true, identity: 'owner@example.com' }) })
  const response = await admin(new Request('https://example.com/api/admin/home/config'), env)
  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.deepEqual(payload.versions.map((version) => version.revision), history.map((row) => row.revision))
  assert.deepEqual(payload.versions.filter((version) => version.validationError).map((version) => version.revision), invalidRevisions)
  assert.equal(payload.versions.find((version) => version.revision === invalidRevisions[0]).config, null)
  assert.deepEqual(payload.versions[0].config, normalizeHomeConfig(JSON.parse(history[0].config_json)))
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision DESC').all(), history)

  const published = await handlePublicHomeConfig(new Request('https://example.com/api/home/config'), env)
  assert.equal(published.status, 200)
  assert.equal((await published.json()).revision, history[0].revision)
  const mutate = (path, body, method = 'POST') => admin(new Request(`https://example.com/api/admin/home/${path}`, {
    method,
    headers: { origin: env.ALLOWED_ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), env)
  assert.equal((await mutate('rollback', { revision: invalidRevisions[0] })).status, 400)
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision DESC').all(), history)

  const config = normalizeHomeConfig(JSON.parse(history[0].config_json))
  config.desktop.brand = 'Updated homepage'
  const saved = await mutate('config', { schemaVersion: 1, baseRevision: history[0].revision, note: 'Regression draft', config }, 'PUT')
  assert.equal(saved.status, 201)
  const { revision } = await saved.json()
  assert.equal((await mutate('publish', { revision: history[0].revision })).status, 409)
  assert.equal((await mutate('publish', { revision })).status, 200)
  const publicAfter = await handlePublicHomeConfig(new Request('https://example.com/api/home/config'), env)
  assert.equal((await publicAfter.json()).config.desktop.brand, config.desktop.brand)
  const rollback = await mutate('rollback', { revision: history[0].revision })
  assert.equal(rollback.status, 201)
  const restored = db.prepare('SELECT * FROM home_config_versions ORDER BY revision DESC LIMIT 1').get()
  assert.equal(restored.config_json, history[0].config_json)
  assert.ok(restored.published_at)

  const broken = db.prepare('SELECT config_json FROM home_config_versions WHERE revision = ?').get(invalidRevisions[0])
  const inserted = db.prepare('INSERT INTO home_config_versions (config_json, note, created_by) VALUES (?, ?, ?)')
    .run(broken.config_json, 'Legacy invalid draft', 'migration')
  const rejected = await mutate('publish', { revision: Number(inserted.lastInsertRowid) })
  assert.equal(rejected.status, 400)
  assert.equal((await rejected.json()).error, 'INVALID_CONFIG')
  assert.equal(db.prepare('SELECT published_at FROM home_config_versions WHERE revision = ?').get(Number(inserted.lastInsertRowid)).published_at, null)
})

test('homepage alignment preserves content and history, is idempotent, and respects drafts', async (t) => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  await readFile(new URL('../migrations/0002_home_config.sql', import.meta.url), 'utf8').then((sql) => db.exec(sql))
  const migration = await readFile(new URL('../migrations/0015_align_home_desktop_entries.sql', import.meta.url), 'utf8')
  const config = structuredClone(DEFAULT_HOME_CONFIG)
  config.boot.lines = ['Custom boot message']
  const [projects, knowledge, about] = config.desktop.entries
  about.window.summary = 'Custom about summary\nContact details'
  config.desktop.entries = [
    { ...structuredClone(projects), id: 'experiments', label: 'AI 实验' },
    about, knowledge, projects,
    { ...structuredClone(about), id: 'github', label: 'GitHub' },
  ]
  config.desktop.entries.forEach((entry, index) => { entry.position = { x: 80 + index * 96, y: 268 } })
  const insert = db.prepare('INSERT INTO home_config_versions (schema_version, config_json, note, created_by, published_at) VALUES (1, ?, ?, ?, ?)')
  insert.run(JSON.stringify(config), 'Customized homepage', 'owner', '2026-09-12T00:00:00Z')
  const history = db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all()
  db.exec(migration)
  const after = db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all()
  assert.deepEqual(after.slice(0, -1), history)
  assert.equal(after.length, history.length + 1)
  const expected = structuredClone(config)
  expected.desktop.entries = [projects, knowledge, about].map((entry, index) => ({
    ...entry, position: { x: 80, y: 84 + index * 108 },
  }))
  assert.deepEqual(normalizeHomeConfig(JSON.parse(after.at(-1).config_json)), expected)
  assert.ok(after.at(-1).published_at)
  db.exec(migration)
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all(), after)

  insert.run(JSON.stringify(config), 'Pending administrator draft', 'owner', null)
  const withDraft = db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all()
  db.exec(migration)
  assert.deepEqual(db.prepare('SELECT * FROM home_config_versions ORDER BY revision').all(), withDraft)
})
