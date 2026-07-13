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
/* Personal OS start */
.factory-home {
  --os-bg: #F7F4EC; --os-surface: #FFFDF7; --os-ink: #1E2430;
  --os-muted: #69707D; --os-blue: #315EFB; --os-yellow: #F2C94C;
  --os-orange: #EF7B45; --os-green: #3FAE78; --os-terminal: #192232;
}
.system-topbar { position: fixed; inset: 0 0 auto; height: 56px; }
.desktop-canvas {
  display: grid; width: min(1360px, calc(100vw - 48px)); min-height: 1040px;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  grid-template-rows: repeat(14, minmax(0, 1fr)); gap: 16px;
}
.profile-card { min-width: 0; }
.current-status-card { min-width: 0; }
.featured-project-card { min-width: 0; }
.project-folder { min-width: 0; }
.notes-launcher { min-width: 0; }
.lab-launcher { min-width: 0; }
.contact-terminal { min-width: 0; }
.canvas-controls { min-width: 0; }
.desktop-canvas__profile { grid-column: 1 / 8; grid-row: 1 / 5; }
.desktop-canvas__status { grid-column: 9 / 13; grid-row: 1 / 4; }
.desktop-canvas__featured { grid-column: 4 / 11; grid-row: 5 / 10; }
.desktop-canvas__projects { grid-column: 11 / 15; grid-row: 4 / 8; }
.desktop-canvas__notes { grid-column: 1 / 4; grid-row: 6 / 10; }
.desktop-canvas__lab { grid-column: 11 / 15; grid-row: 9 / 13; }
.desktop-canvas__contact { grid-column: 3 / 10; grid-row: 11 / 15; }
.desktop-canvas__controls { grid-column: 12 / 15; grid-row: 14 / 15; }
.factory-home.is-entering .system-topbar { animation-delay: 0ms; }
.factory-home.is-entering .desktop-canvas__profile { animation-delay: 50ms; }
.factory-home.is-entering .desktop-canvas__status { animation-delay: 110ms; }
.factory-home.is-entering .desktop-canvas__featured { animation-delay: 170ms; }
.factory-home.is-entering .desktop-canvas__projects { animation-delay: 230ms; }
.factory-home.is-entering .desktop-canvas__notes { animation-delay: 290ms; }
.factory-home.is-entering .desktop-canvas__lab { animation-delay: 350ms; }
.factory-home.is-entering .desktop-canvas__contact { animation-delay: 410ms; }
.factory-home.is-entering .desktop-canvas__controls { animation-delay: 470ms; }
@media (max-width: 767px) {
  .desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .factory-home.is-entering .system-topbar,
  .factory-home.is-entering .desktop-canvas > * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
/* Personal OS end */
.factory-boot {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  height: 100dvh;
  background: #F7F4EC;
  color: #1E2430;
  transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
.factory-boot__access { min-width: 44px; min-height: 44px; }
.factory-boot__cursor { animation: factory-cursor-blink 800ms step-end infinite; }
@media (prefers-reduced-motion: reduce) {
  .factory-boot { animation: none !important; transition: none !important; }
  .factory-boot__cursor { animation: none !important; }
}
`
}

assert.equal(runChecker(validTheme()).status, 0, 'complete Personal OS palettes and responsive rules must pass validation')

const commented = runChecker(`/* ${validTheme()} */`)
assert.notEqual(commented.status, 0, 'commented-out declarations and selectors must fail validation')

const missingDark = runChecker(validTheme().replace('.dark {', '.dark-missing {'))
assert.notEqual(missingDark.status, 0, 'missing dark palette anchors must fail validation')
assert.match(missingDark.stderr, /custom\.css \.dark must declare --vp-c-bg/)

const missingToken = runChecker(validTheme().replace('--factory-focus: #123456;', ''))
assert.notEqual(missingToken.status, 0, 'both palettes require every factory token')
assert.match(missingToken.stderr, /must declare --factory-focus/)

const nonFixedTopbar = runChecker(validTheme().replace('.system-topbar { position: fixed;', '.system-topbar { position: sticky;'))
assert.notEqual(nonFixedTopbar.status, 0, 'the OS topbar must remain fixed')
assert.match(nonFixedTopbar.stderr, /topbar must use fixed positioning and a 56px height/)

const nonFourteenColumnCanvas = runChecker(validTheme().replace(
  'repeat(14, minmax(0, 1fr))',
  'repeat(12, minmax(0, 1fr))',
))
assert.notEqual(nonFourteenColumnCanvas.status, 0, 'the desktop canvas must use exactly 14 columns')
assert.match(nonFourteenColumnCanvas.stderr, /desktop canvas must use the exact 14-column grid/)

const missingPlacement = runChecker(validTheme().replace('.desktop-canvas__lab { grid-column: 11 / 15; grid-row: 9 / 13; }', ''))
assert.notEqual(missingPlacement.status, 0, 'every OS card needs an explicit placement selector')
assert.match(missingPlacement.stderr, /active \.desktop-canvas__lab rule/)

const misplacedMobile = runChecker(validTheme().replace(
  '@media (max-width: 767px) {\n  .desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }\n}',
  '.desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }',
))
assert.notEqual(misplacedMobile.status, 0, 'the mobile grid declaration must be inside the 767px media query')
assert.match(misplacedMobile.stderr, /must set \.desktop-canvas to one column/)

const missingStagger = runChecker(validTheme().replace(
  '.factory-home.is-entering .desktop-canvas__contact { animation-delay: 410ms; }',
  '.factory-home.is-entering .desktop-canvas__contact { opacity: 0; }',
))
assert.notEqual(missingStagger.status, 0, 'OS cards need explicit stagger delays')
assert.match(missingStagger.stderr, /entrance must stagger \.desktop-canvas__contact at 410ms/)

const missingReducedMotion = runChecker(validTheme().replace('transform: none !important;', 'transform: scale(.995);'))
assert.notEqual(missingReducedMotion.status, 0, 'OS motion and transforms must be reset for reduced-motion users')
assert.match(missingReducedMotion.stderr, /must reset animation, transition, and transform/)

const missingTopbarReduction = runChecker(validTheme().replace(
  '  .factory-home.is-entering .system-topbar,\n',
  '',
))
assert.notEqual(missingTopbarReduction.status, 0, 'reduced motion must cover the fixed topbar')
assert.match(missingTopbarReduction.stderr, /\.system-topbar/)

const nonFixedSplash = runChecker(validTheme().replace(
  '.factory-boot {\n  position: fixed;',
  '.factory-boot {\n  position: static;',
))
assert.notEqual(nonFixedSplash.status, 0, 'splash must cover the viewport')
assert.match(nonFixedSplash.stderr, /factory splash must use fixed positioning/)

const wrongExitDuration = runChecker(validTheme().replace('400ms cubic-bezier', '300ms cubic-bezier'))
assert.notEqual(wrongExitDuration.status, 0, 'splash exit timing is exact')
assert.match(wrongExitDuration.stderr, /factory splash must use the approved 400ms exit/)

const missingSplashReduction = runChecker(validTheme().replace(
  '.factory-boot { animation: none !important; transition: none !important; }',
  '.factory-boot { opacity: 1; }',
))
assert.notEqual(missingSplashReduction.status, 0, 'reduced motion must cover the splash')
assert.match(missingSplashReduction.stderr, /reduced-motion media must suppress splash motion/)

const forbiddenDrag = runChecker(validTheme().replace('/* Personal OS end */', '.desktop-canvas { cursor: grab; touch-action: none; }\n/* Personal OS end */'))
assert.notEqual(forbiddenDrag.status, 0, 'static OS CSS must not advertise drag or zoom behavior')
assert.match(forbiddenDrag.stderr, /must not enable drag or zoom behavior/)

const malformedCss = runChecker(`${validTheme()}\n.broken { color: red;`)
assert.notEqual(malformedCss.status, 0, 'malformed CSS must fail validation')
assert.match(malformedCss.stderr, /unclosed rule block/)

console.log('theme validator tests passed')
