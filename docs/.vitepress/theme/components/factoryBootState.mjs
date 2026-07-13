export const BOOT_STORAGE_KEY = 'personal-site-accessed'
export const BOOT_STORAGE_VALUE = 'true'

export function getSessionStorage(browser) {
  try {
    return browser?.sessionStorage
  } catch {
    return undefined
  }
}

export function getReducedMotionPreference(browser) {
  try {
    if (typeof browser?.matchMedia !== 'function') return true
    return Boolean(browser.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch {
    return true
  }
}

export function readInitialBootState(storage, reducedMotion = false, preflightState = 'none') {
  if (reducedMotion || preflightState !== 'pending' || !storage) return 'skipped'
  try {
    return storage.getItem(BOOT_STORAGE_KEY) === BOOT_STORAGE_VALUE ? 'skipped' : 'ready'
  } catch {
    return 'skipped'
  }
}

export function writeAccessed(storage) {
  try {
    storage?.setItem(BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE)
    return Boolean(storage)
  } catch {
    return false
  }
}

export function transitionBoot(state, event) {
  if (state === 'ready' && event === 'ACTIVATE') return 'leaving'
  if (state === 'leaving' && event === 'EXIT_COMPLETE') return 'complete'
  if (state === 'ready' && event === 'BYPASS') return 'skipped'
  return state
}

export function beginAccess(state, storage) {
  if (state !== 'ready') return state
  return writeAccessed(storage)
    ? transitionBoot(state, 'ACTIVATE')
    : transitionBoot(state, 'BYPASS')
}

export function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"]),audio[controls],video[controls],[role="button"],[role="link"]'))
}

export function shouldActivateFromEnter(event, state) {
  return state === 'ready' && event?.key === 'Enter' && !event.repeat && !event.isComposing
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isInteractiveTarget(event.target)
}

export function shouldContainTab(event, state) {
  return (state === 'ready' || state === 'leaving') && event?.key === 'Tab'
}
