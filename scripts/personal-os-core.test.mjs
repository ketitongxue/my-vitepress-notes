import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  hasCompletedHomeEntry, hashForOsView, initialOsView, normalizeOsHash, OS_VIEWS,
} from '../docs/.vitepress/theme/components/personalOsRouter.mjs'
import { bootLines, canvasCards, canvasConnections, desktopEntries, knowledgeSections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'
import {
  computeCoverTransform, createMacbookBootRuntime, getSessionStorage, MACBOOK_INTERACTIVE_SELECTOR, progressCells,
  shouldActivateMacbookFromEnter, shouldSkipMacbookBoot, transitionMacbookBoot, writeAccessed,
} from '../docs/.vitepress/theme/components/macbookBootState.mjs'
import {
  consumeIconDoubleClick, constrainIconPosition, constrainWindow, createIconActivationState, distance,
  finishIconPointer, isDragDistance, resolveIconPosition, resolveSurfaceBounds,
} from '../docs/.vitepress/theme/components/desktopGeometry.mjs'
import {
  closeWindow, createWindowState, moveWindow, openWindow, resizeWindow, resizeWindowByKey,
  resizeWindowFromEdge,
} from '../docs/.vitepress/theme/components/windowManagerState.mjs'
import {
  exitFrame, normalizeExitProgress,
} from '../docs/.vitepress/theme/components/homeExitState.mjs'
import {
  loadSystemCanvasModule,
} from '../docs/.vitepress/theme/components/systemCanvasLoader.mjs'
import {
  canvasUsableViewport, canvasWheelTransform, clampScale, computeWorldBounds, connectionEndpoints,
  fitWorldBounds, initialFitCards, resizeCardGeometry, resolveTouchOwner, screenToWorld, touchGesture,
  zoomAtPoint,
} from '../docs/.vitepress/theme/components/canvasGeometry.mjs'
import {
  CANVAS_LAYOUT_KEY, loadCanvasLayout, parseCanvasLayout, saveCanvasLayout, serializeCanvasLayout,
} from '../docs/.vitepress/theme/components/canvasPersistence.mjs'
import {
  captureCardGeometry, createHistory, getCommittedLayout, pushHistory, rebaseHistoryTransform,
  resetHistory, restoreCardGeometry, undoHistory,
} from '../docs/.vitepress/theme/components/canvasHistory.mjs'

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

test('a direct non-home claim does not consume the first home boot', () => {
  for (const view of ['knowledge', 'system']) {
    assert.equal(initialOsView(view), view)
    assert.equal(hasCompletedHomeEntry('claimed'), false)
  }
  assert.equal(hasCompletedHomeEntry('returning'), true)
  assert.equal(hasCompletedHomeEntry('fallback'), true)
  assert.equal(initialOsView('unknown'), 'home')
})

test('Personal OS content is complete and internally referential', () => {
  assert.ok(bootLines.length >= 4)
  assert.deepEqual(desktopEntries.map(({ label }) => label), [
    'LLM Wiki', 'Finance Wiki', '知识问答', 'llm-wiki Skill', 'AI 实验',
    '项目档案', '关于我', '联系方式', 'GitHub', '网站更新记录',
  ])
  assert.deepEqual(desktopEntries.slice(0, 4).map(({ window }) => window.href), ['/wiki/', '/finance/', '/ask/', '/llm-wiki/'])
  assert.equal(knowledgeSections.length, 6)
})

test('growth-axis content has eleven immutable trusted nodes', () => {
  assert.deepEqual(canvasCards.map(({ id, type }) => [id, type]), [
    ['identity', 'identity'],
    ['growth-field', 'timeline'],
    ['growth-product', 'timeline'],
    ['growth-system', 'timeline'],
    ['growth-ai', 'timeline'],
    ['core-story', 'principle'],
    ['capabilities', 'skills'],
    ['project-archive', 'project'],
    ['knowledge-products', 'knowledge'],
    ['current-build', 'status'],
    ['next-direction', 'next'],
  ])
  assert.deepEqual(canvasCards.map(({ id, x, y, width, height }) =>
    [id, x, y, width, height]), [
    ['identity', 120, 360, 360, 260],
    ['growth-field', 560, 340, 240, 160],
    ['growth-product', 860, 280, 240, 160],
    ['growth-system', 1160, 340, 260, 170],
    ['growth-ai', 1500, 270, 260, 170],
    ['core-story', 780, 570, 340, 190],
    ['capabilities', 1180, 600, 380, 180],
    ['project-archive', 1190, 850, 340, 190],
    ['knowledge-products', 1830, 500, 400, 260],
    ['current-build', 1740, 850, 320, 170],
    ['next-direction', 1900, 240, 300, 150],
  ])
  assert.equal(Object.isFrozen(canvasCards), true)
  const capabilities = canvasCards.find(({ id }) => id === 'capabilities')
  assert.equal(Object.isFrozen(capabilities), true)
  assert.equal(Object.isFrozen(capabilities.items), true)
  for (const item of capabilities.items) assert.equal(Object.isFrozen(item), true)

  const knowledge = canvasCards.find(({ id }) => id === 'knowledge-products')
  assert.equal(Object.isFrozen(knowledge), true)
  assert.equal(Object.isFrozen(knowledge.links), true)
  for (const link of knowledge.links) assert.equal(Object.isFrozen(link), true)

  assert.equal(Object.isFrozen(canvasConnections), true)
  for (const connection of canvasConnections) assert.equal(Object.isFrozen(connection), true)
})

test('growth-axis relationships and native destinations are exact', () => {
  assert.deepEqual(canvasConnections.map(({ from, to }) => [from, to]), [
    ['identity', 'growth-field'],
    ['growth-field', 'growth-product'],
    ['growth-product', 'growth-system'],
    ['growth-system', 'growth-ai'],
    ['growth-product', 'core-story'],
    ['growth-system', 'core-story'],
    ['growth-system', 'capabilities'],
    ['growth-ai', 'capabilities'],
    ['growth-system', 'project-archive'],
    ['growth-ai', 'knowledge-products'],
    ['growth-ai', 'current-build'],
    ['growth-ai', 'next-direction'],
  ])
  const knowledge = canvasCards.find(({ id }) => id === 'knowledge-products')
  assert.deepEqual(knowledge.links, [
    { label: 'LLM Wiki', href: '/wiki/' },
    { label: 'Finance Wiki', href: '/finance/' },
    { label: '知识问答', href: '/ask/' },
    { label: 'llm-wiki Skill', href: '/llm-wiki/' },
  ])
  const ids = new Set(canvasCards.map(({ id }) => id))
  assert.equal(ids.size, 11)
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

test('home exit progress is finite, clamped, and follows the three approved phases', () => {
  assert.equal(normalizeExitProgress(-20, 100, 500), 0)
  assert.equal(normalizeExitProgress(300, 100, 500), 0.5)
  assert.equal(normalizeExitProgress(900, 100, 500), 1)
  assert.equal(normalizeExitProgress(100, 100, 100), 1)
  assert.equal(normalizeExitProgress(80, 100, 100), 0)
  assert.equal(normalizeExitProgress(100, 200, 100), 0)
  assert.equal(normalizeExitProgress(200, 200, 100), 1)
  assert.equal(Number.isFinite(normalizeExitProgress(Number.NaN, 0, 0)), true)

  assert.deepEqual(exitFrame(0), {
    panelScale: 1,
    computerOpacity: 0,
    terminalOpacity: 0,
  })
  assert.deepEqual(exitFrame(0.55), {
    panelScale: 0.42,
    computerOpacity: 1,
    terminalOpacity: 0,
  })
  assert.deepEqual(exitFrame(1), {
    panelScale: 0.42,
    computerOpacity: 1,
    terminalOpacity: 1,
  })
  assert.deepEqual(exitFrame(-1), exitFrame(0))
  assert.deepEqual(exitFrame(2), exitFrame(1))
})

test('system canvas loader switches module identity after the first failed attempt', async () => {
  const calls = []
  const importers = {
    initial: async () => {
      calls.push('initial')
      throw new Error('blocked chunk')
    },
    retry: async () => {
      calls.push('retry')
      return { default: 'InfiniteCanvas' }
    },
  }

  await assert.rejects(loadSystemCanvasModule(0, importers), /blocked chunk/)
  assert.deepEqual(await loadSystemCanvasModule(1, importers), { default: 'InfiniteCanvas' })
  assert.deepEqual(calls, ['initial', 'retry'])
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

test('hidden desktop measurements preserve icons and moved or resized windows', () => {
  const currentBounds = { width: 1280, height: 690 }
  const initialIcons = Object.fromEntries(desktopEntries.map((entry) => [entry.id, {
    anchor: 'right',
    ...entry.position,
  }]))
  let icons = structuredClone(initialIcons)
  let windows = resizeWindow(
    moveWindow(openWindow(createWindowState(), desktopEntries[0], currentBounds), desktopEntries[0].id, { x: 240, y: 160 }, currentBounds),
    desktopEntries[0].id,
    { width: 520, height: 360 },
    currentBounds,
  )
  const windowSnapshot = structuredClone(windows)
  let iconConstraints = 0
  let windowConstraints = 0

  function applyMeasurement(width, height) {
    const nextBounds = resolveSurfaceBounds(currentBounds, width, height, 40)
    if (nextBounds === currentBounds) return
    iconConstraints += 1
    icons = Object.fromEntries(Object.entries(icons).map(([id, position]) => [
      id,
      constrainIconPosition(position, nextBounds),
    ]))
    windowConstraints += 1
    for (const item of windows.windows) {
      windows = moveWindow(windows, item.id, { x: item.x, y: item.y }, nextBounds)
    }
  }

  for (const directView of ['knowledge', 'system']) applyMeasurement(0, 0)
  assert.equal(iconConstraints, 0)
  assert.equal(windowConstraints, 0)
  assert.deepEqual(icons, initialIcons)
  assert.deepEqual(windows, windowSnapshot)

  applyMeasurement(1280, 720)
  assert.equal(new Set(Object.values(icons).map(({ x, y }) => `${x}:${y}`)).size, 10)
  assert.deepEqual(windows, windowSnapshot)
  assert.equal(resolveSurfaceBounds(currentBounds, Number.NaN, 720, 40), currentBounds)
  assert.equal(resolveSurfaceBounds(currentBounds, 1280, 40, 40), currentBounds)
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
    width: 580,
    height: 360,
    z: 11,
  })

  const reopened = openWindow(opened, entry, bounds)
  assert.equal(reopened.windows.length, 1)
  assert.ok(reopened.windows[0].z > opened.windows[0].z)
  assert.notEqual(reopened.windows[0], opened.windows[0])

  const moved = moveWindow(reopened, entry.id, { x: 900, y: 700 }, bounds)
  assert.deepEqual(
    { x: moved.windows[0].x, y: moved.windows[0].y },
    { x: 440, y: 340 },
  )

  const resized = resizeWindow(moved, entry.id, { width: 20, height: 10 }, bounds)
  assert.deepEqual(
    { width: resized.windows[0].width, height: resized.windows[0].height },
    { width: 360, height: 260 },
  )
  assert.notEqual(resized.windows[0], moved.windows[0])

  const closed = closeWindow(resized, entry.id)
  assert.equal(closed.windows.length, 0)
  assert.equal(resized.windows.length, 1)
})

test('desktop window resize reducer supports keyboard steps and all eight edges', () => {
  const bounds = { width: 800, height: 600 }
  const entry = desktopEntries[0]
  const opened = openWindow(createWindowState(), entry, bounds)

  const wider = resizeWindowByKey(opened, entry.id, 'ArrowRight', false, bounds)
  assert.equal(wider.windows[0].width, 588)
  assert.equal(wider.windows[0].height, 360)

  const taller = resizeWindowByKey(wider, entry.id, 'ArrowDown', true, bounds)
  assert.equal(taller.windows[0].width, 588)
  assert.equal(taller.windows[0].height, 392)

  const minimum = resizeWindow(opened, entry.id, { width: 360, height: 260 }, bounds)
  const constrained = resizeWindowByKey(minimum, entry.id, 'ArrowLeft', true, bounds)
  assert.equal(constrained.windows[0].width, 360)
  assert.equal(constrained.windows[0].height, 260)

  const atBoundary = moveWindow(opened, entry.id, { x: 440, y: 340 }, bounds)
  const beyondBoundary = resizeWindowByKey(atBoundary, entry.id, 'ArrowRight', true, bounds)
  assert.equal(beyondBoundary.windows[0].width, 360)
  assert.equal(beyondBoundary.windows[0].height, 260)
  assert.equal(resizeWindowByKey(opened, entry.id, 'Enter', false, bounds), opened)

  const base = moveWindow(resizeWindow(opened, entry.id, { width: 500, height: 320 }, bounds), entry.id, { x: 120, y: 100 }, bounds)
  const expectations = {
    n: { x: 120, y: 80, width: 500, height: 340 },
    s: { x: 120, y: 100, width: 500, height: 340 },
    e: { x: 120, y: 100, width: 520, height: 320 },
    w: { x: 100, y: 100, width: 520, height: 320 },
    nw: { x: 100, y: 80, width: 520, height: 340 },
    ne: { x: 120, y: 80, width: 520, height: 340 },
    se: { x: 120, y: 100, width: 520, height: 340 },
    sw: { x: 100, y: 100, width: 520, height: 340 },
  }
  for (const [edge, expected] of Object.entries(expectations)) {
    const delta = {
      x: edge.includes('w') ? -20 : edge.includes('e') ? 20 : 0,
      y: edge.includes('n') ? -20 : edge.includes('s') ? 20 : 0,
    }
    const result = resizeWindowFromEdge(base, entry.id, edge, delta, bounds)
    assert.deepEqual(
      (({ x, y, width, height }) => ({ x, y, width, height }))(result.windows[0]),
      expected,
      `${edge} resize keeps the opposite edges anchored`,
    )
  }
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
  assert.match(icon, /<span class="desktop-icon__tile" aria-hidden="true">[\s\S]*<component :is="iconComponent"/)
  assert.match(icon, /setPointerCapture/)
  assert.match(icon, /isDragDistance/)
  assert.match(icon, /@dblclick="handleDoubleClick"/)
  assert.match(icon, /@keydown="handleKeydown"/)
  assert.match(icon, /if \(dragged && !gesture\.dragged\) moveGesture\(\)/)

  assert.match(manager, /focusWindow/)
  assert.match(manager, /moveWindow/)
  assert.match(manager, /resizeWindowFromEdge/)
  assert.match(manager, /requestAnimationFrame/)
  assert.match(manager, /cancelAnimationFrame/)
  assert.match(manager, /const baselineState = \{[\s\S]*?\.\.\.active\.initial[\s\S]*?resizeWindowFromEdge\(\s*baselineState,/)
  assert.match(manager, /setPointerCapture/)
  assert.match(manager, /\.is-manipulating/)
  assert.match(manager, /`关闭 \$\{title\}`/)
  assert.match(manager, /`在新页面打开 \$\{title\}`/)
  assert.match(manager, /@pointerdown\.stop="focus\(item\.id\)"/)
  assert.match(manager, /data-resize-edge/)
  assert.match(manager, /@keydown="handleResizeKey\(item, handle\.edge, \$event\)"/)
  assert.doesNotMatch(manager, />调整大小<\/button>/)
  for (const edge of ['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw']) {
    assert.match(manager, new RegExp(`edge: '${edge}'`))
  }
  assert.match(manager, /window-manager__traffic-lights/)
  assert.match(manager, /window-manager__tape/)
  assert.match(manager, /内容持续完善/)

  assert.match(surface, /desktopEntries/)
  assert.match(surface, /createWindowState/)
  assert.match(surface, /openWindow/)
  assert.match(surface, /ResizeObserver/)
  assert.match(surface, /重置桌面位置/)
  assert.match(surface, /height: 40px/)
  assert.ok(surface.includes('<a class="desktop-surface__brand is-active" href="#home" aria-current="page">JuZX OS</a>'))
  assert.ok(surface.includes('<a href="/about">About</a>'))
  assert.ok(surface.includes('<a href="#knowledge">Knowledge</a>'))
  assert.ok(surface.includes('<a href="#system">Now</a>'))
  assert.equal(surface.includes('<span>桌面</span>'), false)
  assert.match(surface, /<time :datetime="clock">\{\{ clock \}\}<\/time>/)
  assert.match(surface, /right: `\$\{position\.x\}px`/)
  assert.match(surface, /left: `\$\{position\.x\}px`/)
  assert.match(surface, /constrainIconPositions\(nextBounds\)/)
  assert.match(surface, /const nextBounds = resolveSurfaceBounds\([\s\S]*?if \(nextBounds === bounds\.value\) return[\s\S]*?bounds\.value = nextBounds[\s\S]*?constrainIconPositions\(nextBounds\)[\s\S]*?constrainOpenWindows\(nextBounds\)/)
  assert.match(surface, /function resetIconPositions\(\)[\s\S]*?constrainIconPositions\(bounds\.value\)/)
  assert.match(surface, /#2f83d6/i)
  assert.match(surface, /#2875c5/i)
  assert.match(surface, /#3b91e1/i)
  assert.match(surface, new RegExp('linear-gradient', 'i'))
  assert.match(surface, new RegExp('radial-gradient', 'i'))

  for (const source of [icon, manager, surface]) {
    assert.doesNotMatch(source, /<iframe\b/i)
    assert.doesNotMatch(source, /<svg\b/i)
    assert.doesNotMatch(source, /https?:\/\//i)
  }
})

test('canvas geometry is deterministic, immutable, and pointer centered', () => {
  const approximately = (actual, expected) => assert.ok(
    Math.abs(actual - expected) <= 1e-9,
    `${actual} was not within 1e-9 of ${expected}`,
  )

  assert.equal(clampScale(0.1), 0.15)
  assert.equal(clampScale(3.1), 3)
  assert.equal(clampScale(1.75), 1.75)

  const transform = Object.freeze({ scale: 2, panX: 40, panY: -20 })
  const point = Object.freeze({ x: 400, y: 300 })
  assert.deepEqual(screenToWorld(point, transform), { x: 180, y: 160 })

  const worldBefore = screenToWorld(point, transform)
  const zoomed = zoomAtPoint(transform, 2.75, point)
  const worldAfter = screenToWorld(point, zoomed)
  approximately(worldAfter.x, worldBefore.x)
  approximately(worldAfter.y, worldBefore.y)

  const bounds = Object.freeze({ x: 100, y: 50, width: 1200, height: 800 })
  const viewport = Object.freeze({ width: 1440, height: 900 })
  const fitted = fitWorldBounds(bounds, viewport, 64)
  approximately(fitted.scale, 0.965)
  approximately(fitted.panX, 44.5)
  approximately(fitted.panY, 15.75)

  const touches = Object.freeze([
    Object.freeze({ clientX: 100, clientY: 100 }),
    Object.freeze({ clientX: 160, clientY: 180 }),
  ])
  assert.deepEqual(touchGesture(touches), {
    center: { x: 130, y: 140 },
    distance: 100,
  })

  const fromCard = Object.freeze({ x: 10, y: 20, width: 100, height: 80 })
  const toCard = Object.freeze({ x: 250, y: 100, width: 120, height: 60 })
  const diagonal = connectionEndpoints(fromCard, toCard)
  approximately(diagonal.x1, 110)
  approximately(diagonal.y1, 74)
  approximately(diagonal.x2, 250)
  approximately(diagonal.y2, 113.2)

  assert.deepEqual(
    connectionEndpoints(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 200, y: 0, width: 100, height: 100 },
    ),
    { x1: 100, y1: 50, x2: 200, y2: 50 },
  )
  assert.deepEqual(
    connectionEndpoints(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 200, width: 100, height: 100 },
    ),
    { x1: 50, y1: 100, x2: 50, y2: 200 },
  )

  assert.deepEqual(transform, { scale: 2, panX: 40, panY: -20 })
  assert.deepEqual(point, { x: 400, y: 300 })
  assert.deepEqual(bounds, { x: 100, y: 50, width: 1200, height: 800 })
  assert.deepEqual(viewport, { width: 1440, height: 900 })
  assert.deepEqual(touches, [{ clientX: 100, clientY: 100 }, { clientX: 160, clientY: 180 }])
  assert.deepEqual(fromCard, { x: 10, y: 20, width: 100, height: 80 })
  assert.deepEqual(toCard, { x: 250, y: 100, width: 120, height: 60 })
})

test('card resize geometry supports eight anchored edges and minimum readable sizes', () => {
  const initial = Object.freeze({ x: 400, y: 300, width: 240, height: 160 })
  const minimum = Object.freeze({ minWidth: 180, minHeight: 100 })
  const delta = Object.freeze({ x: 20, y: 20 })
  const expected = {
    n: { x: 400, y: 320, width: 240, height: 140 },
    e: { x: 400, y: 300, width: 260, height: 160 },
    s: { x: 400, y: 300, width: 240, height: 180 },
    w: { x: 420, y: 300, width: 220, height: 160 },
    nw: { x: 420, y: 320, width: 220, height: 140 },
    ne: { x: 400, y: 320, width: 260, height: 140 },
    se: { x: 400, y: 300, width: 260, height: 180 },
    sw: { x: 420, y: 300, width: 220, height: 180 },
  }
  for (const [edge, geometry] of Object.entries(expected)) {
    assert.deepEqual(resizeCardGeometry(initial, edge, delta, minimum), geometry, edge)
  }
  assert.deepEqual(resizeCardGeometry(initial, 'w', { x: 999, y: 0 }, minimum), {
    x: 460, y: 300, width: 180, height: 160,
  })
  assert.deepEqual(resizeCardGeometry(initial, 'n', { x: 0, y: 999 }, minimum), {
    x: 400, y: 360, width: 240, height: 100,
  })
  assert.deepEqual(resizeCardGeometry(initial, 'invalid', delta, minimum), initial)
  assert.deepEqual(initial, { x: 400, y: 300, width: 240, height: 160 })
  assert.deepEqual(minimum, { minWidth: 180, minHeight: 100 })
})

test('canvas touch ownership isolates mixed interactive and blank sequences', () => {
  const cardTarget = Object.freeze({ kind: 'interactive', id: 'card' })
  const blankTarget = Object.freeze({ kind: 'blank', id: 'world' })
  const isInteractive = (target) => target.kind === 'interactive'
  const touch = (target) => Object.freeze({ target })

  let cardFirst = resolveTouchOwner(null, [touch(cardTarget)], isInteractive)
  assert.equal(cardFirst, 'interactive')
  cardFirst = resolveTouchOwner(cardFirst, [touch(cardTarget), touch(blankTarget)], isInteractive)
  assert.equal(cardFirst, 'interactive')
  cardFirst = resolveTouchOwner(cardFirst, [touch(blankTarget)], isInteractive)
  assert.equal(cardFirst, 'interactive')
  assert.equal(resolveTouchOwner(cardFirst, [], isInteractive), null)

  let blankFirst = resolveTouchOwner(null, [touch(blankTarget)], isInteractive)
  assert.equal(blankFirst, 'canvas')
  blankFirst = resolveTouchOwner(blankFirst, [touch(blankTarget), touch(cardTarget)], isInteractive)
  assert.equal(blankFirst, 'interactive')
  blankFirst = resolveTouchOwner(blankFirst, [touch(blankTarget)], isInteractive)
  assert.equal(blankFirst, 'interactive')
  assert.equal(resolveTouchOwner(blankFirst, [], isInteractive), null)
})

test('canvas wheel zoom remains pointer centered over an interactive target', () => {
  const transform = Object.freeze({ scale: 1, panX: 20, panY: -10 })
  const point = Object.freeze({ x: 360, y: 240 })
  const cardWheelEvent = Object.freeze({
    deltaY: -200,
    target: Object.freeze({ kind: 'canvas-card' }),
  })

  const before = screenToWorld(point, transform)
  const next = canvasWheelTransform(transform, cardWheelEvent, point)
  const after = screenToWorld(point, next)
  assert.ok(next.scale > transform.scale)
  assert.ok(Math.abs(after.x - before.x) <= 1e-9)
  assert.ok(Math.abs(after.y - before.y) <= 1e-9)
  assert.deepEqual(cardWheelEvent, { deltaY: -200, target: { kind: 'canvas-card' } })
})

const trustedCanvasDefaults = () => ({
  cards: canvasCards.map((card) => ({ ...card })),
  order: canvasCards.map(({ id }) => id),
  transform: { scale: 1, panX: 24, panY: -18 },
})

test('canvas persistence uses only complete trusted v2 geometry', () => {
  assert.equal(CANVAS_LAYOUT_KEY, 'juzx-personal-os-layout-v2')
  const defaults = trustedCanvasDefaults()
  const layout = {
    cards: defaults.cards.map((card, index) => ({
      ...card,
      x: card.x + index,
      visible: index !== 3,
      arbitrary: 'untrusted',
    })),
    order: [...defaults.order.slice(1), defaults.order[0]],
    transform: { scale: 1.5, panX: -220, panY: 84 },
    arbitrary: 'untrusted',
  }
  const raw = serializeCanvasLayout(layout)
  const envelope = JSON.parse(raw)
  assert.deepEqual(Object.keys(envelope), ['version', 'transform', 'order', 'cards'])
  assert.equal(envelope.version, 2)
  assert.deepEqual(Object.keys(envelope.transform), ['scale', 'panX', 'panY'])
  assert.deepEqual(Object.keys(envelope.cards[0]), ['id', 'x', 'y', 'width', 'height', 'visible'])
  for (const forbidden of ['title', 'body', 'href', 'links', 'accent', 'arbitrary']) {
    assert.equal(raw.includes(`\"${forbidden}\"`), false)
  }

  envelope.cards.find(({ id }) => id === 'knowledge-products').links = [
    { label: 'Untrusted', href: 'https://example.com/' },
  ]
  const reversed = JSON.stringify({ ...envelope, cards: [...envelope.cards].reverse() })
  const defaultsSnapshot = structuredClone(defaults)
  const parsed = parseCanvasLayout(reversed, defaults)
  assert.deepEqual(parsed.cards.map(({ id }) => id), defaults.cards.map(({ id }) => id))
  assert.equal(parsed.cards[0].title, defaults.cards[0].title)
  assert.equal(parsed.cards[0].body, defaults.cards[0].body)
  assert.deepEqual(
    parsed.cards.find(({ id }) => id === 'knowledge-products').links,
    defaults.cards.find(({ id }) => id === 'knowledge-products').links,
  )
  assert.equal(parsed.cards[0].accent, defaults.cards[0].accent)
  assert.equal(parsed.cards[3].visible, false)
  assert.equal(parsed.cards[8].x, defaults.cards[8].x + 8)
  assert.deepEqual(parsed.order, layout.order)
  assert.deepEqual(defaults, defaultsSnapshot)
  assert.notEqual(parsed, defaults)
  assert.notEqual(parsed.cards[0], defaults.cards[0])
})

test('canvas persistence strictly rejects malformed and untrusted layouts', () => {
  const defaults = trustedCanvasDefaults()
  const valid = JSON.parse(serializeCanvasLayout(defaults))
  const parse = (mutate, trusted = defaults) => {
    const candidate = structuredClone(valid)
    mutate(candidate)
    return parseCanvasLayout(JSON.stringify(candidate), trusted)
  }

  for (const raw of ['{', 'null', '[]', '42', JSON.stringify({ version: 1 })]) {
    assert.equal(parseCanvasLayout(raw, defaults), null)
  }
  assert.equal(parse((candidate) => { candidate.version = 1 }), null)
  assert.equal(parse((candidate) => { delete candidate.version }), null)
  assert.equal(parse((candidate) => { candidate.cards.pop() }), null)
  assert.equal(parse((candidate) => { candidate.cards.push({ ...candidate.cards[0] }) }), null)
  assert.equal(parse((candidate) => { candidate.cards[0].id = 'unknown' }), null)
  assert.equal(parse((candidate) => { candidate.cards.push({ ...candidate.cards[0], id: 'extra' }) }), null)
  assert.equal(parse((candidate) => { candidate.order.pop() }), null)
  assert.equal(parse((candidate) => { candidate.order.push(candidate.order[0]) }), null)
  assert.equal(parse((candidate) => { candidate.order[0] = 'unknown' }), null)
  for (const field of ['x', 'y', 'visible']) {
    assert.equal(parse((candidate) => { delete candidate.cards[0][field] }), null, field)
  }
  assert.equal(parse((candidate) => { delete candidate.cards[0].width }), null, 'width without height')
  assert.equal(parse((candidate) => { delete candidate.cards[0].height }), null, 'height without width')

  const legacyPositionOnly = structuredClone(valid)
  for (const card of legacyPositionOnly.cards) {
    delete card.width
    delete card.height
  }
  const migrated = parseCanvasLayout(JSON.stringify(legacyPositionOnly), defaults)
  assert.ok(migrated)
  assert.deepEqual(
    migrated.cards.map(({ width, height }) => ({ width, height })),
    defaults.cards.map(({ width, height }) => ({ width, height })),
  )
  assert.deepEqual(
    migrated.cards.map(({ x, y }) => ({ x, y })),
    defaults.cards.map(({ x, y }) => ({ x, y })),
  )
  for (const value of [null, '1', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(parse((candidate) => { candidate.transform.panX = value }), null)
    assert.equal(parse((candidate) => { candidate.cards[0].x = value }), null)
  }
  assert.equal(parse((candidate) => { candidate.cards[0].visible = 1 }), null)
  assert.equal(parse((candidate) => { candidate.cards[0].width = defaults.cards[0].minWidth - 1 }), null)
  assert.equal(parse((candidate) => { candidate.cards[0].height = defaults.cards[0].minHeight - 1 }), null)
  assert.equal(parse((candidate) => { candidate.transform.scale = 9 }), null)
  assert.equal(parse((candidate) => { candidate.transform.scale = 0.14 }), null)
  assert.equal(parseCanvasLayout(JSON.stringify(valid), { cards: [], order: [], transform: defaults.transform }), null)
  assert.equal(parseCanvasLayout(JSON.stringify(valid), { cards: defaults.cards, transform: { scale: null, panX: 0, panY: 0 } }), null)
})

test('canvas persistence rejects finite geometry whose derived bounds overflow', () => {
  const defaults = trustedCanvasDefaults()
  const valid = JSON.parse(serializeCanvasLayout(defaults))
  const parse = (mutate) => {
    const candidate = structuredClone(valid)
    mutate(candidate)
    return parseCanvasLayout(JSON.stringify(candidate), defaults)
  }

  assert.equal(parse((candidate) => {
    candidate.cards[0].x = Number.MAX_VALUE
    candidate.cards[0].width = Number.MAX_VALUE
  }), null)
  assert.equal(parse((candidate) => {
    candidate.cards[0].y = Number.MAX_VALUE
    candidate.cards[0].height = Number.MAX_VALUE
  }), null)
  assert.equal(parse((candidate) => {
    candidate.cards[0].x = -Number.MAX_VALUE
    candidate.cards[1].x = Number.MAX_VALUE
  }), null)

  const largeButSafe = parse((candidate) => {
    candidate.cards[0].x = Number.MAX_VALUE / 4
    candidate.cards[0].width = Number.MAX_VALUE / 4
  })
  assert.ok(largeButSafe)
  assert.equal(Number.isFinite(largeButSafe.cards[0].x + largeButSafe.cards[0].width), true)
})

test('canvas persistence accepted at a high absolute origin remains fit-safe end to end', () => {
  const defaults = trustedCanvasDefaults()
  const envelope = JSON.parse(serializeCanvasLayout(defaults))
  for (const card of envelope.cards) card.visible = false
  envelope.cards[0].visible = true
  envelope.cards[0].x = Number.MAX_VALUE * 0.75

  const parsed = parseCanvasLayout(JSON.stringify(envelope), defaults)
  assert.ok(parsed)
  const bounds = computeWorldBounds(
    parsed.cards,
    { x: 0, y: 0, width: 2400, height: 1200 },
    96,
  )
  assert.equal(Object.values(bounds).every(Number.isFinite), true)
  const fitted = fitWorldBounds(
    bounds,
    canvasUsableViewport({ width: 1440, height: 900 }, false),
    24,
  )
  assert.equal(Object.values(fitted).every(Number.isFinite), true)
})

test('storage denial is silent and v1 is never accessed', () => {
  const defaults = trustedCanvasDefaults()
  const calls = []
  const storage = {
    getItem(key) { calls.push(['get', key]); return serializeCanvasLayout(defaults) },
    setItem(key, value) { calls.push(['set', key, value]) },
  }
  assert.deepEqual(loadCanvasLayout(storage, defaults), defaults)
  assert.equal(saveCanvasLayout(storage, defaults), true)
  assert.deepEqual(calls.map(([operation, key]) => [operation, key]), [
    ['get', CANVAS_LAYOUT_KEY], ['set', CANVAS_LAYOUT_KEY],
  ])
  assert.equal(loadCanvasLayout(undefined, defaults), null)
  assert.equal(saveCanvasLayout(undefined, defaults), false)
  assert.equal(loadCanvasLayout({ getItem() { throw new Error('denied') } }, defaults), null)
  assert.equal(saveCanvasLayout({ setItem() { throw new Error('quota') } }, defaults), false)
  assert.equal(saveCanvasLayout(storage, { cards: [], order: [], transform: defaults.transform }), false)
  const deniedCalls = []
  const denied = {
    getItem(key) { deniedCalls.push(key); throw new Error('denied') },
    setItem() { throw new Error('quota') },
  }
  assert.equal(loadCanvasLayout(denied, defaults), null)
  assert.equal(saveCanvasLayout(denied, defaults), false)
  assert.deepEqual(deniedCalls, ['juzx-personal-os-layout-v2'])
})

test('dynamic bounds measure visible cards and share one Fit rectangle', () => {
  const fallback = { x: 0, y: 0, width: 1000, height: 700 }
  const cards = [
    { id: 'a', x: 100, y: 200, width: 200, height: 100, visible: true },
    { id: 'b', x: 600, y: 500, width: 300, height: 200, visible: true },
    { id: 'hidden', x: -900, y: -900, width: 50, height: 50, visible: false },
    { id: 'bad', x: Number.NaN, y: 0, width: 20, height: 20, visible: true },
  ]
  assert.deepEqual(computeWorldBounds(cards, fallback, 50),
    { x: 50, y: 150, width: 900, height: 600 })
  assert.deepEqual(computeWorldBounds(cards.map((card) => ({ ...card, visible: false })), fallback, 50), fallback)
  const usable = canvasUsableViewport({ width: 1440, height: 900 }, false)
  assert.deepEqual(usable, { x: 72, y: 24, width: 1344, height: 780 })
  assert.deepEqual(canvasUsableViewport({ width: 390, height: 844 }, true),
    { x: 16, y: 16, width: 358, height: 668 })
  const fitted = fitWorldBounds(computeWorldBounds(cards, fallback, 50), usable, 24)
  assert.ok(Number.isFinite(fitted.scale) && Number.isFinite(fitted.panX) && Number.isFinite(fitted.panY))
  assert.deepEqual(initialFitCards(canvasCards, true).map(({ id }) => id),
    ['identity', 'growth-field', 'growth-product', 'growth-system', 'growth-ai'])
  assert.equal(initialFitCards(canvasCards, false).length, 11)

  const offsetFit = fitWorldBounds(
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 100, y: 50, width: 500, height: 300 },
    0,
  )
  assert.deepEqual(offsetFit, { scale: 3, panX: 200, panY: 50 })
})

test('dynamic bounds exclude edge overflow and fall back on aggregate overflow', () => {
  const fallback = { x: 0, y: 0, width: 1000, height: 700 }
  const safe = { id: 'safe', x: 10, y: 20, width: 30, height: 40, visible: true }
  const edgeOverflow = {
    id: 'overflow', x: Number.MAX_VALUE, y: 0,
    width: Number.MAX_VALUE, height: 10, visible: true,
  }

  assert.deepEqual(computeWorldBounds([edgeOverflow], fallback, 0), fallback)
  assert.deepEqual(computeWorldBounds([safe, edgeOverflow], fallback, 0),
    { x: 10, y: 20, width: 30, height: 40 })
  assert.deepEqual(computeWorldBounds([
    { ...safe, id: 'left', x: -Number.MAX_VALUE },
    { ...safe, id: 'right', x: Number.MAX_VALUE },
  ], fallback, 0), fallback)

  const safeLargeBounds = computeWorldBounds([{
    ...safe,
    x: Number.MAX_VALUE / 4,
    width: Number.MAX_VALUE / 4,
  }], fallback, 0)
  assert.equal(Object.values(safeLargeBounds).every(Number.isFinite), true)
})

test('dynamic bounds Fit stays finite at huge origins without disabling ordinary enlargement', () => {
  const viewport = { x: 72, y: 24, width: 1344, height: 780 }
  const ordinary = fitWorldBounds({ x: 10, y: 20, width: 192, height: 240 }, viewport, 24)
  assert.ok(ordinary.scale > 1)
  assert.equal(Object.values(ordinary).every(Number.isFinite), true)

  for (const x of [Number.MAX_VALUE * 0.75, -Number.MAX_VALUE * 0.75]) {
    const fitted = fitWorldBounds({ x, y: 20, width: 192, height: 240 }, viewport, 24)
    assert.equal(Object.values(fitted).every(Number.isFinite), true)
    assert.ok(fitted.scale <= 1)
  }
})

test('canvas history is immutable, bounded, undoable, and resettable', () => {
  const defaults = trustedCanvasDefaults()
  const created = createHistory(defaults)
  assert.deepEqual(created.past, [])
  assert.deepEqual(created.future, [])
  assert.deepEqual(created.present, defaults)
  assert.notEqual(created.present, defaults)
  assert.notEqual(created.present.order, defaults.order)

  const duplicate = pushHistory(created, structuredClone(defaults))
  assert.deepEqual(duplicate, created)
  assert.deepEqual(duplicate.past, [])

  const reordered = structuredClone(defaults)
  reordered.order = [...reordered.order.slice(1), reordered.order[0]]
  const afterReorder = pushHistory(created, reordered)
  assert.equal(afterReorder.past.length, 1)
  assert.deepEqual(afterReorder.present.order, reordered.order)
  assert.notEqual(afterReorder.present.order, reordered.order)

  let history = created
  for (let index = 1; index <= 55; index += 1) {
    history = pushHistory(history, {
      ...defaults,
      transform: { ...defaults.transform, panX: index },
    })
  }
  assert.equal(history.past.length, 50)
  assert.equal(history.past[0].transform.panX, 5)
  assert.equal(history.present.transform.panX, 55)

  const beforeUndo = structuredClone(history)
  const undone = undoHistory(history)
  assert.equal(undone.present.transform.panX, 54)
  assert.equal(undone.future[0].transform.panX, 55)
  assert.deepEqual(history, beforeUndo)
  const repushed = pushHistory(undone, { ...undone.present, transform: { ...undone.present.transform, panY: 99 } })
  assert.deepEqual(repushed.future, [])

  const reset = resetHistory(repushed, defaults)
  assert.deepEqual(reset.past, [])
  assert.deepEqual(reset.future, [])
  assert.deepEqual(reset.present, defaults)
  assert.notEqual(reset.present, defaults)
  assert.deepEqual(undoHistory(created), created)
})

test('non-history transforms survive later undo without restoring a stale viewport', () => {
  const defaults = trustedCanvasDefaults()
  const moved = structuredClone(defaults)
  moved.cards[0].x += 80
  const afterMove = pushHistory(createHistory(defaults), moved)
  const currentTransform = { scale: 1.8, panX: -420, panY: 160 }
  const rebased = rebaseHistoryTransform(afterMove, currentTransform)
  const undone = undoHistory(rebased)

  assert.equal(undone.present.cards[0].x, defaults.cards[0].x)
  assert.deepEqual(undone.present.transform, currentTransform)
  assert.deepEqual(undone.future[0].transform, currentTransform)
  assert.deepEqual(afterMove.present.transform, defaults.transform)
})

test('cancelled card geometry restores the atomic gesture-start geometry', () => {
  const defaults = trustedCanvasDefaults()
  const start = captureCardGeometry(defaults, 'identity')
  const intermediate = structuredClone(defaults)
  intermediate.cards[0] = {
    ...intermediate.cards[0], x: 500, y: 600, width: 700, height: 400,
  }
  intermediate.cards[1].visible = false
  intermediate.transform = { scale: 2, panX: -100, panY: 40 }
  const restored = restoreCardGeometry(intermediate, start)

  assert.deepEqual(
    (({ x, y, width, height }) => ({ x, y, width, height }))(restored.cards[0]),
    (({ x, y, width, height }) => ({ x, y, width, height }))(defaults.cards[0]),
  )
  assert.equal(restored.cards[1].visible, false)
  assert.deepEqual(restored.transform, intermediate.transform)
  assert.deepEqual(intermediate.cards[0], {
    ...defaults.cards[0], x: 500, y: 600, width: 700, height: 400,
  })
})

test('pending persistence never serializes transient cancelled card geometry', () => {
  const defaults = trustedCanvasDefaults()
  const currentTransform = { scale: 1.4, panX: -120, panY: 70 }
  const history = rebaseHistoryTransform(createHistory(defaults), currentTransform)
  const start = captureCardGeometry(history.present, 'identity')
  const transient = structuredClone(history.present)
  transient.cards[0].x += 333
  transient.cards[0].y += 222

  const values = new Map()
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
  }
  assert.equal(saveCanvasLayout(storage, getCommittedLayout(history)), true)
  const savedWhileTransient = loadCanvasLayout(storage, defaults)
  assert.equal(savedWhileTransient.cards[0].x, defaults.cards[0].x)
  assert.deepEqual(savedWhileTransient.transform, currentTransform)

  const restored = restoreCardGeometry(transient, start)
  assert.equal(restored.cards[0].x, defaults.cards[0].x)
  assert.equal(saveCanvasLayout(storage, getCommittedLayout(history)), true)
  const savedAfterCancel = loadCanvasLayout(storage, defaults)
  assert.equal(savedAfterCancel.cards[0].x, defaults.cards[0].x)
  assert.deepEqual(savedAfterCancel.transform, currentTransform)
  assert.equal(transient.cards[0].x, defaults.cards[0].x + 333)
})

test('CanvasCard renders eight read-only semantic variants', () => {
  const card = readComponent('CanvasCard.vue')
  assert.match(card, /:data-card-type="card\.type"/)
  assert.match(card, /:class="\[`canvas-card--\$\{card\.type\}`/)
  for (const type of ['identity', 'timeline', 'principle', 'skills', 'project', 'knowledge', 'status', 'next']) {
    assert.match(card, new RegExp(`canvas-card--${type}`))
  }
  assert.match(card, /class="canvas-card__mark"[\s\S]*\{\{ card\.mark \}\}/)
  assert.match(card, /v-for="item in card\.items"/)
  assert.match(card, /v-for="link in card\.links"[\s\S]*:href="link\.href"/)
  assert.match(card, /import \{ resizeCardGeometry \} from '\.\/canvasGeometry\.mjs'/)
  assert.match(card, /v-for="handle in resizeEdges"/)
  assert.match(card, /data-resize-edge/)
  assert.doesNotMatch(card, /canvas-card__resize(?:"|\s|\{)/)
  for (const edge of ['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw']) {
    assert.match(card, new RegExp(`edge: '${edge}'`))
    assert.match(card, new RegExp(`canvas-card__resize-handle--${edge}`))
  }
  assert.doesNotMatch(card, /contenteditable|<textarea|<input|<img|picture|illustration|portrait/i)
})

test('CanvasCard titlebar exposes its selection state to assistive technology', () => {
  const card = readComponent('CanvasCard.vue')
  assert.match(card,
    /<button[\s\S]*?class="canvas-card__titlebar"[\s\S]*?:aria-pressed="selected"/)
  assert.doesNotMatch(card,
    /class="canvas-card__titlebar"[\s\S]{0,240}:aria-current=/)
})

test('identity anchor is one rounded JZ rectangle without geometry shift', () => {
  const card = readComponent('CanvasCard.vue')
  const identity = canvasCards.find(({ id }) => id === 'identity')
  assert.deepEqual(
    (({ width, height, minWidth, minHeight }) => ({ width, height, minWidth, minHeight }))(identity),
    { width: 360, height: 260, minWidth: 300, minHeight: 220 },
  )
  assert.match(card, /\.canvas-card--identity\s*\{[\s\S]*border-radius:\s*16px/)
  assert.match(card, /\.canvas-card\.is-selected\s*\{[\s\S]*border-width:\s*2px/)
  assert.match(card, /\.canvas-card\.is-selected\s*\{[\s\S]*box-shadow:/)
  assert.match(card, /\.canvas-card--identity \.canvas-card__titlebar\s*\{[^}]*padding:\s*14px 20px 8px;/)
  assert.match(card, /\.canvas-card--identity \.canvas-card__body\s*\{[^}]*padding:\s*0 20px 16px;/)
  assert.match(card, /\.canvas-card--identity \.canvas-card__copy\s*\{[^}]*margin:\s*0;[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.45;/)
  assert.doesNotMatch(card, /\.canvas-card--identity \.canvas-card__body\s*\{[^}]*overflow:\s*auto/)
})

test('status copy is exclusive and native links keep canvas gestures isolated', () => {
  const card = readComponent('CanvasCard.vue')
  assert.match(card, /<p v-if="card\.body && !card\.status"/)
  assert.match(card, /<span v-if="card\.status" class="canvas-card__status">[\s\S]*\{\{ card\.body \}\}/)
  assert.match(card, /v-for="link in card\.links"[\s\S]*@pointerdown\.stop[\s\S]*@click\.stop/)
})

test('infinite canvas components preserve interaction and source contracts', () => {
  const canvas = readComponent('InfiniteCanvas.vue')
  const card = readComponent('CanvasCard.vue')
  const connections = readComponent('CanvasConnections.vue')

  assert.match(canvas, /import \{ canvasCards, canvasConnections \} from '\.\/personalOsContent\.mjs'/)
  assert.match(canvas, /from '\.\/canvasGeometry\.mjs'/)
  assert.match(canvas, /import CanvasCard from '\.\/CanvasCard\.vue'/)
  assert.match(canvas, /import CanvasConnections from '\.\/CanvasConnections\.vue'/)
  assert.match(canvas, /canvasCards\.map\(\(card\) => \(\{ \.\.\.card \}\)\)/)
  assert.match(canvas, /order: canvasCards\.map\(\(\{ id \}\) => id\)/)
  assert.match(canvas, /order: \[\.\.\.stackingOrder\.value\]/)
  assert.match(canvas, /translate\(\$\{transform\.value\.panX\}px, \$\{transform\.value\.panY\}px\) scale\(\$\{transform\.value\.scale\}\)/)
  assert.match(canvas, /transform-origin: 0 0/)
  assert.match(canvas, /const currentTransform = pendingTransform \?\? transform\.value/)
  assert.match(canvas, /canvasWheelTransform\(currentTransform, event, point\)/)
  assert.match(canvas, /resolveTouchOwner\(touchOwner, event\.touches, isInteractiveTarget\)/)
  assert.doesNotMatch(canvas, /function handleWheel\(event\) \{\s*if \(isInteractiveTarget/)
  assert.match(canvas, /requestAnimationFrame/)
  assert.match(canvas, /cancelAnimationFrame/)
  assert.match(canvas, /addEventListener\('wheel', handleWheel, \{ passive: false \}\)/)
  assert.match(canvas, /removeEventListener\('wheel', handleWheel\)/)
  assert.match(canvas, /addEventListener\('touchstart', handleTouchStart, \{ passive: false \}\)/)
  assert.match(canvas, /removeEventListener\('touchstart', handleTouchStart\)/)
  for (const [type, handler] of [
    ['touchmove', 'handleTouchMove'],
    ['touchend', 'handleTouchEnd'],
    ['touchcancel', 'handleTouchCancel'],
  ]) {
    assert.match(canvas, new RegExp(`addEventListener\\('${type}', ${handler}, \\{ passive: false \\}\\)`))
    assert.match(canvas, new RegExp(`removeEventListener\\('${type}', ${handler}\\)`))
  }
  assert.match(canvas, /event\.preventDefault\(\)/)
  assert.match(canvas, /onBeforeUnmount/)
  assert.match(canvas, /@lostpointercapture="cancelPointerPan"/)
  assert.match(canvas, /:key="card\.id"/)
  assert.match(canvas, /emit\('layout-change', currentLayout\(\)\)/)

  assert.match(card, /data-canvas-card/)
  assert.match(card, /setPointerCapture/)
  assert.match(card, /releasePointerCapture/)
  assert.match(card, /pointercancel/)
  assert.match(card, /lostpointercapture/)
  assert.match(card, /onBeforeUnmount\(\(\) => \{[\s\S]*?hasPointerCapture/)
  assert.match(card, /\/ props\.scale/)
  assert.match(card, /resizeCardGeometry\(active\.initial, active\.edge/)
  assert.match(card, /requestAnimationFrame\(applyPoint\)/)
  assert.match(card, /@keydown="handleResizeKey\(handle\.edge, \$event\)"/)
  assert.match(card, /@media \(max-width: 767px\)[\s\S]*?canvas-card__resize-handle--nw[\s\S]*?display:\s*none/)
  assert.match(card, /class="canvas-card__body"[\s\S]{0,260}@pointerdown="beginGesture\('move', \$event\)"[\s\S]{0,260}@pointerup="finishGesture"/)
  assert.match(card, /v-for="link in card\.links"/)
  assert.match(card, /:href="link\.href"/)
  assert.match(card, /gesture-complete/)
  assert.doesNotMatch(card, /v-html/)
  assert.doesNotMatch(card, /\.canvas-card:hover\s*\{[^}]*transform:/)

  assert.match(connections, /import \{ connectionEndpoints \} from '\.\/canvasGeometry\.mjs'/)
  assert.match(connections, /fromCard\.visible === false \|\| toCard\.visible === false/)
  assert.match(connections, /:key="line\.key"/)
  assert.match(connections, /<line\b/)
  assert.match(connections, /aria-hidden="true"/)
  assert.match(connections, /focusable="false"/)
  assert.match(connections, /pointer-events: none/)

  for (const source of [canvas, card, connections]) {
    assert.doesNotMatch(source, /contenteditable|v-html|<iframe\b|<object\b|<embed\b/i)
    assert.doesNotMatch(source, /https?:\/\/|sparkle|particle|illustration|create-card|delete-card/i)
  }
})

test('canvas chrome wires layers, minimap, controls, persistence, and bounded history', () => {
  const canvas = readComponent('InfiniteCanvas.vue')
  const layers = readComponent('CanvasLayers.vue')
  const minimap = readComponent('CanvasMinimap.vue')
  const controls = readComponent('CanvasControls.vue')

  for (const name of ['CanvasLayers', 'CanvasControls']) {
    assert.match(canvas, new RegExp(`import ${name} from './${name}\\.vue'`))
    assert.match(canvas, new RegExp(`<${name}\\b`))
  }
  assert.match(layers, /import CanvasMinimap from '.\/CanvasMinimap\.vue'/)
  assert.match(layers, /<CanvasMinimap\b/)
  assert.doesNotMatch(canvas, /import CanvasMinimap/)
  assert.doesNotMatch(canvas, /<CanvasMinimap\b/)
  assert.match(canvas, /from '\.\/canvasPersistence\.mjs'/)
  assert.match(canvas, /from '\.\/canvasHistory\.mjs'/)
  assert.match(canvas, /@focus="focusCard"/)
  assert.match(canvas, /@visibility="changeVisibility"/)
  assert.match(canvas, /@navigate="navigateToPoint"/)
  for (const [event, handler] of [
    ['zoom-in', 'zoomIn'], ['zoom-out', 'zoomOut'], ['fit', 'fitCanvas'],
    ['undo', 'undoCanvas'], ['save', 'saveNow'], ['reset', 'restoreDefaults'],
  ]) assert.match(canvas, new RegExp(`@${event}="${handler}"`))
  assert.match(canvas, /const SAVE_DELAY = 250/)
  assert.match(canvas, /window\.localStorage/)
  assert.match(canvas, /loadCanvasLayout\(storage, defaultLayout\)/)
  assert.match(canvas, /saveCanvasLayout\(storage, getCommittedLayout\(history\.value\)\)/)
  assert.match(canvas, /const worldBounds = computed\(\(\) => computeWorldBounds\(cards\.value, canonicalBounds, 96\)\)/)
  assert.match(canvas, /const usableViewport = computed\(\(\) => canvasUsableViewport\(viewportSize\.value, mobileViewport\.value\)\)/)
  assert.match(canvas, /initialFitCards\(cards\.value, mobileViewport\.value\)/)
  assert.match(canvas, /fitWorldBounds\(worldBounds\.value, usableViewport\.value, 24\)/)
  assert.match(canvas, /:world-bounds="worldBounds"/)
  assert.match(canvas, /clearTimeout\(saveTimer\)/)
  assert.match(canvas, /:can-undo="history\.past\.length > 0"/)
  assert.match(canvas, /@gesture-complete="completeCardGesture"/)
  assert.match(canvas, /function completeCardGesture[\s\S]*?pushHistory/)
  assert.match(canvas, /function changeVisibility[\s\S]*?pushHistory/)
  assert.match(canvas, /function restoreDefaults[\s\S]*?pushHistory/)
  assert.match(canvas, /@pointercancel\.capture="cancelCardGesture"/)
  assert.match(canvas, /@lostpointercapture\.capture="cancelCardGesture"/)
  assert.match(canvas, /@pointerup\.capture="markCardGestureCompleting"/)
  assert.match(canvas, /function cancelPointerPan[\s\S]*?applyTransform\(pointerGesture\.transform\)/)
  assert.match(canvas, /function updateCardGeometry[\s\S]*?cancelScheduledSave\(\)/)
  assert.match(canvas, /function cancelCardGesture[\s\S]*?saveNow\(\)/)
  assert.match(canvas, /saveCanvasLayout\(storage, getCommittedLayout\(history\.value\)\)/)
  for (const handler of ['updateCardGeometry', 'applyTransform', 'selectCard', 'focusCard', 'navigateToPoint']) {
    const match = canvas.match(new RegExp(`function ${handler}[^]*?(?=\\nfunction |\\nonMounted)`))
    assert.ok(match, handler)
    assert.doesNotMatch(match[0], /pushHistory\(/, handler)
  }

  assert.match(layers, /defineEmits\(\['focus', 'visibility', 'navigate'\]\)/)
  assert.match(layers, /<aside\s+[\s\S]*?class="canvas-layers"/)
  assert.match(layers, /v-for="card in cards"/)
  assert.match(layers, /:key="card\.id"/)
  assert.match(layers, /:aria-current="selectedCardId === card\.id \? 'true' : undefined"/)
  assert.match(layers, /:disabled="card\.visible === false"/)
  assert.match(layers, /展开或收起画布图层/)
  assert.match(layers, /:aria-pressed="card\.visible !== false"/)
  assert.match(layers, /min-width: 44px/)
  assert.match(layers, /@media \(max-width: 767px\)/)

  assert.match(minimap, /defineEmits\(\['navigate'\]\)/)
  for (const prop of ['cards', 'transform', 'viewport', 'worldBounds']) assert.match(minimap, new RegExp(`${prop}:`))
  assert.match(minimap, /v-for="card in visibleCards"/)
  assert.match(minimap, /:key="card\.id"/)
  assert.match(minimap, /-props\.transform\.panX \/ props\.transform\.scale/)
  assert.match(minimap, /getBoundingClientRect\(\)/)
  assert.match(minimap, /props\.worldBounds\.x/)
  assert.match(minimap, /emit\('navigate', \{ x, y \}\)/)
  assert.match(minimap, /<svg\b/)
  assert.match(minimap, /<rect\b/)
  assert.match(minimap, /position: static/)
  assert.match(minimap, /width: 100%/)
  assert.doesNotMatch(minimap, /position: absolute/)

  assert.match(controls, /defineEmits\(\['zoom-in', 'zoom-out', 'fit', 'undo', 'save', 'reset'\]\)/)
  for (const label of ['缩小画布', '放大画布', '适应全部内容', '撤销上一步', '保存画布布局', '恢复默认布局']) {
    assert.ok(controls.includes(`aria-label="${label}"`), label)
  }
  assert.match(controls, /:disabled="!canUndo"/)
  assert.match(controls, /确认恢复默认/)
  assert.match(controls, /aria-label="确认恢复默认" @click="confirmReset">确认<\/button>/)
  assert.match(controls, /取消/)
  assert.match(controls, /emit\('reset'\)/)
  assert.doesNotMatch(controls, /window\.confirm/)

  for (const source of [canvas, layers, minimap, controls]) {
    assert.doesNotMatch(source, /contenteditable|v-html|<iframe\b|<object\b|<embed\b|sessionStorage|window\.confirm/i)
    assert.doesNotMatch(source, /upload|create-card|delete-card|sparkle|particle|illustration|https?:\/\//i)
  }
})

test('Layers is a 48px rail, 220px overlay, and mobile bottom drawer', () => {
  const layers = readComponent('CanvasLayers.vue')
  const canvas = readComponent('InfiniteCanvas.vue')
  assert.match(layers, /import CanvasMinimap from '.\/CanvasMinimap\.vue'/)
  assert.match(layers, /aria-controls="canvas-layers-panel"/)
  assert.match(layers, /:aria-expanded="expanded"/)
  assert.match(layers, /id="canvas-layers-panel"/)
  assert.match(layers, /<CanvasMinimap[\s\S]*:world-bounds="worldBounds"/)
  assert.match(layers, /width:\s*48px/)
  assert.match(layers, /width:\s*220px/)
  assert.match(layers, /@media \(max-width:\s*767px\)[\s\S]*position:\s*fixed[\s\S]*bottom:/)
  assert.match(layers, /min-width:\s*44px[\s\S]*min-height:\s*44px/)
  assert.equal([...canvas.matchAll(/<CanvasMinimap\b/g)].length, 0)
  assert.equal([...canvas.matchAll(/<CanvasLayers\b/g)].length, 1)
})

test('Layers exposes selection and visibility state by accessible name', () => {
  const layers = readComponent('CanvasLayers.vue')
  assert.match(layers, /:aria-current="selectedCardId === card\.id \? 'true' : undefined"/)
  assert.match(layers, /:aria-label="`\$\{card\.visible !== false \? '隐藏' : '显示'\} \$\{card\.title\}`"/)
  assert.match(layers, /@click="emit\('visibility', \{ id: card\.id, visible: card\.visible === false \}\)"/)
})

test('Layers returns focus outside the panel before making it inert', () => {
  const layers = readComponent('CanvasLayers.vue')
  assert.match(layers, /const layersToggle = ref\(null\)/)
  assert.match(layers, /ref="layersToggle"/)
  assert.match(layers, /@click="closePanel"/)
  const closePanel = layers.match(/function closePanel\(\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(closePanel)
  assert.ok(closePanel.indexOf('layersToggle.value?.focus()') >= 0)
  assert.ok(closePanel.indexOf('expanded.value = false') > closePanel.indexOf('layersToggle.value?.focus()'))
})

test('canvas controls retain seven named native actions', () => {
  const controls = readComponent('CanvasControls.vue')
  assert.deepEqual([...controls.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1])
    .filter((label) => ['缩小画布', '当前画布缩放比例', '放大画布', '适应全部内容',
      '撤销上一步', '保存画布布局', '恢复默认布局'].includes(label)), [
    '缩小画布', '当前画布缩放比例', '放大画布', '适应全部内容',
    '撤销上一步', '保存画布布局', '恢复默认布局',
  ])
  for (const event of ['zoom-out', 'zoom-in', 'fit', 'undo', 'save', 'reset']) {
    assert.match(controls, new RegExp(`'${event}'`))
  }
  assert.match(controls, /role="group" aria-label="确认恢复默认布局"/)
  assert.match(controls, /ref="resetButton"/)
  assert.match(controls, /resetButton\.value\?\.focus\(\)/)
})

test('reset Escape recovery is conditional and covers focus outside canvas controls', () => {
  const controls = readComponent('CanvasControls.vue')
  assert.doesNotMatch(controls, /@keydown\.esc/)
  assert.match(controls, /window\.addEventListener\('keydown', handleWindowKeydown\)/)
  assert.match(controls, /window\.removeEventListener\('keydown', handleWindowKeydown\)/)
  assert.match(controls, /onBeforeUnmount\(stopEscapeListener\)/)
  const handler = controls.match(/function handleWindowKeydown\(event\) \{[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(handler, /event\.key !== 'Escape' \|\| !confirmingReset\.value/)
  assert.match(handler, /event\.preventDefault\(\)/)
  assert.match(handler, /event\.stopPropagation\(\)/)
  assert.match(handler, /cancelReset\(\)/)
  const cancelReset = controls.match(/async function cancelReset\(\) \{[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(cancelReset, /if \(!confirmingReset\.value\) return/)
  assert.match(cancelReset, /stopEscapeListener\(\)/)
  assert.ok(cancelReset.indexOf('confirmingReset.value = false') >= 0)
  assert.ok(cancelReset.indexOf('resetButton.value?.focus()') > cancelReset.indexOf('confirmingReset.value = false'))
})

test('system canvas is read-only content with alternate navigation paths', () => {
  const canvas = readComponent('InfiniteCanvas.vue')
  const card = readComponent('CanvasCard.vue')
  const nonViewportComponents = ['CanvasLayers.vue', 'CanvasControls.vue']
    .map(readComponent).join('\n')
  const sources = [canvas, card, nonViewportComponents].join('\n')
  assert.doesNotMatch(sources,
    /contenteditable|<textarea|type="file"|new card|新建|删除卡片|上传|自由连线|createConnection/i)
  assert.match(sources, /aria-label="JuZX OS 无限画布"/)
  assert.match(sources, /aria-describedby="canvas-instructions"/)
  assert.match(sources, /id="canvas-instructions"/)
  assert.match(sources, /聚焦 \$\{card\.title\}/)
  assert.match(sources, /适应全部内容/)
  assert.match(sources, /\[data-canvas-card\], a, button, \[data-canvas-control\]/)
  assert.match(readComponent('CanvasConnections.vue'), /aria-hidden="true"/)
  assert.match(canvas, /\.infinite-canvas__viewport\s*\{[\s\S]*?touch-action:\s*none;/)
  assert.match(card, /\.canvas-card__resize-handle\s*\{[\s\S]*?touch-action:\s*none;/)
  assert.doesNotMatch(nonViewportComponents, /touch-action:\s*none;/)
  assert.match(canvas, /max-width:\s*100vw;[\s\S]*?overflow:\s*hidden;/)
  assert.match(canvas, /animation-duration:\s*1ms !important;/)
  assert.match(canvas, /transition-duration:\s*1ms !important;/)
})

test('system lazy boundary keeps navigation usable and retries a distinct chunk', () => {
  const home = readComponent('KnowledgeFactoryHome.vue')
  assert.match(home, /class="personal-system-view__error"/)
  assert.match(home, /role="alert"/)
  assert.match(home, />\s*重新加载我的 OS\s*</)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue'\)/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue\?retry=1'\)/)
  assert.equal([...home.matchAll(/<BottomOsNavigation\b/g)].length, 1)
  assert.doesNotMatch(home, /@vite-ignore|location\.reload|<iframe|<object|<embed/i)
})

test('active system view isolates VitePress chrome for its exact lifecycle', () => {
  const home = readComponent('KnowledgeFactoryHome.vue')
  const css = readFileSync(new URL('../docs/.vitepress/theme/custom.css', import.meta.url), 'utf8')
  assert.match(home, /const SYSTEM_ACTIVE_CLASS = 'personal-os-system-active'/)
  assert.match(home,
    /function setSystemChromeIsolation\(active\)[\s\S]*document\.documentElement[\s\S]*document\.body[\s\S]*document\.querySelector\('\.Layout'\)/)
  assert.match(home, /setSystemChromeIsolation\(nextView === 'system'\)/)
  assert.match(home, /onBeforeUnmount\(\(\) => \{[\s\S]*setSystemChromeIsolation\(false\)/)
  assert.match(css, /html\.personal-os-system-active[\s\S]*overflow:\s*hidden;/)
  assert.match(css,
    /html\.personal-os-system-active \.VPLocalNav\.empty\.fixed[\s\S]*html\.personal-os-system-active \.VPFooter[\s\S]*display:\s*none !important;/)
})

test('mobile canvas controls clear the Layers trigger and drawer', () => {
  const controls = readComponent('CanvasControls.vue')
  const layers = readComponent('CanvasLayers.vue')
  const mobileControls = controls.match(/@media \(max-width: 767px\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const mobileLayers = layers.match(/@media \(max-width: 767px\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  assert.match(mobileControls, /\.canvas-controls\s*\{[\s\S]*left:\s*60px;[\s\S]*right:\s*8px;/)
  assert.match(mobileControls, /scrollbar-width:\s*none;/)
  assert.match(controls, /\.canvas-controls::-webkit-scrollbar\s*\{[\s\S]*display:\s*none;/)
  assert.match(mobileLayers, /\.canvas-layers\.is-open\s*\{[\s\S]*z-index:\s*32;/)
  assert.match(mobileLayers,
    /\.canvas-layers\.is-open \.canvas-layers__rail\s*\{[\s\S]*background:\s*rgb\(255 253 247 \/ 96%\);[\s\S]*pointer-events:\s*auto;/i)
})

test('my os visual system is warm dotted paper without forbidden assets', () => {
  const canvas = readComponent('InfiniteCanvas.vue')
  const card = readComponent('CanvasCard.vue')
  const css = readFileSync(new URL('../docs/.vitepress/theme/custom.css', import.meta.url), 'utf8')
  const os = css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? ''
  const system = [canvas, card, os].join('\n')
  const systemSurface = [canvas, card].join('\n')
  for (const token of ['#FAF8F1', '#FFFDF7', '#1E2430', '#69707D', '#315EFB',
    '#F4D758', '#EF7B45', '#3FAE78']) assert.match(system, new RegExp(token, 'i'))
  assert.match(canvas, /background-size:\s*28px 28px/)
  assert.match(canvas, /data:image\/svg\+xml/)
  assert.match(canvas, /--node-order/)
  assert.match(canvas, /calc\(var\(--node-order\) \* 55ms\)/)
  assert.doesNotMatch(systemSurface, new RegExp(
    'linear-gradient|radial-gradient|backdrop-filter|\\bstars?\\b|sparkle|particle|illustration|portrait|<img',
    'i',
  ))
})

test('canvas connections remain visible blue on the warm paper surface', () => {
  const connections = readComponent('CanvasConnections.vue')
  assert.match(connections,
    /\.canvas-connections line\s*\{[^}]*stroke:\s*#4169e1;[^}]*stroke-opacity:\s*\.65;[^}]*stroke-width:\s*1\.25;/i)
  assert.doesNotMatch(connections, /\.canvas-connections line\s*\{[^}]*stroke:\s*#fffdf7;/i)
})
