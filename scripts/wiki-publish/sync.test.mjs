import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('./sync.mjs', import.meta.url))

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function run(site, args = [], env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: site,
      env: { ...process.env, LLM_WIKI_PATH: '', ...env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code) => resolve({ code, stderr, stdout }))
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
