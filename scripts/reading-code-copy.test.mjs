import assert from 'node:assert/strict'
import test from 'node:test'
import { installReadingCodeCopy } from '../docs/.vitepress/theme/components/reading/readingCodeCopy.mjs'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function harness({ writeText, execCommand = () => true, text = 'first line\nsecond line\n', language = 'text', ignored = [] } = {}) {
  const attributes = new Map()
  const classes = new Set(['copy'])
  const statuses = []
  const created = []
  const listeners = new Map()
  let selectionRestored = 0
  const originalRange = { cloneRange: () => originalRange }
  const selection = {
    rangeCount: 1,
    getRangeAt: () => originalRange,
    removeAllRanges() { selectionRestored++ },
    addRange(range) { assert.equal(range, originalRange) },
  }
  const document = {
    defaultView: { navigator: { clipboard: writeText ? { writeText } : undefined } },
    activeElement: null,
    getSelection: () => selection,
    execCommand(command) { assert.equal(command, 'copy'); return execCommand(document) },
    body: { append(input) { input.isConnected = true } },
    createElement(tag) {
      assert.equal(tag, 'textarea')
      const input = {
        style: {}, isConnected: false,
        setAttribute() {},
        select() { document.activeElement = input },
        remove() { input.isConnected = false; input.removed = true },
      }
      created.push(input)
      return input
    },
  }
  function focusTarget() {
    const target = { isConnected: true, focusCalls: 0, focus(options) {
      assert.deepEqual(options, { preventScroll: true })
      target.focusCalls++
      document.activeElement = target
    } }
    return target
  }
  const button = Object.assign(focusTarget(), {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    closest: () => button,
  })
  const code = { cloneNode(deep) {
    assert.equal(deep, true)
    const clone = { textContent: text, querySelectorAll(selector) {
      assert.equal(selector, '.vp-copy-ignore, .diff.remove')
      return ignored.map((fragment) => ({ remove() { clone.textContent = clone.textContent.replace(fragment, '') } }))
    } }
    return clone
  } }
  button.parentElement = { className: `language-${language}`, querySelector: () => code }
  const panel = {
    ownerDocument: document,
    querySelector: () => button,
    addEventListener(name, listener, capture) { assert.equal(capture, true); listeners.set(name, listener) },
    removeEventListener(name, listener, capture) {
      assert.equal(capture, true)
      assert.equal(listeners.get(name), listener)
      listeners.delete(name)
    },
  }
  document.activeElement = button
  const dispose = installReadingCodeCopy(panel, { filename: 'example.txt', onStatus: (status) => statuses.push(status) })
  function click() {
    const event = { target: button, stopped: false, prevented: false,
      stopPropagation() { this.stopped = true }, preventDefault() { this.prevented = true } }
    const completion = listeners.get('click')(event)
    assert.equal(event.stopped, true, 'the window copy handler cannot receive this click')
    assert.equal(event.prevented, true)
    return completion
  }
  return { click, dispose, attributes, classes, statuses, created, document, button, focusTarget, listeners, selectionRestored: () => selectionRestored }
}

test('copying uses the one existing button and preserves code whitespace without taking focus', async (t) => {
  const writes = []
  const h = harness({ writeText: async (value) => { writes.push(value) } })
  t.after(h.dispose)
  await h.click()
  assert.deepEqual(writes, ['first line\nsecond line\n'])
  assert.equal(h.created.length, 0)
  assert.equal(h.document.activeElement, h.button)
  assert.equal(h.button.focusCalls, 0)
  assert.ok(h.classes.has('copied'))
  assert.equal(h.attributes.has('aria-disabled'), false)
  assert.equal(h.statuses.at(-1), '代码已复制')
})

test('rejected Clipboard API falls back and restores the current focus after an asynchronous wait', async (t) => {
  const request = deferred()
  const h = harness({ writeText: () => request.promise })
  t.after(h.dispose)
  const done = h.click()
  const nextControl = h.focusTarget()
  h.document.activeElement = nextControl
  request.reject(new Error('NotAllowedError'))
  await done
  assert.equal(h.created.length, 1)
  assert.equal(h.created[0].removed, true)
  assert.equal(h.document.activeElement, nextControl)
  assert.equal(h.button.focusCalls, 0)
  assert.equal(h.selectionRestored(), 1)
  assert.equal(h.statuses.at(-1), '代码已复制')
})

test('failure of both clipboard methods is visible, leaves keyboard focus usable, and can be retried', async (t) => {
  let allow = false
  const h = harness({ writeText: async () => { if (!allow) throw new Error('denied') }, execCommand: () => false })
  t.after(h.dispose)
  await h.click()
  assert.equal(h.classes.has('copied'), false)
  assert.equal(h.statuses.at(-1), '复制未完成，请选中代码手动复制。')
  assert.equal(h.attributes.get('title'), '重试复制')
  assert.equal(h.attributes.has('aria-disabled'), false)
  assert.equal(h.attributes.has('disabled'), false)
  assert.equal(h.document.activeElement, h.button)
  assert.equal(h.created[0].removed, true)
  allow = true
  await h.click()
  assert.equal(h.statuses.at(-1), '代码已复制')
})

test('repeated keyboard or pointer activation while pending issues only one clipboard request', async (t) => {
  const request = deferred()
  let writes = 0
  const h = harness({ writeText: () => { writes++; return request.promise } })
  t.after(h.dispose)
  const first = h.click()
  await h.click()
  assert.equal(writes, 1)
  assert.equal(h.attributes.get('aria-disabled'), 'true')
  assert.equal(h.attributes.has('disabled'), false)
  assert.equal(h.document.activeElement, h.button)
  request.resolve()
  await first
  assert.equal(h.attributes.has('aria-disabled'), false)
  assert.deepEqual(h.statuses, ['复制中…', '代码已复制'])
})

test('fallback exceptions clean up the selection input and do not steal a focus change', async (t) => {
  let nextControl
  const h = harness({ execCommand(document) {
    document.activeElement = nextControl
    throw new Error('unsupported')
  } })
  nextControl = h.focusTarget()
  t.after(h.dispose)
  await h.click()
  assert.equal(h.created[0].removed, true)
  assert.equal(h.document.activeElement, nextControl)
  assert.equal(h.button.focusCalls, 0)
  assert.equal(h.selectionRestored(), 0)
  assert.equal(h.statuses.at(-1), '复制未完成，请选中代码手动复制。')
})

test('closing a reader during a rejected clipboard request leaves no listener, fallback or stale feedback', async () => {
  const request = deferred()
  const h = harness({ writeText: () => request.promise })
  const done = h.click()
  h.dispose()
  request.reject(new Error('denied'))
  await done
  assert.equal(h.listeners.size, 0)
  assert.equal(h.created.length, 0)
  assert.equal(h.attributes.has('aria-disabled'), false)
  assert.deepEqual(h.statuses, ['复制中…'])
})

test('shell snippets retain VitePress prompt stripping and ignored-line behavior', async (t) => {
  const writes = []
  const h = harness({
    writeText: async (value) => writes.push(value),
    text: '$ npm test\n> npm run build\nREMOVED\nIGNORE\n',
    language: 'bash', ignored: ['REMOVED\n', 'IGNORE\n'],
  })
  t.after(h.dispose)
  await h.click()
  assert.deepEqual(writes, ['npm test\nnpm run build'])
})
