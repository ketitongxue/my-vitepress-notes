import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { normalizePersonalOsConfig } from '../shared/personal-os-config.mjs'
import { createPersonalOsAdminHandler, handlePublicPersonalOsConfig } from '../worker/personal-os-config.mjs'

const migrationDirectory = new URL('../migrations/', import.meta.url)
const repairName = '0014_repair_personal_os_connections.sql'
const repair = await readFile(new URL(repairName, migrationDirectory), 'utf8')

async function migratedDatabase(t) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const name of (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort()) {
    if (name === repairName) break
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
