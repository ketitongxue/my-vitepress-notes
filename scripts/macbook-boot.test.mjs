import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createMacbookBootRuntime, getLocalStorage, getReducedMotionPreference,
  shouldSkipMacbookBoot, shouldSkipMacbookFromEnter, startMacbookBootSequence, writeAccessed,
} from '../docs/.vitepress/theme/components/macbookBootState.mjs'

function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function fakeBrowser() {
  let now = 0
  let nextId = 0
  const timers = new Map()
  const listeners = new Map()
  return {
    get now() { return now },
    get pendingTimers() { return timers.size },
    get listeners() { return listeners.size },
    setTimeout(callback, delay) {
      const id = ++nextId
      timers.set(id, { at: now + delay, callback })
      return id
    },
    clearTimeout: (id) => timers.delete(id),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    block(milliseconds) { now += milliseconds },
    advance(milliseconds) {
      const end = now + milliseconds
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        const [id, timer] = next
        timers.delete(id)
        now = Math.max(now, timer.at)
        timer.callback()
      }
      now = end
    },
  }
}

test('automatic boot completes within 1.2 seconds without an activation event', () => {
  const browser = fakeBrowser()
  const events = []
  const runtime = createMacbookBootRuntime(browser, () => {})
  startMacbookBootSequence(runtime, {
    onProgress: (count) => events.push(['progress', count, browser.now]),
    onZoom: () => events.push(['zoom', browser.now]),
    onComplete: () => events.push(['desktop', browser.now]),
  })
  browser.advance(1200)
  assert.equal(events.filter(([kind]) => kind === 'progress').length, 12)
  assert.deepEqual(events.find(([kind]) => kind === 'zoom'), ['zoom', 240])
  assert.deepEqual(events.at(-1), ['desktop', 960])
  assert.equal(browser.pendingTimers, 0)
})

test('a busy main thread does not accumulate extra boot time after progress callbacks are delayed', () => {
  const browser = fakeBrowser()
  const events = []
  const runtime = createMacbookBootRuntime(browser, () => {})
  startMacbookBootSequence(runtime, {
    onProgress: (count) => events.push(['progress', count, browser.now]),
    onZoom: () => events.push(['zoom', browser.now]),
    onComplete: () => events.push(['desktop', browser.now]),
  })
  browser.advance(100)
  browser.block(400)
  browser.advance(700)
  assert.deepEqual(events.find(([kind]) => kind === 'zoom'), ['zoom', 500])
  assert.deepEqual(events.at(-1), ['desktop', 960])
  assert.equal(browser.pendingTimers, 0)
})

for (const interruptionTime of [40, 400]) {
  test(`skipping or unmounting at ${interruptionTime}ms cancels the remaining boot sequence`, () => {
    const browser = fakeBrowser()
    const runtime = createMacbookBootRuntime(browser, () => {})
    let entered = 0
    runtime.listen()
    startMacbookBootSequence(runtime, {
      onProgress() {}, onZoom() {}, onComplete() { entered += 1 },
    })
    browser.advance(interruptionTime)
    runtime.stop()
    browser.advance(2000)
    assert.equal(entered, 0)
    assert.equal(browser.pendingTimers, 0)
    assert.equal(browser.listeners, 0)
  })
}

test('the accessed marker skips boot in a new tab with independent session storage', () => {
  const persistentStorage = storage()
  const firstTab = { localStorage: persistentStorage, sessionStorage: storage() }
  assert.equal(shouldSkipMacbookBoot(getLocalStorage(firstTab)), false)
  assert.equal(writeAccessed(getLocalStorage(firstTab)), true)
  const laterTab = { localStorage: persistentStorage, sessionStorage: storage() }
  assert.equal(laterTab.sessionStorage.getItem('personal-site-accessed'), null)
  assert.equal(shouldSkipMacbookBoot(getLocalStorage(laterTab)), true)
})

test('reduced motion and unavailable or unwritable storage fail open to the desktop', () => {
  const blockedBrowser = { get localStorage() { throw new Error('blocked') } }
  assert.equal(shouldSkipMacbookBoot(getLocalStorage(blockedBrowser)), true)
  assert.equal(shouldSkipMacbookBoot(storage(), true), true)
  assert.equal(shouldSkipMacbookBoot({
    getItem: () => null,
    setItem() { throw new Error('quota exceeded') },
    removeItem() {},
  }), true)
  assert.equal(getReducedMotionPreference({}), true)
  assert.equal(writeAccessed(undefined), false)
})

test('Enter can skip automatic progress and zoom without stealing control keystrokes', () => {
  for (const state of ['launching', 'zooming']) {
    assert.equal(shouldSkipMacbookFromEnter({ key: 'Enter' }, state), true)
    for (const flag of ['repeat', 'isComposing', 'metaKey', 'ctrlKey', 'altKey', 'shiftKey']) {
      assert.equal(shouldSkipMacbookFromEnter({ key: 'Enter', [flag]: true }, state), false)
    }
    assert.equal(shouldSkipMacbookFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, state), false)
  }
  assert.equal(shouldSkipMacbookFromEnter({ key: 'Enter' }, 'desktop'), false)
})
