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
  font-family: var(--vp-font-family-base);
}
.factory-home .system-topbar {
  position: fixed; inset: 0 0 auto; height: 56px;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}
.factory-home.is-entering .system-topbar {
  animation: personal-os-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0ms;
}
.factory-home .desktop-canvas {
  display: grid; width: min(1360px, calc(100vw - 48px)); min-height: 1040px;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  grid-template-rows: repeat(14, minmax(0, 1fr)); gap: 16px;
}
.factory-home .profile-card { min-width: 0; }
.factory-home .current-status-card { min-width: 0; }
.factory-home .featured-project-card { min-width: 0; }
.factory-home .project-folder { min-width: 0; font-family: "JetBrains Mono", "Fira Code", Consolas, monospace; }
.factory-home .notes-launcher { min-width: 0; }
.factory-home .lab-launcher { min-width: 0; }
.factory-home .contact-terminal { min-width: 0; font-family: "JetBrains Mono", "Fira Code", Consolas, monospace; }
.factory-home .canvas-controls { min-width: 0; font-family: "JetBrains Mono", "Fira Code", Consolas, monospace; }
.factory-home .profile-card__eyebrow,
.factory-home .profile-card h1,
.factory-home .profile-card__role,
.factory-home .profile-card__specialty,
.factory-home .profile-card__about,
.factory-home .profile-card__projects,
.factory-home .current-status-card h2,
.factory-home .project-folder h2,
.factory-home .current-status-card dt,
.factory-home .featured-project-card > p:first-child,
.factory-home .featured-project-card dl,
.factory-home .featured-project-card a,
.factory-home .notes-launcher h2,
.factory-home .project-folder li span,
.factory-home .notes-launcher li span,
.factory-home .lab-launcher h2,
.factory-home .lab-launcher li span {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}
.factory-home .profile-card__summary,
.factory-home .current-status-card dd,
.factory-home .featured-project-card h2,
.factory-home .featured-project-card h2 + p,
.factory-home .notes-launcher li,
.factory-home .lab-launcher li {
  font-family: var(--vp-font-family-base);
}
.factory-home .desktop-canvas__profile { grid-column: 1 / 8; grid-row: 1 / 5; }
.factory-home .desktop-canvas__status { grid-column: 9 / 13; grid-row: 1 / 4; }
.factory-home .desktop-canvas__featured { grid-column: 4 / 11; grid-row: 5 / 10; }
.factory-home .desktop-canvas__projects { grid-column: 11 / 15; grid-row: 4 / 8; }
.factory-home .desktop-canvas__notes { grid-column: 1 / 4; grid-row: 6 / 10; }
.factory-home .desktop-canvas__lab { grid-column: 11 / 15; grid-row: 9 / 13; }
.factory-home .desktop-canvas__contact { grid-column: 3 / 10; grid-row: 11 / 15; }
.factory-home .desktop-canvas__controls { grid-column: 12 / 15; grid-row: 14 / 15; }
.factory-home.is-entering .desktop-canvas > * {
  animation: personal-os-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.factory-home.is-entering .desktop-canvas__profile { animation-delay: 50ms; }
.factory-home.is-entering .desktop-canvas__status { animation-delay: 110ms; }
.factory-home.is-entering .desktop-canvas__featured { animation-delay: 170ms; }
.factory-home.is-entering .desktop-canvas__projects { animation-delay: 230ms; }
.factory-home.is-entering .desktop-canvas__notes { animation-delay: 290ms; }
.factory-home.is-entering .desktop-canvas__lab { animation-delay: 350ms; }
.factory-home.is-entering .desktop-canvas__contact { animation-delay: 410ms; }
.factory-home.is-entering .desktop-canvas__controls { animation-delay: 470ms; }
@keyframes personal-os-reveal {
  from { opacity: 0; transform: translateY(8px) scale(.995); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 767px) {
  .factory-home .desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .factory-home.is-entering .system-topbar,
  .factory-home.is-entering .desktop-canvas > * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
.factory-home .profile-card::before { transform: rotate(1deg); }
@media (min-width: 900px) { .unrelated-widget { display: block; transform: rotate(2deg); } }
/* Personal OS end */
.other-page { animation: other-reveal 2s ease both; transform: rotate(4deg); }
@keyframes other-reveal { from { opacity: 0; transform: skew(2deg); } to { opacity: 1; } }
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

function appendToOs(css, extra) {
  return css.replace('/* Personal OS end */', `${extra}\n/* Personal OS end */`)
}

const validThemeResult = runChecker(validTheme())
assert.equal(
  validThemeResult.status,
  0,
  `complete Personal OS palettes and responsive rules must pass validation: ${validThemeResult.stderr}`,
)

const monoRoot = runChecker(validTheme().replace(
  'font-family: var(--vp-font-family-base);',
  'font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;',
))
assert.notEqual(monoRoot.status, 0, 'Chinese homepage body copy must inherit the VitePress sans stack')
assert.match(monoRoot.stderr, /root must use the VitePress base font/)

const sansSystemText = runChecker(validTheme().replace(
  'position: fixed; inset: 0 0 auto; height: 56px;\n  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;',
  'position: fixed; inset: 0 0 auto; height: 56px;\n  font-family: var(--vp-font-family-base);',
))
assert.notEqual(sansSystemText.status, 0, 'system information must use the exact monospace stack')
assert.match(sansSystemText.stderr, /system text must use the exact monospace stack/)

const monoChineseCopy = runChecker(validTheme().replace(
  '.factory-home .profile-card__summary,',
  '.factory-home .profile-card__summary { font-family: "JetBrains Mono", "Fira Code", Consolas, monospace; }\n.factory-home .profile-card__summary-missing,',
))
assert.notEqual(monoChineseCopy.status, 0, 'Chinese body-copy selectors must keep the VitePress sans stack')
assert.match(monoChineseCopy.stderr, /Chinese body text must use the VitePress base font/)

const commented = runChecker(`/* ${validTheme()} */`)
assert.notEqual(commented.status, 0, 'commented-out declarations and selectors must fail validation')

const missingDark = runChecker(validTheme().replace('.dark {', '.dark-missing {'))
assert.notEqual(missingDark.status, 0, 'missing dark palette anchors must fail validation')
assert.match(missingDark.stderr, /exactly one \.dark rule/)

const missingToken = runChecker(validTheme().replace('--factory-focus: #123456;', ''))
assert.notEqual(missingToken.status, 0, 'both palettes require every factory token')
assert.match(missingToken.stderr, /must declare --factory-focus/)

const nonFixedTopbar = runChecker(validTheme().replace('position: fixed; inset: 0 0 auto; height: 56px;', 'position: sticky; inset: 0 0 auto; height: 56px;'))
assert.notEqual(nonFixedTopbar.status, 0, 'the OS topbar must remain fixed')
assert.match(nonFixedTopbar.stderr, /topbar must use fixed positioning and a 56px height/)

const nonFourteenColumnCanvas = runChecker(validTheme().replace(
  'repeat(14, minmax(0, 1fr))',
  'repeat(12, minmax(0, 1fr))',
))
assert.notEqual(nonFourteenColumnCanvas.status, 0, 'the desktop canvas must use exactly 14 columns')
assert.match(nonFourteenColumnCanvas.stderr, /desktop canvas must use the exact 14-column grid/)

const missingPlacement = runChecker(validTheme().replace('.factory-home .desktop-canvas__lab { grid-column: 11 / 15; grid-row: 9 / 13; }', ''))
assert.notEqual(missingPlacement.status, 0, 'every OS card needs an explicit placement selector')
assert.match(missingPlacement.stderr, /exactly one \.factory-home \.desktop-canvas__lab rule/)

const misplacedMobile = runChecker(validTheme().replace(
  '@media (max-width: 767px) {\n  .factory-home .desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }\n}',
  '.factory-home .desktop-canvas { width: calc(100vw - 32px); grid-template-columns: 1fr; }',
))
assert.notEqual(misplacedMobile.status, 0, 'the mobile grid declaration must be inside the 767px media query')
assert.match(misplacedMobile.stderr, /exactly one \.factory-home \.desktop-canvas rule/)

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
assert.match(missingTopbarReduction.stderr, /exactly one \.factory-home\.is-entering \.system-topbar rule/)

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

const forbiddenDrag = runChecker(validTheme().replace('/* Personal OS end */', '.factory-home .desktop-canvas { cursor: grab; touch-action: none; }\n/* Personal OS end */'))
assert.notEqual(forbiddenDrag.status, 0, 'static OS CSS must not advertise drag or zoom behavior')
assert.match(forbiddenDrag.stderr, /must not enable drag or zoom behavior/)

const unscopedSurface = runChecker(validTheme().replace('.factory-home .lab-launcher { min-width: 0; }', '.lab-launcher { min-width: 0; }'))
assert.notEqual(unscopedSurface.status, 0, 'OS selectors must not leak to same-named classes on other pages')
assert.match(unscopedSurface.stderr, /must be homepage scoped/)

const strongShadow = runChecker(validTheme().replace(
  '.factory-home .profile-card { min-width: 0; }',
  '.factory-home .profile-card { min-width: 0; box-shadow: 8px 8px 0 #315EFB; }',
))
assert.notEqual(strongShadow.status, 0, 'saturated offset shadows must be rejected')
assert.match(strongShadow.stderr, /strong or saturated box-shadow/)

const laterAnimationOverride = runChecker(appendToOs(validTheme(), `
.factory-home.is-entering .system-topbar {
  animation: personal-os-reveal 900ms ease both;
  animation-delay: 0ms;
}`))
assert.notEqual(laterAnimationOverride.status, 0, 'a later duplicate animation rule must not bypass validation')
assert.match(laterAnimationOverride.stderr, /exactly one/)

const laterPlacementOverride = runChecker(appendToOs(validTheme(), `
.factory-home .desktop-canvas__profile { grid-column: 2 / 9; grid-row: 2 / 6; }`))
assert.notEqual(laterPlacementOverride.status, 0, 'a later duplicate placement rule must not bypass validation')
assert.match(laterPlacementOverride.stderr, /exactly one/)

const laterMobileOverride = runChecker(appendToOs(validTheme(), `
@media (max-width: 767px) {
  .factory-home .desktop-canvas { width: 100vw; grid-template-columns: repeat(2, 1fr); }
}`))
assert.notEqual(laterMobileOverride.status, 0, 'a later duplicate mobile override must not bypass validation')
assert.match(laterMobileOverride.stderr, /exactly one/)

const laterReducedMotionOverride = runChecker(appendToOs(validTheme(), `
@media (prefers-reduced-motion: reduce) {
  .factory-home.is-entering .system-topbar,
  .factory-home.is-entering .desktop-canvas > * {
    animation: personal-os-reveal 420ms linear both;
    transition: opacity 1s;
    transform: scale(2);
  }
}`))
assert.notEqual(laterReducedMotionOverride.status, 0, 'a later duplicate reduced-motion rule must not bypass validation')
assert.match(laterReducedMotionOverride.stderr, /exactly one/)

const laterStrongShadowOverride = runChecker(appendToOs(validTheme(), `
.factory-home .profile-card { box-shadow: 10px 10px 0 #315EFB; }`))
assert.notEqual(laterStrongShadowOverride.status, 0, 'a later duplicate strong shadow must not bypass validation')
assert.match(laterStrongShadowOverride.stderr, /strong or saturated box-shadow/)

const unexpectedAnimationMedia = runChecker(appendToOs(validTheme(), `
@media (min-width: 900px) {
  .factory-home.is-entering .system-topbar {
    animation: personal-os-reveal 900ms ease both;
  }
}`))
assert.notEqual(unexpectedAnimationMedia.status, 0, 'unexpected media must not override topbar animation')
assert.match(unexpectedAnimationMedia.stderr, /unexpected ancestor context/)

const unexpectedPlacementMedia = runChecker(appendToOs(validTheme(), `
@media (min-width: 900px) {
  .factory-home .desktop-canvas__profile { grid-column: 2 / 9; grid-row: 2 / 6; }
}`))
assert.notEqual(unexpectedPlacementMedia.status, 0, 'unexpected media must not override a placement')
assert.match(unexpectedPlacementMedia.stderr, /unexpected ancestor context/)

const unexpectedCanvasMedia = runChecker(appendToOs(validTheme(), `
@media (min-width: 900px) {
  .factory-home .desktop-canvas { grid-template-columns: repeat(2, 1fr); width: 100vw; }
}`))
assert.notEqual(unexpectedCanvasMedia.status, 0, 'unexpected media must not override the desktop canvas')
assert.match(unexpectedCanvasMedia.stderr, /unexpected ancestor context/)

for (const [label, before, after] of [
  ['duration', 'personal-os-reveal 420ms', 'personal-os-reveal 700ms'],
  ['easing', 'cubic-bezier(0.16, 1, 0.3, 1)', 'ease-in-out'],
  ['translateX', 'translateY(8px) scale(.995)', 'translateX(8px) scale(.995)'],
  ['skew', 'translateY(8px) scale(.995)', 'translateY(8px) skew(2deg)'],
  ['scale', 'scale(.995)', 'scale(2)'],
]) {
  const invalidReveal = runChecker(validTheme().replaceAll(before, after))
  assert.notEqual(invalidReveal.status, 0, `reveal ${label} mutation must fail`)
  assert.match(invalidReveal.stderr, /Personal OS reveal/)
}

const malformedCss = runChecker(`${validTheme()}\n.broken { color: red;`)
assert.notEqual(malformedCss.status, 0, 'malformed CSS must fail validation')
assert.match(malformedCss.stderr, /unclosed rule block/)

console.log('theme validator tests passed')
