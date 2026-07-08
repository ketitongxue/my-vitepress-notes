import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

import { ALLOWED_SECTIONS, scanWikiSnapshot } from './core.mjs'
import { collectionConfig } from './collections.mjs'
import { parseFrontmatter } from './markdown.mjs'

const PAGE_FIELDS = new Set(['source', 'hash', 'publicPath', 'status', 'syncedAt'])
const HASH_PATTERN = /^[a-f0-9]{64}$/
const markdownParser = new MarkdownIt({ html: false })

async function exists(candidate) {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function validSource(source) {
  if (typeof source !== 'string' || source.includes('\\') || path.posix.isAbsolute(source) || path.win32.isAbsolute(source)) return false
  const normalized = path.posix.normalize(source)
  const [section] = normalized.split('/')
  return normalized === source
    && ALLOWED_SECTIONS.includes(section)
    && normalized !== section
    && normalized.endsWith('.md')
    && !normalized.startsWith('../')
}

function withoutCodeBlocks(markdown) {
  return markdown
    .replace(/```[^\n]*\n[\s\S]*?```/g, '')
    .replace(/~~~[^\n]*\n[\s\S]*?~~~/g, '')
}

function internalLinks(markdown) {
  const links = []
  const visit = (tokens) => {
    for (const token of tokens) {
      if (token.type === 'link_open') links.push(token.attrGet('href'))
      if (token.children) visit(token.children)
    }
  }
  visit(markdownParser.parse(markdown, {}))
  return links
}

function linkTarget(source, href, collection) {
  if (!href || href.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return null
  const clean = decodeURIComponent(href.split(/[?#]/, 1)[0])
  if (!clean) return null
  if (clean.split('/').includes('..')) throw new Error('traversal')
  if (clean === collection.urlPrefix || clean === `${collection.urlPrefix}/`) return 'index.md'
  if (clean.startsWith(`${collection.urlPrefix}/`)) {
    const target = clean.slice(`${collection.urlPrefix}/`.length).replace(/\/$/, '')
    return target.endsWith('.md') ? target : `${target}.md`
  }
  if (clean.startsWith('/')) throw new Error('outside wiki')
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), clean))
  if (target === '..' || target.startsWith('../')) throw new Error('traversal')
  return target.endsWith('.md') ? target : `${target}.md`
}

function containsAbsolutePath(markdown, collection) {
  const withoutUrls = markdown.replace(
    /https?:\/\/[^\s<>)]+|(^|[\s(<])\/\/[^\s<>)]+/gim,
    (_url, protocolRelativePrefix) => protocolRelativePrefix || '',
  )
  const hasUnixAbsolutePath = [...withoutUrls.matchAll(/(?:^|[^\p{L}\p{N}_/])\/(?!\/)([^\s)\]}>]+)/gu)]
    .some((match) => {
      const candidate = `/${match[1]}`
      return candidate !== collection.urlPrefix && !candidate.startsWith(`${collection.urlPrefix}/`)
    })
  return hasUnixAbsolutePath
    || /(?:^|[^\p{L}\p{N}_])[A-Za-z]:[\\/]/u.test(withoutUrls)
}

function contentErrors(source, markdown, knownFiles, collection) {
  const errors = []
  if (/(^|\n)\s*sources\s*:/i.test(markdown)) errors.push(`${source}: contains sources: metadata`)
  if (/(?:^|[\s\\/])raw[\\/]/i.test(markdown)) errors.push(`${source}: contains raw/ path`)
  if (containsAbsolutePath(markdown, collection)) {
    errors.push(`${source}: contains an absolute path`)
  }
  if (markdown.includes('[[')) errors.push(`${source}: contains a residual wikilink`)

  const body = withoutCodeBlocks(parseFrontmatter(markdown).body)
  const han = body.match(/\p{Script=Han}/gu)?.length ?? 0
  const nonWhitespace = body.match(/\S/gu)?.length ?? 0
  if (han < 20 || nonWhitespace === 0 || han / nonWhitespace < 0.1) {
    errors.push(`${source}: insufficient Chinese content`)
  }

  for (const href of internalLinks(body)) {
    let target
    try {
      target = linkTarget(source, href, collection)
    } catch (error) {
      const kind = error?.message === 'traversal' ? 'link traversal' : 'broken link'
      errors.push(`${source}: ${kind} ${href}`)
      continue
    }
    if (target && target !== 'index.md' && !knownFiles.has(target)) {
      errors.push(`${source}: broken link ${href}`)
    }
  }
  return errors
}

