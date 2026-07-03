import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export const ALLOWED_SECTIONS = Object.freeze(['comparisons', 'concepts', 'entities'])

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function normalizeSourcePath(sourcePath) {
  if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
    throw new TypeError('Source path must be a non-empty relative path')
  }
  if (path.posix.isAbsolute(sourcePath) || path.win32.isAbsolute(sourcePath)) {
    throw new Error('Source path must be relative')
  }
  if (sourcePath.includes('\\')) {
    throw new Error('Source path must use POSIX separators')
  }

  const normalized = path.posix.normalize(sourcePath)
  const [section] = normalized.split('/')
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    !ALLOWED_SECTIONS.includes(section) ||
    normalized === section
  ) {
    throw new Error('Source path must be inside an allowed directory')
  }
  return normalized
}

export function publicPath(sourcePath) {
  return `docs/wiki/${normalizeSourcePath(sourcePath)}`
}

async function collectMarkdownFiles(directory, section, relativeDirectory = '') {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed: ${absolutePath}`)
    }

    const relativePath = relativeDirectory
      ? path.posix.join(relativeDirectory, entry.name)
      : entry.name
    if (entry.isDirectory()) {
      files.push(
        ...(await collectMarkdownFiles(absolutePath, section, relativePath)),
      )
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({
        absolutePath,
        sourcePath: path.posix.join(section, relativePath),
      })
    }
  }
  return files
}

export async function scanWiki(root) {
  const files = []
  for (const section of ALLOWED_SECTIONS) {
    const sectionPath = path.join(root, section)
    try {
      const metadata = await lstat(sectionPath)
      if (metadata.isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed: ${sectionPath}`)
      }
      if (!metadata.isDirectory()) continue
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    files.push(...(await collectMarkdownFiles(sectionPath, section)))
  }

  const inventory = {}
  for (const file of files.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))) {
    const content = await readFile(file.absolutePath, 'utf8')
    inventory[file.sourcePath] = {
      hash: sha256(content),
      publicPath: publicPath(file.sourcePath),
    }
  }
  return inventory
}

export function diffInventory(previous, current) {
  const result = {
    added: [],
    changed: [],
    unchanged: [],
    deleted: [],
  }

  for (const sourcePath of Object.keys(current).sort()) {
    if (!(sourcePath in previous)) {
      result.added.push(sourcePath)
    } else if (previous[sourcePath].hash === current[sourcePath].hash) {
      result.unchanged.push(sourcePath)
    } else {
      result.changed.push(sourcePath)
    }
  }
  for (const sourcePath of Object.keys(previous).sort()) {
    if (!(sourcePath in current)) result.deleted.push(sourcePath)
  }

  return result
}
