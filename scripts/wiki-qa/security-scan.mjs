import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { access, lstat, open, readFile, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { collectionConfig } from '../wiki-publish/collections.mjs'
import { validatePublishedWiki } from '../wiki-publish/validate.mjs'

const execFileAsync = promisify(execFile)
const MAX_SCAN_FILE_BYTES = 16 * 1024 * 1024
const TEST_FILES = /(?:^|\/)\w[\w.-]*\.test\.mjs$/
const TEST_NET = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.(?:\d{1,3})$/
const TEST_PATH_FIXTURES = new Set([
  ['', 'Users', 'alice', 'private.md'].join('/'),
  ['', 'Users', 'alice', 'wiki', 'private.md'].join('/'),
  ['', 'Users', 'person', 'wiki', 'raw', 'source.md'].join('/'),
  ['', 'home', 'alice', 'private.md'].join('/'),
  ['', 'home', 'alice', 'wiki', 'private.md'].join('/'),
  ['', 'etc', 'passwd'].join('/'),
  ['', 'tmp', 'private.md'].join('/'),
  ['', 'tmp', 'bad.md'].join('/'),
  ['', 'var', 'log', 'private.log'].join('/'),
  ['', 'concepts', 'a.md'].join('/'),
  ['', 'custom', 'path', 'file.md'].join('/'),
  ['', 'workspace', 'secret', 'file.md'].join('/'),
  ['', 'workspace', 'private.md'].join('/'),
  ['', 'wiki', 'concepts', '..', 'private'].join('/'),
  ['', 'wiki', 'concepts', 'Zeta'].join('/'),
  ['C:', 'Users', 'alice', 'private.md'].join('\\'),
  ['C:', 'Users', 'alice', 'wiki', 'private.md'].join('\\'),
  ['raw', 'a.md'].join('/'),
  ['raw', 'article.md'].join('/'),
  ['raw', 'bad.md'].join('/'),
  ['raw', 'private-note.md'].join('/'),
  ['raw', 'private.md'].join('/'),
  ['raw', 'articles', 'private.md'].join('/'),
  ['raw', 'articles', 'source.md'].join('/'),
  ['raw', 'papers', 'book.md'].join('/'),
  ['raw', 'source.md'].join('/'),
])
const SAFE_PROJECT_PATHS = [
  /^\/(?:wiki|finance)\/(?:entities|concepts|comparisons)(?:\/[a-z0-9-]+)?\/?$/,
  /^\/MACD\/RSI$/,
  /^\/notes\/[a-z0-9-]+\/?$/,
  /^\/llm-wiki(?:\/[a-z0-9-]+)?\/?$/,
  /^\/\.codex\/skills\/?$/,
  /^\/\.codex\/skills\/llm-wiki\/?$/,
  /^\/\.codex\/skills\/llm-wiki\/SKILL\.md$/,
  /^\/\.codex\/skills\/llm-wiki\/scripts\/init_wiki\.py$/,
  /^\/api\/ask$/,
  /^\/api\/personal-os\/config$/,
  /^\/api\/admin\/personal-os\/(?:config|publish|rollback)$/,
  /^\/api\/admin\/personal-os$/,
  /^\/admin\/personal-os(?:\.html)?\/?$/,
  /^\/ask\/index\.html$/,
  /^\/assets\/[A-Za-z0-9_./-]+$/,
  /^\/(?:worker|scripts)\/[A-Za-z0-9_./-]+$/,
]
const EXACT_REGEX_SOURCE_TOKENS = new Set([
  ['', '-', 'g'].join('/'),
  ['', '2g', '.test'].join('/'),
  ['', 'allowed', 'i'].join('/'),
  ['', 'absolute path', 'i'].join('/'),
  ['', 'collection', 'i'].join('/'),
  ['', 'hash', 'i'].join('/'),
  ['', 'mirror', 'i'].join('/'),
  ['', 'publicPath', 'i'].join('/'),
  ['', 'reference-missing', 'i'].join('/'),
  ['', 'relative', 'i'].join('/'),
  ['', 'source', 'i'].join('/'),
  ['', 'status', 'i'].join('/'),
  ['', 'wikilink', 'i'].join('/'),
])

function addFinding(findings, file, kind) {
  findings.push(`${file}: ${kind}`)
}

function diagnosticIdentifier(scope, relative) {
  const digest = createHash('sha256').update(relative).digest('hex').slice(0, 12)
  return `${scope}:${digest}`
}

function validIpv4Addresses(text) {
  return [...text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)]
    .map((match) => match[0])
    .filter((address) => address.split('.').every((octet) => Number(octet) <= 255))
}

