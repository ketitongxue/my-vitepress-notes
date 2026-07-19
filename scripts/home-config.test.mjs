import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_HOME_CONFIG, HomeConfigError, normalizeHomeConfig } from '../shared/home-config.mjs'
import { loadHomeConfiguration, staticHomeConfiguration } from '../docs/.vitepress/theme/components/homeConfigClient.mjs'

test('static home configuration is normalized, immutable, and complete', () => {
  assert.equal(Object.isFrozen(DEFAULT_HOME_CONFIG), true)
  assert.equal(Object.isFrozen(DEFAULT_HOME_CONFIG.desktop.entries), true)
  assert.equal(DEFAULT_HOME_CONFIG.boot.lines.length, 4)
  assert.equal(DEFAULT_HOME_CONFIG.desktop.entries.length, 8)
  assert.equal(DEFAULT_HOME_CONFIG.desktop.entries.some(({ id }) => id === 'finance-wiki'), false)
  assert.equal(DEFAULT_HOME_CONFIG.exit.lines.length, 2)
  assert.deepEqual(normalizeHomeConfig(DEFAULT_HOME_CONFIG), structuredClone(DEFAULT_HOME_CONFIG))
})

test('home config rejects unknown icons, fields, unsafe links, and invalid positions', () => {
  for (const mutate of [
    (config) => { config.desktop.entries[0].icon = 'image' },
    (config) => { config.desktop.entries[0].window.href = 'javascript:alert(1)' },
    (config) => { config.desktop.entries[0].position.x = -1 },
    (config) => { config.desktop.entries[0].unknown = true },
  ]) {
    const config = structuredClone(DEFAULT_HOME_CONFIG)
    mutate(config)
    assert.throws(() => normalizeHomeConfig(config), HomeConfigError)
  }
})

test('home configuration client validates D1 data and falls back to static content', async () => {
  const remote = await loadHomeConfiguration({
    fetchImpl: async (path) => {
      assert.equal(path, '/api/home/config')
      return Response.json({ revision: 7, config: DEFAULT_HOME_CONFIG })
    },
  })
  assert.equal(remote.revision, 7)
  assert.equal(remote.source, 'd1')
  assert.deepEqual(remote.config, structuredClone(DEFAULT_HOME_CONFIG))

  const fallback = await loadHomeConfiguration({
    fetchImpl: async () => new Response(null, { status: 503 }),
  })
  assert.deepEqual(fallback, staticHomeConfiguration())
  assert.equal(fallback.source, 'static')
})
