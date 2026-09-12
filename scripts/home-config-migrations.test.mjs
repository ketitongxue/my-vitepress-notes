import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { normalizeHomeConfig } from '../shared/home-config.mjs'
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
