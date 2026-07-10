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

function resolvedPalette(source, inherited = {}) {
  return Object.fromEntries([
    ...Object.entries(inherited),
    ...[...source.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gi)]
      .map((match) => [match[1], match[2].trim()]),
  ])
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

function contrastVariables(theme, foreground, background, themeName) {
  assert.match(theme[foreground] ?? '', /^#[0-9a-f]{6}$/i, `${themeName} missing ${foreground}`)
  assert.match(theme[background] ?? '', /^#[0-9a-f]{6}$/i, `${themeName} missing ${background}`)
  return contrast(theme[foreground], theme[background])
}

test('light and dark palettes use the exact approved colors', () => {
  const light = resolvedPalette(block(':root'))
  const dark = resolvedPalette(block('.dark'), light)

  assert.deepEqual(light, {
    '--vp-c-bg': '#f7f9fc',
    '--vp-c-bg-alt': '#eef3f8',
    '--vp-c-bg-soft': '#e8eff6',
    '--vp-c-border': '#cbd6e4',
    '--vp-c-divider': '#d8e1ec',
    '--vp-c-text-1': '#172033',
    '--vp-c-text-2': '#4f5d73',
    '--vp-c-text-3': '#637187',
    '--vp-c-brand-1': '#137f6b',
    '--vp-c-brand-2': '#0f6f5d',
    '--vp-c-brand-3': '#0b5f50',
    '--vp-home-hero-name-color': '#137f6b',
    '--vp-home-hero-name-background': 'none',
    '--site-card-start': '#ffffff',
    '--site-card-end': '#eef3f8',
    '--site-on-brand': '#ffffff',
    '--site-floating-shadow': '0 14px 40px rgb(23 32 51 / 14%)',
    '--site-muted-on-alt': '#4f5d73',
    '--site-brand-on-soft': '#0f6f5d',
    '--wiki-ask-error-border': '#b42342',
    '--wiki-ask-error-bg': '#fff0f3',
    '--wiki-ask-error-text': '#8b1e35',
  })

  assert.deepEqual(dark, {
    '--vp-c-bg': '#0b1020',
    '--vp-c-bg-alt': '#10182a',
    '--vp-c-bg-soft': '#121a2d',
    '--vp-c-border': '#273451',
    '--vp-c-divider': '#25304a',
    '--vp-c-text-1': '#e7eaf3',
    '--vp-c-text-2': '#aab3c5',
    '--vp-c-text-3': '#8f9bb0',
    '--vp-c-brand-1': '#8be9d3',
    '--vp-c-brand-2': '#64cdb5',
    '--vp-c-brand-3': '#42aa93',
    '--vp-home-hero-name-color': '#8be9d3',
    '--vp-home-hero-name-background': 'none',
    '--site-card-start': '#121a2d',
    '--site-card-end': '#0f1627',
    '--site-on-brand': '#061512',
    '--site-floating-shadow': '0 14px 40px rgb(0 0 0 / 28%)',
    '--site-muted-on-alt': '#8f9bb0',
    '--site-brand-on-soft': '#8be9d3',
    '--wiki-ask-error-border': '#c75b70',
    '--wiki-ask-error-bg': '#3a1720',
    '--wiki-ask-error-text': '#ffd5dc',
  })
})

test('actual light and dark component pairs meet WCAG AA contrast', () => {
  const light = resolvedPalette(block(':root'))
  const themes = [light, resolvedPalette(block('.dark'), light)]

  for (const [index, theme] of themes.entries()) {
    for (const [foreground, background] of [
      ['--vp-c-text-1', '--vp-c-bg'],
      ['--vp-c-text-2', '--vp-c-bg'],
      ['--vp-c-text-3', '--vp-c-bg'],
      ['--vp-c-brand-1', '--vp-c-bg'],
      ['--site-on-brand', '--vp-c-brand-3'],
      ['--site-muted-on-alt', '--vp-c-bg-alt'],
      ['--site-brand-on-soft', '--vp-c-bg-soft'],
      ['--vp-c-text-1', '--vp-c-bg-alt'],
      ['--vp-c-text-2', '--vp-c-bg-alt'],
    ]) {
      const themeName = index === 0 ? 'light' : 'dark'
      const ratio = contrastVariables(theme, foreground, background, themeName)
      assert.ok(ratio >= 4.5, `${themeName} ${foreground} on ${background}: ${ratio}`)
    }
  }
})

test('custom components consume semantic theme variables', () => {
  assert.match(css, /linear-gradient\(145deg, var\(--site-card-start\), var\(--site-card-end\)\)/)
  assert.match(css, /color:\s*var\(--site-on-brand\)/)
  assert.match(css, /box-shadow:\s*var\(--site-floating-shadow\)/)
  assert.match(block('.wiki-ask__empty'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__citations small'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__actions p'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__role'), /color:\s*var\(--site-brand-on-soft\)/)
})
