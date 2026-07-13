# Fullscreen Terminal Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's inline factory boot panel with a session-aware, accessible full-screen terminal splash that exits in 400 ms, unmounts, and reveals the unchanged homepage over 600 ms.

**Architecture:** Keep VitePress `DefaultTheme`, the existing global `KnowledgeFactoryHome` registration, and the server-rendered four-module homepage. A synchronous homepage-only head script establishes pre-paint state and a 2500 ms fail-open watchdog; a browser-global-free helper owns storage/input transitions; the locally imported `FactoryBoot` reconciles hydration, focus, input lock, exit/unmount, and homepage reveal. CSS is fail-open by default and scopes the fixed light splash, responsive layout, exact motion, and reduced-motion bypass to the homepage interaction.

**Tech Stack:** VitePress 1.6.4, Vue 3 SFC, TypeScript VitePress config, CSS, Node.js built-in test runner, existing theme validator, Wrangler 4.

## Global Constraints

- Scope is方案 A: show the splash only on a direct document load of `/` or `/index.html`; a first SPA navigation to `/` without the head marker reveals the homepage directly.
- Rewrite the existing `FactoryBoot.vue` and `factoryBootState.mjs` in place; remove the old inline boot UI, old simulated lines, old skip control, and old 320/720/900 ms timers instead of layering a second splash on top.
- Preserve the exact four homepage modules and routes: `/wiki/`, `/finance/`, `/ask/`, and `/llm-wiki/`.
- Do not modify `worker/**`, quotas, retrieval, `docs/wiki/**`, `docs/finance/**`, `docs/ask/**`, `docs/llm-wiki/**`, generated indexes, publishing pipelines, Wrangler bindings, or any non-home route.
- Do not modify `docs/index.md`, `docs/.vitepress/theme/index.ts`, `package.json`, or `package-lock.json`.
- Add no dependency, remote font, animation library, dark splash variant, replay control, sound, typewriter text, progress line, or extra terminal copy.
- Visible copy is exactly `JuZX@digital-factory ~ zsh` and `> Press Enter to Access System`; the native button's exact accessible name is `进入个人网站`; its separate `_` cursor is `aria-hidden="true"`.
- Splash colors are exactly background `#F7F4EC` and text `#1E2430`; its font stack is exactly `"JetBrains Mono", "Fira Code", Consolas, monospace` in source.
- Storage is exactly `sessionStorage['personal-site-accessed'] = 'true'`; do not use the old key, `localStorage`, cookies, timestamps, or serialized objects.
- Splash fade is exactly 400 ms, homepage fade exactly 600 ms, cursor blink approximately 800 ms, and both fades use `cubic-bezier(0.16, 1, 0.3, 1)`.
- The 400 ms splash fade completes before Vue removes the overlay DOM; only then may the 600 ms homepage fade start.
- CSS without a preflight marker must hide the SSR splash shell and show the complete homepage; JavaScript-disabled, bundle-failure, storage-error, and motion-query-error paths fail open.
- Returning-session and reduced-motion direct loads must not paint the splash or steal focus; reduced motion directly reveals the homepage with zero-duration interaction motion.
- Desktop edge spacing stays within 32–48 px, top-left copy within 14–16 px, and centered command within 16–20 px; mobile edge spacing stays within 20–24 px with a minimum 44-by-44-pixel button.
- Full-screen sizing includes `min-height: 100vh`, then `height: 100dvh` and `min-height: 100dvh`; the overlay is fixed above VitePress navigation.
- Use test-driven development: make each focused contract fail for the intended reason before changing production code, then run it green before committing.

---

### Task 1: Pure Access State and Pre-Paint Head Contract

**Files:**
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `docs/.vitepress/theme/components/factoryBootState.mjs`
- Modify: `docs/.vitepress/config.mts`

**Interfaces:**
- Consumes: the existing Node test harness and VitePress `defineConfig`; no DOM library and no browser global at module evaluation.
- Produces: `BOOT_STORAGE_KEY`, `BOOT_STORAGE_VALUE`, `getSessionStorage(browser)`, `getReducedMotionPreference(browser)`, `readInitialBootState(storage, reducedMotion, preflightState)`, `writeAccessed(storage)`, `transitionBoot(state, event)`, `isInteractiveTarget(target)`, and `shouldActivateFromEnter(event, state)` from `factoryBootState.mjs`; runtime states are exactly `'ready' | 'leaving' | 'complete' | 'skipped'`, events exactly `'ACTIVATE' | 'EXIT_COMPLETE' | 'BYPASS'`.
- Produces: `<html data-personal-site-access="pending|returning|fallback">` from the synchronous head preflight and `window['__personalSiteAccessFallback']` containing the 2500 ms watchdog timer id only while a first direct homepage load is pending.

