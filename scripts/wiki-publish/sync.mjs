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
import { parseFrontmatter } from './markdown.mjs'

const USAGE = 'Usage: npm run wiki:sync -- --wiki <path> (or set LLM_WIKI_PATH)'

function wikiPath(argv, env) {
  const index = argv.indexOf('--wiki')
  if (index !== -1) {
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(USAGE)
    return value
  }
  if (env.LLM_WIKI_PATH) return env.LLM_WIKI_PATH
  throw new Error(USAGE)
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

async function previousInventory(workDirectory) {
  try {
    const report = JSON.parse(await readFile(path.join(workDirectory, 'report.json'), 'utf8'))
    return report.inventory && typeof report.inventory === 'object'
      ? report.inventory
      : {}
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return {}
    throw error
  }
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

async function acquireLock(site) {
  const lock = path.join(site, '.wiki-sync.lock')
  for (;;) {
    const token = randomUUID()
    const candidate = path.join(site, `.wiki-sync.candidate-${token}`)
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
          throw new Error('Wiki sync lock ownership was lost')
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

async function recoverWorkspace(site, target) {
  const entries = await readdir(site)
  const backups = entries
    .filter((entry) => entry.startsWith('.wiki-work.backup-'))
    .sort()
    .map((entry) => path.join(site, entry))
  if (!(await exists(target)) && backups.length > 1) {
    throw new Error('Cannot recover wiki workspace: multiple orphaned backups')
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

export async function sync({ argv = process.argv.slice(2), env = process.env, site = process.cwd() } = {}) {
  const wiki = wikiPath(argv, env)
  const workDirectory = path.join(site, '.wiki-work')
  const lock = await acquireLock(site)
  try {
    await lock.assertOwned()
    await recoverWorkspace(site, workDirectory)
    const previous = await previousInventory(workDirectory)
    const { contents, inventory } = await scanWikiSnapshot(wiki)
    const changes = diffInventory(previous, inventory)
    const report = {
      generatedAt: new Date().toISOString(),
      ...changes,
      inventory,
    }

    const temp = path.join(site, `.wiki-work.tmp-${randomUUID()}`)
    try {
      await mkdir(path.join(temp, 'source'), { recursive: true })
      await copySnapshots(contents, path.join(temp, 'source'))
      const verified = await scanWikiSnapshot(wiki)
      if (JSON.stringify(verified.inventory) !== JSON.stringify(inventory)) {
        throw new Error('Wiki changed while snapshots were being staged')
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
    console.log(`Wiki sync: ${report.added.length} added, ${report.changed.length} changed, ${report.unchanged.length} unchanged, ${report.deleted.length} deleted`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
