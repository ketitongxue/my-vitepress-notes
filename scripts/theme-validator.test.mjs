import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./check-theme.mjs', import.meta.url))
const tokens = [
  '--factory-bg', '--factory-surface', '--factory-surface-muted', '--factory-ink',
  '--factory-ink-muted', '--factory-border', '--factory-brand', '--factory-data',
  '--factory-signal', '--factory-terminal', '--factory-terminal-ink', '--factory-focus',
]

function runChecker(css) {
  const directory = mkdtempSync(join(tmpdir(), 'theme-validator-'))
  const themeDirectory = join(directory, 'docs/.vitepress/theme')
  mkdirSync(themeDirectory, { recursive: true })
  writeFileSync(join(themeDirectory, 'custom.css'), css)
  try {
    return spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function palette(background, brand) {
  return [`--vp-c-bg: ${background};`, `--vp-c-brand-1: ${brand};`, ...tokens.map((token) => `${token}: #123456;`)].join('\n')
}

function validTheme() {
  return `
:root { ${palette('#f6f3ea', '#275dad')} }
.dark { ${palette('#0b1020', '#8aa8ff')} }
.factory-status { display: flex; }
.factory-hero { padding: 2rem; }
.factory-modules__grid { display: grid; }
.factory-module { padding: 1rem; }
.factory-boot { padding: 1rem; }
@media (max-width: 639px) { .factory-modules__grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .factory-home *, .factory-home *::before, .factory-home *::after { animation: none !important; transition: none !important; }
}
`
}

assert.equal(runChecker(validTheme()).status, 0, 'complete factory palettes and responsive rules must pass validation')

const commented = runChecker(`/* ${validTheme()} */`)
assert.notEqual(commented.status, 0, 'commented-out declarations and selectors must fail validation')

const missingDark = runChecker(validTheme().replace('.dark {', '.dark-missing {'))
assert.notEqual(missingDark.status, 0, 'missing dark palette anchors must fail validation')
assert.match(missingDark.stderr, /custom\.css \.dark must declare --vp-c-bg/)

const missingToken = runChecker(validTheme().replace('--factory-focus: #123456;', ''))
assert.notEqual(missingToken.status, 0, 'both palettes require every factory token')
assert.match(missingToken.stderr, /must declare --factory-focus/)

const missingActiveRule = runChecker(validTheme().replace('.factory-boot { padding: 1rem; }', '.factory-boot {}'))
assert.notEqual(missingActiveRule.status, 0, 'required factory selectors must contain active declarations')
assert.match(missingActiveRule.stderr, /active \.factory-boot rule/)

const misplacedMobile = runChecker(validTheme().replace(
  '@media (max-width: 639px) { .factory-modules__grid { grid-template-columns: 1fr; } }',
  '.factory-modules__grid { grid-template-columns: 1fr; }',
))
assert.notEqual(misplacedMobile.status, 0, 'the mobile grid declaration must be inside its media query')
assert.match(misplacedMobile.stderr, /must set \.factory-modules__grid to one column/)

const missingReducedMotion = runChecker(validTheme().replace('transition: none !important;', 'transition: transform 200ms;'))
assert.notEqual(missingReducedMotion.status, 0, 'factory motion must be suppressed for reduced-motion users')
assert.match(missingReducedMotion.stderr, /must suppress factory animation and transition/)

console.log('theme validator tests passed')
