import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseFrontmatter } from './markdown.mjs'
import { publicPath, scanWikiSnapshot } from './core.mjs'
import { collectionConfig } from './collections.mjs'
import { acquireLock } from './sync.mjs'
import { validatePublishedWiki } from './validate.mjs'

const SECTIONS = [
  ['entities', '实体'],
  ['concepts', '概念'],
  ['comparisons', '对比分析'],
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function exists(candidate) {
  try { await access(candidate); return true } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function confirmations(argv, collection) {
  const result = { deletions: [], translations: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const kind = argv[index] === '--confirm-delete'
      ? 'deletions'
      : argv[index] === '--confirm-translation'
        ? (collection.mode === 'curated' ? 'translations' : null)
        : null
    if (!kind) throw new Error(`Unknown finalize argument: ${argv[index]}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${argv[index]} requires a source`)
    assertCanonicalSource(value, collection)
    if (result[kind].includes(value)) throw new Error(`Duplicate ${kind === 'deletions' ? 'deletion' : 'translation'} confirmation: ${value}`)
    result[kind].push(value)
    index += 1
  }
  return result
}

function assertCanonicalSource(source, collection) {
  const segments = typeof source === 'string' ? source.split('/') : []
  const canonical = typeof source === 'string'
    && source.length > 0
    && source.endsWith('.md')
    && !source.includes('\\')
    && !source.includes('%')
    && !source.includes('\0')
    && segments.every((segment) => segment && segment !== '.' && segment !== '..')
    && path.posix.normalize(source) === source
  if (!canonical) throw new Error(`Invalid report source: ${JSON.stringify(source)}`)
  try {
    if (publicPath(source, collection) !== `docs/${collection.docsDirectory}/${source}`) throw new Error('not canonical')
  } catch {
    throw new Error(`Invalid report source: ${JSON.stringify(source)}`)
  }
}

function verifyReport(report, collection) {
  for (const field of ['added', 'changed', 'unchanged', 'deleted']) {
    if (!Array.isArray(report[field])) throw new Error(`Invalid report: ${field} must be an array`)
    for (const source of report[field]) assertCanonicalSource(source, collection)
  }
  if (!report.inventory || typeof report.inventory !== 'object' || Array.isArray(report.inventory)) {
    throw new Error('Invalid report: inventory must be an object')
  }
  for (const source of Object.keys(report.inventory)) assertCanonicalSource(source, collection)
  const affected = [...report.added, ...report.changed]
  if (affected.length && (!report.translationBaselines || typeof report.translationBaselines !== 'object' || Array.isArray(report.translationBaselines))) {
    throw new Error('Invalid report: added/changed sources require translationBaselines')
  }
  if (report.translationBaselines !== undefined) {
    for (const [source, baseline] of Object.entries(report.translationBaselines)) {
      assertCanonicalSource(source, collection)
      if (!affected.includes(source)) throw new Error(`Invalid report: extra translation baseline ${source}`)
      if (baseline !== null && !/^[a-f0-9]{64}$/.test(baseline)) {
        throw new Error(`Invalid report: bad translation baseline ${source}`)
      }
    }
  }
  for (const source of affected) {
    if (!Object.hasOwn(report.translationBaselines, source)) {
      throw new Error(`Invalid report: missing translation baseline ${source}`)
    }
  }
}

export async function indexMarkdown(docsRoot, pages, date, collection) {
  const grouped = new Map(SECTIONS.map(([section]) => [section, []]))
  const pageBySource = new Map()
  for (const page of pages) {
    const markdown = await readFile(path.join(docsRoot, ...page.source.split('/')), 'utf8')
    const title = parseFrontmatter(markdown).frontmatter.title
    if (typeof title !== 'string' || !title.trim()) throw new Error(`${page.source}: missing title`)
    const [section] = page.source.split('/')
    const item = { source: page.source, title: title.trim() }
    grouped.get(section).push(item)
    pageBySource.set(page.source, item)
  }
  const featured = collection.featuredSources
    .map((source) => pageBySource.get(source))
    .filter(Boolean)
  const description = escapeHtml(collection.description)
  const pageCount = escapeHtml(pages.length)
  const syncedDate = escapeHtml(date)
  const lines = [
    '---', `title: ${collection.title}`, `description: ${collection.description}`, '---', '',
    `# ${collection.title}`, '',
    '<div class="knowledge-hub">',
    `  <p class="knowledge-hub__intro">${description}</p>`,
    '  <div class="knowledge-hub__stats" aria-label="知识库统计">',
    `    <span>页面总数：<strong>${pageCount}</strong></span>`,
    `    <span>最近同步日期：<strong>${syncedDate}</strong></span>`,
    '  </div>',
    '  <div class="knowledge-hub__featured" aria-label="精选条目">',
    '    <strong>精选条目</strong>',
    ...featured.map((item) => `    <a href="${escapeHtml(`${collection.urlPrefix}/${item.source.replace(/\.md$/, '')}`)}">${escapeHtml(item.title)}</a>`),
    '  </div>',
    '  <div class="knowledge-hub__sections" aria-label="分类概览">',
    ...SECTIONS.map(([section, heading]) => `    <div><a href="#${escapeHtml(heading)}">${escapeHtml(heading)}</a><strong>${escapeHtml(grouped.get(section).length)}</strong></div>`),
    '  </div>',
    '</div>', '',
    '<details class="knowledge-hub__all">',
    `<summary>全部条目（${pageCount}）</summary>`, '',
  ]
  for (const [section, heading] of SECTIONS) {
    lines.push(`## ${heading}`, '')
    for (const item of grouped.get(section)) {
      lines.push(`- [${item.title}](${collection.urlPrefix}/${item.source.replace(/\.md$/, '')})`)
    }
    lines.push('')
  }
  lines.push('</details>', '')
  return `${lines.join('\n').trimEnd()}\n`
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

async function stageVerifiedSnapshot(snapshot, destination, deleted) {
  await mkdir(destination)
  for (const [source, markdown] of Object.entries(snapshot.contents)) {
    if (deleted.has(source)) continue
    const target = path.join(destination, ...source.split('/'))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, markdown)
  }
}

async function replacePublication({ site, stagedWiki, stagedManifest, collection, renameFile = rename }) {
  const token = randomUUID()
  const wiki = path.join(site, 'docs', collection.docsDirectory)
  const manifest = path.join(site, collection.manifestFile)
  const wikiBackup = path.join(site, `${collection.publishPrefix}.backup-wiki-${token}`)
  const manifestBackup = path.join(site, `${collection.publishPrefix}.backup-manifest-${token}`)
  const hadWiki = await exists(wiki)
  const hadManifest = await exists(manifest)
  if (hadWiki !== hadManifest) throw new Error(`docs/${collection.docsDirectory} and ${collection.manifestFile} must both exist or both be absent`)
  const transactionKind = hadWiki ? 'existing' : 'initial'
  const preparedMarker = path.join(site, `${collection.publishPrefix}.transaction-prepared-${transactionKind}-${token}`)
  const installedMarker = path.join(site, `${collection.publishPrefix}.transaction-installed-${token}`)
  await mkdir(path.dirname(wiki), { recursive: true })
  await writeFile(preparedMarker, '')
  if (hadWiki) await renameFile(wiki, wikiBackup)
  try {
    if (hadManifest) await renameFile(manifest, manifestBackup)
    try {
      await renameFile(stagedWiki, wiki)
      await renameFile(stagedManifest, manifest)
      await renameFile(preparedMarker, installedMarker)
    } catch (error) {
      await rm(wiki, { recursive: true, force: true })
      if (await exists(manifestBackup)) await renameFile(manifestBackup, manifest)
      if (hadWiki && await exists(wikiBackup)) await renameFile(wikiBackup, wiki)
      else await rm(wikiBackup, { recursive: true, force: true })
      throw error
    }
    await Promise.all([rm(wikiBackup, { recursive: true, force: true }), rm(manifestBackup, { force: true })])
    await rm(installedMarker, { force: true })
  } catch (error) {
    if (hadWiki && !(await exists(wiki)) && await exists(wikiBackup)) await renameFile(wikiBackup, wiki)
    throw error
  }
}

export async function recoverPublication(site, collection) {
  const entries = await readdir(site)
  const tokens = new Set(entries.flatMap((entry) => {
    const escaped = collection.publishPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const backup = new RegExp(`^${escaped}\\.backup-(?:wiki|manifest)-(.+)$`).exec(entry)
    if (backup) return [backup[1]]
    const prepared = new RegExp(`^${escaped}\\.transaction-prepared-(?:initial|existing)-(.+)$`).exec(entry)
    if (prepared) return [prepared[1]]
    const installed = new RegExp(`^${escaped}\\.transaction-installed-(.+)$`).exec(entry)
    return installed ? [installed[1]] : []
  }))
  if (tokens.size > 1) throw new Error('Cannot recover publication: multiple backup transactions')
  if (!tokens.size) return
  const [token] = tokens
  const wiki = path.join(site, 'docs', collection.docsDirectory)
  const manifest = path.join(site, collection.manifestFile)
  const wikiBackup = path.join(site, `${collection.publishPrefix}.backup-wiki-${token}`)
  const manifestBackup = path.join(site, `${collection.publishPrefix}.backup-manifest-${token}`)
  const initialMarker = path.join(site, `${collection.publishPrefix}.transaction-prepared-initial-${token}`)
  const existingMarker = path.join(site, `${collection.publishPrefix}.transaction-prepared-existing-${token}`)
  const installedMarker = path.join(site, `${collection.publishPrefix}.transaction-installed-${token}`)
  const [hasWiki, hasManifest, hasWikiBackup, hasManifestBackup, hasInitialMarker, hasExistingMarker, hasInstalledMarker] = await Promise.all(
    [wiki, manifest, wikiBackup, manifestBackup, initialMarker, existingMarker, installedMarker].map(exists),
  )
  const markerCount = [hasInitialMarker, hasExistingMarker, hasInstalledMarker].filter(Boolean).length
  if (markerCount > 1) throw new Error('Cannot recover publication: conflicting transaction markers')
  if (hasInstalledMarker) {
    if (!hasWiki || !hasManifest) throw new Error('Cannot recover publication: installed transaction is incomplete')
    await Promise.all([
      rm(wikiBackup, { recursive: true, force: true }),
      rm(manifestBackup, { force: true }),
      rm(installedMarker, { force: true }),
    ])
    return
  }
  if (hasInitialMarker || hasExistingMarker) {
    if (hasInitialMarker) {
      await rm(wiki, { recursive: true, force: true })
      await rm(manifest, { force: true })
    } else {
      if (hasWikiBackup) {
        await rm(wiki, { recursive: true, force: true })
        await rename(wikiBackup, wiki)
      }
      if (hasManifestBackup) {
        await rm(manifest, { force: true })
        await rename(manifestBackup, manifest)
      }
    }
    await rm(hasInitialMarker ? initialMarker : existingMarker, { force: true })
    return
  }
  // Backward compatibility for backup-only transactions created by older versions.
  if (!hasWiki && hasWikiBackup) await rename(wikiBackup, wiki)
  if (!hasManifest && hasManifestBackup) {
    if (hasWiki && hasWikiBackup) {
      await rm(wiki, { recursive: true, force: true })
      await rename(wikiBackup, wiki)
    }
    await rename(manifestBackup, manifest)
  }
  if (await exists(wikiBackup)) await rm(wikiBackup, { recursive: true, force: true })
  if (await exists(manifestBackup)) await rm(manifestBackup, { force: true })
}

export async function finalize({ collectionName = 'wiki', argv = process.argv.slice(2), site = process.cwd(), renameFile = rename } = {}) {
  const collectionIndex = argv.indexOf('--collection')
  if (collectionIndex !== -1) {
    collectionName = argv[collectionIndex + 1]
    if (!collectionName || collectionName.startsWith('--')) throw new Error('Missing --collection value')
    argv = [...argv.slice(0, collectionIndex), ...argv.slice(collectionIndex + 2)]
  }
  const collection = collectionConfig(collectionName)
  const confirmed = confirmations(argv, collection)
  const lock = await acquireLock(site, collection)
  let staging
  try {
    await lock.assertOwned()
    await recoverPublication(site, collection)
    const report = JSON.parse(await readFile(path.join(site, collection.workDirectory, 'report.json'), 'utf8'))
    verifyReport(report, collection)
    const deleted = new Set(report.deleted)
    for (const source of confirmed.deletions) {
      if (!deleted.has(source)) throw new Error(`Extra deletion confirmation: ${source}`)
    }
    const missingConfirmations = report.deleted.filter((source) => !confirmed.deletions.includes(source))
    if (missingConfirmations.length) throw new Error(`Unconfirmed deletion: ${missingConfirmations.join(', ')}`)
    const translationSources = new Set([...report.added, ...report.changed])
    for (const source of confirmed.translations) {
      if (!translationSources.has(source)) throw new Error(`Extra translation confirmation: ${source}`)
    }

    const manifestPath = path.join(site, collection.manifestFile)
    const docsRoot = path.join(site, 'docs', collection.docsDirectory)
    const [hadDocs, hadManifest] = await Promise.all([exists(docsRoot), exists(manifestPath)])
    if (hadDocs !== hadManifest) throw new Error(`docs/${collection.docsDirectory} and ${collection.manifestFile} must both exist or both be absent`)
    const initial = !hadDocs
    const manifest = initial ? { version: 1, pages: [] } : JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!report.added.length && !report.changed.length && !report.deleted.length) {
      const result = await validatePublishedWiki({ docsRoot, manifest, collection })
      if (result.errors.length) throw new Error(result.errors.join('\n'))
      return { pages: manifest.pages.length, unchanged: true }
    }

    staging = path.join(site, `${collection.publishPrefix}.tmp-${randomUUID()}`)
    const stagedWiki = path.join(staging, collection.docsDirectory)
    await mkdir(staging)
    const publishedSnapshot = initial ? { contents: {}, inventory: {} } : await scanWikiSnapshot(docsRoot, { collection })
    await stageVerifiedSnapshot(publishedSnapshot, stagedWiki, deleted)

    let preparedSnapshot
    if (collection.mode === 'mirror') {
      const preparedRoot = path.join(site, collection.workDirectory, 'prepared')
      preparedSnapshot = await scanWikiSnapshot(preparedRoot, { collection })
      const expected = [...translationSources].sort(compareCodePoints)
      const actual = Object.keys(preparedSnapshot.contents).sort(compareCodePoints)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Prepared mirror batch does not match added/changed report')
      for (const source of expected) {
        const target = path.join(stagedWiki, ...source.split('/'))
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, preparedSnapshot.contents[source])
      }
    }

    const bySource = new Map(manifest.pages.map((page) => [page.source, page]))
    for (const source of report.changed) {
      if (!bySource.has(source)) throw new Error(`${source}: changed source is missing from manifest`)
    }
    for (const source of report.added) {
      if (bySource.has(source)) throw new Error(`${source}: added source already exists in manifest`)
    }
    for (const source of translationSources) {
      const currentHash = (collection.mode === 'mirror'
        ? preparedSnapshot.inventory[source]?.hash
        : publishedSnapshot.inventory[source]?.hash)
      if (!currentHash) throw new Error(`${source}: missing translation`)
      if (currentHash === report.translationBaselines[source]) {
        if (collection.mode === 'mirror' || !confirmed.translations.includes(source)) {
          throw new Error(`${source}: ${collection.mode === 'mirror' ? 'prepared mirror' : 'translation'} was not updated`)
        }
      }
    }
    for (const source of report.deleted) bySource.delete(source)
    const syncedAt = report.generatedAt
    for (const source of [...report.changed, ...report.added]) {
      if (!report.inventory[source]?.hash) throw new Error(`${source}: missing inventory entry`)
      bySource.set(source, {
        source,
        hash: report.inventory[source].hash,
        publicPath: publicPath(source, collection),
        status: 'published',
        syncedAt,
      })
    }
    const pages = [...bySource.values()].sort((a, b) => compareCodePoints(a.source, b.source))
    const nextManifest = { version: 1, pages }
    await writeFile(path.join(stagedWiki, 'index.md'), await indexMarkdown(stagedWiki, pages, syncedAt.slice(0, 10), collection))
    const validation = await validatePublishedWiki({ docsRoot: stagedWiki, manifest: nextManifest, collection })
    if (validation.errors.length) throw new Error(validation.errors.join('\n'))
    const stagedManifest = path.join(staging, collection.manifestFile)
    await writeFile(stagedManifest, `${JSON.stringify(nextManifest, null, 2)}\n`)
    await lock.assertOwned()
    await replacePublication({ site, stagedWiki, stagedManifest, collection, renameFile })
    return { pages: pages.length, unchanged: false }
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true })
    await lock.release()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  finalize().then((result) => console.log(`${result.pages} published pages`)).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
