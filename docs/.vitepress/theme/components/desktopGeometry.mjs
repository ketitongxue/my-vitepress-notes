export const distance = (start, current) => Math.hypot(current.x - start.x, current.y - start.y)

export const isDragDistance = (start, current, threshold = 4) => distance(start, current) > threshold

export function constrainWindow(rect, bounds, min = { width: 280, height: 200 }) {
  const x = Math.max(0, Math.min(rect.x, Math.max(0, bounds.width - min.width)))
  const y = Math.max(0, Math.min(rect.y, Math.max(0, bounds.height - min.height)))
  const width = Math.max(min.width, Math.min(rect.width, bounds.width - x))
  const height = Math.max(min.height, Math.min(rect.height, bounds.height - y))
  return { x, y, width, height }
}
