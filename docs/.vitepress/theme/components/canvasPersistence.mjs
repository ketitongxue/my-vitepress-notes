export const CANVAS_LAYOUT_KEY = 'juzx-personal-os-layout-v3'

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
    && Number.isFinite(card.x + card.width)
    && Number.isFinite(card.y + card.height)
    && typeof card.visible === 'boolean'
}

function withTrustedDimensions(card, trusted) {
  if (!isObject(card)) return null
  const hasWidth = Object.hasOwn(card, 'width')
  const hasHeight = Object.hasOwn(card, 'height')
  if (hasWidth !== hasHeight) return null
  if (hasWidth) return { ...card }
  return { ...card, width: trusted.width, height: trusted.height }
}

function hasFiniteLayoutBounds(cards) {
  const minX = Math.min(...cards.map(({ x }) => x))
  const minY = Math.min(...cards.map(({ y }) => y))
  const maxX = Math.max(...cards.map(({ x, width }) => x + width))
  const maxY = Math.max(...cards.map(({ y, height }) => y + height))
  return Number.isFinite(maxX - minX) && Number.isFinite(maxY - minY)
}

function validOrder(order, ids) {
  if (!Array.isArray(order) || order.length !== ids.size) return false
  const orderedIds = new Set()
  for (const id of order) {
    if (typeof id !== 'string' || !ids.has(id) || orderedIds.has(id)) return false
    orderedIds.add(id)
  }
  return orderedIds.size === ids.size
}

function validLayout(layout, requireTrustedMinimums = false) {
  if (!isObject(layout) || !Number.isSafeInteger(layout.contentRevision)
    || layout.contentRevision < 0 || !validTransform(layout.transform)) return false
  if (!Array.isArray(layout.cards) || layout.cards.length === 0) return false
  const ids = new Set()
  for (const card of layout.cards) {
    if (!validCard(card) || ids.has(card.id)) return false
    if (requireTrustedMinimums && (
      !isFiniteNumber(card.minWidth) || card.minWidth <= 0
      || !isFiniteNumber(card.minHeight) || card.minHeight <= 0
    )) return false
    ids.add(card.id)
  }
  return validOrder(layout.order, ids) && hasFiniteLayoutBounds(layout.cards)
}

function serializableEnvelope(layout) {
  if (!validLayout(layout)) return null
  return {
    version: 3,
    contentRevision: layout.contentRevision,
    transform: {
      scale: layout.transform.scale,
      panX: layout.transform.panX,
      panY: layout.transform.panY,
    },
    order: [...layout.order],
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
  if (typeof raw !== 'string' || !validLayout(defaults, true)) return null

  try {
    const stored = JSON.parse(raw)
    if (!isObject(stored) || stored.version !== 3) return null
    if (stored.contentRevision !== defaults.contentRevision) return null
    if (!validTransform(stored.transform) || !Array.isArray(stored.cards)) return null
    if (stored.cards.length !== defaults.cards.length) return null

    const trustedIds = new Set(defaults.cards.map(({ id }) => id))
    if (!validOrder(stored.order, trustedIds)) return null
    const storedById = new Map()
    for (const card of stored.cards) {
      if (!isObject(card) || !trustedIds.has(card.id) || storedById.has(card.id)) return null
      const trusted = defaults.cards.find(({ id }) => id === card.id)
      const geometry = withTrustedDimensions(card, trusted)
      if (!validCard(geometry)) return null
      if (geometry.width < trusted.minWidth || geometry.height < trusted.minHeight) return null
      storedById.set(card.id, geometry)
    }
    if (storedById.size !== trustedIds.size) return null
    if (!hasFiniteLayoutBounds([...storedById.values()])) return null

    return {
      contentRevision: defaults.contentRevision,
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
      order: [...stored.order],
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
