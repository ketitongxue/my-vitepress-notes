const PUBLIC_FIELDS = ['title', 'type', 'tags', 'created', 'updated']

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0]
    const last = value.at(-1)
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).replace(/\\(.)/g, '$1')
    }
  }
  return value
}

function parseInlineArray(value) {
  const items = []
  let item = ''
  let quote = null
  let escaped = false

  for (const character of value) {
    if (escaped) {
      item += character
      escaped = false
    } else if (quote && character === '\\') {
      escaped = true
    } else if (quote && character === quote) {
      quote = null
    } else if (!quote && (character === '"' || character === "'")) {
      quote = character
    } else if (!quote && character === ',') {
      items.push(item.trim())
      item = ''
    } else {
      item += character
    }
  }
  items.push(item.trim())
  return items
}

function parseValue(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return parseInlineArray(inner)
  }
  return unquote(trimmed)
}

export function parseFrontmatter(markdown) {
  const opening = /^\uFEFF?---\r?\n/.exec(markdown)
  if (!opening) return { frontmatter: {}, body: markdown }

  const remainder = markdown.slice(opening[0].length)
  const closing = /^---\r?\n/m.exec(remainder)
  if (!closing) return { frontmatter: {}, body: markdown }

  const frontmatter = {}
  for (const line of remainder.slice(0, closing.index).replace(/\r?\n$/, '').split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    if (key) frontmatter[key] = parseValue(line.slice(separator + 1))
  }

  return { frontmatter, body: remainder.slice(closing.index + closing[0].length) }
}

function safeString(value) {
  const text = String(value)
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new TypeError('frontmatter values cannot contain a control character')
  return text
}

function serializeValue(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(safeString))
  return JSON.stringify(safeString(value))
}

export function serializePublicFrontmatter(frontmatter) {
  const lines = PUBLIC_FIELDS
    .filter((field) => Object.hasOwn(frontmatter, field))
    .map((field) => `${field}: ${serializeValue(frontmatter[field])}`)
  return `---\n${lines.join('\n')}\n---\n`
}

export function convertWikilinks(markdown, known) {
  const warnings = []
  const warned = new Set()
  const converted = markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, rawTarget, rawLabel) => {
    const target = rawTarget.trim()
    const label = rawLabel?.trim() || target
    const publicPath = known.get(target)
    if (publicPath) return `[${label}](${publicPath})`
    if (!warned.has(target)) {
      warnings.push(target)
      warned.add(target)
    }
    return label
  })
  return { markdown: converted, warnings }
}

export function containsPrivateData(markdown) {
  const withoutUrls = markdown.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>)]+/gi, '')
  const hasUnixAbsolutePath = [...withoutUrls.matchAll(/(?:^|[^\p{L}\p{N}_/])\/(?!\/)([^\s)\]}>]+)/gu)]
    .some((match) => {
      const path = `/${match[1]}`
      return path !== '/wiki' && !path.startsWith('/wiki/')
    })

  return /(^|\n)\s*sources\s*:/i.test(markdown)
    || /(?:^|[\s\\/])raw[\\/]/i.test(withoutUrls)
    || hasUnixAbsolutePath
    || /(?:^|[\s('"`])[A-Za-z]:[\\/]/.test(markdown)
    || markdown.includes('[[')
}
