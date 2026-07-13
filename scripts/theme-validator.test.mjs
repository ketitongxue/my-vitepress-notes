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
.system-topbar { position: fixed; inset: 0 0 auto; }
.desktop-canvas { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); }
.profile-card { grid-column: 1 / span 5; }
.current-status-card { grid-column: 6 / span 3; }
.featured-project-card { grid-column: 9 / span 6; }
.project-folder { grid-column: 1 / span 4; }
.notes-launcher { grid-column: 5 / span 3; }
.lab-launcher { grid-column: 8 / span 3; }
.contact-terminal { grid-column: 11 / span 4; }
.canvas-controls { grid-column: 1 / span 14; }
.factory-home.is-entering .profile-card { animation-delay: 40ms; }
.factory-home.is-entering .current-status-card { animation-delay: 80ms; }
.factory-home.is-entering .featured-project-card { animation-delay: 120ms; }
.factory-home.is-entering .project-folder { animation-delay: 160ms; }
.factory-home.is-entering .notes-launcher { animation-delay: 200ms; }
.factory-home.is-entering .lab-launcher { animation-delay: 240ms; }
.factory-home.is-entering .contact-terminal { animation-delay: 280ms; }
.factory-home.is-entering .canvas-controls { animation-delay: 320ms; }
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
@media (max-width: 767px) { .desktop-canvas { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .factory-home.is-entering .desktop-canvas > * { animation: none !important; transition: none !important; }
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
assert.match(nonFixedTopbar.stderr, /topbar must use fixed positioning/)

const nonFourteenColumnCanvas = runChecker(validTheme().replace(
  'repeat(14, minmax(0, 1fr))',
  'repeat(12, minmax(0, 1fr))',
))
assert.notEqual(nonFourteenColumnCanvas.status, 0, 'the desktop canvas must use exactly 14 columns')
assert.match(nonFourteenColumnCanvas.stderr, /desktop canvas must use a 14-column grid/)

const missingPlacement = runChecker(validTheme().replace('.lab-launcher { grid-column: 8 / span 3; }', ''))
assert.notEqual(missingPlacement.status, 0, 'every OS card needs an explicit placement selector')
assert.match(missingPlacement.stderr, /active \.lab-launcher rule/)

const misplacedMobile = runChecker(validTheme().replace(
  '@media (max-width: 767px) { .desktop-canvas { grid-template-columns: 1fr; } }',
  '.desktop-canvas { grid-template-columns: 1fr; }',
))
assert.notEqual(misplacedMobile.status, 0, 'the mobile grid declaration must be inside the 767px media query')
assert.match(misplacedMobile.stderr, /must set \.desktop-canvas to one column/)

const missingStagger = runChecker(validTheme().replace(
  '.factory-home.is-entering .contact-terminal { animation-delay: 280ms; }',
  '.factory-home.is-entering .contact-terminal { opacity: 0; }',
))
assert.notEqual(missingStagger.status, 0, 'OS cards need explicit stagger delays')
assert.match(missingStagger.stderr, /entrance must stagger \.contact-terminal/)

const missingReducedMotion = runChecker(validTheme().replace('transition: none !important;', 'transition: transform 200ms;'))
assert.notEqual(missingReducedMotion.status, 0, 'OS motion must be suppressed for reduced-motion users')
assert.match(missingReducedMotion.stderr, /must suppress Personal OS animation and transition/)

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

const forbiddenDrag = runChecker(`${validTheme()}\n.desktop-canvas { cursor: grab; }`)
assert.notEqual(forbiddenDrag.status, 0, 'static OS CSS must not advertise drag or zoom behavior')
assert.match(forbiddenDrag.stderr, /must not enable drag or zoom behavior/)

const malformedCss = runChecker(`${validTheme()}\n.broken { color: red;`)
assert.notEqual(malformedCss.status, 0, 'malformed CSS must fail validation')
assert.match(malformedCss.stderr, /unclosed rule block/)

console.log('theme validator tests passed')
