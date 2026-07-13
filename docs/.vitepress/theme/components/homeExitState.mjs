function clamp01(value) {
  if (!Number.isFinite(value)) return value === Number.POSITIVE_INFINITY ? 1 : 0
  return Math.max(0, Math.min(1, value))
}

export function normalizeExitProgress(scrollTop, start, end) {
  const position = Number(scrollTop)
  const from = Number(start)
  const to = Number(end)

  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  if (to <= from) {
    if (!Number.isFinite(position)) return position === Number.POSITIVE_INFINITY ? 1 : 0
    return position < from ? 0 : 1
  }
  if (position === Number.POSITIVE_INFINITY) return 1
  if (!Number.isFinite(position)) return 0
  return clamp01((position - from) / (to - from))
}

export function exitFrame(progress) {
  const p = clamp01(Number(progress))
  const shrink = clamp01(p / 0.55)
  const terminal = clamp01((p - 0.82) / 0.18)

  return {
    panelScale: shrink === 1 ? 0.42 : 1 - 0.58 * shrink,
    computerOpacity: shrink,
    terminalOpacity: terminal,
  }
}
