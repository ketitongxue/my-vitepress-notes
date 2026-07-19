import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Wrangler schema and assets directory use explicit relative paths', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.equal(config.$schema, './node_modules/wrangler/config-schema.json')
  assert.equal(config.assets.directory, './docs/.vitepress/dist')
  assert.equal(config.build.command, 'npm run qa:index')
})

test('Wrangler configures the exact QA rate and daily quota limits', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.deepEqual(config.ratelimits, [{
    name: 'QA_RATE_LIMITER',
    namespace_id: '20260704',
    simple: { limit: 3, period: 60 },
  }])
  assert.equal(config.vars.DAILY_PER_IP_LIMIT, '5')
  assert.equal(config.vars.DAILY_GLOBAL_LIMIT, '10')
})

test('main test script runs Worker tests and Wrangler is pinned', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url)),
  )

  assert.match(packageJson.scripts.test, /node --test worker\/\*\.test\.mjs/)
  assert.match(packageJson.scripts.test, /npm run wiki:validate && npm run finance:validate/)
  assert.equal(
    packageJson.scripts['worker:dev'],
    'npm run content:sync && npm run qa:index && wrangler dev',
  )
  assert.equal(packageJson.scripts.deploy, 'npm run build && wrangler deploy')
  assert.doesNotMatch(packageJson.scripts.build, /npm run build/)
  assert.equal(packageJson.devDependencies.wrangler, '4.107.0')
})

test('Cloudflare builds use Node 22', async () => {
  const nodeVersion = await readFile(new URL('../.node-version', import.meta.url), 'utf8')
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')

  assert.equal(nodeVersion.trim(), '22')
  assert.match(readme, /要求 Node\.js 22 或更高版本。/, 'README Node requirement')
  assert.match(readme, /Node\.js：`22`/, 'README Cloudflare Node')
  assert.doesNotMatch(readme, /Node\.js(?:：`| )20/, 'README must not recommend Node 20')
})
