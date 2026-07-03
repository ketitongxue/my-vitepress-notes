import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
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

function isContained(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

async function assertContained(candidate, canonicalSectionRoot) {
  const resolved = await realpath(candidate)
  if (!isContained(canonicalSectionRoot, resolved)) {
    throw new Error(`Path resolves outside its allowed directory: ${candidate}`)
  }
  return resolved
}

async function readVerifiedFile(absolutePath, canonicalSectionRoot) {
  let handle
  try {
    handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (error) {
    if (error?.code === 'ELOOP') {
      throw new Error(`Symbolic links are not allowed: ${absolutePath}`)
    }
    throw error
  }

  try {
    const openedMetadata = await handle.stat()
    if (!openedMetadata.isFile()) {
      throw new Error(`Expected a regular file: ${absolutePath}`)
    }

    await assertContained(absolutePath, canonicalSectionRoot)
    const pathMetadata = await lstat(absolutePath)
    if (pathMetadata.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed: ${absolutePath}`)
    }
    if (
      pathMetadata.dev !== openedMetadata.dev ||
      pathMetadata.ino !== openedMetadata.ino
    ) {
      throw new Error(`File changed while being scanned: ${absolutePath}`)
    }

    const content = await handle.readFile('utf8')

    await assertContained(absolutePath, canonicalSectionRoot)
    const finalMetadata = await lstat(absolutePath)
    if (
      finalMetadata.isSymbolicLink() ||
      finalMetadata.dev !== openedMetadata.dev ||
      finalMetadata.ino !== openedMetadata.ino
    ) {
      throw new Error(`File changed while being scanned: ${absolutePath}`)
    }
    return content
  } finally {
    await handle.close()
  }
}

async function collectMarkdownFiles(
  directory,
  section,
  canonicalSectionRoot,
  relativeDirectory = '',
) {
  await assertContained(directory, canonicalSectionRoot)
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
        ...(await collectMarkdownFiles(
          absolutePath,
          section,
          canonicalSectionRoot,
          relativePath,
        )),
      )
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({
        absolutePath,
        canonicalSectionRoot,
        sourcePath: path.posix.join(section, relativePath),
      })
    }
  }
  return files
}

export async function scanWiki(root) {
  const rootMetadata = await lstat(root)
  if (rootMetadata.isSymbolicLink()) {
    throw new Error(`Symbolic links are not allowed: ${root}`)
  }
  if (!rootMetadata.isDirectory()) {
    throw new Error(`Wiki root must be a directory: ${root}`)
  }

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
    const canonicalSectionRoot = await realpath(sectionPath)
    files.push(
      ...(await collectMarkdownFiles(
        sectionPath,
        section,
        canonicalSectionRoot,
      )),
    )
  }

  const inventory = {}
  for (const file of files.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))) {
    const content = await readVerifiedFile(
      file.absolutePath,
      file.canonicalSectionRoot,
    )
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
