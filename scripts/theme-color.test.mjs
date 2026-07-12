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

function srgbChannels(hex) {
  return hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255)
}

function mixSrgb(foreground, background, foregroundWeight) {
  const foregroundChannels = srgbChannels(foreground)
  const backgroundChannels = srgbChannels(background)
  return foregroundChannels.map((channel, index) =>
    channel * foregroundWeight + backgroundChannels[index] * (1 - foregroundWeight))
}

function luminance(color) {
  const channels = (Array.isArray(color) ? color : srgbChannels(color))
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
    '--vp-c-bg': '#f6f3ea',
    '--vp-c-bg-alt': '#edf1f5',
    '--vp-c-bg-soft': '#e7ecf2',
    '--vp-c-border': '#cfd6df',
    '--vp-c-divider': '#dbe0e6',
    '--vp-c-text-1': '#1d2433',
    '--vp-c-text-2': '#596579',
    '--vp-c-text-3': '#5f6d82',
    '--vp-c-brand-1': '#275dad',
    '--vp-c-brand-2': '#1f4f96',
    '--vp-c-brand-3': '#17447f',
    '--vp-home-hero-name-color': '#275dad',
    '--vp-home-hero-name-background': 'none',
    '--site-card-start': '#fffdf7',
    '--site-card-end': '#edf1f5',
    '--site-on-brand': '#ffffff',
    '--vp-button-brand-text': 'var(--site-on-brand)',
    '--vp-button-brand-hover-text': 'var(--site-on-brand)',
    '--vp-button-brand-active-text': 'var(--site-on-brand)',
    '--site-floating-shadow': '0 14px 40px rgb(23 32 51 / 14%)',
    '--site-muted-on-alt': '#596579',
    '--site-brand-on-soft': '#17447f',
    '--wiki-ask-error-border': '#b42342',
    '--wiki-ask-error-bg': '#fff0f3',
    '--wiki-ask-error-text': '#8b1e35',
    '--factory-bg': '#f6f3ea',
    '--factory-surface': '#fffdf7',
    '--factory-surface-muted': '#edf1f5',
    '--factory-ink': '#1d2433',
    '--factory-ink-muted': '#596579',
    '--factory-border': '#cfd6df',
    '--factory-brand': '#275dad',
    '--factory-data': '#137f6b',
    '--factory-signal': '#b77900',
    '--factory-terminal': '#172033',
    '--factory-terminal-ink': '#edf3fb',
    '--factory-focus': '#155eef',
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
    '--vp-c-brand-1': '#8aa8ff',
    '--vp-c-brand-2': '#a6bbff',
    '--vp-c-brand-3': '#6f8fe8',
    '--vp-home-hero-name-color': '#8aa8ff',
    '--vp-home-hero-name-background': 'none',
    '--site-card-start': '#11192b',
    '--site-card-end': '#162138',
    '--site-on-brand': '#071021',
    '--vp-button-brand-text': 'var(--site-on-brand)',
    '--vp-button-brand-hover-text': 'var(--site-on-brand)',
    '--vp-button-brand-active-text': 'var(--site-on-brand)',
    '--site-floating-shadow': '0 14px 40px rgb(0 0 0 / 28%)',
    '--site-muted-on-alt': '#8f9bb0',
    '--site-brand-on-soft': '#8be9d3',
    '--wiki-ask-error-border': '#c75b70',
    '--wiki-ask-error-bg': '#3a1720',
    '--wiki-ask-error-text': '#ffd5dc',
    '--factory-bg': '#0b1020',
    '--factory-surface': '#11192b',
    '--factory-surface-muted': '#162138',
    '--factory-ink': '#e8edf6',
    '--factory-ink-muted': '#aab5c8',
    '--factory-border': '#2b3956',
    '--factory-brand': '#8aa8ff',
    '--factory-data': '#8be9d3',
    '--factory-signal': '#f2c94c',
    '--factory-terminal': '#060a12',
    '--factory-terminal-ink': '#edf3fb',
    '--factory-focus': '#9db5ff',
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
      ['--site-on-brand', '--vp-c-brand-2'],
      ['--site-on-brand', '--vp-c-brand-1'],
      ['--site-muted-on-alt', '--vp-c-bg-alt'],
      ['--site-brand-on-soft', '--vp-c-bg-soft'],
      ['--vp-c-text-1', '--vp-c-bg-alt'],
      ['--vp-c-text-2', '--vp-c-bg-alt'],
      ['--factory-ink', '--factory-bg'],
      ['--factory-ink-muted', '--factory-bg'],
      ['--factory-brand', '--factory-bg'],
      ['--factory-terminal-ink', '--factory-terminal'],
    ]) {
      const themeName = index === 0 ? 'light' : 'dark'
      const ratio = contrastVariables(theme, foreground, background, themeName)
      assert.ok(ratio >= 4.5, `${themeName} ${foreground} on ${background}: ${ratio}`)
    }

    const userMessageBackground = mixSrgb(theme['--vp-c-brand-3'], theme['--vp-c-bg-soft'], 0.12)
    const userMessageRatio = contrast(theme['--site-brand-on-soft'], userMessageBackground)
    assert.ok(userMessageRatio >= 4.5, `${index === 0 ? 'light' : 'dark'} role on user message: ${userMessageRatio}`)
  }
})

test('native brand buttons consume semantic on-brand text', () => {
  const light = resolvedPalette(block(':root'))
  for (const property of [
    '--vp-button-brand-text',
    '--vp-button-brand-hover-text',
    '--vp-button-brand-active-text',
  ]) assert.equal(light[property], 'var(--site-on-brand)')
})

test('custom components consume semantic theme variables', () => {
  assert.match(block('.VPFeature'), /linear-gradient\(145deg, var\(--site-card-start\), var\(--site-card-end\)\)/)
  assert.match(block('.wiki-ask button'), /color:\s*var\(--site-on-brand\)/)
  assert.match(block('.wiki-ask__composer'), /box-shadow:\s*var\(--site-floating-shadow\)/)
  assert.match(block('.wiki-ask__empty'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__citations small'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__actions p'), /color:\s*var\(--site-muted-on-alt\)/)
  assert.match(block('.wiki-ask__role'), /color:\s*var\(--site-brand-on-soft\)/)
  assert.match(block('.knowledge-hub__sections a'), /color:\s*var\(--site-brand-on-soft\)/)
})
