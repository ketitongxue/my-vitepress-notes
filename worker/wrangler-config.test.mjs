import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Wrangler schema and assets directory use explicit relative paths', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.equal(config.$schema, './node_modules/wrangler/config-schema.json')
  assert.equal(config.assets.directory, './docs/.vitepress/dist')
})

test('main test script runs Worker tests and Wrangler is pinned', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url)),
  )

  assert.match(packageJson.scripts.test, /^npm run qa:index && node --test worker\/\*\.test\.mjs/)
  assert.equal(packageJson.scripts['worker:dev'], 'npm run qa:index && wrangler dev')
  assert.equal(packageJson.scripts.deploy, 'npm run build && wrangler deploy')
  assert.doesNotMatch(packageJson.scripts.build, /npm run build/)
  assert.equal(packageJson.devDependencies.wrangler, '4.107.0')
})
