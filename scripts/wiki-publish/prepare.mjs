import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectionConfig } from './collections.mjs'
import { scanWikiSnapshot } from './core.mjs'
import { containsPrivateData, convertWikilinks, parseFrontmatter, serializePublicFrontmatter, stripProvenance } from './markdown.mjs'
import { requiredPublicationRoot } from './publication-root.mjs'
import { acquireLock } from './sync.mjs'

async function exists(candidate) {
  try { await access(candidate); return true } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function prepareTransactionPaths(site, collection, token) {
  const target = path.join(site, collection.workDirectory, 'prepared')
  return {
    target,
    candidate: path.join(site, `${collection.workDirectory}.prepared-candidate-${token}`),
    backup: `${target}.backup-${token}`,
  }
}

export async function recoverPrepared(site, collection) {
  const [siteEntries, workEntries] = await Promise.all([
    readdir(site),
    readdir(path.join(site, collection.workDirectory)),
  ])
  const candidatePrefix = `${collection.workDirectory}.prepared-candidate-`
  const backupPrefix = 'prepared.backup-'
  const tokens = new Set([
    ...siteEntries.filter((entry) => entry.startsWith(candidatePrefix)).map((entry) => entry.slice(candidatePrefix.length)),
    ...workEntries.filter((entry) => entry.startsWith(backupPrefix)).map((entry) => entry.slice(backupPrefix.length)),
  ])
  if (tokens.size > 1) throw new Error(`Cannot recover ${collection.name} prepared batch: multiple transactions`)
  if (!tokens.size) return
  const [token] = tokens
  const { target, candidate, backup } = prepareTransactionPaths(site, collection, token)
  const [hasTarget, hasBackup] = await Promise.all([exists(target), exists(backup)])
  if (!hasTarget && hasBackup) await rename(backup, target)
  else if (hasBackup) await rm(backup, { recursive: true, force: true })
  await rm(candidate, { recursive: true, force: true })
}

async function replacePrepared(candidate, target, backup) {
  const hadTarget = await exists(target)
  if (hadTarget) await rename(target, backup)
  try {
    await rename(candidate, target)
  } catch (error) {
    if (hadTarget) await rename(backup, target)
    throw error
  }
  if (hadTarget) await rm(backup, { recursive: true, force: true })
}

function knownTargets(inventory, collection) {
  const known = new Map()
  const aliases = new Map()
  for (const source of Object.keys(inventory)) {
    const target = source.replace(/\.md$/, '')
    const slug = path.posix.basename(target)
    const url = `${collection.urlPrefix}/${target}`
    known.set(target, url)
    aliases.set(slug, aliases.has(slug) && aliases.get(slug) !== url ? null : url)
  }
  for (const [slug, url] of aliases) if (url) known.set(slug, url)
  if (collection.name === 'finance' && known.has('ai-quant-agent-workflow')) {
    known.set('ai-agent-system', known.get('ai-quant-agent-workflow'))
  }
  return known
}

export async function prepareMirror({ collectionName, site = requiredPublicationRoot(), writePrepared = writeFile }) {
  const collection = collectionConfig(collectionName)
  if (collection.mode !== 'mirror') throw new Error(`${collection.name} is not a mirror collection`)
  const lock = await acquireLock(site, collection)
  const workRoot = path.join(site, collection.workDirectory)
  const token = randomUUID()
  const { target, candidate, backup } = prepareTransactionPaths(site, collection, token)
  try {
    await lock.assertOwned()
    await recoverPrepared(site, collection)
    const report = JSON.parse(await readFile(path.join(workRoot, 'report.json'), 'utf8'))
    const snapshot = await scanWikiSnapshot(path.join(workRoot, 'source'), { collection })
    const known = knownTargets(snapshot.inventory, collection)
    const prepared = new Map()
    for (const source of [...report.added, ...report.changed]) {
      const raw = snapshot.contents[source]
      if (raw === undefined) throw new Error(`${source}: missing source snapshot`)
      const { frontmatter, body } = parseFrontmatter(raw)
      const converted = convertWikilinks(stripProvenance(body), known)
      if (converted.warnings.length) throw new Error(`${source}: unresolved wikilink: ${converted.warnings.join(', ')}`)
      const markdown = `${serializePublicFrontmatter(frontmatter)}${converted.markdown}`
      if (containsPrivateData(markdown, collection)) throw new Error(`${source}: sanitized page still contains private data`)
      prepared.set(source, markdown)
    }
    await mkdir(candidate)
    for (const [source, markdown] of prepared) {
      const output = path.join(candidate, ...source.split('/'))
      await mkdir(path.dirname(output), { recursive: true })
      await writePrepared(output, markdown)
    }
    await lock.assertOwned()
    await replacePrepared(candidate, target, backup)
    return { prepared: prepared.size }
  } finally {
    await rm(candidate, { recursive: true, force: true })
    await lock.release()
  }
}

function collectionArgument(argv) {
  const index = argv.indexOf('--collection')
  if (index < 0 || !argv[index + 1]) throw new Error('Usage: prepare.mjs --collection <name>')
  if (argv.length !== 2) throw new Error('Unexpected prepare arguments')
  return argv[index + 1]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prepareMirror({ collectionName: collectionArgument(process.argv.slice(2)) })
    .then(({ prepared }) => console.log(`${prepared} prepared pages`))
    .catch((error) => { console.error(error.message); process.exitCode = 1 })
}
