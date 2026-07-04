import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { scanArtifactFiles, scanText, scanTrackedFiles } from './security-scan.mjs'

const projectRoot = path.resolve(import.meta.dirname, '../..')

test('scanner catches production leaks without echoing their values', () => {
  const secret = ['sk', 'live', '0123456789abcdefghijklmnopqrstuvwxyz'].join('-')
  const assigned = 'live-assigned-value'
  const assignment = `${['DEEPSEEK', 'API', 'KEY'].join('_')}=${assigned}`
  const localPath = ['', 'Users', 'realname', 'Documents', 'llm_wiki', 'raw', 'source.md'].join('/')
  const address = [198, 18, 0, 42].join('.')
  const findings = scanText('worker/leak.mjs', [
    secret,
    assignment,
    localPath,
    address,
  ].join('\n'))

  assert.deepEqual(findings, [
    'worker/leak.mjs: possible provider secret',
    'worker/leak.mjs: assigned DeepSeek API key',
    'worker/leak.mjs: local absolute path',
    'worker/leak.mjs: private source path',
    'worker/leak.mjs: full IP address',
  ])
  assert.ok(findings.every((finding) => !finding.includes(secret) && !finding.includes(assigned)))
})

test('scanner permits variable names and explicit documentation fixtures only in tests', () => {
  assert.deepEqual(scanText('worker/safe.mjs', 'env.DEEPSEEK_API_KEY'), [])
  assert.deepEqual(scanText('worker/safe.test.mjs', [
    'sk-test-0123456789abcdefghijklmnop',
    'DEEPSEEK_API_KEY=test-fixture-value',
    '/Users/alice/wiki/private.md',
    'raw/private.md',
    '203.0.113.42',
  ].join('\n')), [])
  assert.notDeepEqual(scanText('worker/unsafe.mjs', 'DEEPSEEK_API_KEY=test-fixture-value'), [])
  assert.notDeepEqual(scanText('assets/app.js', '203.0.113.42', { artifact: true }), [])
})

test('scanner catches POSIX, Windows, UNC, and backslash raw paths without exposing them', () => {
  const separators = ['/', '\\']
  const samples = [
    ['', 'root', 'llm_wiki', 'notes.md'].join('/'),
    ['', 'private', 'var', 'folders', 'notes.md'].join('/'),
    ['', 'tmp', 'private-notes.md'].join('/'),
    ['', 'var', 'tmp', 'private-notes.md'].join('/'),
    ['C:', 'Users', 'owner', 'notes.md'].join(separators[1]),
    ['', '', 'server', 'share', 'notes.md'].join(separators[1]),
    ['source', 'raw', 'private.md'].join(separators[1]),
  ]
  const findings = scanText('worker/leak.mjs', samples.join('\n'))

  assert.ok(findings.includes('worker/leak.mjs: local absolute path'))
  assert.ok(findings.includes('worker/leak.mjs: private source path'))
  assert.ok(findings.every((finding) => samples.every((sample) => !finding.includes(sample))))
})

test('scanner catches generic Unix paths and near-miss fixtures in source and plans', () => {
  const sourcePaths = [
    ['', 'opt', 'company', 'secret.md'].join('/'),
    ['', 'etc', 'company.conf'].join('/'),
    ['', 'srv', 'app', 'config.json'].join('/'),
    ['', 'Volumes', 'Private', 'notes.md'].join('/'),
    ['', 'segment', 'private', 'notes.md'].join('/'),
    ['', 'Users', 'alice', 'company', 'secret.md'].join('/'),
    ['raw', 'company-secret.md'].join('/'),
  ]
  const sourceFindings = scanText('worker/leak.mjs', sourcePaths.join('\n'))
  const planFindings = scanText(
    'docs/superpowers/plans/new-plan.md',
    ['', 'root', 'company', 'secret.md'].join('/'),
  )
  const specFindings = scanText('docs/superpowers/specs/new-spec.md', sourcePaths[0])

  assert.ok(sourceFindings.includes('worker/leak.mjs: local absolute path'))
  assert.ok(sourceFindings.includes('worker/leak.mjs: private source path'))
  for (const sample of sourcePaths.slice(0, -1)) {
    assert.deepEqual(scanText('worker/leak.mjs', sample), ['worker/leak.mjs: local absolute path'])
  }
  assert.deepEqual(scanText('worker/leak.mjs', sourcePaths.at(-1)), ['worker/leak.mjs: private source path'])
  assert.deepEqual(planFindings, ['docs/superpowers/plans/new-plan.md: local absolute path'])
  assert.deepEqual(specFindings, ['docs/superpowers/specs/new-spec.md: local absolute path'])
  assert.ok([...sourceFindings, ...planFindings].every(
    (finding) => sourcePaths.every((sample) => !finding.includes(sample)),
  ))
})

test('scanner allows web routes, URLs, imports, and regex source', () => {
  assert.deepEqual(scanText('worker/safe.mjs', [
    '/wiki/concepts/attention',
    '/notes/static-site-delivery',
    '/api/ask',
    '/assets/app.hash.js',
    'https://example.com/raw/article.md',
    "import value from '/worker/module.mjs'",
    String.raw`const pattern = /(?:^|[\\/])raw[\\/]/`,
    'const isRatio = /2g/.test(value)',
  ].join('\n')), [])
  const traversingAsset = ['', 'assets', '..', '..', 'etc', 'passwd'].join('/')
  assert.deepEqual(
    scanText('worker/unsafe.mjs', traversingAsset),
    ['worker/unsafe.mjs: local absolute path'],
  )
})

test('integrated test command preserves the deployment verification order', async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
  const command = packageJson.scripts.test
  const ordered = [
    'npm run qa:index',
    'node --test scripts/wiki-publish/*.test.mjs',
    'node --test scripts/wiki-qa/*.test.mjs',
    'node --test worker/*.test.mjs',
    'npm run wiki:validate',
    'npm run test:content',
    'npm run test:theme',
    'npm run docs:build',
    'npm run qa:security',
  ]
  let cursor = -1
  for (const step of ordered) {
    const next = command.indexOf(step)
    assert.ok(next > cursor, `${step} must appear once and in order`)
    assert.equal(command.indexOf(step, next + 1), -1, `${step} must not be repeated`)
    cursor = next
  }
})

test('README documents setup, secrets, deployment, limits, and privacy', async () => {
  const readme = await readFile(path.join(projectRoot, 'README.md'), 'utf8')
  for (const required of [
    'npm install',
    'npm run qa:index',
    'npm run worker:dev',
    'npx wrangler secret put DEEPSEEK_API_KEY',
    'npx wrangler secret put IP_HASH_SALT',
    'npm test',
    'Build command `npm run build`',
    'Deploy command `npx wrangler deploy`',
    '5 次/分钟',
    '30 次/天',
    '50 次/天',
    'sessionStorage',
  ]) assert.ok(readme.includes(required), `README must include ${required}`)
})

test('tracked files contain no credential or private-data leaks', async () => {
  assert.deepEqual(await scanTrackedFiles(projectRoot), [])
})

test('artifact scan fails closed when a clean archive has not been built', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  await assert.rejects(scanArtifactFiles(root), /artifacts are missing.*build first/i)
})
