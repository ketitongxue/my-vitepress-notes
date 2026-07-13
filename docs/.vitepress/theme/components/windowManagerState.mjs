import { constrainWindow } from './desktopGeometry.mjs'

export const createWindowState = () => ({ windows: [], nextZ: 10, cascade: 0 })

export function focusWindow(state, id) {
  const nextZ = state.nextZ + 1
  return {
    ...state,
    nextZ,
    windows: state.windows.map((item) => item.id === id ? { ...item, z: nextZ } : item),
  }
}

export function openWindow(state, entry, bounds) {
  if (state.windows.some(({ id }) => id === entry.id)) return focusWindow(state, entry.id)
  const offset = (state.cascade % 5) * 32
  const rect = constrainWindow({ x: 96 + offset, y: 72 + offset, width: 420, height: 300 }, bounds)
  const nextZ = state.nextZ + 1
  return {
    windows: [...state.windows, { id: entry.id, entry, ...rect, z: nextZ }],
    nextZ,
    cascade: state.cascade + 1,
  }
}

export const closeWindow = (state, id) => ({
  ...state,
  windows: state.windows.filter((item) => item.id !== id),
})

export function moveWindow(state, id, point, bounds) {
  return {
    ...state,
    windows: state.windows.map((item) => item.id === id
      ? { ...item, ...constrainWindow({ ...item, x: point.x, y: point.y }, bounds) }
      : item),
  }
}

export function resizeWindow(state, id, size, bounds) {
  return {
    ...state,
    windows: state.windows.map((item) => item.id === id
      ? { ...item, ...constrainWindow({ ...item, width: size.width, height: size.height }, bounds) }
      : item),
  }
}

export function resizeWindowByKey(state, id, key, shiftKey, bounds) {
  const item = state.windows.find((window) => window.id === id)
  const direction = {
    ArrowLeft: { width: -1, height: 0 },
    ArrowRight: { width: 1, height: 0 },
    ArrowUp: { width: 0, height: -1 },
    ArrowDown: { width: 0, height: 1 },
  }[key]
  if (!item || !direction) return state
  const step = shiftKey ? 32 : 8
  return resizeWindow(state, id, {
    width: item.width + direction.width * step,
    height: item.height + direction.height * step,
  }, bounds)
}
