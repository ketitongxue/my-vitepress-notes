import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const pages = {
  hub: 'docs/llm-wiki/index.md',
  principles: 'docs/llm-wiki/principles.md',
  build: 'docs/llm-wiki/build.md',
  install: 'docs/llm-wiki/install.md'
}

const repo = 'https://github.com/ketitongxue/llm-wiki-skill'
const fixedRelease = `${repo}/releases/tag/v1.0.0`
const latestRelease = `${repo}/releases/latest`
const zip = `${repo}/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip`
const checksum = `${repo}/releases/download/v1.0.0/SHA256SUMS.txt`

async function page(name) {
  return readFile(pages[name], 'utf8')
}

async function listTree(root) {
  const entries = []
  for (const dirent of await readdir(root, { withFileTypes: true })) {
    const relative = path.join(root, dirent.name)
    entries.push(relative)
    if (dirent.isDirectory()) entries.push(...await listTree(relative))
  }
  return entries
}

test('publishes four pages with unique H1 headings and a hub backlink', async () => {
  const documents = await Promise.all(Object.values(pages).map((path) => readFile(path, 'utf8')))
  const headings = documents.map((document) => document.match(/^# (.+)$/m)?.[1])
  assert.equal(headings.every(Boolean), true)
  assert.equal(new Set(headings).size, 4)
  for (const document of documents) assert.match(document, /\]\(\/llm-wiki\/\)/)
})

test('hub identifies v1.0.0 and GitHub as the only source of truth', async () => {
  const document = await page('hub')
  for (const value of ['v1.0.0', repo, fixedRelease, latestRelease, '唯一可信源码']) {
    assert.ok(document.includes(value), `hub missing ${value}`)
  }
})

test('install page uses fixed release assets and the verified Codex path', async () => {
  const document = await page('install')
  for (const value of [zip, checksum, 'shasum -a 256', '~/.codex/skills/llm-wiki']) {
    assert.ok(document.includes(value), `install missing ${value}`)
  }
})

test('install page pins clone installation to the v1.0.0 tag', async () => {
  const document = await page('install')
  assert.ok(document.includes(
    'git clone --branch v1.0.0 --depth 1 https://github.com/ketitongxue/llm-wiki-skill'
  ))
  assert.match(document, /临时目录/)
  assert.doesNotMatch(document, /git clone (?!.*--branch v1\.0\.0)/)
})

test('principles page explains the model, attribution, and retrieval boundaries', async () => {
  const document = await page('principles')
  for (const value of ['Raw', 'Wiki', 'Schema', 'Andrej Karpathy', '临时搜索', '长上下文', 'RAG']) {
    assert.ok(document.includes(value), `principles missing ${value}`)
  }
})

test('build page covers orientation, ingestion, linking, and quality controls', async () => {
  const document = await page('build')
  for (const value of [
    'purpose.md', 'SCHEMA.md', 'index.md', 'log.md', '一份来源', '机制页', 'Hub',
    '双向链接', 'lint', '冲突', '孤立页', '敏感数据'
  ]) {
    assert.ok(document.includes(value), `build missing ${value}`)
  }
})

test('build page does not present the package validator as a knowledge-base linter', async () => {
  const document = await page('build')
  assert.doesNotMatch(document, /python3[^\n]*scripts\/validate\.py[^\n]*<WIKI_PATH>/)
  assert.match(document, /验证器只验证安装的 Skill 包/)
  assert.match(document, /lint checklist/)
})

test('website does not mirror public Skill implementation or release artifacts', async () => {
  const entries = await listTree('docs/llm-wiki')
  const violations = entries.filter((entry) => {
    const basename = path.basename(entry)
    return ['SKILL.md', 'SHA256SUMS.txt', 'templates', 'scripts'].includes(basename) || basename.endsWith('.zip')
  })
  assert.deepEqual(violations, [])
})

test('examples do not expose a personal filesystem path', async () => {
  const documents = await Promise.all(Object.values(pages).map((path) => readFile(path, 'utf8')))
  for (const document of documents) {
    assert.doesNotMatch(document, /\/Users\/|[A-Za-z]:\\Users\\/)
  }
  assert.ok(documents.some((document) => document.includes('<WIKI_PATH>')))
})
