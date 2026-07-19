import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { diffInventory, scanWikiSnapshot } from './core.mjs'
import { collectionConfig } from './collections.mjs'
import { parseFrontmatter } from './markdown.mjs'
import { requiredPublicationRoot } from './publication-root.mjs'

function wikiPath(argv, env, collection) {
  const usage = `Usage: npm run ${collection.name}:sync -- --wiki <path> (or set ${collection.envKey})`
  const index = argv.indexOf('--wiki')
  if (index !== -1) {
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(usage)
    return value
  }
  if (env[collection.envKey]) return env[collection.envKey]
  throw new Error(usage)
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

async function publishedInventory(site, collection) {
  let manifest
  try {
    manifest = JSON.parse(await readFile(path.join(site, collection.manifestFile), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
  if (!Array.isArray(manifest.pages)) {
    throw new Error(`${collection.manifestFile} must contain a pages array`)
  }

  const inventory = {}
  for (const page of [...manifest.pages].sort((left, right) =>
    String(left.source).localeCompare(String(right.source)),
  )) {
    if (typeof page.source !== 'string' || typeof page.hash !== 'string') {
      throw new Error(`${collection.manifestFile} pages require source and hash`)
    }
    if (Object.hasOwn(inventory, page.source)) {
      throw new Error(`${collection.manifestFile} contains duplicate source: ${page.source}`)
    }
    inventory[page.source] = {
      hash: page.hash,
      publicPath: page.publicPath,
    }
  }
  return inventory
}

async function copySnapshots(contents, destination) {
  for (const [sourcePath, content] of Object.entries(contents)) {
    // Parse every snapshot through the shared Markdown boundary before retaining it.
    parseFrontmatter(content)
    const target = path.join(destination, ...sourcePath.split('/'))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
}

async function readLockOwner(directory) {
  try {
    return JSON.parse(await readFile(path.join(directory, 'owner.json'), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null
    throw error
  }
}

function sameOwner(left, right) {
  return left?.pid === right?.pid && left?.token === right?.token
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error?.code === 'ESRCH') return false
    throw error
  }
}

async function reclaimStaleLock(lock, observedOwner) {
  if (!observedOwner) {
    let metadata
    try {
      metadata = await stat(lock)
    } catch (error) {
      if (error?.code === 'ENOENT') return true
      throw error
    }
    if (Date.now() - metadata.mtimeMs < 500) return false
  } else if (processIsAlive(observedOwner.pid)) {
    return false
  }

  const claim = `${lock}.claim-${randomUUID()}`
  try {
    await rename(lock, claim)
  } catch (error) {
    if (error?.code === 'ENOENT') return true
    throw error
  }

  const claimedOwner = await readLockOwner(claim)
  if (sameOwner(observedOwner, claimedOwner)) {
    await rm(claim, { recursive: true, force: true })
    return true
  }

  try {
    await rename(claim, lock)
  } catch (error) {
    if (!['EEXIST', 'ENOTEMPTY'].includes(error?.code)) throw error
    await rm(claim, { recursive: true, force: true })
  }
  return false
}

export async function acquireLock(site, collection = collectionConfig('wiki')) {
  const lock = path.join(site, collection.lockName)
  for (;;) {
    const token = randomUUID()
    const candidate = path.join(site, `${collection.lockName.replace(/\.lock$/, '')}.candidate-${token}`)
    try {
      await mkdir(candidate)
      await writeFile(
        path.join(candidate, 'owner.json'),
        JSON.stringify({ pid: process.pid, token }),
      )
      await rename(candidate, lock)
    } catch (error) {
      await rm(candidate, { recursive: true, force: true })
      if (!['EEXIST', 'ENOTEMPTY'].includes(error?.code)) throw error
      const observedOwner = await readLockOwner(lock)
      if (await reclaimStaleLock(lock, observedOwner)) continue
      await new Promise((resolve) => setTimeout(resolve, 25))
      continue
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
    if (!sameOwner(await readLockOwner(lock), { pid: process.pid, token })) continue
    return {
      assertOwned: async () => {
        if (!sameOwner(await readLockOwner(lock), { pid: process.pid, token })) {
          throw new Error(`${collection.name} sync lock ownership was lost`)
        }
      },
      release: async () => {
        if (sameOwner(await readLockOwner(lock), { pid: process.pid, token })) {
          await rm(lock, { recursive: true, force: true })
        }
      },
    }
  }
}

async function recoverWorkspace(site, target, collection = collectionConfig('wiki')) {
  const entries = await readdir(site)
  const backups = entries
    .filter((entry) => entry.startsWith(`${collection.workDirectory}.backup-`))
    .sort()
    .map((entry) => path.join(site, entry))
  if (!(await exists(target)) && backups.length > 1) {
    throw new Error(`Cannot recover ${collection.name} workspace: multiple orphaned backups`)
  }
  if (!(await exists(target)) && backups.length === 1) {
    await rename(backups[0], target)
    return
  }
  if (await exists(target)) {
    await Promise.all(backups.map((backup) => rm(backup, { recursive: true, force: true })))
  }
}

async function replaceDirectory(temp, target) {
  const backup = `${target}.backup-${randomUUID()}`
  const hadTarget = await exists(target)
  if (hadTarget) await rename(target, backup)
  try {
    await rename(temp, target)
  } catch (error) {
    if (hadTarget) await rename(backup, target)
    throw error
  }
  if (hadTarget) await rm(backup, { recursive: true, force: true })
}

export async function sync({ collectionName = 'wiki', argv = process.argv.slice(2), env = process.env, site = requiredPublicationRoot(env) } = {}) {
  const collectionFlags = argv.flatMap((value, index) => value === '--collection' ? [index] : [])
  if (collectionFlags.length > 1) throw new Error('Duplicate --collection value')
  if (collectionFlags.length === 1) {
    const index = collectionFlags[0]
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error('Missing --collection value')
    collectionName = value
    argv = [...argv.slice(0, index), ...argv.slice(index + 2)]
  }
  const collection = collectionConfig(collectionName)
  const wiki = wikiPath(argv, env, collection)
  const workDirectory = path.join(site, collection.workDirectory)
  const lock = await acquireLock(site, collection)
  try {
    await lock.assertOwned()
    await recoverWorkspace(site, workDirectory, collection)
    const previous = await publishedInventory(site, collection)
    const { contents, inventory } = await scanWikiSnapshot(wiki, { collection })
    const changes = diffInventory(previous, inventory)
    const publishedRoot = path.join(site, 'docs', collection.docsDirectory)
    const published = await exists(publishedRoot)
      ? await scanWikiSnapshot(publishedRoot, { collection })
      : { inventory: {} }
    const translationBaselines = Object.fromEntries(
      [...changes.added, ...changes.changed].map((source) => [
        source,
        published.inventory[source]?.hash ?? null,
      ]),
    )
    const report = {
      generatedAt: new Date().toISOString(),
      ...changes,
      inventory,
      translationBaselines,
    }

    const temp = path.join(site, `${collection.workDirectory}.tmp-${randomUUID()}`)
    try {
      await mkdir(path.join(temp, 'source'), { recursive: true })
      await copySnapshots(contents, path.join(temp, 'source'))
      const verified = await scanWikiSnapshot(wiki, { collection })
      if (JSON.stringify(verified.inventory) !== JSON.stringify(inventory)) {
        throw new Error(`${collection.name} changed while snapshots were being staged`)
      }
      await lock.assertOwned()
      await writeFile(path.join(temp, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
      await replaceDirectory(temp, workDirectory)
    } catch (error) {
      await rm(temp, { recursive: true, force: true })
      throw error
    }
    return report
  } finally {
    await lock.release()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await sync()
    console.log(`Sync: ${report.added.length} added, ${report.changed.length} changed, ${report.unchanged.length} unchanged, ${report.deleted.length} deleted`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
