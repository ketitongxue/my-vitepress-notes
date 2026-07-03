import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseFrontmatter } from './markdown.mjs'
import { publicPath, scanWikiSnapshot } from './core.mjs'
import { acquireLock } from './sync.mjs'
import { validatePublishedWiki } from './validate.mjs'

const SECTIONS = [
  ['entities', '实体'],
  ['concepts', '概念'],
  ['comparisons', '对比分析'],
]

async function exists(candidate) {
  try { await access(candidate); return true } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function confirmations(argv) {
  const values = []
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--confirm-delete') throw new Error(`Unknown finalize argument: ${argv[index]}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error('--confirm-delete requires a source')
    if (values.includes(value)) throw new Error(`Duplicate deletion confirmation: ${value}`)
    values.push(value)
    index += 1
  }
  return values
}

function verifyReport(report) {
  for (const field of ['added', 'changed', 'unchanged', 'deleted']) {
    if (!Array.isArray(report[field])) throw new Error(`Invalid report: ${field} must be an array`)
    for (const source of report[field]) publicPath(source)
  }
  if (!report.inventory || typeof report.inventory !== 'object' || Array.isArray(report.inventory)) {
    throw new Error('Invalid report: inventory must be an object')
  }
}

async function indexMarkdown(docsRoot, pages, date) {
  const grouped = new Map(SECTIONS.map(([section]) => [section, []]))
  for (const page of pages) {
    const markdown = await readFile(path.join(docsRoot, ...page.source.split('/')), 'utf8')
    const title = parseFrontmatter(markdown).frontmatter.title
    if (typeof title !== 'string' || !title.trim()) throw new Error(`${page.source}: missing title`)
    const [section] = page.source.split('/')
    grouped.get(section).push({ source: page.source, title: title.trim() })
  }
  const lines = [
    '---', 'title: LLM Wiki 中文知识库', 'description: 面向 AI 编程、智能体工程与产品实践的中文知识库。', '---', '',
    '# LLM Wiki 中文知识库', '',
    `这里收录 ${pages.length} 篇经过整理的中文知识页面，涵盖实体、核心概念与对比分析。`, '',
    `- 页面总数：**${pages.length}**`, `- 最近同步日期：**${date}**`, '',
  ]
  for (const [section, heading] of SECTIONS) {
    lines.push(`## ${heading}`, '')
    for (const item of grouped.get(section)) {
      lines.push(`- [${item.title}](/wiki/${item.source.replace(/\.md$/, '')})`)
    }
    lines.push('')
  }
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

async function replacePublication({ site, stagedWiki, stagedManifest }) {
  const token = randomUUID()
  const wiki = path.join(site, 'docs', 'wiki')
  const manifest = path.join(site, 'wiki-manifest.json')
  const wikiBackup = path.join(site, `.wiki-publish.backup-wiki-${token}`)
  const manifestBackup = path.join(site, `.wiki-publish.backup-manifest-${token}`)
  await rename(wiki, wikiBackup)
  try {
    await rename(manifest, manifestBackup)
    try {
      await rename(stagedWiki, wiki)
      await rename(stagedManifest, manifest)
    } catch (error) {
      await rm(wiki, { recursive: true, force: true })
      if (await exists(manifestBackup)) await rename(manifestBackup, manifest)
      await rename(wikiBackup, wiki)
      throw error
    }
    await Promise.all([rm(wikiBackup, { recursive: true, force: true }), rm(manifestBackup, { force: true })])
  } catch (error) {
    if (!(await exists(wiki)) && await exists(wikiBackup)) await rename(wikiBackup, wiki)
    throw error
  }
}

async function recoverPublication(site) {
  const entries = await readdir(site)
  const tokens = new Set(entries.flatMap((entry) => {
    const match = /^\.wiki-publish\.backup-(?:wiki|manifest)-(.+)$/.exec(entry)
    return match ? [match[1]] : []
  }))
  if (tokens.size > 1) throw new Error('Cannot recover publication: multiple backup transactions')
  if (!tokens.size) return
  const [token] = tokens
  const wiki = path.join(site, 'docs', 'wiki')
  const manifest = path.join(site, 'wiki-manifest.json')
  const wikiBackup = path.join(site, `.wiki-publish.backup-wiki-${token}`)
  const manifestBackup = path.join(site, `.wiki-publish.backup-manifest-${token}`)
  const [hasWiki, hasManifest, hasWikiBackup, hasManifestBackup] = await Promise.all(
    [wiki, manifest, wikiBackup, manifestBackup].map(exists),
  )
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

export async function finalize({ argv = process.argv.slice(2), site = process.cwd() } = {}) {
  const confirmed = confirmations(argv)
  const lock = await acquireLock(site)
  let staging
  try {
    await lock.assertOwned()
    await recoverPublication(site)
    const report = JSON.parse(await readFile(path.join(site, '.wiki-work', 'report.json'), 'utf8'))
    verifyReport(report)
    const deleted = new Set(report.deleted)
    for (const source of confirmed) {
      if (!deleted.has(source)) throw new Error(`Extra deletion confirmation: ${source}`)
    }
    const missingConfirmations = report.deleted.filter((source) => !confirmed.includes(source))
    if (missingConfirmations.length) throw new Error(`Unconfirmed deletion: ${missingConfirmations.join(', ')}`)

    const manifestPath = path.join(site, 'wiki-manifest.json')
    const docsRoot = path.join(site, 'docs', 'wiki')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!report.added.length && !report.changed.length && !report.deleted.length) {
      const result = await validatePublishedWiki({ docsRoot, manifest })
      if (result.errors.length) throw new Error(result.errors.join('\n'))
      return { pages: manifest.pages.length, unchanged: true }
    }

    staging = path.join(site, `.wiki-publish.tmp-${randomUUID()}`)
    const stagedWiki = path.join(staging, 'wiki')
    await mkdir(staging)
    const publishedSnapshot = await scanWikiSnapshot(docsRoot)
    await stageVerifiedSnapshot(publishedSnapshot, stagedWiki, deleted)

    const bySource = new Map(manifest.pages.map((page) => [page.source, page]))
    for (const source of report.deleted) bySource.delete(source)
    const syncedAt = report.generatedAt
    for (const source of [...report.changed, ...report.added]) {
      if (!report.inventory[source]?.hash) throw new Error(`${source}: missing inventory entry`)
      if (!(await exists(path.join(stagedWiki, ...source.split('/'))))) throw new Error(`${source}: missing translation`)
      bySource.set(source, {
        source,
        hash: report.inventory[source].hash,
        publicPath: publicPath(source),
        status: 'published',
        syncedAt,
      })
    }
    const pages = [...bySource.values()].sort((a, b) => compareCodePoints(a.source, b.source))
    const nextManifest = { version: 1, pages }
    await writeFile(path.join(stagedWiki, 'index.md'), await indexMarkdown(stagedWiki, pages, syncedAt.slice(0, 10)))
    const validation = await validatePublishedWiki({ docsRoot: stagedWiki, manifest: nextManifest })
    if (validation.errors.length) throw new Error(validation.errors.join('\n'))
    const stagedManifest = path.join(staging, 'wiki-manifest.json')
    await writeFile(stagedManifest, `${JSON.stringify(nextManifest, null, 2)}\n`)
    await lock.assertOwned()
    await replacePublication({ site, stagedWiki, stagedManifest })
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
