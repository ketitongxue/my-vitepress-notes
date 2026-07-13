import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { hashForOsView, normalizeOsHash, OS_VIEWS } from '../docs/.vitepress/theme/components/personalOsRouter.mjs'
import { bootLines, canvasCards, canvasConnections, desktopEntries, knowledgeSections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'
import {
  computeCoverTransform, createMacbookBootRuntime, getSessionStorage, MACBOOK_INTERACTIVE_SELECTOR, progressCells,
  shouldActivateMacbookFromEnter, shouldSkipMacbookBoot, transitionMacbookBoot, writeAccessed,
} from '../docs/.vitepress/theme/components/macbookBootState.mjs'
import {
  consumeIconDoubleClick, constrainIconPosition, constrainWindow, createIconActivationState, distance,
  finishIconPointer, isDragDistance, resolveIconPosition,
} from '../docs/.vitepress/theme/components/desktopGeometry.mjs'
import {
  closeWindow, createWindowState, moveWindow, openWindow, resizeWindow, resizeWindowByKey,
} from '../docs/.vitepress/theme/components/windowManagerState.mjs'

const readComponent = (name) => readFileSync(
  new URL(`../docs/.vitepress/theme/components/${name}`, import.meta.url),
  'utf8',
)

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

test('desktop geometry distinguishes clicks from drags and constrains windows', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
  assert.equal(isDragDistance({ x: 0, y: 0 }, { x: 4, y: 0 }), false)
  assert.equal(isDragDistance({ x: 0, y: 0 }, { x: 4.01, y: 0 }), true)
  assert.deepEqual(
    constrainWindow(
      { x: -20, y: 5, width: 900, height: 700 },
      { width: 800, height: 600 },
    ),
    { x: 0, y: 5, width: 800, height: 595 },
  )
})

test('desktop icon activation suppresses drag and synthetic touch double-clicks', () => {
  let state = createIconActivationState()
  let pointer = finishIconPointer(state, {
    dragged: true,
    pointerType: 'mouse',
    timeStamp: 100,
  })
  assert.equal(pointer.openTouch, false)

  state = pointer.state
  pointer = finishIconPointer(state, {
    dragged: false,
    pointerType: 'mouse',
    timeStamp: 180,
  })
  let doubleClick = consumeIconDoubleClick(pointer.state, 200)
  assert.equal(doubleClick.open, false)
  assert.deepEqual(doubleClick.state, createIconActivationState())

  pointer = finishIconPointer(doubleClick.state, {
    dragged: false,
    pointerType: 'mouse',
    timeStamp: 1000,
  })
  doubleClick = consumeIconDoubleClick(pointer.state, 1100)
  assert.equal(doubleClick.open, true)

  pointer = finishIconPointer(doubleClick.state, {
    dragged: false,
    pointerType: 'touch',
    timeStamp: 2000,
  })
  assert.equal(pointer.openTouch, true)
  doubleClick = consumeIconDoubleClick(pointer.state, 2100)
  assert.equal(doubleClick.open, false)
})

test('dragged desktop icons convert to left coordinates and survive a narrower surface', () => {
  const iconSize = { width: 88, height: 76 }
  const wideBounds = { width: 1200, height: 700 }
  const initial = { anchor: 'right', x: 80, y: 84 }
  assert.deepEqual(resolveIconPosition(initial, wideBounds, iconSize), { x: 1032, y: 84 })

  const dragged = constrainIconPosition(
    { anchor: 'left', x: 900, y: 500 },
    wideBounds,
    iconSize,
  )
  assert.deepEqual(dragged, { anchor: 'left', x: 900, y: 500 })

  const narrowed = constrainIconPosition(dragged, { width: 500, height: 400 }, iconSize)
  assert.deepEqual(narrowed, { anchor: 'left', x: 412, y: 324 })
  assert.deepEqual(
    resolveIconPosition(narrowed, { width: 500, height: 400 }, iconSize),
    { x: 412, y: 324 },
  )
})

