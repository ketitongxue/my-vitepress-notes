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
  --os-boot: #F7F4EC;
  --os-surface: #FFFDF7;
  --os-ink: #1E2430;
  --os-muted: #69707D;
  --os-action: #315EFB;
  --os-brand: #F4D758;
  --os-orange: #EF7B45;
  --os-green: #3FAE78;
  --os-terminal: #192232;
  --os-desktop: #2F83D6;
  --os-desktop-deep: #2875C5;
  --os-desktop-highlight: #3B91E1;
  font-family: var(--vp-font-family-base);
}
.factory-home .macbook-boot { background: #F7F4EC; color: #1E2430; }
.factory-home .desktop-surface { overflow: hidden; background: linear-gradient(145deg, #3B91E1, #2F83D6 46%, #2875C5); }
.factory-home .desktop-surface__menu { height: 40px; color: #F4D758; }
.factory-home .desktop-surface__workspace { height: calc(100vh - 40px); }
.factory-home .desktop-surface__workspace { height: calc(100dvh - 40px); }
.factory-home .desktop-icon { color: #FFFDF7; }
.factory-home .window-manager__window { min-width: 360px; min-height: 260px; background: #FFFDF7; }
.factory-home .bottom-os-navigation { border-color: #69707D; }
.factory-home .knowledge-portfolio { max-width: 72ch; color: #1E2430; }
.factory-home .infinite-canvas { overflow: hidden; background: #F7F4EC; }
.factory-home .canvas-card { background: #FFFDF7; }
.factory-home .canvas-layers { color: #192232; }
.factory-home .canvas-controls { color: #3FAE78; }
.factory-home :where(a, button):focus-visible { outline: 3px solid #315EFB; }
@media (max-width: 767px) {
  .factory-home { overflow-x: clip; }
  .factory-home .canvas-controls button { min-width: 44px; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .factory-home *, .factory-home *::before, .factory-home *::after {
    animation: none !important;
    transition: none !important;
  }
}
/* Personal OS end */
`
}

function expectFailure(css, message, pattern) {
  const result = runChecker(css)
  assert.notEqual(result.status, 0, message)
  assert.match(result.stderr, pattern)
}

const valid = validTheme()
const validResult = runChecker(valid)
assert.equal(validResult.status, 0, `current Personal OS visual contract must pass: ${validResult.stderr}`)

expectFailure(`/* ${valid} */`, 'commented CSS must fail', /exactly one :root rule/)
expectFailure(valid.replace('.dark {', '.dark-missing {'), 'dark palette remains required', /exactly one \.dark rule/)
expectFailure(valid.replace('--factory-focus: #123456;', ''), 'factory tokens remain required', /must declare --factory-focus/)

expectFailure(valid.replaceAll('#2F83D6', '#275DAD'), 'desktop blue is exact', /palette must include #2F83D6/)
expectFailure(valid.replace('height: 40px;', 'height: 32px;'), 'menu height is exact', /menu must be exactly 40px/)
expectFailure(valid.replace('.factory-home .desktop-surface__workspace { height: calc(100dvh - 40px); }', ''), 'dvh pair is required', /100vh and 100dvh geometry/)
expectFailure(valid.replace('min-width: 360px;', 'min-width: 340px;'), 'window width minimum is fixed', /360 x 260 desktop minimum/)
expectFailure(valid.replace('min-height: 260px;', 'min-height: 240px;'), 'window height minimum is fixed', /360 x 260 desktop minimum/)
expectFailure(valid.replace('@media (max-width: 767px)', '@media (max-width: 700px)'), 'mobile query is exact', /max-width: 767px/)
expectFailure(valid.replace('min-width: 44px;', 'min-width: 40px;'), 'mobile hit width is fixed', /44px hit area/)
expectFailure(valid.replace('animation: none !important;', 'animation: fade 1s;'), 'reduced motion is required', /reduced-motion coverage/)
expectFailure(valid.replace('.factory-home .desktop-icon', '.desktop-icon'), 'OS selectors cannot leak', /must be homepage scoped/)
expectFailure(
  valid.replace('/* Personal OS end */', '.desktop-surface__menu { height: 99px; }\n/* Personal OS end */'),
  'unscoped BEM descendants cannot bypass homepage scope',
  /must be homepage scoped/,
)
expectFailure(
  valid.replace('/* Personal OS end */', '.desktop-surface_menu { height: 99px; }\n/* Personal OS end */'),
  'unscoped single-underscore BEM descendants cannot bypass homepage scope',
  /must be homepage scoped/,
)
expectFailure(
  valid.replace('/* Personal OS end */', '.canvas-card--selected { opacity: .9; }\n/* Personal OS end */'),
  'unscoped BEM modifiers cannot bypass homepage scope',
  /must be homepage scoped/,
)
expectFailure(
  valid.replace('/* Personal OS end */', '.window-manager__controls { display: none; }\n/* Personal OS end */'),
  'unscoped window controls cannot bypass homepage scope',
  /must be homepage scoped/,
)
expectFailure(
  valid.replace('/* Personal OS end */', '.window-manager__resize-handle { width: 1px; }\n/* Personal OS end */'),
  'unscoped window resize handles cannot bypass homepage scope',
  /must be homepage scoped/,
)
expectFailure(
  valid.replace('/* Personal OS end */', '.canvas-connections { opacity: 0; }\n/* Personal OS end */'),
  'unscoped structural canvas connections cannot bypass homepage scope',
  /must be homepage scoped/,
)
const blurAllowed = runChecker(valid.replace('border-color: #69707D;', 'border-color: #69707D; backdrop-filter: blur(8px);'))
assert.equal(blurAllowed.status, 0, `approved backdrop blur should pass: ${blurAllowed.stderr}`)
const starsAllowed = runChecker(valid.replace('color: #FFFDF7;', 'color: #FFFDF7; --stars: visible;'))
assert.equal(starsAllowed.status, 0, `approved star texture token should pass: ${starsAllowed.stderr}`)
expectFailure(valid.replace('color: #FFFDF7;', 'color: #FFFDF7; --particle: visible;'), 'particles remain forbidden', /must not use particles/)
expectFailure(valid.replace('color: #FFFDF7;', 'color: #FFFDF7; --illustration: visible;'), 'illustrations remain forbidden', /must not use particles/)
expectFailure(valid.replace('background: #FFFDF7;', 'background: #FFFDF7; box-shadow: 18px 18px 0 #315EFB;'), 'strong colored shadow is forbidden', /strong or saturated box-shadow/)
expectFailure(valid.replace('font-family: var(--vp-font-family-base);', 'font-family: var(--vp-font-family-base); touch-action: none;'), 'page-wide touch lock is forbidden', /must not disable touch action page-wide/)

const malformed = runChecker(`${valid}\n.broken { color: red;`)
assert.notEqual(malformed.status, 0, 'malformed CSS must fail')
assert.match(malformed.stderr, /unclosed rule block/)

console.log('theme validator tests passed')
