import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { scanArtifactFiles, scanPublishedCollections, scanText, scanTrackedFiles } from './security-scan.mjs'
import { buildIndex } from './indexer.mjs'

const projectRoot = path.resolve(import.meta.dirname, '../..')
const execFileAsync = promisify(execFile)
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const safeBody = '# 安全页面\n\n这是用于验证跨集合安全门禁的中文内容，包含足够多的汉字来满足公开内容质量检查要求。'

async function publishedCollectionsFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-collections-'))
  const name = 'wiki'
  const source = 'concepts/safe.md'
  const markdown = `---\ntitle: 安全页面\n---\n${safeBody}\n`
  await mkdir(path.join(root, 'docs', name, 'concepts'), { recursive: true })
  await writeFile(path.join(root, 'docs', name, source), markdown)
  await writeFile(path.join(root, `${name}-manifest.json`), `${JSON.stringify({
    version: 1,
    pages: [{
      source,
      hash: sha256(markdown),
      publicPath: `docs/${name}/${source}`,
      status: 'published',
      syncedAt: '2026-07-08T00:00:00.000Z',
    }],
  })}\n`)
  return root
}

test('published collection scan applies every content gate to the AI Wiki', async (t) => {
  const mutations = [
    ['sources: metadata', (markdown) => `${markdown}\nsources:\n  - private`],
    ['raw/ path', (markdown) => `${markdown}\nraw/private.md`],
    ['absolute path', (markdown) => `${markdown}\n/Users/person/private.md`],
    ['residual wikilink', (markdown) => `${markdown}\n[[private]]`],
    ['broken link', (markdown) => `${markdown}\n[missing](/wiki/concepts/missing)`],
  ]
  for (const [expected, mutate] of mutations) {
    const root = await publishedCollectionsFixture()
    t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
    const page = path.join(root, 'docs/wiki/concepts/safe.md')
    await writeFile(page, mutate(await readFile(page, 'utf8')))
    const findings = await scanPublishedCollections(root)
    assert.ok(findings.some((finding) => finding.includes(expected)), `${expected} must be rejected`)
  }

  const extraRoot = await publishedCollectionsFixture()
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(extraRoot, { recursive: true, force: true })))
  await writeFile(path.join(extraRoot, 'docs/wiki/concepts/extra.md'), safeBody)
  assert.ok((await scanPublishedCollections(extraRoot)).some((finding) => finding.includes('extra file')))

  const missingRoot = await publishedCollectionsFixture()
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(missingRoot, { recursive: true, force: true })))
  await import('node:fs/promises').then(({ rm }) => rm(path.join(missingRoot, 'docs/wiki/concepts/safe.md')))
  assert.ok((await scanPublishedCollections(missingRoot)).some((finding) => finding.includes('missing file')))
})

test('QA index remains scoped to the AI Wiki', async () => {
  const manifest = JSON.parse(await readFile(path.join(projectRoot, 'wiki-manifest.json'), 'utf8'))
  const index = await buildIndex(path.join(projectRoot, 'docs'))
  assert.equal(index.pages.length, manifest.pages.length)
  assert.ok(index.chunks.length >= index.pages.length)
  assert.ok(index.pages.every(({ url }) => url.startsWith('/wiki/')))
  assert.ok(index.chunks.every(({ url }) => url.startsWith('/wiki/')))
})

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
  assert.notDeepEqual(scanText('assets/fake.test.mjs', 'DEEPSEEK_API_KEY=test-fixture-value', { artifact: true }), [])
  assert.notDeepEqual(scanText('assets/fake.test.mjs', 'sk-test-0123456789abcdefghijklmnop', { artifact: true }), [])
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

test('regex-shaped filesystem paths are never exempt by shape alone', () => {
  const paths = [
    ['', 'etc', 'g'].join('/'),
    ['', 'root', 'gi'].join('/'),
    ['', 'srv', 'm'].join('/'),
    ['', 'private', 'u.test'].join('/'),
  ]
  for (const value of paths) {
    assert.deepEqual(scanText('worker/leak.mjs', value), ['worker/leak.mjs: local absolute path'])
  }
})

