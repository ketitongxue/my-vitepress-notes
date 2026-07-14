export const OS_VIEWS = Object.freeze(['home', 'knowledge', 'system'])

export function normalizeOsHash(hash = '') {
  const candidate = String(hash).replace(/^#/, '')
  return OS_VIEWS.includes(candidate) ? candidate : 'home'
}

export function hashForOsView(view) {
  return `#${OS_VIEWS.includes(view) ? view : 'home'}`
}

export function initialOsView(claimedView) {
  return OS_VIEWS.includes(claimedView) ? claimedView : 'home'
}

export function hasCompletedHomeEntry(accessState) {
  return accessState === 'returning' || accessState === 'fallback'
}
