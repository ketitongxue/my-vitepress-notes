import { normalizePersonalOsConfig } from '../../../../shared/personal-os-config.mjs'
import { canvasCards, canvasConnections } from './personalOsContent.mjs'

export function staticPersonalOsConfiguration() {
  return {
    revision: 0,
    source: 'static',
    config: normalizePersonalOsConfig({ cards: canvasCards, connections: canvasConnections }),
  }
}

export async function loadPersonalOsConfiguration({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') return staticPersonalOsConfiguration()
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null
  try {
    const response = await fetchImpl('/api/personal-os/config', {
      headers: { accept: 'application/json' },
      signal: controller?.signal,
    })
    if (!response.ok) throw new Error(`Personal OS configuration request failed: ${response.status}`)
    const payload = await response.json()
    if (!Number.isSafeInteger(payload?.revision) || payload.revision < 1) {
      throw new Error('Personal OS configuration revision is invalid')
    }
    return {
      revision: payload.revision,
      source: 'd1',
      config: normalizePersonalOsConfig(payload.config),
    }
  } catch {
    return staticPersonalOsConfiguration()
  } finally {
    if (timeout !== null) clearTimeout(timeout)
  }
}
