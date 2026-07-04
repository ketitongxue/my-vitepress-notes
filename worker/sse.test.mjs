import assert from 'node:assert/strict'
import test from 'node:test'

import { createSseResponse, encodeEvent } from './sse.mjs'

test('encodeEvent emits exact JSON SSE framing and rejects injectable event names', () => {
  assert.equal(
    encodeEvent('delta', { text: 'first\ndata: forged' }),
    'event: delta\ndata: {"text":"first\\ndata: forged"}\n\n',
  )
  assert.throws(() => encodeEvent('delta\nevent: error', {}), /event type/i)
  assert.throws(() => encodeEvent('delta', undefined), /JSON serializable/i)
})

test('createSseResponse sets streaming security and cache headers', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: done\ndata: {}\n\n'))
      controller.close()
    },
  })
  const response = createSseResponse(stream)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(await response.text(), 'event: done\ndata: {}\n\n')
})