test('scanner allows web routes, URLs, imports, and regex source', () => {
  assert.deepEqual(scanText('worker/safe.mjs', [
    '/wiki/concepts/attention',
    '/wiki/concepts/context-engineering',
    '/projects/go-tiny-claw',
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

test('scanner narrowly allows the public skill routes and documented Codex install path', () => {
  for (const value of [
    '/llm-wiki/',
    '/llm-wiki/install',
    '/.codex/skills',
    '/.codex/skills/llm-wiki/SKILL.md',
    '/.codex/skills/llm-wiki/scripts/init_wiki.py',
  ]) {
    assert.deepEqual(scanText('docs/llm-wiki/install.md', value, { artifact: true }), [])
  }
  for (const value of [
    ['', 'llm-wiki-private', 'secret'].join('/'),
    ['', '.codex', 'skills-other', 'private', 'file'].join('/'),
    ['', '.codex', 'skills', 'another-skill', 'private', 'file'].join('/'),
    ['', '.codex', 'skills', 'llm-wiki', '..', 'private', 'file'].join('/'),
    ['', '.codex', 'skills', 'llm-wiki', 'private', 'secret.txt'].join('/'),
    ['', '.codex', 'skills', 'llm-wiki', '.env'].join('/'),
    ['', '.codex', 'skills', 'llm-wiki', 'user-notes', 'personal.md'].join('/'),
  ]) {
    assert.match(scanText('docs/llm-wiki/install.md', value, { artifact: true }).join('\n'), /local absolute path/)
  }
})

test('integrated test command preserves the deployment verification order', async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
  const command = packageJson.scripts.test
  const ordered = [
    'npm run qa:index',
    'node --test scripts/external-wiki-tooling.test.mjs',
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
  const limitsParagraph = '公开问答限制为每个 IP 3 次/分钟、5 次/天，全站 10 次/天。每日配额由单例\n'
    + 'SQLite Durable Object 原子计数，并按 UTC 日期重置。'
  for (const required of [
    'npm install',
    'npm run content:sync',
    'npm run worker:dev',
    'npx wrangler secret put DEEPSEEK_API_KEY',
    'npx wrangler secret put IP_HASH_SALT',
    'npm test',
    'PUBLICATION_ROOT="$PUBLIC_CONTENT_PATH" LLM_WIKI_PATH="$LLM_WIKI_PATH" npm run wiki:sync',
    'ketitongxue/llm-wiki-publisher',
    'Build command `npm run build`',
    'Deploy command `npx wrangler deploy`',
    'sessionStorage',
  ]) assert.ok(readme.includes(required), `README must include ${required}`)
  assert.ok(readme.includes(limitsParagraph), 'README must include the exact production limits paragraph')
  assert.ok(
    !readme.includes('5 次/分钟、30 次/天，全站 50 次/天'),
    'README must not include the obsolete combined limit statement',
  )

  const collisionMutation = limitsParagraph
    .replace(' 3 次/分钟', ' 13 次/分钟')
    .replace('、5 次/天', '、15 次/天')
    .replace(' 10 次/天', ' 110 次/天')
  for (const collisionProneSubstring of ['3 次/分钟', '5 次/天', '10 次/天']) {
    assert.ok(collisionMutation.includes(collisionProneSubstring))
  }
  assert.ok(!collisionMutation.includes(limitsParagraph))
})

test('tracked files contain no credential or private-data leaks', async () => {
  assert.deepEqual(await scanTrackedFiles(projectRoot), [])
})

test('artifact scan fails closed when a clean archive has not been built', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  await assert.rejects(scanArtifactFiles(root), /artifacts are missing.*build first/i)
})

test('artifact scan rejects symlinked files and directories without exposing their targets', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  const outside = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-outside-'))
  t.after(() => Promise.all([
    import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })),
    import('node:fs/promises').then(({ rm }) => rm(outside, { recursive: true, force: true })),
  ]))
  const dist = path.join(root, 'docs/.vitepress/dist')
  await mkdir(dist, { recursive: true })
  await writeFile(path.join(outside, 'private.txt'), 'outside fixture')
  await symlink(path.join(outside, 'private.txt'), path.join(dist, 'linked-file'))

  await assert.rejects(scanArtifactFiles(root), (error) => {
    assert.match(error.message, /symbolic link/i)
    assert.doesNotMatch(error.message, /outside|private\.txt/)
    return true
  })

  await import('node:fs/promises').then(({ rm }) => rm(path.join(dist, 'linked-file')))
  await symlink(outside, path.join(dist, 'linked-directory'))
  await assert.rejects(scanArtifactFiles(root), (error) => {
    assert.match(error.message, /symbolic link/i)
    assert.doesNotMatch(error.message, /outside|private\.txt/)
    return true
  })
})

