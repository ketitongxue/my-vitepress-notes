import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALLOWED_SECTIONS, sha256 } from './core.mjs'
import { parseFrontmatter } from './markdown.mjs'

const PAGE_FIELDS = new Set(['source', 'hash', 'publicPath', 'status', 'syncedAt'])
const HASH_PATTERN = /^[a-f0-9]{64}$/

async function exists(candidate) {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function markdownFiles(directory, relative = '') {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const childRelative = relative ? path.posix.join(relative, entry.name) : entry.name
    const child = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(child, childRelative))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(childRelative)
  }
  return files.sort()
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
  return [...markdown.matchAll(/!?(?<!\!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)]
    .filter((match) => match[0][0] !== '!')
    .map((match) => match[1].replace(/^<|>$/g, ''))
}

function linkTarget(source, href) {
  const clean = decodeURIComponent(href.split(/[?#]/, 1)[0])
  if (!clean || clean.startsWith('#') || /^(?:https?:|mailto:|tel:|\/\/)/i.test(clean)) return null
  if (clean === '/wiki' || clean === '/wiki/') return 'index.md'
  if (clean.startsWith('/wiki/')) {
    const target = clean.slice('/wiki/'.length).replace(/\/$/, '')
    return target.endsWith('.md') ? target : `${target}.md`
  }
  if (clean.startsWith('/')) return null
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), clean))
  return target.endsWith('.md') ? target : `${target}.md`
}

function containsAbsolutePath(markdown) {
  const withoutUrls = markdown.replace(
    /https?:\/\/[^\s<>)]+|(^|[\s(<])\/\/[^\s<>)]+/gim,
    (_url, protocolRelativePrefix) => protocolRelativePrefix || '',
  )
  const hasUnixAbsolutePath = [...withoutUrls.matchAll(/(?:^|[^\p{L}\p{N}_/])\/(?!\/)([^\s)\]}>]+)/gu)]
    .some((match) => {
      const candidate = `/${match[1]}`
      return candidate !== '/wiki' && !candidate.startsWith('/wiki/')
    })
  return hasUnixAbsolutePath
    || /(?:^|[^\p{L}\p{N}_])[A-Za-z]:[\\/]/u.test(withoutUrls)
}

function contentErrors(source, markdown, knownFiles) {
  const errors = []
  if (/(^|\n)\s*sources\s*:/i.test(markdown)) errors.push(`${source}: contains sources: metadata`)
  if (/(?:^|[\s\\/])raw[\\/]/i.test(markdown)) errors.push(`${source}: contains raw/ path`)
  if (containsAbsolutePath(markdown)) {
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
      target = linkTarget(source, href)
    } catch {
      errors.push(`${source}: broken link ${href}`)
      continue
    }
    if (target && target !== 'index.md' && !knownFiles.has(target)) {
      errors.push(`${source}: broken link ${href}`)
    }
  }
  return errors
}

export async function validatePublishedWiki({ docsRoot, manifest }) {
  const errors = []
  const warnings = []
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : []
  if (manifest?.version !== 1) errors.push('manifest: version must be 1')
  if (!Array.isArray(manifest?.pages)) errors.push('manifest: pages must be an array')

  const diskFiles = new Set()
  for (const section of ALLOWED_SECTIONS) {
    for (const file of await markdownFiles(path.join(docsRoot, section))) {
      diskFiles.add(path.posix.join(section, file))
    }
  }

  const manifestSources = new Set()
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
    if (page.publicPath !== `docs/wiki/${page.source}`) errors.push(`${label}: invalid publicPath`)
    if (page.status !== 'published') errors.push(`${label}: invalid status`)
    if (typeof page.syncedAt !== 'string' || !Number.isFinite(Date.parse(page.syncedAt))) errors.push(`${label}: invalid syncedAt`)
  }

  for (const source of diskFiles) {
    if (!manifestSources.has(source)) errors.push(`docs/wiki: extra file ${source}`)
  }
  for (const source of manifestSources) {
    if (!diskFiles.has(source)) {
      errors.push(`docs/wiki: missing file ${source}`)
      continue
    }
    const markdown = await readFile(path.join(docsRoot, ...source.split('/')), 'utf8')
    const page = pages.find((candidate) => candidate?.source === source)
    if (HASH_PATTERN.test(page.hash ?? '') && sha256(markdown) !== page.hash) errors.push(`${source}: hash does not match content`)
    errors.push(...contentErrors(source, markdown, diskFiles))
  }
  return { errors: errors.sort(), warnings: warnings.sort() }
}

async function main() {
  const site = process.cwd()
  const docsRoot = path.join(site, 'docs', 'wiki')
  const manifestPath = path.join(site, 'wiki-manifest.json')
  const [hasDocs, hasManifest] = await Promise.all([exists(docsRoot), exists(manifestPath)])
  if (!hasDocs && !hasManifest) {
    console.log('no published wiki yet')
    return
  }
  if (!hasDocs || !hasManifest) throw new Error('docs/wiki and wiki-manifest.json must either both exist or both be absent')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const result = await validatePublishedWiki({ docsRoot, manifest })
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
