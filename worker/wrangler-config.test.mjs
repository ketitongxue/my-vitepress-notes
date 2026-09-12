import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Wrangler schema and assets directory use explicit relative paths', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.equal(config.$schema, './node_modules/wrangler/config-schema.json')
  assert.equal(config.assets.directory, './docs/.vitepress/dist')
  assert.equal(config.build.command, 'npm run docs:build:site')
  assert.equal(config.ratelimits, undefined)
  assert.equal(config.durable_objects, undefined)
})

test('main test script runs Worker tests and Wrangler is pinned', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url)),
  )

  assert.match(packageJson.scripts.test, /worker\/index\.test\.mjs/)
  assert.doesNotMatch(packageJson.scripts.test, /wiki:validate|qa:index|content:sync/)
  assert.equal(packageJson.scripts['worker:dev'], 'wrangler dev')
  assert.equal(packageJson.scripts.deploy, 'npm run build && wrangler deploy')
  assert.doesNotMatch(packageJson.scripts.build, /npm run build/)
  assert.equal(packageJson.devDependencies.wrangler, '4.107.0')
})

test('project Node version is pinned to 22', async () => {
  const nodeVersion = await readFile(new URL('../.node-version', import.meta.url), 'utf8')

  assert.equal(nodeVersion.trim(), '22')
})