test('artifact scan detects UTF-16LE and binary embedded secrets without printing them', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  const dist = path.join(root, 'docs/.vitepress/dist/assets')
  await mkdir(dist, { recursive: true })
  const assignment = `${['DEEPSEEK', 'API', 'KEY'].join('_')}=live-utf16-value`
  const secret = ['sk', 'live', '0123456789abcdefghijklmnopqrstuvwxyz'].join('-')
  const binaryPath = ['', 'opt', 'company', 'secret.md'].join('/')
  await writeFile(path.join(dist, 'utf16.bin'), Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(assignment, 'utf16le'),
  ]))
  await writeFile(path.join(dist, 'binary.bin'), Buffer.concat([
    Buffer.from([0x00, 0x01, 0x02, 0xff, 0x00]),
    Buffer.from(secret, 'ascii'),
    Buffer.from([0x00]),
    Buffer.from(binaryPath, 'ascii'),
    Buffer.from([0x00, 0xfe]),
  ]))

  const findings = await scanArtifactFiles(root)
  assert.deepEqual(findings.map((finding) => finding.replace(/^artifact:[a-f0-9]{12}: /, '')).sort(), [
    'assigned DeepSeek API key',
    'local absolute path',
    'possible provider secret',
  ])
  assert.ok(findings.every((finding) => /^artifact:[a-f0-9]{12}: /.test(finding)))
  assert.ok(findings.every((finding) => !finding.includes(secret) && !finding.includes('live-utf16-value')))
})

test('raw byte scan finds UTF-16 secrets after a neutral 4 KiB prefix in both endian orders', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  const dist = path.join(root, 'docs/.vitepress/dist/assets')
  await mkdir(dist, { recursive: true })
  const secret = ['sk', 'live', '0123456789abcdefghijklmnopqrstuvwxyz'].join('-')
  const little = Buffer.from(secret, 'utf16le')
  const big = Buffer.from(little)
  for (let index = 0; index < big.length; index += 2) {
    const first = big[index]
    big[index] = big[index + 1]
    big[index + 1] = first
  }
  const prefix = Buffer.alloc(4096, 0x41)
  await writeFile(path.join(dist, 'late-le.bin'), Buffer.concat([prefix, little]))
  await writeFile(path.join(dist, 'late-be.bin'), Buffer.concat([prefix, big]))

  const findings = await scanArtifactFiles(root)
  assert.equal(findings.filter((finding) => finding.endsWith(': possible provider secret')).length, 2)
  assert.ok(findings.every((finding) => !finding.includes(secret) && !finding.includes('late-')))
})

