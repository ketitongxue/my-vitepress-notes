import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectionConfig } from './collections.mjs'
import { scanWikiSnapshot } from './core.mjs'
import { containsPrivateData, convertWikilinks, parseFrontmatter, serializePublicFrontmatter, stripProvenance } from './markdown.mjs'

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
  return known
}

export async function prepareMirror({ collectionName, site = process.cwd() }) {
  const collection = collectionConfig(collectionName)
  if (collection.mode !== 'mirror') throw new Error(`${collection.name} is not a mirror collection`)
  const workRoot = path.join(site, collection.workDirectory)
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
  for (const [source, markdown] of prepared) {
    const target = path.join(site, 'docs', collection.docsDirectory, ...source.split('/'))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, markdown)
  }
  return { prepared: prepared.size }
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
