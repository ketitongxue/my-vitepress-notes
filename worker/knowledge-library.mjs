const UPSTREAM_URL = 'https://ketitongxue.github.io/ai-era-html-docs/docs/directory.json'
const MAX_TREE_BYTES = 2 * 1024 * 1024
const FRESH_SECONDS = 60
const LAST_SUCCESS_SECONDS = 7 * 24 * 60 * 60
const CACHE_PATH = '/api/knowledge/tree/__published_v1/'
const FETCHED_AT_HEADER = 'x-knowledge-fetched-at'
const PUBLIC_HEADERS = {
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'x-content-type-options': 'nosniff',
}

class DirectoryError extends Error {
  constructor(category, status) {
    super(category)
    this.category = category
    this.status = status
  }
}

async function readTree(response) {
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new DirectoryError('content_type')
  }
  if (Number(response.headers.get('content-length')) > MAX_TREE_BYTES || !response.body) {
    throw new DirectoryError('response_size')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_TREE_BYTES) {
        await reader.cancel()
        throw new DirectoryError('response_size')
      }
      try {
        text += decoder.decode(value, { stream: true })
      } catch {
        throw new DirectoryError('json')
      }
    }
    try {
      return JSON.parse(text + decoder.decode())
    } catch {
      throw new DirectoryError('json')
    }
  } finally {
    reader.releaseLock()
  }
}

function normalizeTree(data) {
  const generatedTime = typeof data?.generatedAt === 'string' ? Date.parse(data.generatedAt) : NaN
  if (data?.schemaVersion !== 1 || !Array.isArray(data.tree) || data.truncated !== false
    || typeof data.sha !== 'string' || !/^[a-f\d]{40}$/i.test(data.sha)
    || !Number.isFinite(generatedTime)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(data.generatedAt)
    || new Date(generatedTime).toISOString().replace('.000Z', 'Z') !== data.generatedAt.replace('.000Z', 'Z')) {
    throw new DirectoryError('schema')
  }
  const tree = []
  const paths = new Set()
  for (const item of data.tree) {
    if (!item || typeof item.path !== 'string' || item.type !== 'blob' || item.mode !== '100644') {
      throw new DirectoryError('schema')
    }
    const { path, type, mode } = item
    if (!path.startsWith('docs/') || !/\.html?$/i.test(path)
      || /[\\\u0000-\u001f\u007f]/.test(path)
      || path.split('/').some((part) => !part || part === '.' || part === '..') || paths.has(path)) {
      throw new DirectoryError('path')
    }
    paths.add(path)
    tree.push({ path, type, mode })
  }
  return { schemaVersion: 1, sha: data.sha, generatedAt: data.generatedAt, tree, truncated: false }
}

function publicResponse(request, data, status = 200, headers = {}) {
  const response = Response.json(data, { status, headers: { ...PUBLIC_HEADERS, ...headers } })
  return request.method === 'HEAD'
    ? new Response(null, { status: response.status, headers: response.headers })
    : response
}

export function createKnowledgeTreeHandler({
  fetchImpl = (...args) => fetch(...args),
  getCache = () => globalThis.caches?.default,
  timeoutMs = 5000,
  now = () => Date.now(),
  warn = (entry) => console.warn(JSON.stringify(entry)),
} = {}) {
  // Log only controlled categories: never include exception text, visitor headers or upstream bodies.
  function log(event, category, fallback, status) {
    warn({ event, category, ...(status === undefined ? {} : { status }), fallback })
  }

  async function readCached(cache, key, lifetime) {
    try {
      const cached = await cache?.match(key)
      if (!cached?.ok) return undefined
      const fetchedAt = Number(cached.headers.get(FETCHED_AT_HEADER))
      const age = now() - fetchedAt
      if (!Number.isFinite(fetchedAt) || !cached.headers.has(FETCHED_AT_HEADER)
        || age < 0 || age >= lifetime * 1000) return undefined
      return normalizeTree(await readTree(cached))
    } catch {
      log('knowledge_directory_cache_failure', 'cache_read', 'upstream')
      return undefined
    }
  }

  return async function handleKnowledgeTree(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...PUBLIC_HEADERS,
          allow: 'GET, HEAD, OPTIONS',
          'access-control-allow-methods': 'GET, HEAD, OPTIONS',
          'access-control-allow-headers': 'Content-Type',
        },
      })
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return publicResponse(request, { error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'GET, HEAD, OPTIONS' })
    }

    // Versioned, public cache keys never contain visitor headers or arbitrary query strings.
    const freshKey = new Request(new URL(`${CACHE_PATH}fresh`, request.url))
    const lastSuccessKey = new Request(new URL(`${CACHE_PATH}last-success`, request.url))
    let cache
    try {
      cache = getCache()
    } catch {
      log('knowledge_directory_cache_failure', 'cache_access', 'upstream')
    }
    if (new URL(request.url).searchParams.get('refresh') !== '1') {
      const cached = await readCached(cache, freshKey, FRESH_SECONDS)
      if (cached) return publicResponse(request, { ...cached, source: 'live' })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let data
    try {
      const upstream = await fetchImpl(UPSTREAM_URL, {
        method: 'GET',
        headers: { accept: 'application/json', 'cache-control': 'no-cache' },
        redirect: 'error',
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!upstream.ok) throw new DirectoryError('upstream_http', upstream.status)
      data = normalizeTree(await readTree(upstream))
    } catch (error) {
      const category = controller.signal.aborted ? 'timeout'
        : error instanceof DirectoryError ? error.category : 'network'
      controller.abort()
      const stale = await readCached(cache, lastSuccessKey, LAST_SUCCESS_SECONDS)
      log('knowledge_directory_upstream_failure', category, stale ? 'last_success' : 'none',
        error instanceof DirectoryError ? error.status : undefined)
      if (stale) return publicResponse(request, { ...stale, source: 'stale' })
      return publicResponse(request, { error: 'KNOWLEDGE_DIRECTORY_UNAVAILABLE' }, 503)
    } finally {
      clearTimeout(timer)
    }

    if (cache) {
      const fetchedAt = String(now())
      // Cache API entries are local to a data center and may be evicted before their TTL.
      // Only successful fetches refresh these entries; failures never extend stale data's lifetime.
      const writes = Promise.all([
        [freshKey, FRESH_SECONDS],
        [lastSuccessKey, LAST_SUCCESS_SECONDS],
      ].map(([key, lifetime]) => Promise.resolve().then(() => cache.put(key, Response.json(data, {
        headers: { 'cache-control': `public, max-age=${lifetime}`, [FETCHED_AT_HEADER]: fetchedAt },
      }))).catch(() => log('knowledge_directory_cache_failure', 'cache_write', 'live'))))
      if (ctx?.waitUntil) ctx.waitUntil(writes)
      else await writes
    }
    return publicResponse(request, { ...data, source: 'live' })
  }
}

export const handleKnowledgeTree = createKnowledgeTreeHandler()