test('desktop window reducer keeps singleton windows within viewport bounds', () => {
  const bounds = { width: 800, height: 600 }
  const entry = desktopEntries[0]
  const initial = createWindowState()
  const opened = openWindow(initial, entry, bounds)

  assert.equal(opened.windows.length, 1)
  assert.equal(initial.windows.length, 0)
  assert.deepEqual(opened.windows[0], {
    id: entry.id,
    entry,
    x: 96,
    y: 72,
    width: 420,
    height: 300,
    z: 11,
  })

  const reopened = openWindow(opened, entry, bounds)
  assert.equal(reopened.windows.length, 1)
  assert.ok(reopened.windows[0].z > opened.windows[0].z)
  assert.notEqual(reopened.windows[0], opened.windows[0])

  const moved = moveWindow(reopened, entry.id, { x: 900, y: 700 }, bounds)
  assert.deepEqual(
    { x: moved.windows[0].x, y: moved.windows[0].y },
    { x: 520, y: 400 },
  )

  const resized = resizeWindow(moved, entry.id, { width: 20, height: 10 }, bounds)
  assert.deepEqual(
    { width: resized.windows[0].width, height: resized.windows[0].height },
    { width: 280, height: 200 },
  )
  assert.notEqual(resized.windows[0], moved.windows[0])

  const closed = closeWindow(resized, entry.id)
  assert.equal(closed.windows.length, 0)
  assert.equal(resized.windows.length, 1)
})

test('desktop window resize control supports arrow keys and Shift steps', () => {
  const bounds = { width: 800, height: 600 }
  const entry = desktopEntries[0]
  const opened = openWindow(createWindowState(), entry, bounds)

  const wider = resizeWindowByKey(opened, entry.id, 'ArrowRight', false, bounds)
  assert.equal(wider.windows[0].width, 428)
  assert.equal(wider.windows[0].height, 300)

  const taller = resizeWindowByKey(wider, entry.id, 'ArrowDown', true, bounds)
  assert.equal(taller.windows[0].width, 428)
  assert.equal(taller.windows[0].height, 332)

  const minimum = resizeWindow(opened, entry.id, { width: 280, height: 200 }, bounds)
  const constrained = resizeWindowByKey(minimum, entry.id, 'ArrowLeft', true, bounds)
  assert.deepEqual(
    { width: constrained.windows[0].width, height: constrained.windows[0].height },
    { width: 280, height: 200 },
  )
  assert.equal(resizeWindowByKey(opened, entry.id, 'Enter', false, bounds), opened)
})

test('desktop components use local Tabler icons and native pointer interactions', () => {
  const icon = readComponent('DesktopIcon.vue')
  const manager = readComponent('WindowManager.vue')
  const surface = readComponent('DesktopSurface.vue')

  for (const name of ['IconFolder', 'IconFileText', 'IconTerminal2', 'IconWorld']) {
    assert.match(icon, new RegExp(`\\b${name}\\b`))
  }
  assert.match(icon, /from '@tabler\/icons-vue'/)
  assert.match(icon, /folder: IconFolder/)
  assert.match(icon, /file: IconFileText/)
  assert.match(icon, /terminal: IconTerminal2/)
  assert.match(icon, /world: IconWorld/)
  assert.match(icon, /<button\b/)
  assert.match(icon, /<component :is="iconComponent" aria-hidden="true"/)
  assert.match(icon, /setPointerCapture/)
  assert.match(icon, /isDragDistance/)
  assert.match(icon, /@dblclick="handleDoubleClick"/)
  assert.match(icon, /@keydown="handleKeydown"/)
  assert.match(icon, /if \(dragged && !gesture\.dragged\) moveGesture\(\)/)

  assert.match(manager, /focusWindow/)
  assert.match(manager, /moveWindow/)
  assert.match(manager, /resizeWindow/)
  assert.match(manager, /requestAnimationFrame/)
  assert.match(manager, /cancelAnimationFrame/)
  assert.match(manager, /setPointerCapture/)
  assert.match(manager, /\.is-manipulating/)
  assert.match(manager, /`关闭 \$\{title\}`/)
  assert.match(manager, /`在新页面打开 \$\{title\}`/)
  assert.match(manager, /@pointerdown\.stop="focus\(item\.id\)"/)
  assert.match(manager, /@keydown="handleResizeKey\(item, \$event\)"/)

  assert.match(surface, /desktopEntries/)
  assert.match(surface, /createWindowState/)
  assert.match(surface, /openWindow/)
  assert.match(surface, /ResizeObserver/)
  assert.match(surface, /重置桌面位置/)
  assert.match(surface, /height: 30px/)
  assert.match(surface, /right: `\$\{position\.x\}px`/)
  assert.match(surface, /left: `\$\{position\.x\}px`/)
  assert.match(surface, /constrainIconPositions\(nextBounds\)/)
  assert.match(surface, /function resetIconPositions\(\)[\s\S]*?constrainIconPositions\(bounds\.value\)/)
  assert.match(surface, /background: #2B7FD8;/)
  assert.equal(surface.toLowerCase().includes('gradient'), false)

  for (const source of [icon, manager, surface]) {
    assert.doesNotMatch(source, /<iframe\b/i)
    assert.doesNotMatch(source, /<svg\b/i)
    assert.doesNotMatch(source, /https?:\/\//i)
  }
})
