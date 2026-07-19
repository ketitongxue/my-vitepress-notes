import assert from 'node:assert/strict'
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { sync } from './sync.mjs'
import { sha256 } from './core.mjs'

const cli = fileURLToPath(new URL('./sync.mjs', import.meta.url))

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function run(site, args = [], env = {}, timeout = 10_000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: site,
      env: { ...process.env, LLM_WIKI_PATH: '', FINANCE_WIKI_PATH: '', PUBLICATION_ROOT: site, ...env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stderr, stdout })
    })
  })
}

async function exists(candidate) {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeManifest(site, entries) {
  await writeFile(path.join(site, 'wiki-manifest.json'), `${JSON.stringify({
    version: 1,
    pages: Object.entries(entries).map(([source, hash]) => ({
      source,
      hash,
      publicPath: `docs/wiki/${source}`,
      status: 'published',
      syncedAt: '2026-07-03T00:00:00.000Z',
    })),
  })}\n`)
}

test('sync writes relative change report and allowed source snapshots without touching docs', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(path.join(wiki, 'entities'), { recursive: true }),
    mkdir(path.join(wiki, 'raw'), { recursive: true }),
    mkdir(path.join(site, 'docs', 'wiki'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(path.join(wiki, 'concepts', 'a.md'), '---\ntitle: A\n---\nA\n'),
    writeFile(path.join(wiki, 'entities', 'gone.md'), 'gone\n'),
    writeFile(path.join(wiki, 'raw', 'secret.md'), 'secret\n'),
    writeFile(path.join(site, 'docs', 'wiki', 'keep.md'), 'published\n'),
  ])

  const first = await run(site, ['--wiki', wiki])
  assert.equal(first.code, 0, first.stderr)
  const reportPath = path.join(site, '.wiki-work', 'report.json')
  const firstReport = await json(reportPath)
  assert.deepEqual(Object.keys(firstReport), [
    'generatedAt', 'added', 'changed', 'unchanged', 'deleted', 'inventory', 'translationBaselines',
  ])
  assert.match(firstReport.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(firstReport.added, ['concepts/a.md', 'entities/gone.md'])
  assert.deepEqual(firstReport.changed, [])
  assert.deepEqual(firstReport.unchanged, [])
  assert.deepEqual(firstReport.deleted, [])
  assert.deepEqual(firstReport.translationBaselines, {
    'concepts/a.md': null,
    'entities/gone.md': null,
  })
  assert.equal(
    await readFile(path.join(site, '.wiki-work', 'source', 'concepts', 'a.md'), 'utf8'),
    '---\ntitle: A\n---\nA\n',
  )
  await assert.rejects(readFile(path.join(site, '.wiki-work', 'source', 'raw', 'secret.md')))
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'keep.md'), 'utf8'), 'published\n')
  assert.equal(JSON.stringify(firstReport).includes(wiki), false)
  assert.equal(JSON.stringify(firstReport).includes(site), false)

  await writeManifest(site, {
    'concepts/a.md': sha256('---\ntitle: A\n---\nA\n'),
    'entities/gone.md': sha256('gone\n'),
  })

  const previousChangedTranslation = '---\ntitle: 旧译文\n---\n这是原有中文译文，用于确认同步时会安全记录公开内容哈希作为翻译基线。\n'
  const staleAddedTranslation = '---\ntitle: 陈旧新增页\n---\n这是一个预先存在但尚未纳入清单的陈旧页面，需要人工更新或明确确认。\n'
  await Promise.all([
    mkdir(path.join(site, 'docs', 'wiki', 'concepts'), { recursive: true }),
    mkdir(path.join(site, 'docs', 'wiki', 'entities'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(path.join(site, 'docs', 'wiki', 'concepts', 'a.md'), previousChangedTranslation),
    writeFile(path.join(site, 'docs', 'wiki', 'entities', 'new.md'), staleAddedTranslation),
  ])

  await Promise.all([
    writeFile(path.join(wiki, 'concepts', 'a.md'), '---\ntitle: A\n---\nchanged\n'),
    rm(path.join(wiki, 'entities', 'gone.md')),
    writeFile(path.join(wiki, 'entities', 'new.md'), 'new\n'),
  ])
  const second = await run(site, [], { LLM_WIKI_PATH: wiki })
  assert.equal(second.code, 0, second.stderr)
  const secondReport = await json(reportPath)
  assert.deepEqual(secondReport.added, ['entities/new.md'])
  assert.deepEqual(secondReport.changed, ['concepts/a.md'])
  assert.deepEqual(secondReport.unchanged, [])
  assert.deepEqual(secondReport.deleted, ['entities/gone.md'])
  assert.deepEqual(secondReport.translationBaselines, {
    'entities/new.md': sha256(staleAddedTranslation),
    'concepts/a.md': sha256(previousChangedTranslation),
  })
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'keep.md'), 'utf8'), 'published\n')
  assert.equal(await readFile(path.join(site, '.wiki-work', 'source', 'entities', 'new.md'), 'utf8'), 'new\n')
})

