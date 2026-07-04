const encoder = new TextEncoder()

export function encodeEvent(type, data) {
  if (typeof type !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(type)) {
    throw new TypeError('Invalid SSE event type')
  }
  const json = JSON.stringify(data)
  if (json === undefined) throw new TypeError('SSE data must be JSON serializable')
  return `event: ${type}\ndata: ${json}\n\n`
}

export function createSseResponse(stream) {
  return new Response(stream, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  })
}

export function encodeEventBytes(type, data) {
  return encoder.encode(encodeEvent(type, data))
}
