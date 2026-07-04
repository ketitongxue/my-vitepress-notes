import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Wrangler schema and assets directory use explicit relative paths', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.equal(config.$schema, './node_modules/wrangler/config-schema.json')
  assert.equal(config.assets.directory, './docs/.vitepress/dist')
})
