export const BOOT_STORAGE_KEY = 'ai-era:knowledge-factory:booted'
export const BOOT_STORAGE_VALUE = 'v1'

export function readInitialBootState(storage, reducedMotion = false) {
  if (reducedMotion) return 'skipped'
  try {
    return storage?.getItem(BOOT_STORAGE_KEY) === BOOT_STORAGE_VALUE ? 'skipped' : 'ready'
  } catch {
    return 'ready'
  }
}

export function writeBooted(storage) {
  try {
    storage?.setItem(BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE)
    return Boolean(storage)
  } catch {
    return false
  }
}

export function transitionBoot(state, event) {
  if (event === 'SKIP') return 'skipped'
  if (state === 'ready' && event === 'START') return 'booting'
  if (state === 'booting' && event === 'COMPLETE') return 'complete'
  return state
}

export function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('a,button,input,textarea,select,summary,[contenteditable="true"],[role="button"],[role="link"]'))
}

export function shouldStartFromEnter(event, state) {
  return state === 'ready' && event?.key === 'Enter' && !event.repeat && !event.isComposing
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isInteractiveTarget(event.target)
}
