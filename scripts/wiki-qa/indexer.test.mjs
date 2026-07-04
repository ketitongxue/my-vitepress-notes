import assert from 'node:assert/strict'
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { buildIndex, normalizeSearchText, splitDocument } from './indexer.mjs'

const frontmatter = (title, type = 'concept') => `---\ntitle: "${title}"\ntype: "${type}"\ntags: ["agent", "workflow"]\n---\n`

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-index-'))
  for (const directory of ['entities', 'concepts', 'comparisons', 'queries', 'raw']) {
    await mkdir(path.join(root, 'wiki', directory), { recursive: true })
  }
  await writeFile(path.join(root, 'wiki', 'concepts', 'public.md'), `${frontmatter('公开概念')}# 公开概念\n\n## 原理\n\n这是公开正文。`)
  await writeFile(path.join(root, 'wiki', 'entities', 'tool.md'), `${frontmatter('工具', 'entity')}# 工具\n\n工具说明。`)
  await writeFile(path.join(root, 'wiki', 'comparisons', 'compare.md'), `${frontmatter('比较', 'comparison')}# 比较\n\n比较说明。`)
  await writeFile(path.join(root, 'wiki', 'queries', 'private.md'), `${frontmatter('查询')}# 查询\n\n不能公开。`)
  await writeFile(path.join(root, 'wiki', 'raw', 'secret.md'), '# secret')
  return root
}

test('buildIndex is deterministic and scans only public directories', async () => {
  const root = await fixture()
  const first = await buildIndex(root)
  const second = await buildIndex(root)

  assert.deepEqual(first, second)
  assert.deepEqual(first.pages.map(({ url }) => url), [
    '/wiki/comparisons/compare',
    '/wiki/concepts/public',
    '/wiki/entities/tool',
  ])
  assert.ok(first.chunks.every((chunk) => /^\/wiki\/(entities|concepts|comparisons)\//.test(chunk.url)))
  assert.ok(first.chunks.every((chunk) => /^[a-f0-9]{16}$/.test(chunk.id)))
})

test('splitDocument respects headings and keeps normal chunks near the target size', () => {
  const paragraph = '上下文工程通过明确边界来提高智能体执行质量。'.repeat(28)
  const page = {
    title: '上下文工程', type: 'concept', tags: ['agent'], url: '/wiki/concepts/context-engineering',
    body: `# 上下文工程\n\n## 定义\n\n${paragraph}\n\n## 实践\n\n${paragraph}`,
  }
  const chunks = splitDocument(page)

  assert.ok(chunks.length >= 2)
  assert.ok(chunks.every(({ text }) => text.length >= 500 && text.length <= 900))
  assert.deepEqual(new Set(chunks.map(({ section }) => section)), new Set(['定义', '实践']))
})

test('metadata contains normalized terms and frequencies', async () => {
  const index = await buildIndex(await fixture())
  const chunk = index.chunks.find(({ url }) => url === '/wiki/concepts/public')

  assert.equal(chunk.title, '公开概念')
  assert.equal(chunk.type, 'concept')
  assert.deepEqual(chunk.tags, ['agent', 'workflow'])
  assert.ok(chunk.terms.includes('公开'))
  assert.equal(chunk.frequencies['公开'], 2)
  assert.equal(normalizeSearchText(' Claude-Code，权限！ '), 'claude code 权限')
})

test('private references and unresolved wikilinks are rejected', async () => {
  const root = await fixture()
  await writeFile(path.join(root, 'wiki', 'concepts', 'unsafe.md'), `${frontmatter('危险')}# 危险\n\n来自 /Users/person/wiki/raw/source.md 和 [[秘密]]。`)

  await assert.rejects(buildIndex(root), /private data|wikilink/i)
})

test('rejects a public section symlinked outside the wiki', async (context) => {
  const outside = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-outside-'))
  await writeFile(path.join(outside, 'leak.md'), `${frontmatter('泄漏')}# 泄漏\n\n外部秘密。`)
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-linked-'))
  await mkdir(path.join(linkedRoot, 'wiki'), { recursive: true })
  try {
    await symlink(outside, path.join(linkedRoot, 'wiki', 'concepts'), 'dir')
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error?.code)) return context.skip('symlinks are unavailable')
    throw error
  }
  await mkdir(path.join(linkedRoot, 'wiki', 'entities'))
  await mkdir(path.join(linkedRoot, 'wiki', 'comparisons'))

  await assert.rejects(buildIndex(linkedRoot), /symbolic link/i)
})

test('rejects a symlinked Markdown file in a public section', async (context) => {
  const root = await fixture()
  const outside = path.join(await mkdtemp(path.join(os.tmpdir(), 'wiki-qa-file-')), 'leak.md')
  await writeFile(outside, `${frontmatter('泄漏')}# 泄漏\n\n外部秘密。`)
  try {
    await symlink(outside, path.join(root, 'wiki', 'concepts', 'leak.md'))
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error?.code)) return context.skip('symlinks are unavailable')
    throw error
  }

  await assert.rejects(buildIndex(root), /symbolic link/i)
})

test('overlong sections split on paragraph boundaries before sentences', () => {
  const paragraphs = ['甲', '乙', '丙', '丁'].map((prefix) => `${prefix}${'段落内容。'.repeat(65)}`)
  const page = {
    title: '段落切分', type: 'concept', tags: [], url: '/wiki/concepts/paragraph-split',
    body: `# 段落切分\n\n## 方法\n\n${paragraphs.join('\n\n')}`,
  }

  const chunks = splitDocument(page)
  assert.deepEqual(chunks.map(({ text }) => text), [
    `${paragraphs[0]}\n\n${paragraphs[1]}`,
    `${paragraphs[2]}\n\n${paragraphs[3]}`,
  ])
})
