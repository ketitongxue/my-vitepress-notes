import assert from 'node:assert/strict'
import test from 'node:test'
import {
  closeWindow, constrainWindowState, createWindowState, focusWindow, moveWindow,
  openWindow, resizeWindowFromEdge, toggleMaximizeWindow,
} from '../docs/.vitepress/theme/components/windowManagerState.mjs'
import { resolveDockInset, resolveSurfaceBounds } from '../docs/.vitepress/theme/components/desktopGeometry.mjs'
import { createWindowFocusManager } from '../docs/.vitepress/theme/components/windowFocus.mjs'

for (const [entry, desktopSize] of [
  [{ id: 'html-knowledge', window: { title: '知识库' } }, [1000, 720]],
  [{ id: 'projects', window: { title: '项目档案' } }, [860, 640]],
]) {
  test(`${entry.id} reader opens at a readable size and stays within desktop and mobile bounds`, () => {
    for (const bounds of [{ width: 1280, height: 760 }, { width: 390, height: 680 }, { width: 360, height: 260 }]) {
      const state = openWindow(createWindowState(), entry, bounds)
      const window = state.windows[0]
      assert.ok(window.x >= 0 && window.y >= 0)
      assert.ok(window.x + window.width <= bounds.width)
      assert.ok(window.y + window.height <= bounds.height)
      if (bounds.width === 1280) assert.deepEqual([window.width, window.height], desktopSize)
      const focused = openWindow(state, entry, bounds)
      assert.equal(focused.windows.length, 1)
      assert.equal(focused, state, 'reopening the front window does not increase its stacking order')
      const maximized = toggleMaximizeWindow(focused, entry.id, bounds)
      assert.equal(maximized.windows[0].width, bounds.width)
      assert.equal(maximized.windows[0].height, bounds.height)
      const restored = toggleMaximizeWindow(maximized, entry.id, bounds).windows[0]
      assert.deepEqual([restored.x, restored.y, restored.width, restored.height], [window.x, window.y, window.width, window.height])
    }
  })
}

test('opening, moving, resizing, maximizing and restoring readers all clear the measured dock', () => {
  for (const [width, height, menu, dockHeight, dockBottom] of [
    [1280, 720, 40, 56, '14px'],
    [390, 844, 48, 56, '34px'],
    [568, 320, 48, 56, '10px'],
    [760, 380, 48, 64, '21px'],
    [2203, 635, 40, 56, '14px'],
  ]) {
    const inset = resolveDockInset(dockHeight, dockBottom)
    const bounds = resolveSurfaceBounds({}, width, height, menu, inset)
    const dockTop = height - dockHeight - Number.parseFloat(dockBottom)
    const clearDock = (state) => {
      for (const item of state.windows) {
        assert.ok(item.x >= 0 && item.x + item.width <= width)
        assert.ok(item.y >= 0 && item.y + item.height <= bounds.height)
        assert.ok(menu + item.y + item.height <= dockTop - 8, `${width}x${height}: ${item.id} must clear navigation`)
      }
    }
    for (const id of ['html-knowledge', 'projects']) {
      let state = openWindow(createWindowState(), { id, window: { title: id } }, bounds)
      clearDock(state)
      state = moveWindow(state, id, { x: 30, y: height }, bounds)
      clearDock(state)
      state = resizeWindowFromEdge(state, id, 'se', { x: width, y: height }, bounds)
      clearDock(state)
      state = toggleMaximizeWindow(state, id, bounds)
      clearDock(state)
      assert.equal(state.windows[0].height, bounds.height)
      state = toggleMaximizeWindow(state, id, bounds)
      clearDock(state)

      const largeBounds = { width: 1440, height: 860 }
      const large = openWindow(createWindowState(), { id, window: { title: id } }, largeBounds)
      clearDock(constrainWindowState(large, bounds))
      clearDock(constrainWindowState(toggleMaximizeWindow(large, id, largeBounds), bounds))
    }
  }
})

test('hidden desktops keep their last valid bounds while dock and safe-area changes recalculate them', () => {
  const previous = { width: 1280, height: 602 }
  assert.equal(resolveSurfaceBounds(previous, 0, 0, 40, 78), previous)
  assert.equal(resolveSurfaceBounds(previous, 1280, 720, 40, 78), previous)
  assert.equal(resolveDockInset(0, '14px'), 0)
  assert.equal(resolveDockInset(undefined, '14px'), 0)
  assert.deepEqual(resolveSurfaceBounds(previous, 1280, 720, 40, resolveDockInset(64, '34px')), { width: 1280, height: 574 })
})

