import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('navigation and page expose the dedicated ask experience', async () => {
  const [config, page] = await Promise.all([
    read('docs/.vitepress/config.mts'),
    read('docs/ask/index.md'),
  ])
  assert.match(config, /text:\s*['"]问答['"],\s*link:\s*['"]\/ask\/['"]/)
  assert.match(page, /layout:\s*page/)
  assert.match(page, /WikiAsk/)
})

test('component meets interaction, persistence, stream, and safety contracts', async () => {
  const component = await read('docs/.vitepress/theme/components/WikiAsk.vue')

  for (const state of ['idle', 'retrieving', 'streaming', 'complete', 'error']) {
    assert.match(component, new RegExp(`['"]${state}['"]`), `missing state ${state}`)
  }
  assert.match(component, /<label[^>]*for=/)
  assert.match(component, /<textarea[^>]*id=/)
  assert.match(component, /发送/)
  assert.match(component, /停止生成/)
  assert.match(component, /清空对话/)
  assert.match(component, /aria-live=['"]polite['"]/)
  assert.match(component, /new AbortController\(\)/)
  assert.match(component, /sessionStorage\.(?:getItem|setItem|removeItem)/)
  assert.match(component, /wiki-ask:v1/)
  assert.match(component, /MAX_HISTORY_ITEMS\s*=\s*6/)
  assert.match(component, /\.slice\(-MAX_HISTORY_ITEMS\)/)
  for (const event of ['meta', 'delta', 'done', 'error']) {
    assert.match(component, new RegExp(`['"]${event}['"]`), `missing SSE event ${event}`)
  }
  assert.equal(component.includes('/^\\/wiki\\/'), true)
  assert.doesNotMatch(component, /v-html/)
})

test('ask styles include sticky composer, mobile layout, and reduced motion', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.wiki-ask__composer[\s\S]*position:\s*sticky/)
  assert.match(css, /@media\s*\(max-width:\s*720px\)/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
