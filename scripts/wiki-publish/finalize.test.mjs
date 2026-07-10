import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { sha256 } from './core.mjs'
import { collectionConfig } from './collections.mjs'
import { finalize, recoverPublication } from './finalize.mjs'
import { prepareMirror } from './prepare.mjs'

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
  const completeReport = {
    generatedAt: '2026-07-03T12:00:00.000Z', added: [], changed: [], unchanged: [], deleted: [], inventory: {}, ...report,
  }
  completeReport.translationBaselines ??= Object.fromEntries([
    ...completeReport.added.map((source) => [source, null]),
    ...completeReport.changed.map((source) => [source, sha256('previous translation')]),
  ])
  await writeFile(path.join(site, '.wiki-work', 'report.json'), `${JSON.stringify(completeReport)}\n`)
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
  assert.match(index, /class="knowledge-hub"/)
  assert.match(index, /<details class="knowledge-hub__all">/)
  assert.match(index, /<summary>全部条目（2）<\/summary>/)
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
  const results = await Promise.allSettled([finalize({ site }), finalize({ site })])
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
  assert.match(results.find(({ status }) => status === 'rejected').reason.message, /added source already exists/i)
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

test('rejects an intermediate directory symlink before confirmed deletion can touch external files', async (t) => {
  const source = 'concepts/link/victim.md'
  const outside = await mkdtemp(path.join(tmpdir(), 'wiki-finalize-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  const victim = path.join(outside, 'victim.md')
  await writeFile(victim, 'must survive\n')
  const site = await fixture(t, { pages: [page(source)], report: { deleted: [source] } })
  await mkdir(path.join(site, 'docs', 'wiki', 'concepts'))
  await symlink(outside, path.join(site, 'docs', 'wiki', 'concepts', 'link'))

  await assert.rejects(finalize({ site, argv: ['--confirm-delete', source] }), /symbolic link/i)
  assert.equal(await readFile(victim, 'utf8'), 'must survive\n')
})

test('sorts manifest and generated index by locale-independent Unicode code points', async (t) => {
  const sources = ['entities/é.md', 'entities/z.md']
  const inventory = Object.fromEntries(sources.map((source) => [source, { hash: sha256(source), publicPath: `docs/wiki/${source}` }]))
  const site = await fixture(t, { report: { added: sources, inventory } })
  await put(site, sources[0], '重音页面')
  await put(site, sources[1], '字母页面')

  await finalize({ site })
  const manifest = JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8'))
  assert.deepEqual(manifest.pages.map(({ source }) => source), ['entities/z.md', 'entities/é.md'])
  const index = await readFile(path.join(site, 'docs', 'wiki', 'index.md'), 'utf8')
  assert.ok(index.indexOf('/wiki/entities/z') < index.indexOf('/wiki/entities/é'))
})

test('rolls back a newly installed wiki when a crash occurs before manifest installation', async (t) => {
  const source = 'concepts/same.md'
  const site = await fixture(t, { pages: [page(source)], report: { unchanged: [source], inventory: { [source]: { hash: 'a'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
  const original = await put(site, source, '原始页面')
  await rename(path.join(site, 'docs', 'wiki'), path.join(site, '.wiki-publish.backup-wiki-crash'))
  await rename(path.join(site, 'wiki-manifest.json'), path.join(site, '.wiki-publish.backup-manifest-crash'))
  await mkdir(path.join(site, 'docs', 'wiki', 'concepts'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', source), 'partially installed wiki\n')

  await finalize({ site })
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', source), 'utf8'), original)
  assert.equal(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages.length, 1)
})

test('recovers every initial publication transaction interruption point', async (t) => {
  const collection = collectionConfig('finance')
  for (const state of ['marker-only', 'wiki-installed', 'pair-installed', 'committed']) await t.test(state, async (st) => {
    const site = await mkdtemp(path.join(tmpdir(), 'finance-initial-recovery-'))
    st.after(() => rm(site, { recursive: true, force: true }))
    await mkdir(path.join(site, 'docs'), { recursive: true })
    const token = 'crash'
    const preparedMarker = path.join(site, `.finance-publish.transaction-prepared-initial-${token}`)
    const installedMarker = path.join(site, `.finance-publish.transaction-installed-${token}`)
    await writeFile(state === 'committed' ? installedMarker : preparedMarker, '')
    if (state !== 'marker-only') {
      await mkdir(path.join(site, 'docs', 'finance'), { recursive: true })
      await writeFile(path.join(site, 'docs', 'finance', 'partial.md'), 'new docs\n')
    }
    if (state === 'pair-installed' || state === 'committed') {
      await writeFile(path.join(site, 'finance-manifest.json'), '{"version":1,"pages":[]}\n')
    }

    await recoverPublication(site, collection)

    if (state === 'committed') {
      assert.equal(await readFile(path.join(site, 'docs', 'finance', 'partial.md'), 'utf8'), 'new docs\n')
      assert.match(await readFile(path.join(site, 'finance-manifest.json'), 'utf8'), /pages/)
    } else {
      await assert.rejects(readFile(path.join(site, 'docs', 'finance', 'partial.md')), /ENOENT/)
      await assert.rejects(readFile(path.join(site, 'finance-manifest.json')), /ENOENT/)
    }
    await assert.rejects(readFile(preparedMarker), /ENOENT/)
    await assert.rejects(readFile(installedMarker), /ENOENT/)
  })
})

test('rejects multiple publication recovery transactions without mutation', async (t) => {
  const site = await mkdtemp(path.join(tmpdir(), 'finance-multiple-recovery-'))
  t.after(() => rm(site, { recursive: true, force: true }))
  await writeFile(path.join(site, '.finance-publish.transaction-prepared-initial-one'), '')
  await writeFile(path.join(site, '.finance-publish.transaction-prepared-initial-two'), '')
  await assert.rejects(recoverPublication(site, collectionConfig('finance')), /multiple backup transactions/i)
})

test('rejects non-canonical report sources and inventory keys before mutation', async (t) => {
  const cases = [
    { field: 'deleted', source: 'concepts/../entities/x.md' },
    { field: 'added', source: 'concepts/not-markdown.txt' },
    { field: 'changed', source: 'concepts/%2e%2e/entities/x.md' },
    { field: 'deleted', source: String.raw`concepts\victim.md` },
    { field: 'added', source: 'concepts/./x.md' },
    { field: 'changed', source: 'concepts/x\u0000.md'.replace('\\u0000', '\u0000') },
  ]
  for (const { field, source } of cases) await t.test(`${field}: ${JSON.stringify(source)}`, async (st) => {
    const site = await fixture(st, { report: { [field]: [source], inventory: { [source]: { hash: 'd'.repeat(64), publicPath: `docs/wiki/${source}` } } } })
    const before = await readFile(path.join(site, 'wiki-manifest.json'))
    await assert.rejects(finalize({ site, argv: field === 'deleted' ? ['--confirm-delete', source] : [] }), /invalid report source/i)
    assert.deepEqual(await readFile(path.join(site, 'wiki-manifest.json')), before)
  })

  await t.test('inventory key', async (st) => {
    const source = 'concepts/good.md'
    const site = await fixture(st, { report: { added: [source], inventory: {
      [source]: { hash: 'e'.repeat(64), publicPath: `docs/wiki/${source}` },
      'concepts/../entities/hidden.md': { hash: 'f'.repeat(64), publicPath: 'docs/wiki/entities/hidden.md' },
    } } })
    await put(site, source)
    await assert.rejects(finalize({ site }), /invalid report source/i)
  })
})

test('does not advance a changed source hash until its translation is edited', async (t) => {
  const source = 'concepts/changed.md'
  const oldTranslation = `---\ntitle: 旧译文\n---\n${BODY}\n`
  const oldHash = 'a'.repeat(64)
  const newHash = 'b'.repeat(64)
  const site = await fixture(t, { pages: [page(source, oldHash)], report: {
    changed: [source], inventory: { [source]: { hash: newHash, publicPath: `docs/wiki/${source}` } },
    translationBaselines: { [source]: sha256(oldTranslation) },
  } })
  await mkdir(path.join(site, 'docs', 'wiki', 'concepts'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', source), oldTranslation)
  await assert.rejects(finalize({ site }), /translation.*not.*updated/i)
  assert.equal(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages[0].hash, oldHash)

  await writeFile(path.join(site, 'docs', 'wiki', source), oldTranslation.replace('旧译文', '新译文'))
  await finalize({ site })
  assert.equal(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages[0].hash, newHash)
})

test('blocks a stale pre-existing added page unless edited or explicitly acknowledged', async (t) => {
  const source = 'entities/new.md'
  const stale = `---\ntitle: 陈旧页面\n---\n${BODY}\n`
  const report = {
    added: [source], inventory: { [source]: { hash: 'c'.repeat(64), publicPath: `docs/wiki/${source}` } },
    translationBaselines: { [source]: sha256(stale) },
  }
  const site = await fixture(t, { report })
  await mkdir(path.join(site, 'docs', 'wiki', 'entities'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', source), stale)
  await assert.rejects(finalize({ site }), /translation.*not.*updated/i)
  await finalize({ site, argv: ['--confirm-translation', source] })
  assert.equal(JSON.parse(await readFile(path.join(site, 'wiki-manifest.json'), 'utf8')).pages[0].source, source)
})

test('requires exact canonical translation confirmations for pending added or changed sources', async (t) => {
  const source = 'concepts/changed.md'
  const content = await (async () => `---\ntitle: 未变化\n---\n${BODY}\n`)()
  for (const argv of [
    ['--confirm-translation'],
    ['--confirm-translation', 'concepts/other.md'],
    ['--confirm-translation', 'concepts/../entities/x.md'],
    ['--confirm-translation', source, '--confirm-translation', source],
  ]) await t.test(argv.join(' '), async (st) => {
    const site = await fixture(st, { pages: [page(source)], report: {
      changed: [source], inventory: { [source]: { hash: 'd'.repeat(64), publicPath: `docs/wiki/${source}` } },
      translationBaselines: { [source]: sha256(content) },
    } })
    await mkdir(path.join(site, 'docs', 'wiki', 'concepts'), { recursive: true })
    await writeFile(path.join(site, 'docs', 'wiki', source), content)
    await assert.rejects(finalize({ site, argv }), /confirm-translation|translation confirmation|invalid report source/i)
  })
})

test('safely rejects a legacy report with added or changed sources but no translation baseline', async (t) => {
  const source = 'concepts/new.md'
  const site = await fixture(t, { report: {
    added: [source], inventory: { [source]: { hash: 'f'.repeat(64), publicPath: `docs/wiki/${source}` } },
  } })
  await put(site, source)
  const reportPath = path.join(site, '.wiki-work', 'report.json')
  const legacy = JSON.parse(await readFile(reportPath, 'utf8'))
  delete legacy.translationBaselines
  await writeFile(reportPath, JSON.stringify(legacy))
  await assert.rejects(finalize({ site }), /require translationBaselines/i)
})

test('initial Finance finalization installs collection outputs and rolls both back on manifest-install failure', async (t) => {
  const source = 'concepts/first.md'
  for (const fail of [false, true]) await t.test(fail ? 'rollback' : 'success', async (st) => {
    const site = await mkdtemp(path.join(tmpdir(), 'finance-finalize-'))
    st.after(() => rm(site, { recursive: true, force: true }))
    await mkdir(path.join(site, '.finance-work'), { recursive: true })
    await mkdir(path.join(site, '.finance-work', 'prepared', 'concepts'), { recursive: true })
    const content = `---\ntitle: 金融概念\n---\n${BODY}\n`
    await writeFile(path.join(site, '.finance-work', 'prepared', source), content)
    await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({
      generatedAt: '2026-07-08T00:00:00.000Z', added: [source], changed: [], unchanged: [], deleted: [],
      inventory: { [source]: { hash: sha256('source'), publicPath: `docs/finance/${source}` } },
      translationBaselines: { [source]: null },
    }))
    const renameFile = async (from, to) => {
      if (fail && to === path.join(site, 'finance-manifest.json')) throw new Error('injected manifest failure')
      return rename(from, to)
    }
    if (fail) {
      await assert.rejects(finalize({ collectionName: 'finance', site, renameFile }), /injected/)
      await assert.rejects(readFile(path.join(site, 'docs', 'finance', source)), /ENOENT/)
      await assert.rejects(readFile(path.join(site, 'finance-manifest.json')), /ENOENT/)
    } else {
      await finalize({ collectionName: 'finance', site })
      assert.equal(JSON.parse(await readFile(path.join(site, 'finance-manifest.json'), 'utf8')).pages.length, 1)
      assert.match(await readFile(path.join(site, 'docs', 'finance', 'index.md'), 'utf8'), /\/finance\/concepts\/first/)
    }
  })
})

test('Finance finalization rejects unchanged prepared bytes without Wiki translation override', async (t) => {
  const source = 'concepts/same.md'
  const site = await mkdtemp(path.join(tmpdir(), 'finance-finalize-'))
  t.after(() => rm(site, { recursive: true, force: true }))
  await mkdir(path.join(site, '.finance-work'), { recursive: true })
  await mkdir(path.join(site, '.finance-work', 'prepared', 'concepts'), { recursive: true })
  const content = `---\ntitle: 金融概念\n---\n${BODY}\n`
  await writeFile(path.join(site, '.finance-work', 'prepared', source), content)
  await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({
    generatedAt: '2026-07-08T00:00:00.000Z', added: [source], changed: [], unchanged: [], deleted: [],
    inventory: { [source]: { hash: sha256('source'), publicPath: `docs/finance/${source}` } },
    translationBaselines: { [source]: sha256(content) },
  }))
  await assert.rejects(finalize({ collectionName: 'finance', site, argv: ['--confirm-translation', source] }), /unknown finalize argument|not updated/i)
})

test('incremental Finance finalization commits or rolls back collection outputs atomically', async (t) => {
  const source = 'concepts/risk.md'
  for (const fail of [false, true]) await t.test(fail ? 'rollback' : 'success', async (st) => {
    const site = await mkdtemp(path.join(tmpdir(), 'finance-finalize-incremental-'))
    st.after(() => rm(site, { recursive: true, force: true }))
    await mkdir(path.join(site, '.finance-work'), { recursive: true })
    await mkdir(path.join(site, 'docs', 'finance', 'concepts'), { recursive: true })
    await mkdir(path.join(site, '.finance-work', 'prepared', 'concepts'), { recursive: true })
    const previous = `---\ntitle: 旧风险页面\n---\n${BODY}\n`
    const prepared = previous.replace('旧风险页面', '新风险页面')
    const oldManifest = { version: 1, pages: [{
      source, hash: sha256('old source'), publicPath: `docs/finance/${source}`,
      status: 'published', syncedAt: '2026-07-01T00:00:00.000Z',
    }] }
    await writeFile(path.join(site, 'docs', 'finance', source), previous)
    await writeFile(path.join(site, '.finance-work', 'prepared', source), prepared)
    await writeFile(path.join(site, 'finance-manifest.json'), `${JSON.stringify(oldManifest, null, 2)}\n`)
    await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({
      generatedAt: '2026-07-08T00:00:00.000Z', added: [], changed: [source], unchanged: [], deleted: [],
      inventory: { [source]: { hash: sha256('new source'), publicPath: `docs/finance/${source}` } },
      translationBaselines: { [source]: sha256(previous) },
    }))
    const beforeManifest = await readFile(path.join(site, 'finance-manifest.json'))
    const renameFile = async (from, to) => {
      if (fail && to === path.join(site, 'finance-manifest.json') && from.includes('.finance-publish.tmp-')) {
        throw new Error('injected incremental manifest failure')
      }
      return rename(from, to)
    }

    if (fail) {
      await assert.rejects(finalize({ collectionName: 'finance', site, renameFile }), /injected incremental/)
      assert.deepEqual(await readFile(path.join(site, 'finance-manifest.json')), beforeManifest)
      assert.equal(await readFile(path.join(site, 'docs', 'finance', source), 'utf8'), previous)
    } else {
      await finalize({ collectionName: 'finance', site })
      const manifest = JSON.parse(await readFile(path.join(site, 'finance-manifest.json'), 'utf8'))
      assert.equal(manifest.pages[0].hash, sha256('new source'))
      assert.equal(await readFile(path.join(site, 'docs', 'finance', source), 'utf8'), prepared)
    }
  })
})

test('rejects mismatched publication pairs before mutation', async (t) => {
  for (const present of ['docs', 'manifest']) await t.test(present, async (st) => {
    const site = await mkdtemp(path.join(tmpdir(), 'finance-mismatch-'))
    st.after(() => rm(site, { recursive: true, force: true }))
    await mkdir(path.join(site, '.finance-work'), { recursive: true })
    await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({
      generatedAt: '2026-07-08T00:00:00.000Z', added: [], changed: [], unchanged: [], deleted: [], inventory: {},
    }))
    if (present === 'docs') {
      await mkdir(path.join(site, 'docs', 'finance'), { recursive: true })
      await writeFile(path.join(site, 'docs', 'finance', 'sentinel.txt'), 'docs survive\n')
    } else {
      await writeFile(path.join(site, 'finance-manifest.json'), '{"version":1,"pages":[]}\n')
    }
    await assert.rejects(finalize({ collectionName: 'finance', site }), /both exist or both be absent/i)
    if (present === 'docs') assert.equal(await readFile(path.join(site, 'docs', 'finance', 'sentinel.txt'), 'utf8'), 'docs survive\n')
    else assert.equal(await readFile(path.join(site, 'finance-manifest.json'), 'utf8'), '{"version":1,"pages":[]}\n')
  })
})

test('prepare and finalize serialize and publish only the complete prepared batch', async (t) => {
  const source = 'concepts/test.md'
  const site = await mkdtemp(path.join(tmpdir(), 'finance-prepare-finalize-'))
  t.after(() => rm(site, { recursive: true, force: true }))
  await mkdir(path.join(site, '.finance-work', 'source', 'concepts'), { recursive: true })
  const raw = `---\ntitle: 金融概念\n---\n${BODY}\n`
  await writeFile(path.join(site, '.finance-work', 'source', source), raw)
  await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({
    generatedAt: '2026-07-08T00:00:00.000Z', added: [source], changed: [], unchanged: [], deleted: [],
    inventory: { [source]: { hash: sha256(raw), publicPath: `docs/finance/${source}` } },
    translationBaselines: { [source]: null },
  }))
  let releaseWrite
  const paused = new Promise((resolve) => { releaseWrite = resolve })
  let entered
  const writing = new Promise((resolve) => { entered = resolve })
  const preparing = prepareMirror({
    collectionName: 'finance', site,
    writePrepared: async (...args) => { entered(); await paused; return writeFile(...args) },
  })
  await writing
  const finalizing = finalize({ collectionName: 'finance', site })
  releaseWrite()
  await Promise.all([preparing, finalizing])
  assert.equal(JSON.parse(await readFile(path.join(site, 'finance-manifest.json'), 'utf8')).pages.length, 1)
  assert.match(await readFile(path.join(site, 'docs', 'finance', source), 'utf8'), /金融概念/)
})