- [ ] **Step 1: Replace the old state tests with failing exact-key, fail-open, transition, and head-preflight contracts**

In `scripts/personal-knowledge-factory.test.mjs`, change the helper import to:

```js
import {
  BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, getReducedMotionPreference, getSessionStorage, isInteractiveTarget,
  readInitialBootState, shouldActivateFromEnter, transitionBoot, writeAccessed,
} from '../docs/.vitepress/theme/components/factoryBootState.mjs'
```

Replace the existing boot storage, initial-state, and transition test blocks with these complete blocks, leaving the homepage/four-module tests in place:

```js
test('splash state uses the exact session contract and fails open', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  assert.equal(BOOT_STORAGE_KEY, 'personal-site-accessed')
  assert.equal(BOOT_STORAGE_VALUE, 'true')
  assert.equal(readInitialBootState(storage, false, 'pending'), 'ready')
  assert.equal(writeAccessed(storage), true)
  assert.equal(values.get('personal-site-accessed'), 'true')
  assert.equal(readInitialBootState(storage, false, 'pending'), 'skipped')
  assert.equal(readInitialBootState(storage, true, 'pending'), 'skipped')
  assert.equal(readInitialBootState(storage, false, 'returning'), 'skipped')
  assert.equal(readInitialBootState(storage, false, 'none'), 'skipped')
  assert.equal(readInitialBootState(undefined, false, 'pending'), 'skipped')
  assert.equal(readInitialBootState({ getItem() { throw new Error('denied') } }, false, 'pending'), 'skipped')
  assert.equal(writeAccessed({ setItem() { throw new Error('denied') } }), false)
})

test('browser capability accessors fail open without module-level globals', () => {
  const deniedWindow = Object.defineProperty({}, 'sessionStorage', {
    get() { throw new DOMException('denied', 'SecurityError') },
  })
  assert.equal(getSessionStorage(deniedWindow), undefined)
  assert.equal(getReducedMotionPreference({ matchMedia: () => ({ matches: true }) }), true)
  assert.equal(getReducedMotionPreference({ matchMedia() { throw new Error('unavailable') } }), true)
  assert.equal(getReducedMotionPreference({}), true)
})

test('splash transitions accept one activation and no repeated input', () => {
  assert.equal(transitionBoot('ready', 'ACTIVATE'), 'leaving')
  assert.equal(transitionBoot('leaving', 'ACTIVATE'), 'leaving')
  assert.equal(transitionBoot('leaving', 'EXIT_COMPLETE'), 'complete')
  assert.equal(transitionBoot('complete', 'ACTIVATE'), 'complete')
  assert.equal(transitionBoot('ready', 'BYPASS'), 'skipped')
  assert.equal(isInteractiveTarget({ closest: () => ({ tagName: 'BUTTON' }) }), true)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => null } }, 'ready'), true)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', repeat: true, target: { closest: () => null } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', isComposing: true, target: { closest: () => null } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => null } }, 'leaving'), false)
})

test('VitePress head preflight is homepage-only, synchronous, exact, and bounded', async () => {
  const config = await read('docs/.vitepress/config.mts')
  for (const source of [
    "location.pathname === '/'", "location.pathname === '/index.html'",
    "sessionStorage.getItem('personal-site-accessed')", "stored === 'true'",
    "matchMedia('(prefers-reduced-motion: reduce)')", "dataset.personalSiteAccess = 'pending'",
    "dataset.personalSiteAccess = 'returning'", "dataset.personalSiteAccess = 'fallback'",
    "window.setTimeout", '2500', "window['__personalSiteAccessFallback']",
  ]) assert.match(config, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(config, /head:\s*\[\s*\['script',\s*\{\},\s*personalSiteAccessPreflight\]\s*\]/)
  assert.doesNotMatch(config, /type:\s*['"]module['"]/)
})
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```bash
npm run test:factory
```

Expected: FAIL during module import because `writeAccessed` and `shouldActivateFromEnter` are not exported; after only fixing imports it must still fail on the old key and missing `head` preflight.

- [ ] **Step 3: Replace the pure state helper with the exact implementation**

Replace all of `docs/.vitepress/theme/components/factoryBootState.mjs` with:

```js
export const BOOT_STORAGE_KEY = 'personal-site-accessed'
export const BOOT_STORAGE_VALUE = 'true'

export function getSessionStorage(browser) {
  try {
    return browser?.sessionStorage
  } catch {
    return undefined
  }
}

