import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const css = await readFile(new URL('../docs/.vitepress/theme/custom.css', import.meta.url), 'utf8')

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))
  assert.ok(match, `missing ${selector} block`)
  return match[1]
}

function variable(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6}|[^;]+);`, 'i'))
  assert.ok(match, `missing ${name}`)
  return match[1].trim()
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

test('light and dark palettes use the exact approved colors', () => {
  const light = block(':root')
  const dark = block('.dark')
  assert.equal(variable(light, '--vp-c-bg'), '#f7f9fc')
  assert.equal(variable(light, '--vp-c-text-3'), '#637187')
  assert.equal(variable(light, '--vp-c-brand-1'), '#137f6b')
  assert.equal(variable(light, '--site-on-brand'), '#ffffff')
  assert.equal(variable(dark, '--vp-c-bg'), '#0b1020')
  assert.equal(variable(dark, '--vp-c-text-3'), '#8f9bb0')
  assert.equal(variable(dark, '--vp-c-brand-1'), '#8be9d3')
  assert.equal(variable(dark, '--site-on-brand'), '#061512')
})

test('approved text and button pairs meet WCAG AA contrast', () => {
  for (const [foreground, background] of [
    ['#172033', '#f7f9fc'], ['#4f5d73', '#f7f9fc'],
    ['#637187', '#f7f9fc'], ['#137f6b', '#f7f9fc'],
    ['#ffffff', '#0b5f50'], ['#e7eaf3', '#0b1020'],
    ['#aab3c5', '#0b1020'], ['#8f9bb0', '#0b1020'],
    ['#8be9d3', '#0b1020'], ['#061512', '#42aa93'],
  ]) assert.ok(contrast(foreground, background) >= 4.5)
})

test('custom components consume semantic theme variables', () => {
  assert.match(css, /linear-gradient\(145deg, var\(--site-card-start\), var\(--site-card-end\)\)/)
  assert.match(css, /color:\s*var\(--site-on-brand\)/)
  assert.match(css, /box-shadow:\s*var\(--site-floating-shadow\)/)
})
