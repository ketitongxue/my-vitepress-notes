import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { scanWikiSnapshot } from '@ketitongxue/llm-wiki-publisher/core'
import { containsPrivateData, parseFrontmatter } from '@ketitongxue/llm-wiki-publisher/markdown'

const PUBLIC_DIRECTORIES = ['comparisons', 'concepts', 'entities']
const TARGET_MAX = 900
const TARGET_MIN = 500

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function normalizeSearchText(value) {
  return String(value)
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function searchTerms(value) {
  const normalized = normalizeSearchText(value)
  const terms = []
  for (const token of normalized.split(' ').filter(Boolean)) {
    const latinOrNumber = /^[a-z0-9]+$/i.test(token)
    if (latinOrNumber || token.length <= 2) {
      terms.push(token)
      continue
    }
    // CJK bigrams make Chinese keyword matching useful without a runtime segmenter.
    for (let index = 0; index < token.length - 1; index += 1) {
      terms.push(token.slice(index, index + 2))
    }
  }
  return terms
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*|```$/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[~*_]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sectionBlocks(body, fallbackTitle) {
  const blocks = []
  let section = fallbackTitle
  let buffer = []
  const flush = () => {
    const text = plainText(buffer.join('\n'))
    if (text) blocks.push({ section, text })
    buffer = []
  }

  for (const line of body.split(/\r?\n/)) {
    const heading = /^(#{1,3})\s+(.+?)\s*$/.exec(line)
    if (!heading) {
      buffer.push(line)
      continue
    }
    flush()
    if (heading[1].length === 1 && plainText(heading[2]) === fallbackTitle) continue
    section = plainText(heading[2]) || fallbackTitle
  }
  flush()
  return blocks
}

function splitIndivisibleParagraph(text) {
  if (text.length <= TARGET_MAX) return [text]
  const sentences = text.split(/(?<=[。！？；.!?;])\s*/u).filter(Boolean)
  const pieces = []
  let current = ''
  for (const sentence of sentences) {
    if (sentence.length > TARGET_MAX) {
      if (current) pieces.push(current)
      current = ''
      for (let start = 0; start < sentence.length; start += TARGET_MAX) {
        pieces.push(sentence.slice(start, start + TARGET_MAX))
      }
    } else if (!current || current.length + sentence.length <= TARGET_MAX) {
      current += sentence
    } else {
      pieces.push(current)
      current = sentence
    }
  }
  if (current) pieces.push(current)
  if (pieces.length > 1 && pieces.at(-1).length < TARGET_MIN) {
    const tail = pieces.pop()
    const previous = pieces.pop()
    const combined = previous + tail
    const pivot = Math.ceil(combined.length / 2)
    pieces.push(combined.slice(0, pivot), combined.slice(pivot))
  }
  return pieces
}

function splitLongText(text) {
  if (text.length <= TARGET_MAX) return [text]
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const units = paragraphs.flatMap(splitIndivisibleParagraph)
  const pieces = []
  let current = ''
  for (const unit of units) {
    const separator = current ? '\n\n' : ''
    if (!current || current.length + separator.length + unit.length <= TARGET_MAX) {
      current += separator + unit
    } else {
      pieces.push(current)
      current = unit
    }
  }
  if (current) pieces.push(current)
  return pieces
}

function decorateChunk(page, section, text) {
  const allTerms = searchTerms(`${page.title} ${page.tags.join(' ')} ${section} ${text}`)
  const frequencies = Object.create(null)
  for (const term of allTerms) frequencies[term] = (frequencies[term] ?? 0) + 1
  const sortedFrequencies = Object.create(null)
  for (const term of Object.keys(frequencies).sort(compareCodePoints)) {
    sortedFrequencies[term] = frequencies[term]
  }
  const id = createHash('sha256').update(page.url + section + text).digest('hex').slice(0, 16)
  return {
    id,
    title: page.title,
    type: page.type,
    tags: page.tags,
    section,
    url: page.url,
    text,
    terms: Object.keys(sortedFrequencies),
    frequencies: sortedFrequencies,
  }
}

export function splitDocument(page) {
  const pieces = sectionBlocks(page.body, page.title).flatMap(({ section, text }) =>
    splitLongText(text).map((piece) => ({ section, text: piece })),
  )
  const merged = []
  for (const piece of pieces) {
    const previous = merged.at(-1)
    if (previous && previous.text.length < TARGET_MIN
      && previous.text.length + piece.text.length + 2 <= TARGET_MAX) {
      previous.text += `\n\n${piece.text}`
      if (previous.section !== piece.section) previous.section += ` / ${piece.section}`
    } else {
      merged.push({ ...piece })
    }
  }
  if (merged.length > 1 && merged.at(-1).text.length < TARGET_MIN) {
    const tail = merged.at(-1)
    const previous = merged.at(-2)
    if (previous.text.length + tail.text.length + 2 <= TARGET_MAX) {
      previous.text += `\n\n${tail.text}`
      if (previous.section !== tail.section) previous.section += ` / ${tail.section}`
      merged.pop()
    }
  }
  return merged.map(({ section, text }) => decorateChunk(page, section, text))
}

export async function buildIndex(docsRoot) {
  const wikiRoot = path.join(docsRoot, 'wiki')
  const pages = []
  const chunks = []
  const { contents } = await scanWikiSnapshot(wikiRoot)
  for (const typeDirectory of PUBLIC_DIRECTORIES) {
    const prefix = `${typeDirectory}/`
    for (const sourcePath of Object.keys(contents).filter((entry) => entry.startsWith(prefix)).sort(compareCodePoints)) {
      const markdown = contents[sourcePath]
      if (containsPrivateData(markdown)) {
        throw new Error(`Wiki page contains private data or an unresolved wikilink: ${sourcePath}`)
      }
      const { frontmatter, body } = parseFrontmatter(markdown)
      const url = `/wiki/${sourcePath.slice(0, -3)}`
      const page = {
        title: String(frontmatter.title ?? path.posix.basename(sourcePath, '.md')),
        type: String(frontmatter.type ?? typeDirectory.slice(0, -1)),
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
        url,
        body,
      }
      const pageChunks = splitDocument(page)
      if (pageChunks.length === 0) throw new Error(`Wiki page has no indexable content: ${url}`)
      pages.push({ title: page.title, type: page.type, tags: page.tags, url })
      chunks.push(...pageChunks)
    }
  }
  const index = { version: 1, pages, chunks }
  if (containsPrivateData(JSON.stringify(index))) {
    throw new Error('Generated index contains private data or an unresolved wikilink')
  }
  return index
}

async function writeIndex() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const destination = path.join(projectRoot, 'worker', 'generated', 'wiki-index.json')
  const temporary = `${destination}.tmp-${randomUUID()}`
  await mkdir(path.dirname(destination), { recursive: true })
  try {
    const index = await buildIndex(path.join(projectRoot, 'docs'))
    await writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`)
    await rename(temporary, destination)
    console.log(`Indexed ${index.pages.length} pages into ${index.chunks.length} chunks.`)
  } finally {
    await rm(temporary, { force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeIndex()
}
