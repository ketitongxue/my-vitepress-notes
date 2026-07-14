export const distance = (start, current) => Math.hypot(current.x - start.x, current.y - start.y)

export const isDragDistance = (start, current, threshold = 4) => distance(start, current) > threshold

const DOUBLE_CLICK_SUPPRESSION_MS = 700

export const createIconActivationState = () => ({ suppressDoubleClickUntil: 0 })

export function finishIconPointer(state, { dragged, pointerType, timeStamp }) {
  const suppressDoubleClickUntil = dragged || pointerType === 'touch'
    ? Math.max(state.suppressDoubleClickUntil, timeStamp + DOUBLE_CLICK_SUPPRESSION_MS)
    : state.suppressDoubleClickUntil
  return {
    state: { suppressDoubleClickUntil },
    openTouch: pointerType === 'touch' && !dragged,
  }
}

export function consumeIconDoubleClick(state, timeStamp) {
  return {
    state: createIconActivationState(),
    open: state.suppressDoubleClickUntil <= timeStamp,
  }
}

const DEFAULT_ICON_SIZE = { width: 88, height: 76 }

const clamp = (value, maximum) => Math.max(0, Math.min(value, Math.max(0, maximum)))

export function resolveSurfaceBounds(currentBounds, width, height, inset = 0) {
  const nextWidth = Number(width)
  const nextHeight = Number(height) - Number(inset)
  if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
    return currentBounds
  }
  return { width: nextWidth, height: nextHeight }
}

export function constrainIconPosition(position, bounds, size = DEFAULT_ICON_SIZE) {
  return {
    anchor: position.anchor === 'right' ? 'right' : 'left',
    x: clamp(position.x, bounds.width - size.width),
    y: clamp(position.y, bounds.height - size.height),
  }
}

export function resolveIconPosition(position, bounds, size = DEFAULT_ICON_SIZE) {
  const constrained = constrainIconPosition(position, bounds, size)
  return {
    x: constrained.anchor === 'right'
      ? Math.max(0, bounds.width - size.width - constrained.x)
      : constrained.x,
    y: constrained.y,
  }
}

export function constrainWindow(rect, bounds, min = { width: 280, height: 200 }) {
  const x = Math.max(0, Math.min(rect.x, Math.max(0, bounds.width - min.width)))
  const y = Math.max(0, Math.min(rect.y, Math.max(0, bounds.height - min.height)))
  const width = Math.max(min.width, Math.min(rect.width, bounds.width - x))
  const height = Math.max(min.height, Math.min(rect.height, bounds.height - y))
  return { x, y, width, height }
}
