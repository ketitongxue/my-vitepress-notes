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
      env: { ...process.env, LLM_WIKI_PATH: '', ...env },
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

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'))
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
    'generatedAt', 'added', 'changed', 'unchanged', 'deleted', 'inventory',
  ])
  assert.match(firstReport.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(firstReport.added, ['concepts/a.md', 'entities/gone.md'])
  assert.deepEqual(firstReport.changed, [])
  assert.deepEqual(firstReport.unchanged, [])
  assert.deepEqual(firstReport.deleted, [])
  assert.equal(
    await readFile(path.join(site, '.wiki-work', 'source', 'concepts', 'a.md'), 'utf8'),
    '---\ntitle: A\n---\nA\n',
  )
  await assert.rejects(readFile(path.join(site, '.wiki-work', 'source', 'raw', 'secret.md')))
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'keep.md'), 'utf8'), 'published\n')
  assert.equal(JSON.stringify(firstReport).includes(wiki), false)
  assert.equal(JSON.stringify(firstReport).includes(site), false)

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
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'keep.md'), 'utf8'), 'published\n')
  assert.equal(await readFile(path.join(site, '.wiki-work', 'source', 'entities', 'new.md'), 'utf8'), 'new\n')
})

test('sync exits 1 with usage when no wiki path is configured', async (t) => {
  const site = await temporaryDirectory(t, 'sync-site-')
  const result = await run(site)
  assert.equal(result.code, 1)
  assert.match(result.stderr, /Usage:.*--wiki <path>.*LLM_WIKI_PATH/i)
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
  assert.equal(outputs.filter((output) => /1 added/.test(output)).length, 1)
  assert.equal(outputs.filter((output) => /1 unchanged/.test(output)).length, 1)
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
  assert.equal(outputs.filter((output) => /1 added/.test(output)).length, 1)
  assert.equal(outputs.filter((output) => /1 unchanged/.test(output)).length, 1)
})