function isAllowedTestFixture(value) {
  return TEST_PATH_FIXTURES.has(value)
    || TEST_PATH_FIXTURES.has(value.replaceAll('\\', '/'))
}

function withoutWebUrls(text) {
  return text
    .replace(/https?:\/\/[^\s'"`<>]+/gi, '')
    .replace(/(^|[\s(<])\/\/[^\s'"`<>]+/gim, '$1')
    .replace(/\bfile:\/\//gi, '')
}

function isSafeProjectPath(value) {
  if (value.split('/').some((segment) => segment === '.' || segment === '..')) return false
  return SAFE_PROJECT_PATHS.some((pattern) => pattern.test(value))
}

function isKnownRegexSource(file, value) {
  return /\.[cm]?[jt]s$/.test(file) && EXACT_REGEX_SOURCE_TOKENS.has(value)
}

export function scanText(file, text, { artifact = false, label = file } = {}) {
  const findings = []
  const isTest = TEST_FILES.test(file)

  for (const match of text.matchAll(/\bsk-[A-Za-z0-9_-]{20,}\b/g)) {
    if (!(!artifact && isTest && /^sk-(?:fake|test)-/.test(match[0]))) {
      addFinding(findings, label, 'possible provider secret')
    }
  }

  for (const match of text.matchAll(/\bDEEPSEEK_API_KEY\s*=\s*['"]?([A-Za-z0-9_$.-][A-Za-z0-9_$./-]*)['"]?/g)) {
    if (!(!artifact && isTest && /^(?:fake|test|fixture)-/.test(match[1]))) {
      addFinding(findings, label, 'assigned DeepSeek API key')
    }
  }

  const pathText = withoutWebUrls(text)
  const absolutePaths = [
    ...pathText.matchAll(/(?:^|[^A-Za-z0-9_:/.-])(\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)+)/gm),
    ...pathText.matchAll(/(?:^|[^A-Za-z0-9_])(\b[A-Za-z]:[\\/][^\s)'"`]+)/gm),
    ...pathText.matchAll(/(?:^|[^\\])(\\\\[A-Za-z0-9._-]+[\\/][A-Za-z0-9$._-]+(?:[\\/][^\s)'"`]+)?)/gm),
  ]
  for (const match of absolutePaths) {
    const value = match[1].replace(/[.,，。]$/, '')
    if (!isKnownRegexSource(file, value) && !isSafeProjectPath(value)
      && (artifact || !isTest || !isAllowedTestFixture(value))) {
      addFinding(findings, label, 'local absolute path')
    }
  }

  for (const match of pathText.matchAll(/(?:^|[\s/\\('"`])(raw[\\/][A-Za-z0-9_.-]+(?:[\\/][A-Za-z0-9_.-]+)*)(?=$|[\s)'"`\],])/gim)) {
    const value = match[1]
    if (artifact || !isTest || !isAllowedTestFixture(value)) {
      addFinding(findings, label, 'private source path')
    }
  }

  for (const address of validIpv4Addresses(text)) {
    if (!(!artifact && isTest && TEST_NET.test(address))) addFinding(findings, label, 'full IP address')
  }

  return [...new Set(findings)]
}

function decodeUtf16Be(content, offset = 0) {
  const bytes = Buffer.from(content.subarray(offset, content.length - ((content.length - offset) % 2)))
  for (let index = 0; index < bytes.length; index += 2) {
    const first = bytes[index]
    bytes[index] = bytes[index + 1]
    bytes[index + 1] = first
  }
  return bytes.toString('utf16le')
}

function decodedTexts(content) {
  const texts = new Set()
  if (content[0] === 0xff && content[1] === 0xfe) {
    texts.add(content.subarray(2).toString('utf16le'))
    return texts
  }
  if (content[0] === 0xfe && content[1] === 0xff) {
    texts.add(decodeUtf16Be(content, 2))
    return texts
  }
  if (content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf) {
    texts.add(content.subarray(3).toString('utf8'))
    return texts
  }

  const sampleLength = Math.min(content.length - (content.length % 2), 4096)
  let evenNuls = 0
  let oddNuls = 0
  for (let index = 0; index < sampleLength; index += 2) {
    if (content[index] === 0) evenNuls += 1
    if (content[index + 1] === 0) oddNuls += 1
  }
  const pairs = sampleLength / 2
  if (pairs > 0 && oddNuls / pairs > 0.3 && evenNuls / pairs < 0.1) {
    texts.add(content.toString('utf16le'))
  } else if (pairs > 0 && evenNuls / pairs > 0.3 && oddNuls / pairs < 0.1) {
    texts.add(decodeUtf16Be(content))
  } else {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(content)
      const controls = [...text].filter((character) => {
        const code = character.charCodeAt(0)
        return (code < 32 && !['\t', '\n', '\r'].includes(character)) || code === 127
      }).length
      if (text.length === 0 || controls / text.length < 0.02) texts.add(text)
    } catch {
      // Binary files are still checked below using high-confidence ASCII signatures.
    }
  }
  return texts
}

function scanHighConfidenceSecrets(label, text) {
  const findings = []
  if (/\bsk-[A-Za-z0-9_-]{20,}\b/.test(text)) addFinding(findings, label, 'possible provider secret')
  if (/\bDEEPSEEK_API_KEY\s*=\s*['"]?[A-Za-z0-9_$.-][A-Za-z0-9_$./-]*/.test(text)) {
    addFinding(findings, label, 'assigned DeepSeek API key')
  }
  return findings
}

function scanRawByteSignatures(label, content) {
  const text = content.toString('latin1')
  const findings = scanHighConfidenceSecrets(label, text)
  if (validIpv4Addresses(text).length > 0) addFinding(findings, label, 'full IP address')
  if (/(?:^|[^A-Za-z0-9_:/.-])\/(?:Users|home|root|private|tmp|var|opt|etc|srv|Volumes)\/[A-Za-z0-9._~-]+/.test(text)
    || /(?:^|[^A-Za-z0-9_])\b[A-Za-z]:[\\/][A-Za-z0-9._~-]+[\\/][A-Za-z0-9._~-]+/.test(text)
    || /(?:^|[^\\])\\\\[A-Za-z0-9._-]+[\\/][A-Za-z0-9$._-]+/.test(text)) {
    addFinding(findings, label, 'local absolute path')
  }
  if (/(?:^|[\s/\\('"`])raw[\\/][A-Za-z0-9_.-]+/i.test(text)) {
    addFinding(findings, label, 'private source path')
  }
  return findings
}

function scanUtf16ProtectedBytes(relative, label, content, artifact) {
  const findings = []
  for (const offset of [0, 1]) {
    if (content.length - offset < 2) continue
    findings.push(...scanText(relative, content.subarray(offset).toString('utf16le'), { artifact, label }))
    findings.push(...scanText(relative, decodeUtf16Be(content, offset), { artifact, label }))
  }
  return findings
}

function scanBuffer(relative, content, artifact, label = relative) {
  const texts = decodedTexts(content)
  const findings = scanUtf16ProtectedBytes(relative, label, content, artifact)
  if (texts.size === 0) findings.push(...scanRawByteSignatures(label, content))
  for (const text of texts) findings.push(...scanText(relative, text, { artifact, label }))
  return [...new Set(findings)]
}

function assertContained(rootReal, candidateReal) {
  if (candidateReal !== rootReal && !candidateReal.startsWith(`${rootReal}${path.sep}`)) {
    throw new Error('deployment artifact escaped its canonical root')
  }
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino
}

async function readOpenFileBounded(absolute, expected, artifact) {
  let handle
  try {
    handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    const opened = await handle.stat()
    if (!opened.isFile() || !sameFile(opened, expected)) {
      throw new Error('deployment artifact changed during security scan')
    }
    if (opened.size > MAX_SCAN_FILE_BYTES) throw new Error('deployment artifact exceeds scan size limit')

    const content = Buffer.allocUnsafe(Math.min(MAX_SCAN_FILE_BYTES + 1, opened.size + 1))
    let length = 0
    while (length < content.length) {
      const { bytesRead } = await handle.read(content, length, content.length - length, length)
      if (bytesRead === 0) break
      length += bytesRead
    }
    if (length > opened.size || length > MAX_SCAN_FILE_BYTES) {
      throw new Error('deployment artifact changed during security scan')
    }
    const after = await handle.stat()
    if (!sameFile(after, opened) || after.size !== opened.size) {
      throw new Error('deployment artifact changed during security scan')
    }
    return content.subarray(0, length)
  } catch (error) {
    if (artifact && ['ELOOP', 'EMLINK'].includes(error?.code)) {
      throw new Error('deployment artifacts contain a symbolic link')
    }
    throw error
  } finally {
    await handle?.close()
  }
}

async function scanTrackedFile(rootReal, relative) {
  const absolute = path.resolve(rootReal, relative)
  assertContained(rootReal, absolute)
  const before = await lstat(absolute)
  if (before.isSymbolicLink() || !before.isFile()) throw new Error('tracked scan input is not a regular file')
  if (before.size > MAX_SCAN_FILE_BYTES) throw new Error('tracked scan input exceeds scan size limit')
  const label = diagnosticIdentifier('tracked', relative)
  return [
    ...scanText(relative, relative, { artifact: true, label }),
    ...scanBuffer(relative, await readOpenFileBounded(absolute, before, false), false, label),
  ]
}

export async function scanTrackedFiles(projectRoot) {
  try {
    const rootReal = await realpath(projectRoot)
    const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
    const files = stdout.split('\0').filter(Boolean)
    const findings = []
    for (const file of files) findings.push(...await scanTrackedFile(rootReal, file))
    return [...new Set(findings)]
  } catch {
    throw new Error('tracked file security scan failed')
  }
}

async function artifactFiles(rootReal, directory = rootReal, prefix = '', paths = []) {
  const directoryBefore = await lstat(directory)
  if (directoryBefore.isSymbolicLink()) throw new Error('deployment artifacts contain a symbolic link')
  if (!directoryBefore.isDirectory()) throw new Error('deployment artifact tree contains a non-directory')
  const directoryReal = await realpath(directory)
  assertContained(rootReal, directoryReal)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    paths.push(relative)
    const absolute = path.join(directory, entry.name)
    const entryBefore = await lstat(absolute)
    if (entry.isSymbolicLink() || entryBefore.isSymbolicLink()) {
      throw new Error('deployment artifacts contain a symbolic link')
    }
    const entryReal = await realpath(absolute)
    assertContained(rootReal, entryReal)
    if (entryBefore.isDirectory()) {
      files.push(...await artifactFiles(rootReal, absolute, relative, paths))
    } else if (entryBefore.isFile()) {
      files.push({ absolute, relative, before: entryBefore, real: entryReal })
    } else {
      throw new Error('deployment artifact tree contains a non-regular entry')
    }
  }
  const directoryAfter = await lstat(directory)
  if (directoryAfter.isSymbolicLink() || !sameFile(directoryAfter, directoryBefore)
    || await realpath(directory) !== directoryReal) {
    throw new Error('deployment artifact directory changed during security scan')
  }
  return files
}

async function scanArtifactFilesInternal(projectRoot) {
  const root = path.join(projectRoot, 'docs/.vitepress/dist')
  let files
  let rootBefore
  let rootReal
  const artifactPaths = []
  try {
    rootBefore = await lstat(root)
    if (rootBefore.isSymbolicLink()) throw new Error('deployment artifacts contain a symbolic link')
    if (!rootBefore.isDirectory()) throw new Error('deployment artifact root is not a directory')
    rootReal = await realpath(root)
    files = await artifactFiles(rootReal, rootReal, '', artifactPaths)
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('deployment artifacts are missing; run docs:build first')
    throw error
  }
  if (files.length === 0) throw new Error('deployment artifacts are empty; run docs:build first')
  const findings = []
  for (const relative of artifactPaths) {
    const label = diagnosticIdentifier('artifact', relative)
    findings.push(...scanText(relative, relative, { artifact: true, label }))
  }
  for (const file of files) {
    const parentReal = await realpath(path.dirname(file.absolute))
    assertContained(rootReal, parentReal)
    const before = await lstat(file.absolute)
    if (before.isSymbolicLink()) throw new Error('deployment artifacts contain a symbolic link')
    const fileReal = await realpath(file.absolute)
    assertContained(rootReal, fileReal)
    if (!sameFile(before, file.before) || fileReal !== file.real) {
      throw new Error('deployment artifact changed during security scan')
    }
    const content = await readOpenFileBounded(file.absolute, before, true)
    const after = await lstat(file.absolute)
    if (after.isSymbolicLink() || !sameFile(after, before) || await realpath(file.absolute) !== fileReal) {
      throw new Error('deployment artifact changed during security scan')
    }
    findings.push(...scanBuffer(
      file.relative,
      content,
      true,
      diagnosticIdentifier('artifact', file.relative),
    ))
  }
  const rootAfter = await lstat(root)
  if (rootAfter.isSymbolicLink() || !sameFile(rootAfter, rootBefore) || await realpath(root) !== rootReal) {
    throw new Error('deployment artifact root changed during security scan')
  }
  return [...new Set(findings)]
}

export async function scanArtifactFiles(projectRoot) {
  try {
    return await scanArtifactFilesInternal(projectRoot)
  } catch (error) {
    if (/^deployment artifact/.test(error?.message)) throw error
    throw new Error('deployment artifact security scan failed')
  }
}

async function exists(candidate) {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

export async function scanPublishedCollections(projectRoot) {
  const findings = []
  for (const name of ['wiki', 'finance']) {
    const collection = collectionConfig(name)
    const docsRoot = path.join(projectRoot, 'docs', collection.docsDirectory)
    const manifestPath = path.join(projectRoot, collection.manifestFile)
    const [hasDocs, hasManifest] = await Promise.all([exists(docsRoot), exists(manifestPath)])
    if (!hasDocs || !hasManifest) {
      findings.push(`${name}: published documents and manifest must both exist`)
      continue
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const result = await validatePublishedWiki({ docsRoot, manifest, collection })
    findings.push(...result.errors.map((error) => `${name}: ${error}`))
  }
  return findings
}

export async function scanRepository(projectRoot) {
  return [
    ...await scanPublishedCollections(projectRoot),
    ...await scanTrackedFiles(projectRoot),
    ...await scanArtifactFiles(projectRoot),
  ]
}

async function main() {
  const projectRoot = path.resolve(import.meta.dirname, '../..')
  const findings = await scanRepository(projectRoot)
  if (findings.length > 0) {
    for (const finding of findings) console.error(finding)
    process.exitCode = 1
    return
  }
  console.log('Wiki QA security scan passed.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Security scan failed: ${error?.message ?? 'unknown error'}`)
    process.exitCode = 1
  })
}
