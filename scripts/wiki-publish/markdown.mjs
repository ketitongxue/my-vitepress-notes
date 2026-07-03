const PUBLIC_FIELDS = ['title', 'type', 'tags', 'created', 'updated']

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0]
    const last = value.at(-1)
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1)
    }
  }
  return value
}

function parseValue(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((item) => unquote(item.trim()))
  }
  return unquote(trimmed)
}

export function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---\n')) return { frontmatter: {}, body: markdown }

  const closing = markdown.indexOf('\n---\n', 4)
  if (closing === -1) return { frontmatter: {}, body: markdown }

  const frontmatter = {}
  for (const line of markdown.slice(4, closing).split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    if (key) frontmatter[key] = parseValue(line.slice(separator + 1))
  }

  return { frontmatter, body: markdown.slice(closing + 5) }
}

function serializeValue(value) {
  if (Array.isArray(value)) return `[${value.map(String).join(', ')}]`
  return String(value)
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
  return /(^|\n)\s*sources\s*:/i.test(markdown)
    || /(?:^|[\s(])raw[\\/]/i.test(markdown)
    || /(?:^|[\s('"`])\/(?:Users|home|private|var|tmp|etc|opt|root|usr|bin|sbin|dev|proc|sys|srv|mnt)\//.test(markdown)
    || /(?:^|[\s('"`])[A-Za-z]:[\\/]/.test(markdown)
    || markdown.includes('[[')
}
