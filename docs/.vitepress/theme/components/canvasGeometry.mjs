const MIN_SCALE = 0.15
const MAX_SCALE = 3
const PRIMARY_IDS = new Set([
  'identity', 'growth-product', 'growth-ai',
])

export function clampScale(scale) {
  if (!Number.isFinite(scale)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function screenToWorld(point, transform) {
  return {
    x: (point.x - transform.panX) / transform.scale,
    y: (point.y - transform.panY) / transform.scale,
  }
}

export function zoomAtPoint(transform, nextScale, point) {
  const worldPoint = screenToWorld(point, transform)
  const scale = clampScale(nextScale)
  return {
    scale,
    panX: point.x - worldPoint.x * scale,
    panY: point.y - worldPoint.y * scale,
  }
}

export function canvasWheelTransform(transform, event, point) {
  const nextScale = transform.scale * Math.exp(-event.deltaY * 0.001)
  return zoomAtPoint(transform, nextScale, point)
}

export function resolveTouchOwner(owner, touches, isInteractiveTarget) {
  if (touches.length === 0) return null
  if (owner === 'interactive') return 'interactive'

  for (let index = 0; index < touches.length; index += 1) {
    if (isInteractiveTarget(touches[index].target)) return 'interactive'
  }

  return 'canvas'
}

export function fitWorldBounds(bounds, viewport, padding = 64) {
  const availableWidth = Math.max(0, viewport.width - padding * 2)
  const availableHeight = Math.max(0, viewport.height - padding * 2)
  const scale = clampScale(Math.min(
    availableWidth / bounds.width,
    availableHeight / bounds.height,
  ))
  const centerAtScale = (nextScale) => ({
    scale: nextScale,
    panX: (viewport.x ?? 0)
      + (viewport.width - bounds.width * nextScale) / 2 - bounds.x * nextScale,
    panY: (viewport.y ?? 0)
      + (viewport.height - bounds.height * nextScale) / 2 - bounds.y * nextScale,
  })

  const fitted = centerAtScale(scale)
  if (Object.values(fitted).every(Number.isFinite)) return fitted

  const safeFitted = centerAtScale(Math.min(scale, 1))
  if (Object.values(safeFitted).every(Number.isFinite)) return safeFitted
  return { scale: 1, panX: 0, panY: 0 }
}

export function initialFitCards(cards, mobile) {
  return cards.filter((card) => card.visible !== false && (!mobile || PRIMARY_IDS.has(card.id)))
}

export function computeWorldBounds(cards, fallback, padding = 96) {
  const visible = cards.filter((card) => card.visible !== false
    && [card.x, card.y, card.width, card.height].every(Number.isFinite)
    && card.width > 0 && card.height > 0
    && Number.isFinite(card.x + card.width)
    && Number.isFinite(card.y + card.height))
  if (visible.length === 0) return { ...fallback }

  const minX = Math.min(...visible.map(({ x }) => x))
  const minY = Math.min(...visible.map(({ y }) => y))
  const maxX = Math.max(...visible.map(({ x, width }) => x + width))
  const maxY = Math.max(...visible.map(({ y, height }) => y + height))
  const bounds = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
  if (!Object.values(bounds).every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) return { ...fallback }
  return bounds
}

export function canvasUsableViewport(viewport, mobile) {
  if (mobile) {
    return {
      x: 16,
      y: 16,
      width: Math.max(1, viewport.width - 32),
      height: Math.max(1, viewport.height - 176),
    }
  }
  return {
    x: 72,
    y: 24,
    width: Math.max(1, viewport.width - 96),
    height: Math.max(1, viewport.height - 120),
  }
}

export function touchGesture(touches) {
  const first = touches[0]
  const second = touches[1]
  const dx = second.clientX - first.clientX
  const dy = second.clientY - first.clientY

  return {
    center: {
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2,
    },
    distance: Math.hypot(dx, dy),
  }
}

const RESIZE_EDGES = new Set(['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw'])

export function resizeCardGeometry(initial, edge, delta, minimum) {
  if (!RESIZE_EDGES.has(edge)) return { ...initial }

  const minWidth = Math.max(1, minimum.minWidth)
  const minHeight = Math.max(1, minimum.minHeight)
  const right = initial.x + initial.width
  const bottom = initial.y + initial.height
  let x = initial.x
  let y = initial.y
  let width = initial.width
  let height = initial.height

  if (edge.includes('w')) {
    width = Math.max(minWidth, initial.width - delta.x)
    x = right - width
  } else if (edge.includes('e')) {
    width = Math.max(minWidth, initial.width + delta.x)
  }

  if (edge.includes('n')) {
    height = Math.max(minHeight, initial.height - delta.y)
    y = bottom - height
  } else if (edge.includes('s')) {
    height = Math.max(minHeight, initial.height + delta.y)
  }

  return { x, y, width, height }
}

function rectangleEdgePoint(card, direction) {
  const center = {
    x: card.x + card.width / 2,
    y: card.y + card.height / 2,
  }
  const halfWidth = Math.max(card.width / 2, Number.EPSILON)
  const halfHeight = Math.max(card.height / 2, Number.EPSILON)
  const denominator = Math.max(
    Math.abs(direction.x) / halfWidth,
    Math.abs(direction.y) / halfHeight,
  )
  if (!Number.isFinite(denominator) || denominator <= Number.EPSILON) return center
  const distance = 1 / denominator
  return {
    x: center.x + direction.x * distance,
    y: center.y + direction.y * distance,
  }
}

export function connectionEndpoints(fromCard, toCard) {
  const fromCenter = {
    x: fromCard.x + fromCard.width / 2,
    y: fromCard.y + fromCard.height / 2,
  }
  const toCenter = {
    x: toCard.x + toCard.width / 2,
    y: toCard.y + toCard.height / 2,
  }
  const direction = {
    x: toCenter.x - fromCenter.x,
    y: toCenter.y - fromCenter.y,
  }
  const fromEdge = rectangleEdgePoint(fromCard, direction)
  const toEdge = rectangleEdgePoint(toCard, { x: -direction.x, y: -direction.y })
  return {
    x1: fromEdge.x,
    y1: fromEdge.y,
    x2: toEdge.x,
    y2: toEdge.y,
  }
}
