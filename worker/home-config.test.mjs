import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_HOME_CONFIG } from '../shared/home-config.mjs'
import { createHomeAdminHandler, handlePublicHomeConfig } from './home-config.mjs'

function row(revision = 1, publishedAt = '2026-07-16T00:00:00.000Z') {
  return {
    revision,
    schema_version: 1,
    config_json: JSON.stringify(DEFAULT_HOME_CONFIG),
    note: 'Initial',
    created_by: 'owner@example.com',
    created_at: '2026-07-16T00:00:00.000Z',
    published_at: publishedAt,
  }
}

function retiredKnowledgeLinkRow(revision = 11) {
  const config = structuredClone(DEFAULT_HOME_CONFIG)
  config.desktop.menuLinks.push({ label: '知识', href: '#knowledge' })
  return { ...row(revision), config_json: JSON.stringify(config), note: 'Legacy knowledge menu' }
}

function statement(methods) {
  return {
    values: [],
    bind(...values) { this.values = values; return this },
    async first() { return methods.first?.(this.values) ?? null },
    async all() { return methods.all?.(this.values) ?? { results: [] } },
    async run() { return methods.run?.(this.values) ?? { meta: { changes: 0 } } },
  }
}

function request(path, { method = 'GET', body } = {}) {
  return new Request(`https://juzxailab.com${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json', origin: 'https://juzxailab.com' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const allowOwner = async () => ({ ok: true, identity: 'owner@example.com' })

test('public home config returns the latest validated version with ETag', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ first: () => row() }) } }
  const response = await handlePublicHomeConfig(request('/api/home/config'), env)
  const notModified = await handlePublicHomeConfig(new Request(
    'https://juzxailab.com/api/home/config',
    { headers: { 'if-none-match': '"home-1"' } },
  ), env)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('etag'), '"home-1"')
  assert.match(response.headers.get('cache-control'), /stale-while-revalidate=300/)
  assert.equal((await response.json()).config.desktop.entries.length, DEFAULT_HOME_CONFIG.desktop.entries.length)
  assert.equal(notModified.status, 304)
})

test('public home config fails closed when D1 has no published version', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({}) } }
  const response = await handlePublicHomeConfig(request('/api/home/config'), env)

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'HOME_CONFIG_UNAVAILABLE' })
})

test('home admin requires authentication and lists normalized versions', async () => {
  const denied = createHomeAdminHandler({
    authenticate: async () => ({ ok: false, response: Response.json({ error: 'denied' }, { status: 403 }) }),
  })
  const allowed = createHomeAdminHandler({ authenticate: allowOwner })
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ all: () => ({ results: [row()] }) }) } }

  assert.equal((await denied(request('/api/admin/home/config'), env)).status, 403)
  const response = await allowed(request('/api/admin/home/config'), env)
  assert.equal((await response.json()).versions[0].config.desktop.entries[0].id, 'projects')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('home admin preserves invalid history and latest revision while returning valid configurations', async (t) => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const invalid = retiredKnowledgeLinkRow()
  const malformed = { ...row(10), config_json: '{broken JSON' }
  for (const [name, rows] of [
    ['valid latest with invalid history', [row(13), row(12), invalid, malformed]],
    ['invalid latest', [invalid, row(9)]],
    ['all invalid', [invalid, malformed]],
  ]) {
    await t.test(name, async () => {
      const env = { PERSONAL_OS_DB: { prepare: () => statement({ all: () => ({ results: rows }) }) } }
      const response = await handler(request('/api/admin/home/config'), env)
      assert.equal(response.status, 200)
      const { versions } = await response.json()
      assert.deepEqual(versions.map(({ revision }) => revision), rows.map(({ revision }) => revision))
      for (let index = 0; index < rows.length; index++) {
        const source = rows[index]
        const version = versions[index]
        assert.equal(version.note, source.note)
        assert.equal(version.createdBy, source.created_by)
        assert.equal(version.createdAt, source.created_at)
        assert.equal(version.publishedAt, source.published_at)
        assert.equal(version.schemaVersion, source.schema_version)
        if (source === invalid || source === malformed) {
          assert.equal(version.config, null)
          assert.match(version.validationError, source === invalid ? /desktop\.menuLinks\[\d+\]\.href/ : /not valid JSON/)
        } else {
          assert.deepEqual(version.config, JSON.parse(source.config_json))
          assert.equal(version.validationError, undefined)
        }
      }
    })
  }
})

test('home admin can save from a valid history entry using the invalid latest base revision', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const rows = [retiredKnowledgeLinkRow(14), row(13)]
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: { prepare: () => statement({
      all: () => ({ results: rows }),
      run: (values) => ({ meta: { changes: values[4] === rows[0].revision ? 1 : 0, last_row_id: 15 } }),
    }) },
  }
  const list = await handler(request('/api/admin/home/config'), env)
  const { versions } = await list.json()
  const saved = await handler(request('/api/admin/home/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: versions[0].revision, config: versions[1].config },
  }), env)
  assert.equal(saved.status, 201)
  assert.deepEqual(await saved.json(), { revision: 15 })
})

test('home admin distinguishes missing D1 and rejected queries from invalid stored configurations', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const failQuery = async () => { throw new Error('Internal database failure') }
  for (const database of [
    undefined,
    { prepare() { throw new Error('Internal database failure') } },
    { prepare: () => statement({ first: failQuery, all: failQuery }) },
  ]) {
    const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: database }
    for (const [path, options] of [
      ['/api/admin/home/config', {}],
      ['/api/admin/home/publish', { method: 'POST', body: { revision: 13 } }],
      ['/api/admin/home/rollback', { method: 'POST', body: { revision: 13 } }],
    ]) {
      const response = await handler(request(path, options), env)
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'HOME_CONFIG_DB_UNAVAILABLE' })
    }
  }
})

test('home admin saves a validated draft with optimistic concurrency', async () => {
  const calls = []
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare: () => statement({
        run(values) {
          calls.push(values)
          return { meta: { changes: 1, last_row_id: 2 } }
        },
      }),
    },
  }
  const response = await handler(request('/api/admin/home/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: 1, note: 'Update', config: DEFAULT_HOME_CONFIG },
  }), env)

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { revision: 2 })
  assert.equal(calls[0][4], 1)
  assert.equal(JSON.parse(calls[0][1]).desktop.entries.length, DEFAULT_HOME_CONFIG.desktop.entries.length)
})

test('home admin rejects stale drafts, invalid origins, duplicate ids, and unsafe links', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: { prepare: () => statement({ run: () => ({ meta: { changes: 0 } }) }) },
  }
  const stale = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: DEFAULT_HOME_CONFIG },
  }), env)
  const wrongOrigin = await handler(new Request('https://juzxailab.com/api/admin/home/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ schemaVersion: 1, baseRevision: 1, config: DEFAULT_HOME_CONFIG }),
  }), env)
  const unsafeConfig = structuredClone(DEFAULT_HOME_CONFIG)
  unsafeConfig.desktop.entries[0].window.href = 'javascript:alert(1)'
  const unsafe = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: unsafeConfig },
  }), env)
  const duplicateConfig = structuredClone(DEFAULT_HOME_CONFIG)
  duplicateConfig.desktop.entries[1].id = duplicateConfig.desktop.entries[0].id
  const duplicate = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: duplicateConfig },
  }), env)

  assert.equal(stale.status, 409)
  assert.equal(wrongOrigin.status, 403)
  assert.equal(unsafe.status, 400)
  assert.equal(duplicate.status, 400)
})

test('home admin publishes latest and rollback creates a new published revision', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare(sql) {
        if (sql.includes('RETURNING revision')) return statement({ first: () => ({ revision: 5 }) })
        if (sql.includes('SELECT config_json')) return statement({ first: (values) => row(values[0]) })
        return statement({ run: () => ({ meta: { changes: 1 } }) })
      },
    },
  }
  const publish = await handler(request('/api/admin/home/publish', {
    method: 'POST', body: { revision: 4 },
  }), env)
  const rollback = await handler(request('/api/admin/home/rollback', {
    method: 'POST', body: { revision: 2 },
  }), env)

  assert.deepEqual(await publish.json(), { revision: 4, published: true })
  assert.equal(rollback.status, 201)
  assert.deepEqual(await rollback.json(), { revision: 5, rolledBackFrom: 2, published: true })
})

test('home publish and rollback reject retired links, malformed JSON, and unsafe links before writing', async (t) => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const unsafe = structuredClone(DEFAULT_HOME_CONFIG)
  unsafe.desktop.entries[0].window.href = 'javascript:alert(1)'
  for (const [name, source] of [
    ['retired knowledge link', retiredKnowledgeLinkRow(14)],
    ['malformed JSON', { ...row(14), config_json: '{broken JSON' }],
    ['unsafe link', { ...row(14), config_json: JSON.stringify(unsafe) }],
  ]) {
    for (const action of ['publish', 'rollback']) {
      await t.test(`${action}: ${name}`, async () => {
        let mutations = 0
        const env = {
          ALLOWED_ORIGIN: 'https://juzxailab.com',
          PERSONAL_OS_DB: { prepare(sql) {
            if (/^\s*SELECT config_json/.test(sql)) return statement({ first: () => source })
            mutations++
            return statement({ first: () => ({ revision: 15 }), run: () => ({ meta: { changes: 1 } }) })
          } },
        }
        const response = await handler(request(`/api/admin/home/${action}`, {
          method: 'POST', body: { revision: 14 },
        }), env)
        assert.equal(response.status, 400)
        assert.equal((await response.json()).error, 'INVALID_CONFIG')
        assert.equal(mutations, 0)
      })
    }
  }
})

test('home publish preserves latest-revision conflicts before and after validation', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  for (const selected of [null, row(13)]) {
    const env = {
      ALLOWED_ORIGIN: 'https://juzxailab.com',
      PERSONAL_OS_DB: { prepare(sql) {
        if (sql.includes('SELECT config_json')) return statement({ first: () => selected })
        return statement({ run: () => ({ meta: { changes: 0 } }) })
      } },
    }
    const response = await handler(request('/api/admin/home/publish', {
      method: 'POST', body: { revision: 13 },
    }), env)
    assert.equal(response.status, 409)
    assert.deepEqual(await response.json(), { error: 'REVISION_CONFLICT' })
  }
})

test('home rollback distinguishes a missing revision from a source changed after validation', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  for (const [selected, status, code] of [[null, 404, 'REVISION_NOT_FOUND'], [row(13), 409, 'REVISION_CONFLICT']]) {
    const env = {
      ALLOWED_ORIGIN: 'https://juzxailab.com',
      PERSONAL_OS_DB: { prepare(sql) {
        return statement({ first: () => sql.includes('SELECT config_json') ? selected : null })
      } },
    }
    const response = await handler(request('/api/admin/home/rollback', {
      method: 'POST', body: { revision: 13 },
    }), env)
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: code })
  }
})