test('finance sync isolates inventory, workspace, and source environment', async (t) => {
  const financeRoot = await temporaryDirectory(t, 'sync-finance-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await mkdir(path.join(financeRoot, 'concepts'), { recursive: true })
  await writeFile(path.join(financeRoot, 'concepts', 'a.md'), 'finance\n')

  const report = await sync({
    collectionName: 'finance',
    env: { FINANCE_WIKI_PATH: financeRoot },
    site,
  })

  assert.equal(report.inventory['concepts/a.md'].publicPath, 'docs/finance/concepts/a.md')
  assert.equal(await exists(path.join(site, '.finance-work', 'report.json')), true)
  assert.equal(await exists(path.join(site, '.wiki-work')), false)
})

test('finance and wiki sync use independent locks and recovery workspaces', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const finance = await temporaryDirectory(t, 'sync-finance-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(path.join(finance, 'concepts'), { recursive: true }),
    mkdir(path.join(site, '.wiki-work.backup-crash')),
    mkdir(path.join(site, '.finance-work.backup-crash')),
  ])
  await Promise.all([
    writeFile(path.join(wiki, 'concepts', 'a.md'), 'wiki\n'),
    writeFile(path.join(finance, 'concepts', 'a.md'), 'finance\n'),
    writeFile(path.join(site, '.wiki-work.backup-crash', 'old'), 'wiki'),
    writeFile(path.join(site, '.finance-work.backup-crash', 'old'), 'finance'),
  ])

  const [wikiResult, financeResult] = await Promise.all([
    sync({ env: { LLM_WIKI_PATH: wiki }, site }),
    sync({ collectionName: 'finance', env: { FINANCE_WIKI_PATH: finance }, site }),
  ])

  assert.equal(wikiResult.inventory['concepts/a.md'].publicPath, 'docs/wiki/concepts/a.md')
  assert.equal(financeResult.inventory['concepts/a.md'].publicPath, 'docs/finance/concepts/a.md')
  assert.equal(await readFile(path.join(site, '.wiki-work', 'source', 'concepts', 'a.md'), 'utf8'), 'wiki\n')
  assert.equal(await readFile(path.join(site, '.finance-work', 'source', 'concepts', 'a.md'), 'utf8'), 'finance\n')
})

test('sync CLI validates collection arguments before sync flags', async (t) => {
  const site = await temporaryDirectory(t, 'sync-site-')
  for (const args of [['--collection'], ['--collection', '--wiki'], ['--collection', 'wiki', '--collection', 'finance']]) {
    const result = await run(site, args)
    assert.equal(result.code, 1)
    assert.match(result.stderr, /collection/i)
  }
})

test('sync exits 1 with usage when no wiki path is configured', async (t) => {
  const site = await temporaryDirectory(t, 'sync-site-')
  const result = await run(site)
  assert.equal(result.code, 1)
  assert.match(result.stderr, /Usage:.*--wiki <path>.*LLM_WIKI_PATH/i)
})

