function focusElement(element) {
  if (!element?.isConnected || element.closest('[inert], [aria-hidden="true"]')) return false
  if (!element.getClientRects().length) return false
  element.focus({ preventScroll: true })
  return element.ownerDocument.activeElement === element
}

// Keep browser focus separate from persisted window geometry. Call open/restore
// after Vue renders so a departing transition cannot receive focus again.
export function createWindowFocusManager({ getWindowElement, getTopWindowId, getFallbackElement }) {
  const openers = new Map()
  const lastFocused = new Map()

  return {
    rememberOpener(id, element) {
      if (element && !getWindowElement(id)?.contains(element)) openers.set(id, element)
    },

    recordFocus(id, element) {
      if (getWindowElement(id)?.contains(element)) lastFocused.set(id, element)
    },

    focusOpenedWindow(id) {
      return focusElement(getWindowElement(id))
    },

    prepareClose(id) {
      const departing = getWindowElement(id)
      const document = departing?.ownerDocument
      const shouldRestore = departing?.contains(document.activeElement)
      const opener = openers.get(id)
      const fallback = getFallbackElement(id)
      openers.delete(id)
      lastFocused.delete(id)

      return () => {
        if (!shouldRestore) return
        const active = document.activeElement
        // Closing a background window, or focus moving elsewhere before the
        // render completes, must not steal another control's keyboard focus.
        if (active && active !== document.body && active !== document.documentElement && !departing.contains(active)) return
        const nextId = getTopWindowId()
        if (nextId && (focusElement(lastFocused.get(nextId)) || focusElement(getWindowElement(nextId)))) return
        if (!focusElement(opener)) focusElement(fallback)
      }
    },
  }
}
