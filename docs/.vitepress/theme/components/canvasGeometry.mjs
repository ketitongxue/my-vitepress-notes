const MIN_SCALE = 0.15
const MAX_SCALE = 3

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

  return {
    scale,
    panX: (viewport.width - bounds.width * scale) / 2 - bounds.x * scale,
    panY: (viewport.height - bounds.height * scale) / 2 - bounds.y * scale,
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

export function connectionEndpoints(fromCard, toCard) {
  return {
    x1: fromCard.x + fromCard.width / 2,
    y1: fromCard.y + fromCard.height / 2,
    x2: toCard.x + toCard.width / 2,
    y2: toCard.y + toCard.height / 2,
  }
}
