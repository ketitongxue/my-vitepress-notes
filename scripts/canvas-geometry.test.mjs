import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canvasUsableViewport, computeWorldBounds, fitWorldBounds, initialFitCards,
} from '../docs/.vitepress/theme/components/canvasGeometry.mjs'
import { canvasCards } from '../docs/.vitepress/theme/components/personalOsContent.mjs'

const cards = Object.freeze([
  Object.freeze({ id: 'growth-product', x: 860, y: 280, width: 240, height: 160, visible: true }),
  Object.freeze({ id: 'identity', x: 120, y: 360, width: 360, height: 260, visible: true }),
  Object.freeze({ id: 'growth-ai', x: 1500, y: 270, width: 260, height: 170, visible: true }),
])

function assertWithinViewport(usable, viewport) {
  for (const value of Object.values(usable)) assert.ok(Number.isFinite(value))
  assert.ok(usable.x >= 0 && usable.y >= 0)
  assert.ok(usable.width > 0 && usable.height > 0)
  assert.ok(usable.x + usable.width <= Math.max(1, viewport.width))
  assert.ok(usable.y + usable.height <= Math.max(1, viewport.height))
}

test('desktop fit avoids the introduction, layer toggle and bottom controls', () => {
  const viewport = { width: 1440, height: 900 }
  const usable = canvasUsableViewport(viewport, false)
  assertWithinViewport(usable, viewport)
  assert.ok(usable.x >= 24)
  assert.ok(usable.y >= 146 + 44 + 12)
  assert.ok(usable.x + usable.width <= viewport.width - 24)
  assert.ok(usable.y + usable.height <= viewport.height - 108)
  assert.ok(usable.width >= 1300 && usable.height >= 580)
})

test('mobile fit leaves room for the menu, layers, toolbar and navigation dock', () => {
  const viewport = { width: 390, height: 844 }
  const usable = canvasUsableViewport(viewport, true)
  assertWithinViewport(usable, viewport)
  assert.ok(usable.x >= 16)
  assert.ok(usable.y >= 132 + 44 + 16)
  assert.ok(usable.x + usable.width <= viewport.width - 16)
  assert.ok(usable.y + usable.height <= viewport.height - 160)

  const [identity] = initialFitCards(cards, true)
  const bounds = computeWorldBounds([identity], {}, 12)
  const transform = fitWorldBounds(bounds, usable, 8)
  assert.ok(transform.scale >= .85, 'the identity card should remain readable on a phone')
  assert.ok(identity.x * transform.scale + transform.panX >= usable.x)
  assert.ok(identity.y * transform.scale + transform.panY >= usable.y)
  assert.ok((identity.x + identity.width) * transform.scale + transform.panX <= usable.x + usable.width)
  assert.ok((identity.y + identity.height) * transform.scale + transform.panY <= usable.y + usable.height)
})

test('short landscape displays fit beside the introduction without collapsing vertically', () => {
  for (const [viewport, mobile, menuHeight] of [
    [{ width: 844, height: 390 }, false, 40],
    [{ width: 667, height: 375 }, true, 48],
    [{ width: 568, height: 320 }, true, 48],
  ]) {
    const usable = canvasUsableViewport(viewport, mobile)
    assertWithinViewport(usable, viewport)
    assert.ok(usable.x >= Math.min(320, Math.round(viewport.width * .4)), 'content should sit to the right of the introductory controls')
    assert.ok(usable.y >= menuHeight + 16)
    assert.ok(usable.height >= 150, 'the usable area should not become a thin strip')
    assert.ok(usable.y + usable.height <= viewport.height - 84)
  }
})

test('the real mobile initial fit stays readable and above the bottom bar at 568 by 320', () => {
  const viewport = { width: 568, height: 320 }
  const usable = canvasUsableViewport(viewport, true)
  const initialCards = initialFitCards(canvasCards, true)
  assert.deepEqual(initialCards.map(({ id }) => id), ['identity'])
  const bounds = computeWorldBounds(initialCards, {}, 12)
  const transform = fitWorldBounds(bounds, usable, 8)
  assert.ok(transform.scale > .4, 'the actual identity card should not collapse to minimum zoom')

  const [identity] = initialCards
  const rect = {
    left: identity.x * transform.scale + transform.panX,
    top: identity.y * transform.scale + transform.panY,
    right: (identity.x + identity.width) * transform.scale + transform.panX,
    bottom: (identity.y + identity.height) * transform.scale + transform.panY,
  }
  assert.ok(rect.left >= usable.x && rect.top >= usable.y)
  assert.ok(rect.right <= usable.x + usable.width)
  assert.ok(rect.bottom <= usable.y + usable.height)
  assert.ok(rect.bottom <= viewport.height - 84, 'the identity card should clear the shared controls row')
})

test('tiny and unresolved viewport measurements keep finite, positive fitting bounds', () => {
  for (const viewport of [{ width: 1, height: 1 }, { width: 20, height: 40 }, { width: 640, height: 120 }, { width: 0, height: 0 }]) {
    for (const mobile of [true, false]) {
      assertWithinViewport(canvasUsableViewport(viewport, mobile), viewport)
    }
  }
  assert.deepEqual(canvasUsableViewport({ width: NaN, height: Infinity }, false), {
    x: 0, y: 0, width: 1, height: 1,
  })
})

test('mobile starts with the identity card even when it is not first in the configuration', () => {
  assert.deepEqual(initialFitCards(cards, true).map(({ id }) => id), ['identity'])
  assert.deepEqual(initialFitCards(cards, false), cards)
})

test('mobile falls back to the first visible card when identity is hidden or absent', () => {
  const hiddenIdentity = cards.map((card) => card.id === 'identity' ? { ...card, visible: false } : card)
  assert.deepEqual(initialFitCards(hiddenIdentity, true).map(({ id }) => id), ['growth-product'])
  assert.deepEqual(initialFitCards(cards.filter(({ id }) => id !== 'identity'), true).map(({ id }) => id), ['growth-product'])
  assert.deepEqual(initialFitCards(cards.map((card) => ({ ...card, visible: false })), true), [])
  assert.deepEqual(initialFitCards([], true), [])
  assert.deepEqual(initialFitCards(hiddenIdentity, false).map(({ id }) => id), ['growth-product', 'growth-ai'])
})
