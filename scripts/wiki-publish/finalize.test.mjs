import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { sha256 } from './core.mjs'
import { finalize } from './finalize.mjs'

const BODY = '这是一个完整的中文知识页面，用于验证安全发布流程、链接与内容质量都符合公开要求。'

async function fixture(t, { report = {}, pages = [] } = {}) {
  const site = await mkdtemp(path.join(tmpdir(), 'wiki-finalize-'))
  t.after(() => rm(site, { recursive: true, force: true }))
  await Promise.all([
    mkdir(path.join(site, '.wiki-work'), { recursive: true }),
    mkdir(path.join(site, 'docs', 'wiki'), { recursive: true }),
  ])
  const manifest = { version: 1, pages }
  await writeFile(path.join(site, 'wiki-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(path.join(site, '.wiki-work', 'report.json'), `${JSON.stringify({
    generatedAt: '2026-07-03T12:00:00.000Z', added: [], changed: [], unchanged: [], deleted: [], inventory: {}, ...report,
  })}\n`)
  return site
}

async function put(site, source, title = '中文标题', body = BODY) {
  const content = `---\ntitle: ${title}\n---\n${body}\n`
  await mkdir(path.join(site, 'docs', 'wiki', path.dirname(source)), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', source), content)
  return content
}

function page(source, hash = 'a'.repeat(64)) {
  return { source, hash, publicPath: `docs/wiki/${source}`, status: 'published', syncedAt: '2026-07-01T00:00:00.000Z' }
}

test('publishes all staged additions and changes with source hashes and a generated index', async (t) => {
  const changed = 'concepts/changed.md'
  const added = 'entities/new.md'
  const hashes = { [changed]: sha256('new source'), [added]: sha256('added source') }
  const site = await fixture(t, { pages: [page(changed)], report: {
    added: [added], changed: [changed], inventory: {
      [added]: { hash: hashes[added], publicPath: `docs/wiki/${added}` },
      [changed]: { hash: hashes[changed], publicPath: `docs/wiki/${changed}` },
    },
  } })
  await put(site, changed, '变更页面')
  await put(site, added, '新增实体')

  const result = await finalize({ site })
  const manifest = JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8'))
  assert.equal(result.pages, 2)
  assert.deepEqual(manifest.pages.map(({ source, hash }) => ({ source, hash })), [
    { source: changed, hash: hashes[changed] }, { source: added, hash: hashes[added] },
  ])
  const index = await readFile(path.join(site, 'docs', 'wiki', 'index.md'), 'utf8')
  assert.match(index, /页面总数：\*\*2\*\*/)
  assert.match(index, /\[新增实体\]\(\/wiki\/entities\/new\)/)
})

test('missing translation and validation failure preserve manifest bytes', async (t) => {
  for (const kind of ['missing', 'invalid']) await t.test(kind, async (st) => {
    const source = 'concepts/new.md'
    const site = await fixture(st, { report: { added: [source], inventory: { [source]: { hash: 'b'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
    if (kind === 'invalid') await put(site, source, 'Bad', 'English only')
    const before = await readFile(path.join(site, 'wiki-manifest.json'))
    await assert.rejects(finalize({ site }), kind === 'missing' ? /missing translation/i : /insufficient Chinese/i)
    assert.deepEqual(await readFile(path.join(site, 'wiki-manifest.json')), before)
  })
})

test('deletions block by default and exact confirmation removes page and manifest entry', async (t) => {
  const source = 'concepts/gone.md'
  const site = await fixture(t, { pages: [page(source)], report: { deleted: [source] } })
  await put(site, source, '待删除页面')
  const before = await readFile(path.join(site, 'wiki-manifest.json'))
  await assert.rejects(finalize({ site }), /unconfirmed deletion.*concepts\/gone\.md/i)
  assert.deepEqual(await readFile(path.join(site, 'wiki-manifest.json')), before)

  await finalize({ site, argv: ['--confirm-delete', source] })
  assert.deepEqual(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages, [])
  await assert.rejects(readFile(path.join(site, 'docs', 'wiki', source)), /ENOENT/)
})

test('rejects bad, extra, and duplicate deletion confirmations without mutation', async (t) => {
  const source = 'concepts/gone.md'
  for (const argv of [
    ['--confirm-delete'],
    ['--confirm-delete', 'entities/other.md'],
    ['--confirm-delete', source, '--confirm-delete', source],
  ]) await t.test(argv.join(' '), async (st) => {
    const site = await fixture(st, { pages: [page(source)], report: { deleted: [source] } })
    await put(site, source)
    const before = await readFile(path.join(site, 'wiki-manifest.json'))
    await assert.rejects(finalize({ site, argv }), /confirm-delete|confirmation/i)
    assert.deepEqual(await readFile(path.join(site, 'wiki-manifest.json')), before)
  })
})

test('unchanged report validates but does not rewrite manifest or index', async (t) => {
  const source = 'concepts/same.md'
  const site = await fixture(t, { pages: [page(source)], report: { unchanged: [source], inventory: { [source]: { hash: 'a'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
  await put(site, source)
  await writeFile(path.join(site, 'docs', 'wiki', 'index.md'), 'manual index bytes\n')
  const beforeManifest = await readFile(path.join(site, 'wiki-manifest.json'))
  const beforeIndex = await readFile(path.join(site, 'docs', 'wiki', 'index.md'))
  await finalize({ site })
  assert.deepEqual(await readFile(path.join(site, 'wiki-manifest.json')), beforeManifest)
  assert.deepEqual(await readFile(path.join(site, 'docs', 'wiki', 'index.md')), beforeIndex)
})

test('concurrent finalizers serialize through the shared publication lock', async (t) => {
  const source = 'concepts/new.md'
  const site = await fixture(t, { report: { added: [source], inventory: { [source]: { hash: 'c'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
  await put(site, source)
  const [first, second] = await Promise.all([finalize({ site }), finalize({ site })])
  assert.equal(first.pages, 1)
  assert.equal(second.pages, 1)
  assert.equal(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages.length, 1)
})

test('recovers a publication directory backup left by a crash before finalizing', async (t) => {
  const source = 'concepts/same.md'
  const site = await fixture(t, { pages: [page(source)], report: { unchanged: [source], inventory: { [source]: { hash: 'a'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
  await put(site, source)
  await rename(path.join(site, 'docs', 'wiki'), path.join(site, '.wiki-publish.backup-wiki-crash'))

  const result = await finalize({ site })
  assert.equal(result.pages, 1)
  assert.match(await readFile(path.join(site, 'docs', 'wiki', source), 'utf8'), /完整的中文知识页面/)
})