test('sync CLI refuses to publish without PUBLICATION_ROOT', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  const result = await run(site, ['--wiki', wiki], { PUBLICATION_ROOT: '' })
  assert.equal(result.code, 1)
  assert.match(result.stderr, /PUBLICATION_ROOT is required/)
})

test('manifest is the published baseline when local report is absent', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await mkdir(path.join(wiki, 'concepts'), { recursive: true })
  await writeFile(path.join(wiki, 'concepts', 'a.md'), 'published\n')
  await writeManifest(site, { 'concepts/a.md': sha256('published\n') })

  const result = await run(site, ['--wiki', wiki])
  assert.equal(result.code, 0, result.stderr)
  const report = await json(path.join(site, '.wiki-work', 'report.json'))
  assert.deepEqual(report.added, [])
  assert.deepEqual(report.changed, [])
  assert.deepEqual(report.unchanged, ['concepts/a.md'])
})

test('stale local report cannot override manifest baseline', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(path.join(site, '.wiki-work'), { recursive: true }),
  ])
  await writeFile(path.join(wiki, 'concepts', 'a.md'), 'current\n')
  await writeManifest(site, { 'concepts/a.md': sha256('current\n') })
  await writeFile(path.join(site, '.wiki-work', 'report.json'), JSON.stringify({
    inventory: {
      'concepts/a.md': { hash: sha256('stale\n'), publicPath: 'docs/wiki/concepts/a.md' },
      'entities/stale.md': { hash: sha256('stale'), publicPath: 'docs/wiki/entities/stale.md' },
    },
  }))

  const result = await run(site, ['--wiki', wiki])
  assert.equal(result.code, 0, result.stderr)
  const report = await json(path.join(site, '.wiki-work', 'report.json'))
  assert.deepEqual(report.changed, [])
  assert.deepEqual(report.deleted, [])
  assert.deepEqual(report.unchanged, ['concepts/a.md'])
})

test('manifest classifies source changes and its absence classifies additions', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const changedSite = await temporaryDirectory(t, 'sync-site-')
  const newSite = await temporaryDirectory(t, 'sync-site-')
  await mkdir(path.join(wiki, 'concepts'), { recursive: true })
  await writeFile(path.join(wiki, 'concepts', 'a.md'), 'new\n')
  await writeManifest(changedSite, { 'concepts/a.md': sha256('old\n') })

  assert.equal((await run(changedSite, ['--wiki', wiki])).code, 0)
  assert.deepEqual(
    (await json(path.join(changedSite, '.wiki-work', 'report.json'))).changed,
    ['concepts/a.md'],
  )
  assert.equal((await run(newSite, ['--wiki', wiki])).code, 0)
  assert.deepEqual(
    (await json(path.join(newSite, '.wiki-work', 'report.json'))).added,
    ['concepts/a.md'],
  )
})

