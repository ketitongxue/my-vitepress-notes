import { DEFAULT_HOME_CONFIG, normalizeHomeConfig } from '../../../../shared/home-config.mjs'

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
    return {
      revision: payload.revision,
      source: 'd1',
      config: normalizeHomeConfig(payload.config),
    }
  } catch {
    return staticHomeConfiguration()
  } finally {
    if (timeout !== null) clearTimeout(timeout)
  }
}
