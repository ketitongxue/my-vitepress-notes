import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(import.meta.dirname, '../..')
const TEST_FILES = /(?:^|\/)\w[\w.-]*\.test\.mjs$/
const TEST_NET = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.(?:\d{1,3})$/
const PRIVATE_FIXTURE_FILES = new Set(['a.md', 'article.md', 'bad.md', 'private.md', 'secret.md', 'source.md'])

function addFinding(findings, file, kind) {
  findings.push(`${file}: ${kind}`)
}

export function scanText(file, text, { artifact = false } = {}) {
  const findings = []
  const isTest = TEST_FILES.test(file)

  for (const match of text.matchAll(/\bsk-[A-Za-z0-9_-]{20,}\b/g)) {
    if (!(isTest && /^sk-(?:fake|test)-/.test(match[0]))) {
      addFinding(findings, file, 'possible provider secret')
    }
  }

  for (const match of text.matchAll(/\bDEEPSEEK_API_KEY\s*=\s*['"]?([A-Za-z0-9_$.-][A-Za-z0-9_$./-]*)['"]?/g)) {
    const assigned = match[1].replace(/^['"]|['"]$/g, '')
    if (!(isTest && /^(?:fake|test|fixture)-/.test(assigned))) {
      addFinding(findings, file, 'assigned DeepSeek API key')
    }
  }

  const absolutePaths = [
    ...text.matchAll(/(?:^|[\s('"`])\/(?:Users|home)\/([^\s)'"`]+)/gm),
    ...text.matchAll(/(?:^|[\s('"`])[A-Za-z]:\\Users\\([^\s)'"`]+)/gm),
  ]
  for (const match of absolutePaths) {
    const fixturePath = /^(?:alice|person|test|fake)(?:[\\/]|$)/i.test(match[1])
    if (artifact || !isTest || !fixturePath) {
      addFinding(findings, file, 'local absolute path')
    }
  }

  for (const match of text.matchAll(/(?:^|[\s/('"`])((?:sources\/)?raw\/[A-Za-z0-9_./-]+)/gim)) {
    const dedicatedFixture = isTest && PRIVATE_FIXTURE_FILES.has(path.posix.basename(match[1]).toLowerCase())
    if (artifact || !dedicatedFixture) {
      addFinding(findings, file, 'private source path')
    }
  }

  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    const octets = match[0].split('.').map(Number)
    if (octets.some((octet) => octet > 255)) continue
    if (!(isTest && TEST_NET.test(match[0]))) addFinding(findings, file, 'full IP address')
  }

  return [...new Set(findings)]
}

async function trackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout.split('\0').filter(Boolean)
}

async function artifactFiles(directory, prefix = '') {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT' && prefix === '') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...await artifactFiles(path.join(directory, entry.name), relative))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

async function scanFile(relative, { artifact = false, root = projectRoot } = {}) {
  const content = await readFile(path.join(root, relative))
  if (content.includes(0)) return []
  return scanText(relative, content.toString('utf8'), { artifact })
}

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

test('tracked files and generated deployment artifacts contain no credential or private-data leaks', async () => {
  const trackedFindings = (await Promise.all(
    (await trackedFiles()).map((file) => scanFile(file)),
  )).flat()
  const buildRoot = path.join(projectRoot, 'docs/.vitepress/dist')
  const artifactFindings = (await Promise.all(
    (await artifactFiles(buildRoot)).map((file) => scanFile(file, { artifact: true, root: buildRoot })),
  )).flat()

  assert.deepEqual([...trackedFindings, ...artifactFindings], [])
})
