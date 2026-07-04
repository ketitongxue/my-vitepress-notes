import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const TEST_FILES = /(?:^|\/)\w[\w.-]*\.test\.mjs$/
const POLICY_DOCS = /^docs\/superpowers\/(?:plans|specs)\//
const TEST_NET = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.(?:\d{1,3})$/
const PRIVATE_FIXTURE_FILES = new Set([
  'a.md', 'article.md', 'bad.md', 'private-note.md', 'private.log', 'private.md', 'secret.md', 'source.md',
])

function addFinding(findings, file, kind) {
  findings.push(`${file}: ${kind}`)
}

function isFixturePath(value) {
  const pieces = value.split(/[\\/]/).filter(Boolean)
  return pieces.some((piece) => /^(?:alice|person|test|fake)$/i.test(piece))
    || PRIVATE_FIXTURE_FILES.has(pieces.at(-1)?.toLowerCase())
}

function withoutWebUrls(text) {
  return text.replace(/(?:https?:)?\/\/[^\s'"`<>]+/gi, '')
}

export function scanText(file, text, { artifact = false } = {}) {
  const findings = []
  const isTest = TEST_FILES.test(file)
  const allowDocumentedPath = !artifact && POLICY_DOCS.test(file)

  for (const match of text.matchAll(/\bsk-[A-Za-z0-9_-]{20,}\b/g)) {
    if (!(isTest && /^sk-(?:fake|test)-/.test(match[0]))) {
      addFinding(findings, file, 'possible provider secret')
    }
  }

  for (const match of text.matchAll(/\bDEEPSEEK_API_KEY\s*=\s*['"]?([A-Za-z0-9_$.-][A-Za-z0-9_$./-]*)['"]?/g)) {
    if (!(isTest && /^(?:fake|test|fixture)-/.test(match[1]))) {
      addFinding(findings, file, 'assigned DeepSeek API key')
    }
  }

  const pathText = withoutWebUrls(text)
  const absolutePaths = [
    ...pathText.matchAll(/(?:^|[^A-Za-z0-9_:/.-])(\/(?:Users|home|root|private|tmp|var)\/[A-Za-z0-9._~ -][^\s)'"`]*)/gm),
    ...pathText.matchAll(/(?:^|[^A-Za-z0-9_])(\b[A-Za-z]:[\\/][^\s)'"`]+)/gm),
    ...pathText.matchAll(/(?:^|[^\\])(\\\\[A-Za-z0-9._-]+[\\/][A-Za-z0-9$._-]+(?:[\\/][^\s)'"`]+)?)/gm),
  ]
  for (const match of absolutePaths) {
    if (!allowDocumentedPath && (artifact || !isTest || !isFixturePath(match[1]))) {
      addFinding(findings, file, 'local absolute path')
    }
  }

  for (const match of pathText.matchAll(/(?:^|[\s/\\('"`])(raw[\\/][A-Za-z0-9_.-]+(?:[\\/][A-Za-z0-9_.-]+)*)(?=$|[\s)'"`\],])/gim)) {
    if (!allowDocumentedPath && (artifact || !isTest || !isFixturePath(match[1]))) {
      addFinding(findings, file, 'private source path')
    }
  }

  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    const octets = match[0].split('.').map(Number)
    if (octets.some((octet) => octet > 255)) continue
    if (!(isTest && TEST_NET.test(match[0]))) addFinding(findings, file, 'full IP address')
  }

  return [...new Set(findings)]
}

async function scanFile(root, relative, artifact = false) {
  const content = await readFile(path.join(root, relative))
  if (content.includes(0)) return []
  return scanText(relative, content.toString('utf8'), { artifact })
}

export async function scanTrackedFiles(projectRoot) {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  const files = stdout.split('\0').filter(Boolean)
  return (await Promise.all(files.map((file) => scanFile(projectRoot, file)))).flat()
}

async function artifactFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...await artifactFiles(path.join(directory, entry.name), relative))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

export async function scanArtifactFiles(projectRoot) {
  const root = path.join(projectRoot, 'docs/.vitepress/dist')
  let files
  try {
    files = await artifactFiles(root)
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('deployment artifacts are missing; run docs:build first')
    throw error
  }
  if (files.length === 0) throw new Error('deployment artifacts are empty; run docs:build first')
  return (await Promise.all(files.map((file) => scanFile(root, file, true)))).flat()
}

export async function scanRepository(projectRoot) {
  return [
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