export async function validatePublishedWiki({ docsRoot, manifest, collection = collectionConfig('wiki') }) {
  const errors = []
  const warnings = []
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : []
  if (manifest?.version !== 1) errors.push('manifest: version must be 1')
  if (!Array.isArray(manifest?.pages)) errors.push('manifest: pages must be an array')

  const snapshot = await scanWikiSnapshot(docsRoot)
  const diskFiles = new Set(Object.keys(snapshot.inventory))

  const manifestSources = new Set()
  const manifestPublicPaths = new Set()
  for (const [index, page] of pages.entries()) {
    const label = `manifest.pages[${index}]`
    if (!page || typeof page !== 'object' || Array.isArray(page)) {
      errors.push(`${label}: must be an object`)
      continue
    }
    for (const field of Object.keys(page)) {
      if (!PAGE_FIELDS.has(field)) errors.push(`${label}: unexpected field ${field}`)
    }
    if (!validSource(page.source)) errors.push(`${label}: invalid source`)
    else {
      if (manifestSources.has(page.source)) errors.push(`${label}: duplicate source ${page.source}`)
      manifestSources.add(page.source)
    }
    if (!HASH_PATTERN.test(page.hash ?? '')) errors.push(`${label}: invalid hash`)
    if (typeof page.publicPath === 'string') {
      if (manifestPublicPaths.has(page.publicPath)) errors.push(`${label}: duplicate publicPath ${page.publicPath}`)
      manifestPublicPaths.add(page.publicPath)
    }
    if (page.publicPath !== `docs/${collection.docsDirectory}/${page.source}`) errors.push(`${label}: invalid publicPath`)
    if (page.status !== 'published') errors.push(`${label}: invalid status`)
    if (typeof page.syncedAt !== 'string' || !Number.isFinite(Date.parse(page.syncedAt))) errors.push(`${label}: invalid syncedAt`)
  }

  for (const source of diskFiles) {
    if (!manifestSources.has(source)) errors.push(`docs/${collection.docsDirectory}: extra file ${source}`)
  }
  for (const source of manifestSources) {
    if (!diskFiles.has(source)) {
      errors.push(`docs/${collection.docsDirectory}: missing file ${source}`)
      continue
    }
    const markdown = snapshot.contents[source]
    errors.push(...contentErrors(source, markdown, diskFiles, collection))
  }
  return { errors: errors.sort(), warnings: warnings.sort() }
}

async function main() {
  const site = process.cwd()
  const argv = process.argv.slice(2)
  const indexes = argv.flatMap((value, index) => value === '--collection' ? [index] : [])
  if (indexes.length > 1) throw new Error('Duplicate --collection value')
  if (indexes.length && (!argv[indexes[0] + 1] || argv[indexes[0] + 1].startsWith('--'))) throw new Error('Missing --collection value')
  if ((indexes.length && argv.length !== 2) || (!indexes.length && argv.length)) throw new Error('Unexpected validation arguments')
  const collection = collectionConfig(indexes.length ? argv[indexes[0] + 1] : 'wiki')
  const docsRoot = path.join(site, 'docs', collection.docsDirectory)
  const manifestPath = path.join(site, collection.manifestFile)
  const [hasDocs, hasManifest] = await Promise.all([exists(docsRoot), exists(manifestPath)])
  if (!hasDocs && !hasManifest) {
    console.log('no published wiki yet')
    return
  }
  if (!hasDocs || !hasManifest) throw new Error(`docs/${collection.docsDirectory} and ${collection.manifestFile} must either both exist or both be absent`)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const result = await validatePublishedWiki({ docsRoot, manifest, collection })
  if (result.errors.length) {
    for (const error of result.errors) console.error(error)
    process.exitCode = 1
    return
  }
  console.log(`${manifest.pages.length} published pages`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