test('sync rejects an allowed-directory symlink swap before snapshot copying', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const outside = await temporaryDirectory(t, 'sync-outside-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await Promise.all([
    mkdir(path.join(wiki, 'comparisons'), { recursive: true }),
    mkdir(path.join(wiki, 'entities'), { recursive: true }),
    mkdir(path.join(outside, 'entities'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(path.join(wiki, 'comparisons', 'large.md'), Buffer.alloc(64 * 1024 * 1024, 97)),
    writeFile(path.join(wiki, 'entities', 'z.md'), 'same hash\n'),
    writeFile(path.join(outside, 'entities', 'z.md'), 'same hash\n'),
  ])

  const syncing = sync({ argv: ['--wiki', wiki], site })
  let staged = false
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const entries = await readdir(site)
    const temporary = entries.find((entry) => entry.startsWith('.wiki-work.tmp-'))
    if (temporary) {
      try {
        await access(path.join(site, temporary, 'source', 'comparisons', 'large.md'))
        staged = true
        break
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
  assert.equal(staged, true, 'snapshot staging was not observed')
  await rename(path.join(wiki, 'entities'), path.join(wiki, 'entities-inside'))
  await symlink(path.join(outside, 'entities'), path.join(wiki, 'entities'))

  await assert.rejects(syncing, /symbolic link|changed|outside/i)
})

test('sync rejects symlinks while reading public translation baselines', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const outside = await temporaryDirectory(t, 'sync-public-outside-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(path.join(outside, 'concepts'), { recursive: true }),
    mkdir(path.join(site, 'docs', 'wiki'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(path.join(wiki, 'concepts', 'a.md'), 'new source\n'),
    writeFile(path.join(outside, 'concepts', 'a.md'), 'outside translation\n'),
    writeManifest(site, { 'concepts/a.md': sha256('old source\n') }),
  ])
  await symlink(path.join(outside, 'concepts'), path.join(site, 'docs', 'wiki', 'concepts'))

  await assert.rejects(sync({ argv: ['--wiki', wiki], site }), /symbolic link/i)
  await assert.rejects(readFile(path.join(site, '.wiki-work', 'report.json')), /ENOENT/)
})

test('concurrent sync processes serialize against the same site', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  await mkdir(path.join(wiki, 'concepts'), { recursive: true })
  await writeFile(path.join(wiki, 'concepts', 'large.md'), Buffer.alloc(32 * 1024 * 1024, 98))

  const [first, second] = await Promise.all([
    run(site, ['--wiki', wiki]),
    run(site, ['--wiki', wiki]),
  ])
  assert.equal(first.code, 0, first.stderr)
  assert.equal(second.code, 0, second.stderr)
  const outputs = [first.stdout, second.stdout]
  assert.equal(outputs.filter((output) => /1 added/.test(output)).length, 2)
})

test('startup restores an orphaned backup and a failed sync preserves it', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  const backup = path.join(site, '.wiki-work.backup-crash')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(backup, { recursive: true }),
  ])
  const oldReport = '{"old":true}\n'
  await writeFile(path.join(backup, 'report.json'), oldReport)
  await symlink(path.join(site, 'missing.md'), path.join(wiki, 'concepts', 'bad.md'))

  const result = await run(site, ['--wiki', wiki])
  assert.equal(result.code, 1)
  assert.equal(await readFile(path.join(site, '.wiki-work', 'report.json'), 'utf8'), oldReport)
})

test('sync recovers an ownerless lock left by initialization crash', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  const lock = path.join(site, '.wiki-sync.lock')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(lock),
  ])
  await writeFile(path.join(wiki, 'concepts', 'a.md'), 'a\n')
  const old = new Date(Date.now() - 60_000)
  await utimes(lock, old, old)

  const result = await run(site, ['--wiki', wiki], {}, 2_000)
  assert.equal(result.code, 0, result.stderr)
  assert.match(result.stdout, /1 added/)
})

test('two stale-lock reclaimers do not delete a replacement lock', async (t) => {
  const wiki = await temporaryDirectory(t, 'sync-wiki-')
  const site = await temporaryDirectory(t, 'sync-site-')
  const lock = path.join(site, '.wiki-sync.lock')
  await Promise.all([
    mkdir(path.join(wiki, 'concepts'), { recursive: true }),
    mkdir(lock),
  ])
  await Promise.all([
    writeFile(path.join(wiki, 'concepts', 'large.md'), Buffer.alloc(32 * 1024 * 1024, 99)),
    writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: 999_999_999, token: 'stale' })),
  ])

  const [first, second] = await Promise.all([
    run(site, ['--wiki', wiki]),
    run(site, ['--wiki', wiki]),
  ])
  assert.equal(first.code, 0, first.stderr)
  assert.equal(second.code, 0, second.stderr)
  const outputs = [first.stdout, second.stdout]
  assert.equal(outputs.filter((output) => /1 added/.test(output)).length, 2)
})
