import assert from 'node:assert/strict'
import test from 'node:test'
import { observeVisualViewport } from '../docs/.vitepress/theme/components/visualViewport.mjs'
import { constrainIconPosition } from '../docs/.vitepress/theme/components/desktopGeometry.mjs'

function browserWithViewport(viewport) {
  return Object.assign(new EventTarget(), {
    innerWidth: 2548,
    innerHeight: 734,
    visualViewport: viewport && Object.assign(new EventTarget(), viewport),
  })
}

const zoomedViewport = Object.freeze({
  offsetLeft: 125.5,
  offsetTop: 74,
  width: 2203.114,
  height: 634.649,
  scale: 1.1565,
})

test('short visible desktops retain the complete icon and label within their bounds', () => {
  const bounds = { width: 568, height: 272 }
  const position = constrainIconPosition({ anchor: 'right', x: 80, y: 300 }, bounds)
  assert.ok(position.y + 92 <= bounds.height)
  assert.ok(position.x + 88 <= bounds.width)
})

test('initial pinch-zoom viewport uses visible CSS coordinates without cancelling native zoom', () => {
  const browser = browserWithViewport(zoomedViewport)
  const changes = []
  const cleanup = observeVisualViewport(browser, (style) => changes.push(style))

  assert.deepEqual(changes, [{
    '--os-viewport-left': '125.5px',
    '--os-viewport-top': '74px',
    '--os-viewport-width': '2203.114px',
    '--os-viewport-height': '634.649px',
  }])
  assert.equal(browser.visualViewport.scale, 1.1565)
  assert.equal(browser.innerWidth, 2548)
  cleanup()
})

test('visual viewport scrolling and resizing keep the visible bounds current', () => {
  const browser = browserWithViewport(zoomedViewport)
  const changes = []
  const cleanup = observeVisualViewport(browser, (style) => changes.push(style))

  browser.visualViewport.offsetLeft = 210
  browser.visualViewport.offsetTop = 105.25
  browser.visualViewport.dispatchEvent(new Event('scroll'))
  assert.deepEqual(changes.at(-1), {
    '--os-viewport-left': '210px',
    '--os-viewport-top': '105.25px',
    '--os-viewport-width': '2203.114px',
    '--os-viewport-height': '634.649px',
  })

  Object.assign(browser.visualViewport, { width: 1274, height: 367, scale: 2 })
  browser.visualViewport.dispatchEvent(new Event('resize'))
  assert.equal(changes.at(-1)['--os-viewport-width'], '1274px')
  assert.equal(changes.at(-1)['--os-viewport-height'], '367px')
  assert.equal(browser.visualViewport.scale, 2)

  browser.visualViewport.height = 340
  browser.dispatchEvent(new Event('resize'))
  assert.equal(changes.at(-1)['--os-viewport-height'], '340px')
  assert.equal(changes.length, 4)
  cleanup()
})

test('browsers without VisualViewport use window dimensions and track resize', () => {
  const browser = browserWithViewport()
  const changes = []
  const cleanup = observeVisualViewport(browser, (style) => changes.push(style))
  assert.deepEqual(changes, [{
    '--os-viewport-left': '0px',
    '--os-viewport-top': '0px',
    '--os-viewport-width': '2548px',
    '--os-viewport-height': '734px',
  }])

  Object.assign(browser, { innerWidth: 390, innerHeight: 844 })
  browser.dispatchEvent(new Event('resize'))
  assert.deepEqual(changes.at(-1), {
    '--os-viewport-left': '0px',
    '--os-viewport-top': '0px',
    '--os-viewport-width': '390px',
    '--os-viewport-height': '844px',
  })
  cleanup()
  browser.dispatchEvent(new Event('resize'))
  assert.equal(changes.length, 2)
})

test('cleanup removes visual viewport and window subscriptions', () => {
  const browser = browserWithViewport(zoomedViewport)
  const changes = []
  const cleanup = observeVisualViewport(browser, (style) => changes.push(style))
  cleanup()
  cleanup()

  browser.visualViewport.dispatchEvent(new Event('scroll'))
  browser.visualViewport.dispatchEvent(new Event('resize'))
  browser.dispatchEvent(new Event('resize'))
  assert.equal(changes.length, 1)
})
