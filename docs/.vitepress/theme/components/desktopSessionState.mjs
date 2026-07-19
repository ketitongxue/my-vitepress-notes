import { constrainIconPosition, constrainWindow } from './desktopGeometry.mjs'

export const DESKTOP_SESSION_KEY = 'juzx-os:v1:desktop-session'
const MAX_SESSION_BYTES = 64 * 1024

const finite = (value) => Number.isFinite(value)
const nonNegativeInteger = (value, fallback = 0) => (
  Number.isInteger(value) && value >= 0 ? value : fallback
)

export function getDesktopSessionStorage(windowLike = globalThis) {
  try {
    return windowLike?.sessionStorage ?? null
  } catch {
    return null
  }
}

function serializedWindow(item) {
  if (!item || typeof item.id !== 'string') return null
  if (![item.x, item.y, item.width, item.height, item.z].every(finite)) return null
  const saved = {
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    z: item.z,
  }
  if (item.maximized === true) {
    saved.maximized = true
    if (item.restoreRect && [
      item.restoreRect.x,
      item.restoreRect.y,
      item.restoreRect.width,
      item.restoreRect.height,
    ].every(finite)) saved.restoreRect = { ...item.restoreRect }
  }
  return saved
}

export function serializeDesktopSession(iconPositions, windowState) {
  const icons = {}
  for (const [id, position] of Object.entries(iconPositions ?? {})) {
    if (typeof id !== 'string' || !position || ![position.x, position.y].every(finite)) continue
    icons[id] = {
      anchor: position.anchor === 'right' ? 'right' : 'left',
      x: position.x,
      y: position.y,
    }
  }
  const windows = (Array.isArray(windowState?.windows) ? windowState.windows : [])
    .map(serializedWindow)
    .filter(Boolean)
  return JSON.stringify({
    version: 1,
    icons,
    windows,
    nextZ: nonNegativeInteger(windowState?.nextZ, 10),
    cascade: nonNegativeInteger(windowState?.cascade),
  })
}

export function saveDesktopSession(storage, iconPositions, windowState, key = DESKTOP_SESSION_KEY) {
  try {
    if (!storage) return false
    storage.setItem(key, serializeDesktopSession(iconPositions, windowState))
    return true
  } catch {
    return false
  }
}

function restoredIcons(saved, entries, bounds) {
  return Object.fromEntries(entries.map((entry) => {
    const candidate = saved?.icons?.[entry.id]
    const position = candidate && [candidate.x, candidate.y].every(finite)
      ? candidate
      : { anchor: 'right', ...entry.position }
    return [entry.id, constrainIconPosition(position, bounds)]
  }))
}

function restoredWindows(saved, entries, bounds) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]))
  const seen = new Set()
  const windows = []
  for (const candidate of Array.isArray(saved?.windows) ? saved.windows : []) {
    const entry = entryById.get(candidate?.id)
    if (!entry || seen.has(candidate.id)) continue
    if (![candidate.x, candidate.y, candidate.width, candidate.height, candidate.z].every(finite)) continue
    seen.add(candidate.id)
    const rect = constrainWindow(candidate, bounds)
    const restored = { id: candidate.id, entry, ...rect, z: candidate.z }
    if (candidate.maximized === true) {
      const restoreRect = candidate.restoreRect
        && [
          candidate.restoreRect.x,
          candidate.restoreRect.y,
          candidate.restoreRect.width,
          candidate.restoreRect.height,
        ].every(finite)
        ? constrainWindow(candidate.restoreRect, bounds)
        : rect
      Object.assign(restored, {
        maximized: true,
        restoreRect,
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height,
      })
    }
    windows.push(restored)
  }
  return windows
}

export function parseDesktopSession(serialized, entries, bounds) {
  if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > MAX_SESSION_BYTES) return null
  let saved
  try {
    saved = JSON.parse(serialized)
  } catch {
    return null
  }
  if (!saved || saved.version !== 1 || !Array.isArray(entries)) return null
  const windows = restoredWindows(saved, entries, bounds)
  const highestZ = windows.reduce((highest, item) => Math.max(highest, item.z), 10)
  return {
    iconPositions: restoredIcons(saved, entries, bounds),
    windowState: {
      windows,
      nextZ: Math.max(highestZ, nonNegativeInteger(saved.nextZ, 10)),
      cascade: nonNegativeInteger(saved.cascade),
    },
  }
}

export function loadDesktopSession(storage, entries, bounds, key = DESKTOP_SESSION_KEY) {
  try {
    if (!storage) return null
    const serialized = storage.getItem(key)
    if (serialized === null) return null
    const restored = parseDesktopSession(serialized, entries, bounds)
    if (!restored) storage.removeItem(key)
    return restored
  } catch {
    return null
  }
}
