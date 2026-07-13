export const CANVAS_LAYOUT_KEY = 'juzx-personal-os-layout-v1'

const MIN_SCALE = 0.15
const MAX_SCALE = 3

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function validTransform(transform) {
  return isObject(transform)
    && isFiniteNumber(transform.scale)
    && transform.scale >= MIN_SCALE
    && transform.scale <= MAX_SCALE
    && isFiniteNumber(transform.panX)
    && isFiniteNumber(transform.panY)
}

function validCard(card) {
  return isObject(card)
    && typeof card.id === 'string'
    && card.id.length > 0
    && isFiniteNumber(card.x)
    && isFiniteNumber(card.y)
    && isFiniteNumber(card.width)
    && card.width > 0
    && isFiniteNumber(card.height)
    && card.height > 0
    && typeof card.visible === 'boolean'
}

function validLayout(layout) {
  if (!isObject(layout) || !validTransform(layout.transform)) return false
  if (!Array.isArray(layout.cards) || layout.cards.length === 0) return false
  const ids = new Set()
  for (const card of layout.cards) {
    if (!validCard(card) || ids.has(card.id)) return false
    ids.add(card.id)
  }
  return true
}

function serializableEnvelope(layout) {
  if (!validLayout(layout)) return null
  return {
    version: 1,
    transform: {
      scale: layout.transform.scale,
      panX: layout.transform.panX,
      panY: layout.transform.panY,
    },
    cards: layout.cards.map(({ id, x, y, width, height, visible }) => ({
      id, x, y, width, height, visible,
    })),
  }
}

export function serializeCanvasLayout(layout) {
  const envelope = serializableEnvelope(layout)
  if (!envelope) throw new TypeError('Invalid canvas layout')
  return JSON.stringify(envelope)
}

export function parseCanvasLayout(raw, defaults) {
  if (typeof raw !== 'string' || !validLayout(defaults)) return null

  try {
    const stored = JSON.parse(raw)
    if (!isObject(stored) || stored.version !== 1) return null
    if (!validTransform(stored.transform) || !Array.isArray(stored.cards)) return null
    if (stored.cards.length !== defaults.cards.length) return null

    const trustedIds = new Set(defaults.cards.map(({ id }) => id))
    const storedById = new Map()
    for (const card of stored.cards) {
      if (!validCard(card) || !trustedIds.has(card.id) || storedById.has(card.id)) return null
      storedById.set(card.id, card)
    }
    if (storedById.size !== trustedIds.size) return null

    return {
      cards: defaults.cards.map((trusted) => {
        const geometry = storedById.get(trusted.id)
        return {
          ...trusted,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          visible: geometry.visible,
        }
      }),
      transform: {
        scale: stored.transform.scale,
        panX: stored.transform.panX,
        panY: stored.transform.panY,
      },
    }
  } catch {
    return null
  }
}

export function loadCanvasLayout(storage, defaults) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return null
    const raw = storage.getItem(CANVAS_LAYOUT_KEY)
    if (raw === null) return null
    return parseCanvasLayout(raw, defaults)
  } catch {
    return null
  }
}

export function saveCanvasLayout(storage, layout) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false
    storage.setItem(CANVAS_LAYOUT_KEY, serializeCanvasLayout(layout))
    return true
  } catch {
    return false
  }
}
