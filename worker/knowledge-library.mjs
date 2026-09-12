import { knowledgeLibrarySnapshot } from './knowledge-library-snapshot.mjs'

const UPSTREAM_URL = 'https://api.github.com/repos/ketitongxue/ai-era-html-docs/git/trees/main?recursive=1'
const MAX_TREE_BYTES = 2 * 1024 * 1024

async function readTree(response) {
  if (Number(response.headers.get('content-length')) > MAX_TREE_BYTES || !response.body) {
    throw new Error('Invalid library response size')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_TREE_BYTES) {
        await reader.cancel()
        throw new Error('Library response too large')
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } finally {
    reader.releaseLock()
  }
}

function normalizeTree(data) {
  if (!Array.isArray(data?.tree) || data.truncated !== false
    || typeof data.sha !== 'string' || !/^[a-f\d]{40}$/i.test(data.sha)) {
    throw new Error('Incomplete library tree')
  }
  const tree = []
  const paths = new Set()
  for (const item of data.tree) {
    if (!item || typeof item.path !== 'string' || typeof item.mode !== 'string'
      || !['blob', 'tree', 'commit'].includes(item.type)) throw new Error('Invalid library tree entry')
    const { path, type, mode } = item
    if (type !== 'blob' || mode !== '100644' || !path.startsWith('docs/') || !/\.html?$/i.test(path)
      || /[\\\u0000-\u001f]/.test(path)
      || path.split('/').some((part) => !part || part === '.' || part === '..') || paths.has(path)) continue
    paths.add(path)
    tree.push({ path, type, mode })
  }
  return { sha: data.sha, tree, truncated: false, source: 'live' }
}

function withoutBody(response) {
  return new Response(null, { status: response.status, headers: response.headers })
}

export function createKnowledgeTreeHandler({
  fetchImpl = (...args) => fetch(...args),
  getCache = () => globalThis.caches?.default,
  timeoutMs = 5000,
} = {}) {
  return async function handleKnowledgeTree(request, _env, ctx) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return Response.json({ error: 'METHOD_NOT_ALLOWED' }, {
        status: 405,
        headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' },
      })
    }

    // One public cache entry per site, independent of visitor headers and query strings.
    const cacheKey = new Request(new URL('/api/knowledge/tree', request.url), { method: 'GET' })
    let cache
    try {
      cache = getCache()
      const cached = await cache?.match(cacheKey)
      if (cached?.ok) return request.method === 'HEAD' ? withoutBody(cached) : cached
    } catch {
      // The directory remains available when the optional edge cache is unavailable.
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let data
    try {
      const upstream = await fetchImpl(UPSTREAM_URL, {
        method: 'GET',
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'juzxailab-knowledge-directory' },
        redirect: 'error',
        signal: controller.signal,
      })
      if (!upstream.ok) throw new Error('Library unavailable')
      data = normalizeTree(await readTree(upstream))
    } catch {
      controller.abort()
      data = { ...knowledgeLibrarySnapshot, source: 'snapshot' }
    } finally {
      clearTimeout(timer)
    }

    const response = Response.json(data, {
      headers: {
        'cache-control': `public, max-age=${data.source === 'live' ? 300 : 60}`,
        'x-content-type-options': 'nosniff',
      },
    })
    if (cache) {
      const cachedResponse = response.clone()
      const write = Promise.resolve().then(() => cache.put(cacheKey, cachedResponse)).catch(() => {})
      if (ctx?.waitUntil) ctx.waitUntil(write)
      else await write
    }
    return request.method === 'HEAD' ? withoutBody(response) : response
  }
}

export const handleKnowledgeTree = createKnowledgeTreeHandler()
