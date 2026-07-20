import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectionConfig } from '@ketitongxue/llm-wiki-publisher/collections'
import { passiveMarkdownErrors, validatePublishedWiki } from '@ketitongxue/llm-wiki-publisher/validate'

const execFileAsync = promisify(execFile)
const DEFAULT_REPOSITORY = 'https://github.com/ketitongxue/juzxailab-content.git'
const COLLECTIONS = ['wiki']
const RETIRED_ARTIFACTS = ['docs/finance', 'finance-manifest.json']
const ALLOWED_COLLECTION_ENTRIES = new Set(['comparisons', 'concepts', 'entities', 'index.md'])

async function exists(candidate) {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function copyTree(source, destination) {
  const metadata = await lstat(source)
  if (metadata.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${source}`)
  if (!metadata.isDirectory()) throw new Error(`Expected directory: ${source}`)
  await mkdir(destination, { recursive: true })
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${from}`)
    if (entry.isDirectory()) await copyTree(from, to)
    else if (entry.isFile() && entry.name.endsWith('.md')) await copyFile(from, to)
    else if (entry.isFile()) throw new Error(`Unexpected public-content file: ${from}`)
    else throw new Error(`Unsupported content entry: ${from}`)
  }
}

async function assertCollectionLayout(source) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!ALLOWED_COLLECTION_ENTRIES.has(entry.name)) {
      throw new Error(`Unexpected public-content entry: ${path.join(source, entry.name)}`)
    }
    if (entry.name === 'index.md' ? !entry.isFile() : !entry.isDirectory()) {
      throw new Error(`Invalid public-content entry: ${path.join(source, entry.name)}`)
    }
  }
}

async function validateRoot(root) {
  for (const name of COLLECTIONS) {
    const collection = collectionConfig(name)
    const docsRoot = path.join(root, 'docs', collection.docsDirectory)
    const manifestPath = path.join(root, collection.manifestFile)
    if (!(await exists(docsRoot)) || !(await exists(manifestPath))) {
      throw new Error(`${name}: content directory and manifest are required`)
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const result = await validatePublishedWiki({ docsRoot, manifest, collection })
    const indexPath = path.join(docsRoot, 'index.md')
    if (!(await exists(indexPath))) throw new Error(`${name}: index.md is required`)
    result.errors.push(...passiveMarkdownErrors(`${name}/index.md`, await readFile(indexPath, 'utf8')))
    if (result.errors.length) throw new Error(`${name}: ${result.errors.join('; ')}`)
  }
}

async function replaceArtifacts(site, staged) {
  const token = randomUUID()
  const artifacts = [
    ...COLLECTIONS.map((name) => `docs/${name}`),
    ...COLLECTIONS.map((name) => `${name}-manifest.json`),
  ]
  const targets = [...artifacts, ...RETIRED_ARTIFACTS]
  const installed = []
  const backups = []
  try {
    for (const relative of targets) {
      const target = path.join(site, ...relative.split('/'))
      const backup = `${target}.content-backup-${token}`
      await mkdir(path.dirname(target), { recursive: true })
      if (await exists(target)) {
        await rename(target, backup)
        backups.push({ backup, target })
      }
      if (!artifacts.includes(relative)) continue
      const source = path.join(staged, ...relative.split('/'))
      await rename(source, target)
      installed.push(target)
    }
  } catch (error) {
    await Promise.all(installed.map((target) => rm(target, { recursive: true, force: true })))
    for (const { backup, target } of backups.reverse()) {
      if (await exists(backup)) await rename(backup, target)
    }
    throw error
  }
  await Promise.all(backups.map(({ backup }) => rm(backup, { recursive: true, force: true })))
}

export async function installFromDirectory({ site, source }) {
  const stage = path.join(site, `.content-cache.install-${randomUUID()}`)
  try {
    await mkdir(path.join(stage, 'docs'), { recursive: true })
    for (const name of COLLECTIONS) {
      const collectionSource = path.join(source, 'docs', name)
      await assertCollectionLayout(collectionSource)
      await copyTree(collectionSource, path.join(stage, 'docs', name))
      await copyFile(path.join(source, `${name}-manifest.json`), path.join(stage, `${name}-manifest.json`))
    }
    await validateRoot(stage)
    await replaceArtifacts(site, stage)
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

async function localRepository(site, env) {
  if (env.JUZXAILAB_CONTENT_PATH) return path.resolve(site, env.JUZXAILAB_CONTENT_PATH)
  let ancestor = site
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(ancestor, 'juzxailab-content')
    if (await exists(path.join(candidate, 'wiki-manifest.json'))) return candidate
    const parent = path.dirname(ancestor)
    if (parent === ancestor) break
    ancestor = parent
  }
  return null
}

async function repositoryCommit(repository) {
  try {
    const [{ stdout }, { stdout: status }] = await Promise.all([
      execFileAsync('git', ['-C', repository, 'rev-parse', 'HEAD']),
      execFileAsync('git', ['-C', repository, 'status', '--porcelain']),
    ])
    return `${stdout.trim()}${status.trim() ? '-dirty' : ''}`
  } catch {
    return 'unversioned-local-content'
  }
}

async function cloneRepository(site, env) {
  const cacheRoot = path.join(site, '.content-cache')
  await mkdir(cacheRoot, { recursive: true })
  const checkout = await mkdtemp(path.join(cacheRoot, 'checkout-'))
  const repository = env.JUZXAILAB_CONTENT_REPOSITORY || DEFAULT_REPOSITORY
  const ref = env.JUZXAILAB_CONTENT_REF || 'main'
  await execFileAsync('git', ['clone', '--depth=1', '--single-branch', '--branch', ref, repository, checkout])
  return { checkout, temporary: true }
}

export async function install({ site = process.cwd(), env = process.env } = {}) {
  const local = await localRepository(site, env)
  const resolved = local ? { checkout: local, temporary: false } : await cloneRepository(site, env)
  try {
    await validateRoot(resolved.checkout)
    await installFromDirectory({ site, source: resolved.checkout })
    const commit = await repositoryCommit(resolved.checkout)
    console.log(`Installed juzxailab-content ${commit}.`)
    return { commit, source: resolved.temporary ? 'remote' : 'local' }
  } finally {
    if (resolved.temporary) await rm(resolved.checkout, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  install().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
