import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { sha256 } from './core.mjs'
import { validatePublishedWiki } from './validate.mjs'

const CHINESE_BODY = '这是一个完整的中文知识页面，用于说明发布校验机制如何保护内容质量以及站内链接的正确性。'

async function fixture(t, { source = 'concepts/good.md', content, page = {} } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'wiki-validate-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const publicPath = `docs/wiki/${source}`
  const markdown = content ?? `---\ntitle: 合法页面\n---\n${CHINESE_BODY}\n`
  await mkdir(path.join(root, path.dirname(source)), { recursive: true })
  await writeFile(path.join(root, source), markdown)
  return {
    docsRoot: root,
    manifest: {
      version: 1,
      pages: [{
        source,
        hash: sha256(markdown),
        publicPath,
        status: 'published',
        syncedAt: '2026-07-03T00:00:00.000Z',
        ...page,
      }],
    },
  }
}

async function errorsFor(t, content) {
  const input = await fixture(t, { content })
  return (await validatePublishedWiki(input)).errors.join('\n')
}

test('accepts a complete Chinese published page', async (t) => {
  assert.deepEqual(await validatePublishedWiki(await fixture(t)), {
    errors: [],
    warnings: [],
  })
})

test('rejects sources metadata and raw paths', async (t) => {
  assert.match(await errorsFor(t, `---\nsources: private\n---\n${CHINESE_BODY}`), /sources:/i)
  assert.match(await errorsFor(t, `${CHINESE_BODY}\nraw/private-note.md`), /raw\//i)
})

test('rejects macOS, Linux, and Windows absolute paths', async (t) => {
  assert.match(await errorsFor(t, `${CHINESE_BODY}\n/Users/alice/private.md`), /absolute path/i)
  assert.match(await errorsFor(t, `${CHINESE_BODY}\n/home/alice/private.md`), /absolute path/i)
  assert.match(await errorsFor(t, `${CHINESE_BODY}\nC:\\Users\\alice\\private.md`), /absolute path/i)
})

test('rejects residual wikilinks', async (t) => {
  assert.match(await errorsFor(t, `${CHINESE_BODY}\n[[concepts/secret]]`), /wikilink/i)
})

test('rejects an English-only shell after removing frontmatter and code blocks', async (t) => {
  const content = `---\ntitle: 中文标题包含很多汉字但不应计数\n---\nThis page is still an untranslated English shell.\n\`\`\`text\n这里的代码块汉字也不应计数，这是二十多个汉字。\n\`\`\``
  assert.match(await errorsFor(t, content), /Chinese content/i)
})

test('rejects broken internal Markdown links', async (t) => {
  assert.match(await errorsFor(t, `${CHINESE_BODY}\n[缺失页面](/wiki/concepts/missing)`), /broken link/i)
})

test('rejects extra files under published sections', async (t) => {
  const input = await fixture(t)
  await writeFile(path.join(input.docsRoot, 'concepts', 'extra.md'), CHINESE_BODY)
  assert.match((await validatePublishedWiki(input)).errors.join('\n'), /extra.*concepts\/extra\.md/i)
})

test('rejects manifest entries whose published files are missing', async (t) => {
  const input = await fixture(t)
  input.manifest.pages.push({
    source: 'entities/missing.md',
    hash: 'a'.repeat(64),
    publicPath: 'docs/wiki/entities/missing.md',
    status: 'published',
    syncedAt: '2026-07-03T00:00:00.000Z',
  })
  assert.match((await validatePublishedWiki(input)).errors.join('\n'), /missing.*entities\/missing\.md/i)
})

test('validates manifest fields and returns sorted diagnostics', async (t) => {
  const input = await fixture(t, {
    page: { source: 'raw/bad.md', publicPath: '/tmp/bad.md', hash: 'bad', status: 'draft' },
  })
  const result = await validatePublishedWiki(input)
  assert.deepEqual(result.errors, [...result.errors].sort())
  assert.match(result.errors.join('\n'), /source/i)
  assert.match(result.errors.join('\n'), /publicPath/i)
  assert.match(result.errors.join('\n'), /hash/i)
  assert.match(result.errors.join('\n'), /status/i)
})
