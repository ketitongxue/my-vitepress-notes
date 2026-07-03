import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { diffInventory, scanWiki, sha256 } from './core.mjs'
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

async function copySnapshots(wiki, inventory, destination) {
  for (const [sourcePath, item] of Object.entries(inventory)) {
    const content = await readFile(path.join(wiki, ...sourcePath.split('/')), 'utf8')
    if (sha256(content) !== item.hash) {
      throw new Error(`Source changed while being copied: ${sourcePath}`)
    }
    // Parse every snapshot through the shared Markdown boundary before retaining it.
    parseFrontmatter(content)
    const target = path.join(destination, ...sourcePath.split('/'))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
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
  const previous = await previousInventory(workDirectory)
  const inventory = await scanWiki(wiki)
  const changes = diffInventory(previous, inventory)
  const report = {
    generatedAt: new Date().toISOString(),
    ...changes,
    inventory,
  }

  const temp = path.join(site, `.wiki-work.tmp-${randomUUID()}`)
  try {
    await mkdir(path.join(temp, 'source'), { recursive: true })
    await copySnapshots(wiki, inventory, path.join(temp, 'source'))
    await writeFile(path.join(temp, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    await replaceDirectory(temp, workDirectory)
  } catch (error) {
    await rm(temp, { recursive: true, force: true })
    throw error
  }
  return report
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
