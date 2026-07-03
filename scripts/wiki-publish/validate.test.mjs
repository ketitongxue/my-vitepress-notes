import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
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
  assert.match(await errorsFor(t, `${CHINESE_BODY}\n/etc/passwd\n/tmp/private.md\n/var/log/private.log`), /absolute path/i)
  assert.match(await errorsFor(t, `${CHINESE_BODY}\nC:\\Users\\alice\\private.md`), /absolute path/i)
})

test('allows wiki links and HTTP(S) URLs without treating them as absolute paths', async (t) => {
  const input = await fixture(t, {
    content: `${CHINESE_BODY}\n[本站页面](/wiki/concepts/good)\nhttps://example.com/private/path\nhttp://example.com/Users/alice`,
  })
  assert.doesNotMatch((await validatePublishedWiki(input)).errors.join('\n'), /absolute path/i)
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

test('finds reference, angle-bracket, and escaped-parenthesis broken links', async (t) => {
  const errors = await errorsFor(t, `${CHINESE_BODY}

[missing]: /wiki/concepts/reference-missing

[引用链接][missing]
[尖括号](<missing page.md>)
[嵌套括号](missing\\(nested\\).md)`)
  assert.match(errors, /reference-missing/i)
  assert.match(errors, /missing(?:%20| )page\.md/i)
  assert.match(errors, /missing(?:\\?\(|%28)nested(?:\\?\)|%29)\.md/i)
})

test('rejects plain and encoded link traversal', async (t) => {
  const errors = await errorsFor(t, `${CHINESE_BODY}
[越界](../../secret.md)
[编码越界](%2e%2e/%2e%2e/secret.md)`)
  assert.match(errors, /traversal.*\.\.\/\.\.\/secret\.md/i)
  assert.match(errors, /traversal.*%2e%2e/i)
})

test('rejects extra files under published sections', async (t) => {
  const input = await fixture(t)
  await writeFile(path.join(input.docsRoot, 'concepts', 'extra.md'), CHINESE_BODY)
  assert.match((await validatePublishedWiki(input)).errors.join('\n'), /extra.*concepts\/extra\.md/i)
})

test('rejects symlinked sections, nested directories, and Markdown files', async (t) => {
  for (const kind of ['section', 'directory', 'file']) {
    await t.test(kind, async (subtest) => {
      const input = await fixture(subtest)
      const outside = await mkdtemp(path.join(tmpdir(), 'wiki-validate-outside-'))
      subtest.after(() => rm(outside, { recursive: true, force: true }))
      await writeFile(path.join(outside, 'leak.md'), CHINESE_BODY)
      if (kind === 'section') {
        await symlink(outside, path.join(input.docsRoot, 'entities'))
      } else if (kind === 'directory') {
        await symlink(outside, path.join(input.docsRoot, 'concepts', 'linked'))
      } else {
        await symlink(path.join(outside, 'leak.md'), path.join(input.docsRoot, 'concepts', 'leak.md'))
      }
      await assert.rejects(validatePublishedWiki(input), /symbolic link/i)
    })
  }
})

test('rejects a symlinked docs root', async (t) => {
  const input = await fixture(t)
  const outside = await mkdtemp(path.join(tmpdir(), 'wiki-validate-root-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await mkdir(path.join(outside, 'concepts'))
  await writeFile(path.join(outside, 'concepts', 'good.md'), CHINESE_BODY)
  await rm(input.docsRoot, { recursive: true })
  await symlink(outside, input.docsRoot)

  await assert.rejects(validatePublishedWiki(input), /symbolic link/i)
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

test('accepts a valid source hash that differs from translated content', async (t) => {
  const input = await fixture(t, { page: { hash: 'a'.repeat(64) } })
  assert.doesNotMatch((await validatePublishedWiki(input)).errors.join('\n'), /hash/i)
})

test('rejects malformed hash, duplicate source and publicPath, and bad metadata', async (t) => {
  const input = await fixture(t, {
    page: { hash: 'bad', extra: true },
  })
  input.manifest.pages.push(
    { ...input.manifest.pages[0], syncedAt: undefined },
    {
      ...input.manifest.pages[0],
      source: 'entities/other.md',
      hash: 'b'.repeat(64),
      syncedAt: 'not-a-date',
    },
  )
  const errors = (await validatePublishedWiki(input)).errors.join('\n')
  assert.match(errors, /invalid hash/i)
  assert.match(errors, /duplicate source/i)
  assert.match(errors, /duplicate publicPath/i)
  assert.match(errors, /unexpected field extra/i)
  assert.match(errors, /invalid syncedAt/i)
})