export function getReducedMotionPreference(browser) {
  try {
    if (typeof browser?.matchMedia !== 'function') return true
    return Boolean(browser.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch {
    return true
  }
}

export function readInitialBootState(storage, reducedMotion = false, preflightState = 'none') {
  if (reducedMotion || preflightState !== 'pending' || !storage) return 'skipped'
  try {
    return storage.getItem(BOOT_STORAGE_KEY) === BOOT_STORAGE_VALUE ? 'skipped' : 'ready'
  } catch {
    return 'skipped'
  }
}

export function writeAccessed(storage) {
  try {
    storage?.setItem(BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE)
    return Boolean(storage)
  } catch {
    return false
  }
}

export function transitionBoot(state, event) {
  if (state === 'ready' && event === 'ACTIVATE') return 'leaving'
  if (state === 'leaving' && event === 'EXIT_COMPLETE') return 'complete'
  if (state === 'ready' && event === 'BYPASS') return 'skipped'
  return state
}

export function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"]),audio[controls],video[controls],[role="button"],[role="link"]'))
}

export function shouldActivateFromEnter(event, state) {
  return state === 'ready' && event?.key === 'Enter' && !event.repeat && !event.isComposing
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isInteractiveTarget(event.target)
}
```

- [ ] **Step 4: Add the synchronous homepage-only preflight to VitePress config**

Insert this constant after the import in `docs/.vitepress/config.mts`:

```ts
const personalSiteAccessPreflight = String.raw`(function () {
  var root = document.documentElement
  var isHomepage = location.pathname === '/' || location.pathname === '/index.html'
  if (!isHomepage) return
  try {
    if (typeof window.matchMedia !== 'function') throw new Error('motion query unavailable')
    var stored = window.sessionStorage.getItem('personal-site-accessed')
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root.dataset.personalSiteAccess = stored === 'true' || reduced ? 'returning' : 'pending'
    if (root.dataset.personalSiteAccess === 'pending') {
      window['__personalSiteAccessFallback'] = window.setTimeout(function () {
        if (root.dataset.personalSiteAccess === 'pending') root.dataset.personalSiteAccess = 'fallback'
      }, 2500)
    }
  } catch (error) {
    root.dataset.personalSiteAccess = 'fallback'
  }
})()`
```

Add this property immediately after `srcExclude` in the config object:

```ts
  head: [['script', {}, personalSiteAccessPreflight]],
```

This is a classic inline script by omission of `type="module"`; do not add `async`, `defer`, or an external asset URL.

- [ ] **Step 5: Run focused state/preflight tests and the SSR build GREEN**

Run:

```bash
npm run test:factory
npm run docs:build
```

Expected: `test:factory` passes all current subtests; VitePress reports `build complete` and emits `/index.html` without `window is not defined`, hydration-generation, or config serialization errors.

- [ ] **Step 6: Verify scope and commit Task 1**

Run:

```bash
git diff --check
git diff --name-only HEAD
```

Expected: no whitespace errors; only `docs/.vitepress/config.mts`, `docs/.vitepress/theme/components/factoryBootState.mjs`, and `scripts/personal-knowledge-factory.test.mjs` are listed.

Commit:

```bash
git add docs/.vitepress/config.mts docs/.vitepress/theme/components/factoryBootState.mjs scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: add terminal splash preflight state"
```

Expected: one commit containing the pure state/preflight contract and its passing focused tests.

---

### Task 2: Full-Screen Component, Homepage Reveal, CSS, and Theme Validation

**Files:**
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `docs/.vitepress/theme/components/FactoryBoot.vue`
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Modify: `docs/.vitepress/theme/custom.css`
- Modify: `scripts/theme-validator.mjs`
- Modify: `scripts/theme-validator.test.mjs`

**Interfaces:**
- Consumes: all Task 1 exports exactly as named; `data-personal-site-access="pending|returning|fallback|leaving|entered"`; `window['__personalSiteAccessFallback']`; existing `#factory-title`; existing `.factory-home`, `.factory-hero`, four module definitions, and factory CSS tokens.
- Produces: local `<FactoryBoot @reveal="handleReveal" />`; one `reveal` event emitted only after the 400 ms overlay exit; `.factory-home.is-entering` for the 600 ms homepage animation; overlay phases through `data-state="complete|ready|leaving"`; no overlay node after complete/skipped hydration.
- Produces: CSS selectors `.factory-boot`, `.factory-boot__shell`, `.factory-boot__access`, `.factory-boot__command`, `.factory-boot__cursor`, `.factory-home.is-entering`, keyframes `factory-cursor-blink` and `factory-home-enter`.

- [ ] **Step 1: Replace the old inline/source assertions with failing full-screen component contracts**

Replace the current `factory boot stays inline...`, factory style, and mobile boot portions in `scripts/personal-knowledge-factory.test.mjs` with:

```js
test('factory boot is one exact accessible fullscreen replacement', async () => {
  const [boot, home, css, state] = await Promise.all([
    read('docs/.vitepress/theme/components/FactoryBoot.vue'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/custom.css'),
    read('docs/.vitepress/theme/components/factoryBootState.mjs'),
  ])
  for (const copy of ['JuZX@digital-factory ~ zsh', '> Press Enter to Access System', 'aria-label="进入个人网站"']) {
    assert.match(boot, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(boot, /class="factory-boot__cursor" aria-hidden="true">_<\/span>/)
  assert.doesNotMatch(`${boot}\n${state}`, /启动知识系统|跳过启动|Loading knowledge archives|Connecting Ask Console|ai-era:knowledge-factory:booted|localStorage/)
  assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>\s*<main/)
  assert.doesNotMatch(home.match(/<section class="factory-hero"[\s\S]*?<\/section>/)?.[0] ?? '', /FactoryBoot/)
  assert.match(boot, /v-if="visible"/)
  assert.match(boot, /defineEmits\(\['reveal'\]\)/)
  assert.match(boot, /window\.setTimeout\(finishExit, 400\)/)
  assert.match(boot, /onBeforeUnmount/)
  assert.match(boot, /focus\(\{ preventScroll: true \}\)/)
  assert.match(css, /\.factory-boot\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?min-height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?min-height:\s*100dvh;/)
})

test('splash visual, motion, mobile, and fail-open rules are exact', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  for (const source of [
    '#F7F4EC', '#1E2430', '"JetBrains Mono", "Fira Code", Consolas, monospace',
    '400ms cubic-bezier(0.16, 1, 0.3, 1)', '600ms cubic-bezier(0.16, 1, 0.3, 1)',
    '800ms', 'touch-action: manipulation', 'min-width: 44px', 'min-height: 44px',
  ]) assert.match(css, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(css, /html\[data-personal-site-access="pending"\] \.factory-boot/)
  assert.match(css, /html:not\(\[data-personal-site-access="pending"\]\):not\(\[data-personal-site-access="leaving"\]\) \.factory-home/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.factory-boot__cursor[\s\S]*animation:\s*none !important;/)
  assert.doesNotMatch(css, /\.dark[\s\S]{0,240}\.factory-boot/)
})

test('input lock, preflight claim, cleanup, and focus handoff are explicit', async () => {
  const boot = await read('docs/.vitepress/theme/components/FactoryBoot.vue')
  for (const source of [
    "state.value !== 'ready'", "transitionBoot(state.value, 'ACTIVATE')", 'writeAccessed(getSessionStorage(window))',
    "document.documentElement.dataset.personalSiteAccess = 'leaving'", "delete window['__personalSiteAccessFallback']",
    "window.removeEventListener('keydown', handleKeydown)", "document.getElementById('factory-title')",
    "event.key === 'Tab'", 'event.preventDefault()', '@click.stop="activate"', '@click="handleOverlayClick"',
  ]) assert.match(boot, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})
```

In `scripts/site-design.test.mjs`, append:

```js
test('fullscreen splash replaces the inline boot without changing homepage discovery', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  const hero = home.match(/<section class="factory-hero"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.doesNotMatch(hero, /FactoryBoot/)
  assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>\s*<main/)
  for (const route of ['/wiki/', '/finance/', '/ask/', '/llm-wiki/']) assert.match(home, new RegExp(route.replaceAll('/', '\\/')))
})
```

- [ ] **Step 2: Run the focused source tests and verify RED**

Run:

```bash
npm run test:factory
node --test scripts/site-design.test.mjs
```

Expected: FAIL because the current component still contains the old inline copy and hero placement, lacks the `reveal` event, and CSS explicitly implements an inline panel rather than fixed full-screen rules.

- [ ] **Step 3: Rewrite `FactoryBoot.vue` completely**

Replace all of `docs/.vitepress/theme/components/FactoryBoot.vue` with:

```vue
<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getReducedMotionPreference, getSessionStorage, isInteractiveTarget, readInitialBootState,
  shouldActivateFromEnter, transitionBoot, writeAccessed,
} from './factoryBootState.mjs'

const emit = defineEmits(['reveal'])
const accessButton = ref(null)
const visible = ref(true)
const state = ref('complete')
let exitTimer

function clearPreflightFallback() {
  const timer = window['__personalSiteAccessFallback']
  if (timer !== undefined) window.clearTimeout(timer)
  delete window['__personalSiteAccessFallback']
}

function removeKeydown() {
  window.removeEventListener('keydown', handleKeydown)
}

async function finishExit() {
  if (state.value !== 'leaving') return
  state.value = transitionBoot(state.value, 'EXIT_COMPLETE')
  visible.value = false
  document.documentElement.dataset.personalSiteAccess = 'entered'
  emit('reveal')
  await nextTick()
  document.getElementById('factory-title')?.focus({ preventScroll: true })
}

function activate() {
  if (state.value !== 'ready') return
  state.value = transitionBoot(state.value, 'ACTIVATE')
  writeAccessed(getSessionStorage(window))
  removeKeydown()
  document.documentElement.dataset.personalSiteAccess = 'leaving'
  exitTimer = window.setTimeout(finishExit, 400)
}

function handleOverlayClick(event) {
  if (!isInteractiveTarget(event.target)) activate()
}

function handleKeydown(event) {
  if (state.value !== 'ready') return
  if (event.key === 'Tab') {
    event.preventDefault()
    accessButton.value?.focus({ preventScroll: true })
    return
  }
  if (shouldActivateFromEnter(event, state.value)) activate()
}

onMounted(async () => {
  const root = document.documentElement
  const initial = readInitialBootState(
    getSessionStorage(window),
    getReducedMotionPreference(window),
    root.dataset.personalSiteAccess ?? 'none',
  )
  clearPreflightFallback()
  if (initial !== 'ready') {
    state.value = transitionBoot('ready', 'BYPASS')
    visible.value = false
    root.dataset.personalSiteAccess = 'returning'
    return
  }
  state.value = 'ready'
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  accessButton.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  if (exitTimer !== undefined) window.clearTimeout(exitTimer)
  removeKeydown()
  clearPreflightFallback()
  const root = document.documentElement
  if (root.dataset.personalSiteAccess === 'pending' || root.dataset.personalSiteAccess === 'leaving') {
    root.dataset.personalSiteAccess = 'fallback'
  }
})
</script>

<template>
  <section
    v-if="visible"
    class="factory-boot"
    :data-state="state"
    aria-label="个人网站启动页"
    @click="handleOverlayClick"
  >
    <p class="factory-boot__shell" aria-hidden="true">JuZX@digital-factory ~ zsh</p>
    <button
      ref="accessButton"
      class="factory-boot__access"
      type="button"
      aria-label="进入个人网站"
      :aria-disabled="state === 'leaving'"
      @click.stop="activate"
    >
      <span class="factory-boot__command" aria-hidden="true">&gt; Press Enter to Access System</span>
      <span class="factory-boot__cursor" aria-hidden="true">_</span>
    </button>
  </section>
</template>
```

Do not preserve any portion of the old template or timer sequence.

- [ ] **Step 4: Move the splash outside the hero and add the reveal hook**

In `KnowledgeFactoryHome.vue`, add to `<script setup>` after the import:

```js
import { ref } from 'vue'

const homeEntering = ref(false)

function handleReveal() {
  homeEntering.value = true
}
```

Replace the template's opening with:

```vue
<template>
  <FactoryBoot @reveal="handleReveal" />
  <main :class="['factory-home', { 'is-entering': homeEntering }]">
```

Add `tabindex="-1"` to the existing title without changing its id or text:

```vue
<h1 id="factory-title" tabindex="-1">个人知识工厂</h1>
```

Delete the old `<FactoryBoot />` line from `.factory-hero`. Leave all module data, logs, text, links, and their order byte-for-byte unchanged.

- [ ] **Step 5: Replace only the old boot CSS with the full-screen rules**

Remove `.factory-boot` from shared inline-control selectors, delete the old `.factory-boot`, `__lines`, `__status`, `__controls`, quiet, and disabled rule blocks, and insert this block in their place in `custom.css`:

```css
.factory-boot {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  padding: clamp(20px, 6vw, 24px);
  background: #F7F4EC;
  color: #1E2430;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  opacity: 1;
  touch-action: manipulation;
  transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

html[data-personal-site-access="pending"],
html[data-personal-site-access="leaving"] {
  overflow: hidden;
}

html[data-personal-site-access="pending"] .factory-boot,
html[data-personal-site-access="leaving"] .factory-boot {
  display: flex;
}

html[data-personal-site-access="pending"] .factory-home,
html[data-personal-site-access="leaving"] .factory-home {
  visibility: hidden;
  opacity: 0;
}

html:not([data-personal-site-access="pending"]):not([data-personal-site-access="leaving"]) .factory-home {
  visibility: visible;
}

.factory-boot[data-state="leaving"] {
  opacity: 0;
  pointer-events: none;
}

.factory-boot__shell {
  position: absolute;
  inset-block-start: clamp(20px, 6vw, 24px);
  inset-inline-start: clamp(20px, 6vw, 24px);
  margin: 0;
  font-size: clamp(12px, 3.5vw, 14px);
  line-height: 1.5;
}

.factory-boot__access {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  max-width: 100%;
  padding: 10px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: clamp(14px, 4.5vw, 16px);
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
}

.factory-boot__access:focus-visible {
  outline: 2px solid #1E2430;
  outline-offset: 6px;
}

.factory-boot__command {
  overflow-wrap: anywhere;
}

.factory-boot__cursor {
  display: inline-block;
  width: 1ch;
  animation: factory-cursor-blink 800ms step-end infinite;
}

.factory-home.is-entering {
  animation: factory-home-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes factory-cursor-blink {
  50% { opacity: 0; }
}

@keyframes factory-home-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (min-width: 640px) {
  .factory-boot {
    padding: clamp(32px, 4vw, 48px);
  }

  .factory-boot__shell {
    inset-block-start: clamp(32px, 4vw, 48px);
    inset-inline-start: clamp(32px, 4vw, 48px);
    font-size: clamp(14px, 1.2vw, 16px);
  }

  .factory-boot__access {
    font-size: clamp(16px, 1.5vw, 20px);
  }
}
```

Extend the existing `@media (prefers-reduced-motion: reduce)` block with:

```css
  .factory-boot,
  .factory-home.is-entering {
    animation: none !important;
    transition: none !important;
  }

  .factory-boot__cursor {
    animation: none !important;
  }
```

Keep all non-boot factory, knowledge-hub, and Q&A rules unchanged. Do not add `.dark .factory-boot`.

- [ ] **Step 6: Run the focused interaction contracts GREEN and commit the user-visible replacement**

Run:

```bash
npm run test:factory
node --test scripts/site-design.test.mjs
npm run docs:build
```

Expected: all focused factory and site-design subtests pass; VitePress builds the SSR homepage without hydration-generation errors or unresolved component warnings.

Commit:

```bash
git add docs/.vitepress/theme/components/FactoryBoot.vue docs/.vitepress/theme/components/KnowledgeFactoryHome.vue docs/.vitepress/theme/custom.css scripts/personal-knowledge-factory.test.mjs scripts/site-design.test.mjs
git commit -m "feat: replace inline boot with terminal splash"
```

- [ ] **Step 7: Write failing structural validator cases**

In `scripts/theme-validator.test.mjs`, update `validTheme()` so its splash and reduced-motion portion is exactly:

```css
.factory-boot {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  height: 100dvh;
  background: #F7F4EC;
  color: #1E2430;
  transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
.factory-home.is-entering { animation: factory-home-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.factory-boot__access { min-width: 44px; min-height: 44px; }
.factory-boot__cursor { animation: factory-cursor-blink 800ms step-end infinite; }
@media (max-width: 639px) { .factory-modules__grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .factory-home *, .factory-home *::before, .factory-home *::after { animation: none !important; transition: none !important; }
  .factory-boot, .factory-home.is-entering { animation: none !important; transition: none !important; }
  .factory-boot__cursor { animation: none !important; }
}
```

Append these negative cases:

```js
const nonFixedSplash = runChecker(validTheme().replace('position: fixed;', 'position: static;'))
assert.notEqual(nonFixedSplash.status, 0, 'splash must cover the viewport')
assert.match(nonFixedSplash.stderr, /factory splash must use fixed positioning/)

const wrongExitDuration = runChecker(validTheme().replace('400ms cubic-bezier', '300ms cubic-bezier'))
assert.notEqual(wrongExitDuration.status, 0, 'splash exit timing is exact')
assert.match(wrongExitDuration.stderr, /factory splash must use the approved 400ms exit/)

const missingSplashReduction = runChecker(validTheme().replace(
  '.factory-boot, .factory-home.is-entering { animation: none !important; transition: none !important; }',
  '.factory-home.is-entering { animation: none !important; transition: none !important; }',
))
assert.notEqual(missingSplashReduction.status, 0, 'reduced motion must cover the splash')
assert.match(missingSplashReduction.stderr, /reduced-motion media must suppress splash motion/)
```

- [ ] **Step 8: Run the theme validator test and verify RED**

Run:

```bash
node scripts/theme-validator.test.mjs
```

Expected: FAIL because `theme-validator.mjs` does not yet enforce fixed positioning, the exact 400 ms transition, or splash-specific reduced motion.

- [ ] **Step 9: Extend `validateThemeCss` with exact splash checks**

In `scripts/theme-validator.mjs`, after the existing active factory-rule loop, insert:

```js
  const splash = findRule(rules, '.factory-boot')
  const splashDeclarations = parseDeclarations(splash?.body ?? '')
  if (splashDeclarations.get('position') !== 'fixed' || splashDeclarations.get('inset') !== '0') {
    throw new Error('factory splash must use fixed positioning and inset: 0')
  }
  if (splashDeclarations.get('background') !== '#F7F4EC' || splashDeclarations.get('color') !== '#1E2430') {
    throw new Error('factory splash must use the approved fixed palette')
  }
  if (splashDeclarations.get('transition') !== 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)') {
    throw new Error('factory splash must use the approved 400ms exit')
  }

  const homepageEntrance = findRule(rules, '.factory-home.is-entering')
  if (parseDeclarations(homepageEntrance?.body ?? '').get('animation') !== 'factory-home-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both') {
    throw new Error('factory homepage must use the approved 600ms entrance')
  }

  const accessButton = findRule(rules, '.factory-boot__access')
  const accessDeclarations = parseDeclarations(accessButton?.body ?? '')
  if (accessDeclarations.get('min-width') !== '44px' || accessDeclarations.get('min-height') !== '44px') {
    throw new Error('factory splash access button must keep a 44px hit area')
  }
```

After the existing reduced-motion factory check, insert:

```js
  const reducedSplash = findRule(rules, '.factory-boot', reducedMedia)
  const reducedSplashDeclarations = parseDeclarations(reducedSplash?.body ?? '')
  if (reducedSplashDeclarations.get('animation') !== 'none !important'
    || reducedSplashDeclarations.get('transition') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress splash motion')
  }
  const reducedCursor = findRule(rules, '.factory-boot__cursor', reducedMedia)
  if (parseDeclarations(reducedCursor?.body ?? '').get('animation') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress cursor motion')
  }
```

- [ ] **Step 10: Run factory/theme suites GREEN and commit the validator gate**

Run:

```bash
node scripts/theme-validator.test.mjs
npm run test:theme
npm run test:factory
git diff --check
```

Expected: validator fixtures and negative cases pass, existing light/dark palette tests remain unchanged and pass, focused splash tests pass, and no whitespace errors are reported.

Commit:

```bash
git add scripts/theme-validator.mjs scripts/theme-validator.test.mjs
git commit -m "test: validate terminal splash contracts"
```

Expected: Task 2 ends with two reviewable commits: one user-visible replacement and one structural regression gate.

---

### Task 3: Full Verification, Browser Acceptance, Push, and Pull Request

**Files:**
- Verify only: all changed files from Tasks 1 and 2
- Do not modify: `worker/**`, `docs/wiki/**`, `docs/finance/**`, `docs/ask/**`, `docs/llm-wiki/**`, generated indexes, manifests, quota/security code, `package.json`, or lockfile

**Interfaces:**
- Consumes: the committed Task 1 and Task 2 implementation, existing npm verification chain, VitePress development server, Wrangler dry-run, Git, and GitHub CLI.
- Produces: verified branch `feature/fullscreen-terminal-splash` pushed to `origin` and one PR targeting `main`; this plan explicitly stops before merge or deployment.

- [ ] **Step 1: Run the focused and complete automated gates**

Run each command separately so the failing boundary is visible:

```bash
npm run test:factory
npm test
npx wrangler deploy --dry-run
git diff --check origin/main..HEAD
```

Expected:

- `test:factory`: all splash/state/source subtests pass.
- `npm test`: QA indexing, brand/site design, wiki publishing, wiki QA, Worker tests, wiki/finance validation, content/theme checks, VitePress production build, and security scan all exit 0.
- Wrangler dry-run: packaging completes without deploying and without binding/config errors.
- Git diff check: no whitespace errors.

If a gate fails, do not weaken or delete the failing assertion. Diagnose the smallest in-scope cause, add or refine a focused regression when behavior was uncovered, apply the minimal fix, rerun the failed command and all earlier commands, then commit only that fix with:

```bash
git add docs/.vitepress/config.mts docs/.vitepress/theme/components/FactoryBoot.vue docs/.vitepress/theme/components/KnowledgeFactoryHome.vue docs/.vitepress/theme/components/factoryBootState.mjs docs/.vitepress/theme/custom.css scripts/personal-knowledge-factory.test.mjs scripts/site-design.test.mjs scripts/theme-validator.mjs scripts/theme-validator.test.mjs
git commit -m "fix: complete terminal splash verification"
```

Expected: this commit is created only if verification required an actual scoped correction; otherwise the working tree remains unchanged.

- [ ] **Step 2: Start the local VitePress server for browser acceptance**

Run:

```bash
npm run docs:dev -- --host localhost
```

Expected: VitePress prints a local URL on `http://localhost:5173/` (or the next reported free port) and remains running without console build errors. Use the reported port for every browser check below.

- [ ] **Step 3: Verify fresh-session desktop behavior at 1440 px**

In a fresh browser tab/session, remove only `sessionStorage['personal-site-accessed']`, enable normal motion, and load `/` directly.

Expected:

- first paint is opaque `#F7F4EC` with `JuZX@digital-factory ~ zsh` at the upper left and the centered command only;
- computed splash font is the approved local monospace stack, edge spacing is 32–48 px, shell size 14–16 px, command size 16–20 px;
- centered button is focused with visible focus ring and accessibility tree name `进入个人网站`;
- cursor is a separate accessibility-hidden node and blinks around 800 ms;
- one Enter begins a 400 ms opacity-only exit; repeated Enter/clicks do not restart it;
- `.factory-boot` is absent from the DOM after exit, then `.factory-home.is-entering` runs the 600 ms opacity-only entrance;
- focus ends on `#factory-title`, document scrolling is restored, and all four module links remain unchanged.

- [ ] **Step 4: Verify pointer, keyboard, return-session, and failure paths**

Repeat with a fresh session value for each first-visit case.

Expected:

- clicking empty overlay background activates once;
- clicking the centered button activates once without parent-click duplication;
- Space on the focused button activates once;
- Tab and Shift+Tab retain focus on the button while ready;
- same-tab reload with `personal-site-accessed=true` paints the homepage directly with no overlay or homepage entrance animation;
- changing the stored value to anything other than `true` makes a new direct load eligible;
- denying session storage reveals the homepage directly;
- blocking the VitePress client bundle lets the 2500 ms watchdog change the marker to fallback, hide the SSR overlay, reveal the SSR homepage, and restore scrolling;
- direct loads of `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, and `/about` never receive a splash or scroll lock;
- navigating client-side from another route to `/` without a pending marker displays the homepage directly with no late splash.

- [ ] **Step 5: Verify 768 px and 390 px responsive/reduced-motion behavior**

At 768 px with a fresh session, repeat Enter activation. At 390 px, repeat with a tap on the top-left label, a tap on empty background, and the centered button in separate fresh sessions. Then enable `prefers-reduced-motion: reduce` and load `/` directly.

Expected:

- no horizontal scroll, clipping, viewport gap, or exposed page appears at either width;
- mobile edge spacing remains 20–24 px, text shrinks/wraps legibly, and the button computed hit area is at least 44 by 44 px;
- each mobile tap location activates exactly once and browser zoom remains available;
- dynamic browser chrome is covered through `100dvh` sizing;
- reduced motion paints the homepage directly, leaves no overlay DOM after hydration, performs no cursor/fade animation, and does not move focus;
- existing VitePress search, theme control, mobile menu, four modules, Q&A, and other routes behave as before.

- [ ] **Step 6: Stop the server and audit final branch scope**

Stop the development server with `Ctrl-C`, then run:

```bash
git status --short --branch
git diff --name-status origin/main..HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: working tree is clean; the diff contains only the design/plan docs and the nine implementation/test files named in Tasks 1 and 2; commits are small and ordered as docs, preflight state, visible replacement, validator gate, plus an optional scoped verification fix. No Worker, quota, wiki/finance/ask/LLM Wiki content, generated index, package, lockfile, or other-route file appears.

- [ ] **Step 7: Push the branch and open the pull request**

Push:

```bash
git push -u origin feature/fullscreen-terminal-splash
```

Expected: Git reports the remote branch and sets upstream tracking.

Create the PR:

```bash
gh pr create --base main --head feature/fullscreen-terminal-splash --title "feat: add fullscreen terminal homepage splash" --body "## Summary
- replace the inline factory boot with a homepage-only fullscreen terminal splash
- add session preflight, fail-open hydration, input locking, focus handoff, and reduced-motion behavior
- preserve the four knowledge modules and every non-home route

## Verification
- npm run test:factory
- npm test
- npx wrangler deploy --dry-run
- browser acceptance at 1440px, 768px, and 390px
- git diff --check origin/main..HEAD"
```

Expected: GitHub returns one PR URL targeting `main` from `feature/fullscreen-terminal-splash`.

- [ ] **Step 8: Confirm PR state and stop before merge**

Run:

```bash
gh pr view --json number,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,statusCheckRollup
```

Expected: PR state is `OPEN`, head is `feature/fullscreen-terminal-splash`, base is `main`, and the URL is ready for review. Report the PR URL, commit list, automated results, and browser acceptance results. Do not run `gh pr merge`, do not deploy, and do not modify `main`.

---

## Plan Self-Review

- **Coverage:** Task 1 owns exact storage, pure transitions, homepage-only synchronous preflight, reduced-motion/storage fail-open, and the 2500 ms bundle-failure watchdog. Task 2 owns the in-place UI replacement, exact copy/palette/type/layout, all three inputs, input/focus lock, 400 ms exit, DOM unmount, 600 ms homepage entrance, mobile sizing/touch, cleanup, and structural validators. Task 3 owns the full regression gate, desktop/mobile/reduced-motion/failure browser acceptance, scope audit, push, and PR creation without merge.
- **Unresolved-marker scan:** every path, export, state, event, selector, marker, watchdog delay, command, expected result, commit message, branch, PR title, and PR body is explicit. There are no deferred implementation decisions.
- **Interface consistency:** Task 1 exports `shouldActivateFromEnter` and `writeAccessed`, and Task 2 imports those exact names. Preflight and component both use `data-personal-site-access`, `__personalSiteAccessFallback`, `personal-site-accessed`, value `true`, and the same four runtime states. `FactoryBoot` emits `reveal`; `KnowledgeFactoryHome` consumes `@reveal="handleReveal"`; CSS consumes `.is-entering`. Exit completion is the sole boundary between the 400 ms overlay timer and the 600 ms homepage animation.
