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
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  )
}

async function assertContained(candidate, canonicalSectionRoot) {
  const resolved = await realpath(candidate)
  if (!isContained(canonicalSectionRoot, resolved)) {
    throw new Error(`Path resolves outside its allowed directory: ${candidate}`)
  }
  return resolved
}

function sameObject(left, right) {
  return left.dev === right.dev && left.ino === right.ino
}

async function verifyDirectoryHandle(
  handle,
  directory,
  canonicalDirectory,
  canonicalParent,
) {
  const openedMetadata = await handle.stat()
  if (!openedMetadata.isDirectory()) {
    throw new Error(`Expected a directory: ${directory}`)
  }

  const resolved = await realpath(directory)
  if (resolved !== canonicalDirectory) {
    throw new Error(`Directory changed while being scanned: ${directory}`)
  }
  if (canonicalParent && !isContained(canonicalParent, resolved)) {
    throw new Error(`Path resolves outside its allowed directory: ${directory}`)
  }

  const pathMetadata = await lstat(directory)
  if (pathMetadata.isSymbolicLink()) {
    throw new Error(`Symbolic links are not allowed: ${directory}`)
  }
  if (!sameObject(pathMetadata, openedMetadata)) {
    throw new Error(`Directory changed while being scanned: ${directory}`)
  }
}

async function openVerifiedDirectory(directory, canonicalParent) {
  let handle
  try {
    handle = await open(
      directory,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    )
  } catch (error) {
    if (['ELOOP', 'ENOTDIR'].includes(error?.code)) {
      throw new Error(`Symbolic links are not allowed: ${directory}`)
    }
    throw error
  }

  try {
    const canonicalDirectory = await realpath(directory)
    await verifyDirectoryHandle(
      handle,
      directory,
      canonicalDirectory,
      canonicalParent,
    )
    return { canonicalDirectory, handle }
  } catch (error) {
    await handle.close()
    throw error
  }
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
    if (!sameObject(pathMetadata, openedMetadata)) {
      throw new Error(`File changed while being scanned: ${absolutePath}`)
    }

    const content = await handle.readFile('utf8')

    await assertContained(absolutePath, canonicalSectionRoot)
    const finalMetadata = await lstat(absolutePath)
    if (
      finalMetadata.isSymbolicLink() ||
      !sameObject(finalMetadata, openedMetadata)
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

async function scanWikiInternal(root, includeContent) {
  const rootDirectory = await openVerifiedDirectory(root)
  const sectionDirectories = []
  try {
    const files = []
    for (const section of ALLOWED_SECTIONS) {
      await verifyDirectoryHandle(
        rootDirectory.handle,
        root,
        rootDirectory.canonicalDirectory,
      )
      const sectionPath = path.join(root, section)
      let sectionDirectory
      try {
        sectionDirectory = await openVerifiedDirectory(
          sectionPath,
          rootDirectory.canonicalDirectory,
        )
      } catch (error) {
        if (error?.code === 'ENOENT') continue
        throw error
      }
      sectionDirectories.push({ ...sectionDirectory, path: sectionPath })
      await verifyDirectoryHandle(
        rootDirectory.handle,
        root,
        rootDirectory.canonicalDirectory,
      )
      files.push(
        ...(await collectMarkdownFiles(
          sectionPath,
          section,
          sectionDirectory.canonicalDirectory,
        )),
      )
    }

    const inventory = {}
    const contents = {}
    for (const file of files.sort((a, b) =>
      a.sourcePath.localeCompare(b.sourcePath),
    )) {
      await verifyDirectoryHandle(
        rootDirectory.handle,
        root,
        rootDirectory.canonicalDirectory,
      )
      const sectionDirectory = sectionDirectories.find(
        (candidate) => candidate.canonicalDirectory === file.canonicalSectionRoot,
      )
      await verifyDirectoryHandle(
        sectionDirectory.handle,
        sectionDirectory.path,
        sectionDirectory.canonicalDirectory,
        rootDirectory.canonicalDirectory,
      )
      const content = await readVerifiedFile(
        file.absolutePath,
        file.canonicalSectionRoot,
      )
      inventory[file.sourcePath] = {
        hash: sha256(content),
        publicPath: publicPath(file.sourcePath),
      }
      if (includeContent) contents[file.sourcePath] = content
    }
    return includeContent ? { contents, inventory } : inventory
  } finally {
    await Promise.all(sectionDirectories.map(({ handle }) => handle.close()))
    await rootDirectory.handle.close()
  }
}

export async function scanWiki(root) {
  return scanWikiInternal(root, false)
}

export async function scanWikiSnapshot(root) {
  return scanWikiInternal(root, true)
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