function createFocusFixture() {
  const document = { activeElement: null }
  let state = createWindowState()
  const elements = new Map()
  const makeElement = (name, parent = null) => ({
    name, parent, ownerDocument: document, connected: true, inert: false, visible: true,
    get isConnected() { return this.connected && (!this.parent || this.parent.isConnected) },
    contains(element) {
      for (let node = element; node; node = node.parent) if (node === this) return true
      return false
    },
    closest() {
      for (let node = this; node; node = node.parent) if (node.inert) return node
      return null
    },
    getClientRects() { return this.visible ? [{}] : [] },
    focus(options) {
      assert.deepEqual(options, { preventScroll: true })
      document.activeElement = this
      for (const [id, root] of elements) {
        if (!root.contains(this)) continue
        focusManager.recordFocus(id, this)
        state = focusWindow(state, id)
      }
    },
  })
  document.body = makeElement('body')
  document.documentElement = makeElement('html')
  document.activeElement = document.body
  const fallback = makeElement('desktop brand')
  const focusManager = createWindowFocusManager({
    getWindowElement: (id) => elements.get(id),
    getTopWindowId: () => state.windows.reduce((front, item) => !front || item.z > front.z ? item : front, null)?.id,
    getFallbackElement: () => fallback,
  })
  return {
    document, elements, makeElement, focusManager, fallback,
    get state() { return state },
    open(id, opener) {
      focusManager.rememberOpener(id, opener)
      state = openWindow(state, { id, window: { title: id } }, { width: 1280, height: 602 })
      if (!elements.has(id)) elements.set(id, makeElement(id))
      focusManager.focusOpenedWindow(id)
      return elements.get(id)
    },
    close(id) {
      const restore = focusManager.prepareClose(id)
      const element = elements.get(id)
      state = closeWindow(state, id)
      element.inert = true
      if (element.contains(document.activeElement)) document.activeElement = document.body
      element.connected = false
      elements.delete(id)
      return restore
    },
  }
}

test('keyboard focus raises a background window once and remains stable while tabbing inside it', () => {
  const fixture = createFocusFixture()
  const reader = fixture.open('html-knowledge', fixture.makeElement('library icon'))
  fixture.open('projects', fixture.makeElement('projects icon'))
  const control = fixture.makeElement('article search', reader)
  const before = fixture.state.nextZ
  control.focus({ preventScroll: true })
  assert.equal(fixture.state.nextZ, before + 1)
  assert.equal(fixture.state.windows.find(({ id }) => id === 'html-knowledge').z, fixture.state.nextZ)
  const anotherControl = fixture.makeElement('article link', reader)
  anotherControl.focus({ preventScroll: true })
  assert.equal(fixture.state.nextZ, before + 1)
  assert.equal(focusWindow(fixture.state, 'missing'), fixture.state)
})

test('open focuses the window and close restores the next window then the original launcher', () => {
  const fixture = createFocusFixture()
  const launcher = fixture.makeElement('library icon')
  const reader = fixture.open('html-knowledge', launcher)
  assert.equal(fixture.document.activeElement, reader)
  const search = fixture.makeElement('article search', reader)
  search.focus({ preventScroll: true })
  const project = fixture.open('projects', fixture.makeElement('projects menu'))
  assert.equal(fixture.document.activeElement, project)
  fixture.close('projects')()
  assert.equal(fixture.document.activeElement, search)
  fixture.close('html-knowledge')()
  assert.equal(fixture.document.activeElement, launcher)
})

test('closing a background window or moving focus before the close completes does not steal focus', () => {
  const fixture = createFocusFixture()
  fixture.open('html-knowledge', fixture.makeElement('library icon'))
  const project = fixture.open('projects', fixture.makeElement('projects icon'))
  const link = fixture.makeElement('project link', project)
  link.focus({ preventScroll: true })
  fixture.close('html-knowledge')()
  assert.equal(fixture.document.activeElement, link)
  const restore = fixture.close('projects')
  const dock = fixture.makeElement('navigation dock')
  dock.focus({ preventScroll: true })
  restore()
  assert.equal(fixture.document.activeElement, dock)
})

test('removed controls and launchers fall back to connected visible focus targets', () => {
  const fixture = createFocusFixture()
  const launcher = fixture.makeElement('library icon')
  const reader = fixture.open('html-knowledge', launcher)
  const search = fixture.makeElement('removed search', reader)
  search.focus({ preventScroll: true })
  fixture.open('projects', fixture.makeElement('projects icon'))
  search.connected = false
  fixture.close('projects')()
  assert.equal(fixture.document.activeElement, reader)
  launcher.connected = false
  fixture.close('html-knowledge')()
  assert.equal(fixture.document.activeElement, fixture.fallback)
})
