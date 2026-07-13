import assert from 'node:assert/strict'
import test from 'node:test'
import { hashForOsView, normalizeOsHash, OS_VIEWS } from '../docs/.vitepress/theme/components/personalOsRouter.mjs'
import { bootLines, canvasCards, canvasConnections, desktopEntries, knowledgeSections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'
import {
  computeCoverTransform, createMacbookBootRuntime, getSessionStorage, MACBOOK_INTERACTIVE_SELECTOR, progressCells,
  shouldActivateMacbookFromEnter, shouldSkipMacbookBoot, transitionMacbookBoot, writeAccessed,
} from '../docs/.vitepress/theme/components/macbookBootState.mjs'

test('OS hashes normalize without browser globals', () => {
  assert.deepEqual(OS_VIEWS, ['home', 'knowledge', 'system'])
  assert.equal(normalizeOsHash(''), 'home')
  assert.equal(normalizeOsHash('#knowledge'), 'knowledge')
  assert.equal(normalizeOsHash('#system'), 'system')
  assert.equal(normalizeOsHash('#unknown'), 'home')
  assert.equal(hashForOsView('system'), '#system')
  assert.equal(hashForOsView('unknown'), '#home')
})

test('Personal OS content is complete and internally referential', () => {
  assert.ok(bootLines.length >= 4)
  assert.deepEqual(desktopEntries.map(({ label }) => label), [
    'LLM Wiki', 'Finance Wiki', '知识问答', 'llm-wiki Skill', 'AI 实验',
    '项目档案', '关于我', '联系方式', 'GitHub', '网站更新记录',
  ])
  assert.deepEqual(desktopEntries.slice(0, 4).map(({ window }) => window.href), ['/wiki/', '/finance/', '/ask/', '/llm-wiki/'])
  assert.equal(knowledgeSections.length, 6)
  assert.ok(canvasCards.length >= 8)
  const ids = new Set(canvasCards.map(({ id }) => id))
  assert.equal(ids.size, canvasCards.length)
  for (const edge of canvasConnections) {
    assert.ok(ids.has(edge.from), edge.from)
    assert.ok(ids.has(edge.to), edge.to)
  }
})

test('MacBook boot accepts one launch and computes viewport cover', () => {
  assert.equal(transitionMacbookBoot('typing', 'TYPING_COMPLETE'), 'ready')
  assert.equal(transitionMacbookBoot('ready', 'ACTIVATE'), 'launching')
  assert.equal(transitionMacbookBoot('launching', 'ACTIVATE'), 'launching')
  assert.equal(transitionMacbookBoot('launching', 'PROGRESS_COMPLETE'), 'zooming')
  assert.equal(transitionMacbookBoot('zooming', 'ZOOM_COMPLETE'), 'desktop')
  assert.equal(transitionMacbookBoot('typing', 'SKIP'), 'desktop')
  assert.equal(progressCells(4), '[####--------]')
  assert.deepEqual(computeCoverTransform(
    { left: 300, top: 200, width: 600, height: 360 },
    { width: 1440, height: 900 },
  ), { scale: 2.5, translateX: 120, translateY: 70 })
})

test('MacBook boot fails open when session storage cannot be read and written', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }

  assert.equal(shouldSkipMacbookBoot(storage, false), false)
  assert.equal(values.has('personal-site-access-probe'), false)
  values.set('personal-site-accessed', 'true')
  assert.equal(shouldSkipMacbookBoot(storage, false), true)
  assert.equal(shouldSkipMacbookBoot(storage, true), true)
  assert.equal(shouldSkipMacbookBoot(undefined, false), true)
  assert.equal(shouldSkipMacbookBoot({ getItem() { throw new Error('denied') } }, false), true)
  assert.equal(shouldSkipMacbookBoot({
    getItem: () => null,
    setItem() { throw new Error('denied') },
    removeItem() {},
  }, false), true)
  assert.equal(shouldSkipMacbookBoot({
    getItem: () => null,
    setItem() {},
    removeItem() { throw new Error('denied') },
  }, false), true)

  const deniedWindow = Object.defineProperty({}, 'sessionStorage', {
    get() { throw new Error('denied') },
  })
  assert.equal(getSessionStorage(deniedWindow), undefined)
  assert.equal(writeAccessed({ setItem() { throw new Error('denied') } }), false)
})

test('MacBook Enter activation excludes every interactive target', () => {
  for (const selector of [
    'a', 'button', 'input', 'textarea', 'select', 'summary',
    '[contenteditable]:not([contenteditable="false"])', '[tabindex]',
    'audio[controls]', 'video[controls]', '[role="button"]', '[role="link"]',
  ]) assert.ok(MACBOOK_INTERACTIVE_SELECTOR.split(',').includes(selector), selector)

  const plainTarget = { closest: () => null }
  assert.equal(shouldActivateMacbookFromEnter({ key: 'Enter', target: plainTarget }, 'ready'), true)
  assert.equal(shouldActivateMacbookFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, 'ready'), false)
  assert.equal(shouldActivateMacbookFromEnter({ key: 'Enter', repeat: true, target: plainTarget }, 'ready'), false)
  assert.equal(shouldActivateMacbookFromEnter({ key: 'Enter', isComposing: true, target: plainTarget }, 'ready'), false)
  assert.equal(shouldActivateMacbookFromEnter({ key: 'Enter', target: plainTarget }, 'typing'), false)
})

test('fallback stops late MacBook hydration timers and global Enter', () => {
  const callbacks = {}
  const events = []
  const browser = {
    setTimeout(callback, delay) {
      callbacks.timer = callback
      events.push(['setTimeout', delay])
      return 41
    },
    clearTimeout(id) { events.push(['clearTimeout', id]) },
    addEventListener(type, callback) {
      callbacks.keydown = callback
      events.push(['addEventListener', type])
    },
    removeEventListener(type, callback) {
      assert.equal(callback, callbacks.keydown)
      events.push(['removeEventListener', type])
    },
  }

  const lateHydration = createMacbookBootRuntime(browser, () => events.push('enter'), true)
  assert.equal(lateHydration.listen(), false)
  assert.equal(lateHydration.schedule(() => events.push('typing'), 220), undefined)
  assert.equal(callbacks.timer, undefined)
  assert.equal(callbacks.keydown, undefined)

  const active = createMacbookBootRuntime(browser, () => events.push('enter'))
  assert.equal(active.listen(), true)
  assert.equal(active.schedule(() => events.push('typing'), 220), 41)
  active.stop()
  callbacks.timer()
  callbacks.keydown({ key: 'Enter' })
  assert.equal(events.includes('typing'), false)
  assert.equal(events.includes('enter'), false)
  assert.ok(events.some(([name, value]) => name === 'clearTimeout' && value === 41))
  assert.ok(events.some(([name, value]) => name === 'removeEventListener' && value === 'keydown'))
  assert.equal(active.listen(), false)
  assert.equal(active.schedule(() => events.push('typing'), 220), undefined)
})
