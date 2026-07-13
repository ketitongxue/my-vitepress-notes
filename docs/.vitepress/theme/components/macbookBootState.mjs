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

export function writeAccessed(storage) {
  try { storage?.setItem('personal-site-accessed', 'true'); return Boolean(storage) }
  catch { return false }
}
