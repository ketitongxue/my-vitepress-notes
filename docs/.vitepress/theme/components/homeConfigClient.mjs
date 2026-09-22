import { DEFAULT_HOME_CONFIG, normalizeHomeConfig } from '../../../../shared/home-config.mjs'
import { isLibraryRootHref, libraryUrl } from './knowledgeLibrary.mjs'

function readerHref(href) {
  if (!isLibraryRootHref(href)) return href
  const { search, hash } = new URL(href)
  return `${libraryUrl}${search}${hash}`
}

export function staticHomeConfiguration() {
  return {
    revision: 0,
    source: 'static',
    config: DEFAULT_HOME_CONFIG,
  }
}

export async function loadHomeConfiguration({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') return staticHomeConfiguration()
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null
  try {
    const response = await fetchImpl('/api/home/config', {
      headers: { accept: 'application/json' },
      signal: controller?.signal,
    })
    if (!response.ok) throw new Error(`Home configuration request failed: ${response.status}`)
    const payload = await response.json()
    if (!Number.isSafeInteger(payload?.revision) || payload.revision < 1) {
      throw new Error('Home configuration revision is invalid')
    }
    // Adapt published legacy links for readers without rewriting the saved D1 configuration.
    const config = normalizeHomeConfig(payload.config)
    for (const link of config.desktop.menuLinks) link.href = readerHref(link.href)
    for (const entry of config.desktop.entries) {
      if (entry.window.href) entry.window.href = readerHref(entry.window.href)
    }
    return {
      revision: payload.revision,
      source: 'd1',
      config,
    }
  } catch {
    return staticHomeConfiguration()
  } finally {
    if (timeout !== null) clearTimeout(timeout)
  }
}
