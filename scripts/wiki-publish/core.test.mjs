import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  ALLOWED_SECTIONS,
  diffInventory,
  publicPath,
  scanWiki,
  sha256,
} from './core.mjs'

async function temporaryWiki(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'wiki-publish-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await Promise.all(
    ['entities', 'concepts/nested', 'comparisons', 'raw', 'queries'].map((section) =>
      mkdir(path.join(root, section), { recursive: true }),
    ),
  )
  return root
}

test('scanWiki inventories markdown only from public sections with POSIX paths', async (t) => {
  const root = await temporaryWiki(t)
  await Promise.all([
    writeFile(path.join(root, 'entities', 'z.md'), 'entity'),
    writeFile(path.join(root, 'concepts', 'nested', 'a.md'), 'concept'),
    writeFile(path.join(root, 'comparisons', 'b.md'), 'comparison'),
    writeFile(path.join(root, 'concepts', 'ignore.txt'), 'not markdown'),
    writeFile(path.join(root, 'raw', 'secret.md'), 'raw'),
    writeFile(path.join(root, 'queries', 'private.md'), 'query'),
  ])

  const inventory = await scanWiki(root)

  assert.deepEqual(ALLOWED_SECTIONS, ['comparisons', 'concepts', 'entities'])
  assert.deepEqual(Object.keys(inventory), [
    'comparisons/b.md',
    'concepts/nested/a.md',
    'entities/z.md',
  ])
  assert.deepEqual(inventory['concepts/nested/a.md'], {
    hash: sha256('concept'),
    publicPath: 'docs/wiki/concepts/nested/a.md',
  })
  assert.ok(Object.keys(inventory).every((name) => !name.includes('\\')))
})

test('sha256 is stable and content-sensitive', () => {
  assert.equal(
    sha256('hello'),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  )
  assert.equal(sha256('hello'), sha256('hello'))
  assert.notEqual(sha256('hello'), sha256('Hello'))
})

test('publicPath maps allowed source paths and rejects paths outside them', () => {
  assert.equal(publicPath('concepts/a.md'), 'docs/wiki/concepts/a.md')
  assert.throws(() => publicPath('raw/a.md'), /allowed/i)
  assert.throws(() => publicPath('../concepts/a.md'), /allowed/i)
  assert.throws(() => publicPath('/concepts/a.md'), /relative/i)
})

test('scanWiki rejects symlinks in allowed directories', async (t) => {
  const root = await temporaryWiki(t)
  const target = path.join(root, 'outside.md')
  await writeFile(target, 'outside')
  await symlink(target, path.join(root, 'concepts', 'linked.md'))

  await assert.rejects(scanWiki(root), /symbolic link/i)
})

test('scanWiki rejects a symlinked directory', async (t) => {
  const root = await temporaryWiki(t)
  const outside = await mkdtemp(path.join(tmpdir(), 'wiki-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(path.join(outside, 'secret.md'), 'secret')
  await symlink(outside, path.join(root, 'entities', 'linked-directory'))

  await assert.rejects(scanWiki(root), /symbolic link/i)
})

test('scanWiki rejects a symlinked wiki root', async (t) => {
  const root = await temporaryWiki(t)
  const linkedRoot = `${root}-link`
  t.after(() => rm(linkedRoot, { recursive: true, force: true }))
  await writeFile(path.join(root, 'concepts', 'a.md'), 'concept')
  await symlink(root, linkedRoot)

  await assert.rejects(scanWiki(linkedRoot), /symbolic link/i)
})

test('scanWiki never reads a file replaced by an outside symlink', async (t) => {
  const root = await temporaryWiki(t)
  const outside = path.join(root, 'outside.md')
  const victim = path.join(root, 'concepts', 'z.md')
  await Promise.all([
    writeFile(path.join(root, 'concepts', 'a.md'), Buffer.alloc(32 * 1024 * 1024)),
    writeFile(outside, 'outside secret'),
    writeFile(victim, 'safe'),
  ])

  const scanning = scanWiki(root)
  await new Promise((resolve) => setTimeout(resolve, 2))
  await unlink(victim)
  await symlink(outside, victim)

  try {
    const inventory = await scanning
    assert.notEqual(inventory['concepts/z.md']?.hash, sha256('outside secret'))
  } catch (error) {
    assert.match(error.message, /symbolic link|changed|outside/i)
  }
})

test('scanWiki never adopts an outside section during ancestor replacement', async (t) => {
  const root = await temporaryWiki(t)
  const section = path.join(root, 'concepts')
  const parked = path.join(root, 'concepts-inside')
  const outside = await mkdtemp(path.join(tmpdir(), 'wiki-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(path.join(section, 'safe.md'), 'safe')
  await writeFile(path.join(outside, 'secret.md'), 'outside secret')

  let replacing = true
  const replacement = (async () => {
    while (replacing) {
      try {
        await rename(section, parked)
        await symlink(outside, section)
        await new Promise((resolve) => setImmediate(resolve))
        await unlink(section)
        await rename(parked, section)
        await new Promise((resolve) => setImmediate(resolve))
      } catch (error) {
        if (!['ENOENT', 'EEXIST'].includes(error?.code)) throw error
      }
    }
  })()

  let acceptedOutside = false
  try {
    for (let attempt = 0; attempt < 500 && !acceptedOutside; attempt += 1) {
      try {
        const inventory = await scanWiki(root)
        acceptedOutside = 'concepts/secret.md' in inventory
      } catch (error) {
        assert.match(
          error.message,
          /symbolic link|changed|outside|no such file|not a directory/i,
        )
      }
    }
  } finally {
    replacing = false
    await replacement
  }

  assert.equal(acceptedOutside, false)
})

test('diffInventory sorts added, changed, unchanged, and deleted paths', () => {
  const previous = {
    'concepts/a.md': { hash: 'old' },
    'entities/gone.md': { hash: 'x' },
  }
  const current = {
    'concepts/a.md': { hash: 'new' },
    'concepts/b.md': { hash: 'b' },
  }

  assert.deepEqual(diffInventory(previous, current), {
    added: ['concepts/b.md'],
    changed: ['concepts/a.md'],
    unchanged: [],
    deleted: ['entities/gone.md'],
  })
})

test('diffInventory returns deterministic sorted arrays', () => {
  const previous = {
    'entities/z.md': { hash: 'same' },
    'concepts/c.md': { hash: 'old' },
    'comparisons/a.md': { hash: 'gone' },
  }
  const current = {
    'entities/z.md': { hash: 'same' },
    'concepts/b.md': { hash: 'new' },
    'concepts/c.md': { hash: 'changed' },
    'concepts/a.md': { hash: 'new' },
  }

  assert.deepEqual(diffInventory(previous, current), {
    added: ['concepts/a.md', 'concepts/b.md'],
    changed: ['concepts/c.md'],
    unchanged: ['entities/z.md'],
    deleted: ['comparisons/a.md'],
  })
})
