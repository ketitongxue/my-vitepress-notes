import assert from 'node:assert/strict'
import test from 'node:test'
import { createWindowState, openWindow, toggleMaximizeWindow } from '../docs/.vitepress/theme/components/windowManagerState.mjs'

const entry = { id: 'html-knowledge', window: { title: '知识库' } }

test('knowledge reader opens at a readable size and stays within desktop and mobile bounds', () => {
  for (const bounds of [{ width: 1280, height: 760 }, { width: 390, height: 680 }, { width: 360, height: 260 }]) {
    const state = openWindow(createWindowState(), entry, bounds)
    const window = state.windows[0]
    assert.ok(window.x >= 0 && window.y >= 0)
    assert.ok(window.x + window.width <= bounds.width)
    assert.ok(window.y + window.height <= bounds.height)
    if (bounds.width === 1280) assert.deepEqual([window.width, window.height], [1000, 720])
    const focused = openWindow(state, entry, bounds)
    assert.equal(focused.windows.length, 1)
    assert.ok(focused.windows[0].z > window.z)
    const maximized = toggleMaximizeWindow(focused, entry.id, bounds)
    assert.equal(maximized.windows[0].width, bounds.width)
    assert.equal(maximized.windows[0].height, bounds.height)
    const restored = toggleMaximizeWindow(maximized, entry.id, bounds).windows[0]
    assert.deepEqual([restored.x, restored.y, restored.width, restored.height], [window.x, window.y, window.width, window.height])
  }
})
