const CARD_TYPES = new Set([
  'identity', 'timeline', 'principle', 'skills', 'knowledge', 'status', 'next',
])
const ACCENTS = new Set(['blue', 'yellow', 'green', 'orange'])
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_CARDS = 50
const MAX_CONNECTIONS = 100

export const PERSONAL_OS_SCHEMA_VERSION = 1

export class PersonalOsConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PersonalOsConfigError'
  }
}

function fail(message) {
  throw new PersonalOsConfigError(message)
}

function exactObject(value, name, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`)
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(`${name}.${key} is not supported`)
  }
  return value
}

function text(value, name, { max, required = true } = {}) {
  if (typeof value !== 'string') fail(`${name} must be a string`)
  const normalized = value.trim()
  if (required && normalized.length === 0) fail(`${name} is required`)
  if (normalized.length > max) fail(`${name} is too long`)
  return normalized
}

function optionalText(value, name, max) {
  if (value === undefined || value === null || value === '') return undefined
  return text(value, name, { max })
}

function number(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail(`${name} is out of range`)
  return Math.round(value * 100) / 100
}

function safeHref(value, name) {
  const href = text(value, name, { max: 500 })
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href
  try {
    const url = new URL(href)
    if (url.protocol === 'https:') return url.href
  } catch {
    // Fall through to the validation error.
  }
  fail(`${name} must be a site path or HTTPS URL`)
}

function normalizeCard(value, index) {
  const name = `cards[${index}]`
  const card = exactObject(value, name, new Set([
    'id', 'type', 'kicker', 'title', 'body', 'x', 'y', 'width', 'height',
    'minWidth', 'minHeight', 'visible', 'accent', 'mark', 'items', 'links', 'status',
  ]))
  const type = text(card.type, `${name}.type`, { max: 32 })
  if (!CARD_TYPES.has(type)) fail(`${name}.type is not supported`)
  const accent = text(card.accent, `${name}.accent`, { max: 16 })
  if (!ACCENTS.has(accent)) fail(`${name}.accent is not supported`)
  const items = card.items ?? []
  const links = card.links ?? []
  if (!Array.isArray(items) || items.length > 20) fail(`${name}.items is invalid`)
  if (!Array.isArray(links) || links.length > 12) fail(`${name}.links is invalid`)

  const normalized = {
    id: text(card.id, `${name}.id`, { max: 64 }),
    type,
    kicker: text(card.kicker, `${name}.kicker`, { max: 80 }),
    title: text(card.title, `${name}.title`, { max: 120 }),
    body: typeof card.body === 'string'
      ? text(card.body, `${name}.body`, { max: 1200, required: false })
      : fail(`${name}.body must be a string`),
    x: number(card.x, `${name}.x`, -5000, 10000),
    y: number(card.y, `${name}.y`, -5000, 10000),
    width: number(card.width, `${name}.width`, 120, 2000),
    height: number(card.height, `${name}.height`, 80, 2000),
    minWidth: number(card.minWidth, `${name}.minWidth`, 120, 1200),
    minHeight: number(card.minHeight, `${name}.minHeight`, 80, 1200),
    visible: card.visible !== false,
    accent,
    items: items.map((item, itemIndex) => text(item, `${name}.items[${itemIndex}]`, { max: 80 })),
    links: links.map((link, linkIndex) => {
      const linkName = `${name}.links[${linkIndex}]`
      exactObject(link, linkName, new Set(['label', 'href']))
      return {
        label: text(link.label, `${linkName}.label`, { max: 80 }),
        href: safeHref(link.href, `${linkName}.href`),
      }
    }),
  }
  if (!ID_PATTERN.test(normalized.id)) fail(`${name}.id has an invalid format`)
  if (normalized.minWidth > normalized.width || normalized.minHeight > normalized.height) {
    fail(`${name} minimum size exceeds its default size`)
  }
  for (const [key, max] of [['mark', 24], ['status', 32]]) {
    const optional = optionalText(card[key], `${name}.${key}`, max)
    if (optional !== undefined) normalized[key] = optional
  }
  return normalized
}

export function normalizePersonalOsConfig(input) {
  const root = exactObject(input, 'config', new Set(['cards', 'connections']))
  if (!Array.isArray(root.cards) || root.cards.length === 0 || root.cards.length > MAX_CARDS) {
    fail('config.cards is invalid')
  }
  if (!Array.isArray(root.connections) || root.connections.length > MAX_CONNECTIONS) {
    fail('config.connections is invalid')
  }

  const cards = root.cards.map(normalizeCard)
  const ids = new Set()
  for (const card of cards) {
    if (ids.has(card.id)) fail(`duplicate card id: ${card.id}`)
    ids.add(card.id)
  }

  const edgeIds = new Set()
  const connections = root.connections.map((value, index) => {
    const name = `connections[${index}]`
    const connection = exactObject(value, name, new Set(['from', 'to']))
    const from = text(connection.from, `${name}.from`, { max: 64 })
    const to = text(connection.to, `${name}.to`, { max: 64 })
    if (!ids.has(from) || !ids.has(to)) fail(`${name} references an unknown card`)
    if (from === to) fail(`${name} cannot connect a card to itself`)
    const edgeId = `${from}:${to}`
    if (edgeIds.has(edgeId)) fail(`${name} is duplicated`)
    edgeIds.add(edgeId)
    return { from, to }
  })

  return { cards, connections }
}

export function makeStaticPersonalOsConfig(cards, connections) {
  return normalizePersonalOsConfig({ cards, connections })
}
