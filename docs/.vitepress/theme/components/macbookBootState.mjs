export const MACBOOK_INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[tabindex],audio[controls],video[controls],[role="button"],[role="link"]'

export function transitionMacbookBoot(state, event) {
  if (event === 'SKIP') return 'desktop'
  if (state === 'typing' && event === 'TYPING_COMPLETE') return 'ready'
  if (state === 'ready' && event === 'ACTIVATE') return 'launching'
  if (state === 'launching' && event === 'PROGRESS_COMPLETE') return 'zooming'
  if (state === 'zooming' && event === 'ZOOM_COMPLETE') return 'desktop'
  return state
}

export function progressCells(count) {
  const filled = Math.max(0, Math.min(12, Math.trunc(count)))
  return `[${'#'.repeat(filled)}${'-'.repeat(12 - filled)}]`
}

export function computeCoverTransform(screen, viewport) {
  const scale = Math.max(viewport.width / screen.width, viewport.height / screen.height)
  return {
    scale,
    translateX: viewport.width / 2 - (screen.left + screen.width / 2),
    translateY: viewport.height / 2 - (screen.top + screen.height / 2),
  }
}

export function getSessionStorage(browser) {
  try { return browser?.sessionStorage } catch { return undefined }
}

export function getReducedMotionPreference(browser) {
  try { return typeof browser?.matchMedia !== 'function' || browser.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return true }
}

export function shouldSkipMacbookBoot(storage, reducedMotion = false) {
  if (reducedMotion || !storage) return true
  const probeKey = 'personal-site-access-probe'
  try {
    const accessed = storage.getItem('personal-site-accessed') === 'true'
    storage.setItem(probeKey, 'true')
    storage.removeItem(probeKey)
    return accessed
  } catch {
    try { storage.removeItem?.(probeKey) } catch {}
    return true
  }
}

export function isMacbookInteractiveTarget(target) {
  return Boolean(target?.closest?.(MACBOOK_INTERACTIVE_SELECTOR))
}

export function shouldActivateMacbookFromEnter(event, state) {
  return state === 'ready' && event?.key === 'Enter' && !event.repeat && !event.isComposing
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
    && !isMacbookInteractiveTarget(event.target)
}

export function createMacbookBootRuntime(browser, handleKeydown, disabled = false) {
  const timers = new Set()
  let stopped = Boolean(disabled)
  let listening = false
  const guardedKeydown = (event) => {
    if (!stopped) handleKeydown(event)
  }

  return {
    schedule(callback, delay) {
      if (stopped) return undefined
      const timer = browser.setTimeout(() => {
        timers.delete(timer)
        if (!stopped) callback()
      }, delay)
      timers.add(timer)
      return timer
    },
    listen() {
      if (stopped || listening) return false
      browser.addEventListener('keydown', guardedKeydown)
      listening = true
      return true
    },
    stop() {
      stopped = true
      for (const timer of timers) browser.clearTimeout(timer)
      timers.clear()
      if (listening) {
        browser.removeEventListener('keydown', guardedKeydown)
        listening = false
      }
    },
  }
}

export function writeAccessed(storage) {
  try { storage?.setItem('personal-site-accessed', 'true'); return Boolean(storage) }
  catch { return false }
}
