function withNoStore(response) {
  const headers = new Headers(response.headers)
  headers.set('cache-control', 'no-store')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export { DailyQuota } from './daily-quota.mjs'

function notFound() {
  return Response.json(
    { error: 'Not found' },
    { status: 404, headers: { 'cache-control': 'no-store' } },
  )
}

async function notImplemented() {
  return Response.json(
    { error: 'Not implemented' },
    { status: 501, headers: { 'cache-control': 'no-store' } },
  )
}

export function createWorker({ askHandler = notImplemented } = {}) {
  return {
    async fetch(request, env, ctx) {
      const { pathname } = new URL(request.url)

      if (pathname === '/api/ask' && request.method === 'POST') {
        return withNoStore(await askHandler(request, env, ctx))
      }

      if (pathname === '/api' || pathname.startsWith('/api/')) {
        return notFound()
      }

      return env.ASSETS.fetch(request)
    },
  }
}

export default createWorker()