test('offset-independent UTF-16 scan covers paths, raw sources, and validated IPs', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  const dist = path.join(root, 'docs/.vitepress/dist/assets')
  await mkdir(dist, { recursive: true })
  const prefix = Buffer.alloc(4096, 0x41)
  const littleText = [
    ['', 'opt', 'company', 'secret.md'].join('/'),
    ['raw', 'source.md'].join('/'),
    [198, 18, 0, 42].join('.'),
  ].join(' ')
  const bigText = [
    ['', 'Users', 'owner', 'secret.md'].join('/'),
    ['raw', 'source.md'].join('\\'),
    [198, 18, 0, 42].join('.'),
  ].join(' ')
  const toBigEndian = (value) => {
    const bytes = Buffer.from(value, 'utf16le')
    for (let index = 0; index < bytes.length; index += 2) {
      const first = bytes[index]
      bytes[index] = bytes[index + 1]
      bytes[index + 1] = first
    }
    return bytes
  }
  await writeFile(path.join(dist, 'protected-le.bin'), Buffer.concat([prefix, Buffer.from(littleText, 'utf16le')]))
  await writeFile(path.join(dist, 'protected-be.bin'), Buffer.concat([prefix, toBigEndian(bigText)]))
  await writeFile(path.join(dist, 'invalid-le.bin'), Buffer.concat([
    prefix,
    Buffer.from([999, 999, 999, 999].join('.'), 'utf16le'),
  ]))
  await writeFile(path.join(dist, 'invalid-be.bin'), Buffer.concat([
    prefix,
    toBigEndian([999, 999, 999, 999].join('.')),
  ]))

  const findings = await scanArtifactFiles(root)
  assert.equal(findings.filter((finding) => finding.endsWith(': local absolute path')).length, 2)
  assert.equal(findings.filter((finding) => finding.endsWith(': private source path')).length, 2)
  assert.equal(findings.filter((finding) => finding.endsWith(': full IP address')).length, 2)
  assert.ok(findings.every((finding) => !finding.includes('protected-') && !finding.includes('secret.md')))
})

test('artifact and tracked path diagnostics redact secret-bearing filenames', async (t) => {
  const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  const trackedRoot = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-tracked-'))
  t.after(() => Promise.all([
    import('node:fs/promises').then(({ rm }) => rm(artifactRoot, { recursive: true, force: true })),
    import('node:fs/promises').then(({ rm }) => rm(trackedRoot, { recursive: true, force: true })),
  ]))
  const secret = ['sk', 'live', 'filename0123456789abcdefghijklmnop'].join('-')
  const secretName = `${secret}.txt`
  const dist = path.join(artifactRoot, 'docs/.vitepress/dist')
  await mkdir(dist, { recursive: true })
  await writeFile(path.join(dist, secretName), 'safe contents')
  const artifactFindings = await scanArtifactFiles(artifactRoot)
  assert.equal(artifactFindings.length, 1)
  assert.match(artifactFindings[0], /possible provider secret/)
  assert.doesNotMatch(artifactFindings[0], new RegExp(secret))

  await execFileAsync('git', ['init', '-q'], { cwd: trackedRoot })
  await writeFile(path.join(trackedRoot, secretName), 'safe contents')
  await execFileAsync('git', ['add', '--', secretName], { cwd: trackedRoot })
  const trackedFindings = await scanTrackedFiles(trackedRoot)
  assert.equal(trackedFindings.length, 1)
  assert.match(trackedFindings[0], /possible provider secret/)
  assert.doesNotMatch(trackedFindings[0], new RegExp(secret))
})

test('raw binary IPv4 detection validates every octet', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-security-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  const dist = path.join(root, 'docs/.vitepress/dist')
  await mkdir(dist, { recursive: true })
  await writeFile(path.join(dist, 'invalid.bin'), Buffer.from([0, ...Buffer.from('999.999.999.999'), 0xff]))
  assert.deepEqual(await scanArtifactFiles(root), [])
  await writeFile(path.join(dist, 'valid.bin'), Buffer.from([0, ...Buffer.from('198.51.100.42'), 0xff]))
  const findings = await scanArtifactFiles(root)
  assert.equal(findings.filter((finding) => finding.endsWith(': full IP address')).length, 1)
})
