import { constrainWindow, minimumWindowSize } from './desktopGeometry.mjs'

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
  const rect = constrainWindow({ x: 96 + offset, y: 72 + offset, width: 580, height: 360 }, bounds)
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
  const item = state.windows.find((window) => window.id === id)
  if (!item || item.maximized) return state
  return {
    ...state,
    windows: state.windows.map((window) => window.id === id
      ? { ...window, ...constrainWindow({ ...window, x: point.x, y: point.y }, bounds) }
      : window),
  }
}

export function resizeWindow(state, id, size, bounds) {
  const item = state.windows.find((window) => window.id === id)
  if (!item || item.maximized) return state
  return {
    ...state,
    windows: state.windows.map((window) => window.id === id
      ? { ...window, ...constrainWindow({ ...window, width: size.width, height: size.height }, bounds) }
      : window),
  }
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(value, maximum))

export function resizeWindowFromEdge(state, id, edge, delta, bounds) {
  const item = state.windows.find((window) => window.id === id)
  if (!item || item.maximized || !/^(?:n|s|e|w|ne|nw|se|sw)$/.test(edge)) return state

  const minimum = minimumWindowSize(bounds)
  let left = item.x
  let top = item.y
  let right = item.x + item.width
  let bottom = item.y + item.height

  if (edge.includes('w')) left = clamp(item.x + delta.x, 0, right - minimum.width)
  if (edge.includes('e')) right = clamp(right + delta.x, left + minimum.width, bounds.width)
  if (edge.includes('n')) top = clamp(item.y + delta.y, 0, bottom - minimum.height)
  if (edge.includes('s')) bottom = clamp(bottom + delta.y, top + minimum.height, bounds.height)

  return {
    ...state,
    windows: state.windows.map((window) => window.id === id
      ? { ...window, x: left, y: top, width: right - left, height: bottom - top }
      : window),
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
  if (!item || item.maximized || !direction) return state
  const step = shiftKey ? 32 : 8
  return resizeWindow(state, id, {
    width: item.width + direction.width * step,
    height: item.height + direction.height * step,
  }, bounds)
}

export function toggleMaximizeWindow(state, id, bounds) {
  const item = state.windows.find((window) => window.id === id)
  if (!item) return state
  const nextZ = state.nextZ + 1

  return {
    ...state,
    nextZ,
    windows: state.windows.map((window) => {
      if (window.id !== id) return window
      if (window.maximized) {
        const { maximized, restoreRect, ...restored } = window
        return {
          ...restored,
          ...constrainWindow(restoreRect ?? restored, bounds),
          z: nextZ,
        }
      }
      return {
        ...window,
        restoreRect: {
          x: window.x,
          y: window.y,
          width: window.width,
          height: window.height,
        },
        maximized: true,
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height,
        z: nextZ,
      }
    }),
  }
}

export function constrainWindowState(state, bounds) {
  return {
    ...state,
    windows: state.windows.map((item) => item.maximized
      ? { ...item, x: 0, y: 0, width: bounds.width, height: bounds.height }
      : { ...item, ...constrainWindow(item, bounds) }),
  }
}
