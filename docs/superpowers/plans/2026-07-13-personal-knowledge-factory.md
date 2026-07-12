# Personal Knowledge Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the AI 纪元 homepage as an original, accessible Personal Knowledge Factory while preserving every existing knowledge, Q&A, publishing, and deployment contract.

**Architecture:** Keep VitePress and `DefaultTheme` as the application shell. A globally registered `KnowledgeFactoryHome.vue` owns server-rendered homepage semantics, an imported `FactoryBoot.vue` adds optional ambience, and a browser-global-free `factoryBootState.mjs` owns testable state/storage/input rules; all visual changes remain under factory-scoped CSS and existing VitePress tokens.

**Tech Stack:** VitePress 1.x, Vue 3 single-file components, CSS custom properties, Node.js 22 built-in test runner, Wrangler 4.107.0, Cloudflare Workers.

## Global Constraints

- Preserve the `AI 纪元` brand and the existing routes `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/topics/`, the published notes routes, and `/about`.
- Keep the four primary modules exactly: AI 知识库, 金融知识库, 知识库问答 / ASK CONSOLE, and LLM Wiki Skill.
- The startup is inline and optional: no full-screen overlay, focus trap, scroll lock, mandatory animation, network request, or JavaScript-only navigation.
- Persist only `v1` under session key `ai-era:knowledge-factory:booted`; do not use cookies or `localStorage`.
- Reduced motion initializes a static `SYSTEM READY` presentation and disables non-essential homepage motion.
- Use native links/buttons, visible focus, semantic landmarks, SSR-visible module links, 44 px mobile targets, and no horizontal mobile scrolling.
- Introduce no dependency, remote font, infinite canvas, draggable/resizable window, fake file manager, fictional project/career/media module, Three.js, Canvas, database, authentication, or analytics.
- Do not modify `worker/**`, quota/retrieval/API behavior, `docs/wiki/**`, `docs/finance/**`, `docs/ask/**`, `docs/llm-wiki/**`, `scripts/wiki-publish/**`, `scripts/wiki-qa/**`, generated manifests/indexes, Wrangler bindings, routes, secrets, or the public `llm-wiki-skill` repository/release.
- Retain VitePress local search, sidebars, article typography, Q&A citations, theme switching, and Cloudflare main-branch deployment behavior.
- Implement independently; do not copy the reference site's source, assets, copy, component geometry, or animation sequence.

---

### Task 1: Homepage Semantic Contract and SSR Content

**Files:**
- Create: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Create: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `docs/index.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing routes and VitePress page rendering.
- Produces: global component name `KnowledgeFactoryHome`; DOM hooks `.factory-home`, `#knowledge-modules`, `.factory-module`, `.factory-log`, and four `module` records shaped as `{ id: string, systemLabel: string, title: string, description: string, action: string, href: string, featured?: boolean }`.

- [ ] **Step 1: Write the failing semantic contract**

Create `scripts/personal-knowledge-factory.test.mjs` with source-level tests that remain valid under SSR:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage mounts the dedicated factory component', async () => {
  const page = await read('docs/index.md')
  assert.match(page, /layout:\s*page/)
  assert.match(page, /sidebar:\s*false/)
  assert.match(page, /outline:\s*false/)
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
})

test('factory homepage exposes the real brand, actions, and exactly four modules', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  for (const copy of ['AI 纪元', 'PERSONAL KNOWLEDGE FACTORY', '个人知识工厂', '向知识库提问', '浏览知识模块']) {
    assert.match(home, new RegExp(copy))
  }
  const routes = [...home.matchAll(/href:\s*['"](\/(?:wiki|finance|ask|llm-wiki)\/?)['"]/g)].map((match) => match[1])
  assert.deepEqual(routes.sort(), ['/ask/', '/finance/', '/llm-wiki/', '/wiki/'])
  assert.match(home, /href="#knowledge-modules"/)
  assert.doesNotMatch(home, /MES|项目档案|媒体库|实验室|infinite.canvas|draggable/i)
})
```

Add `"test:factory": "node --test scripts/personal-knowledge-factory.test.mjs"` to `scripts`, and replace the start of the aggregate test command with `npm run qa:index && npm run test:factory && ...`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:factory`

Expected: FAIL because `KnowledgeFactoryHome.vue` does not exist or `docs/index.md` does not mount it.

- [ ] **Step 3: Add the custom page mount and semantic component**

Replace `docs/index.md` with:

```md
---
layout: page
title: AI 纪元
description: 把阅读、整理、连接、问答和发布串成一条个人知识生产线。
sidebar: false
outline: false
pageClass: knowledge-factory-page
---

<KnowledgeFactoryHome />
```

Create `KnowledgeFactoryHome.vue`. Keep all four destination links outside `FactoryBoot` so they exist in SSR output and work when JavaScript fails:

```vue
<script setup>
const modules = [
  { id: 'KB-01', systemLabel: 'AI ARCHIVE', title: 'AI 知识库', description: 'AI 编程、智能体工程、产品实践与工具工作流。', action: '浏览 AI 知识', href: '/wiki/' },
  { id: 'KB-02', systemLabel: 'FINANCE ARCHIVE', title: '金融知识库', description: '投资者、量化研究、市场结构与风险概念。', action: '浏览金融知识', href: '/finance/' },
  { id: 'QA-01', systemLabel: 'ASK CONSOLE', title: '知识库问答', description: '基于公开 AI 知识库检索并生成带来源引用的回答。', action: '向知识库提问', href: '/ask/', featured: true },
  { id: 'TOOL-01', systemLabel: 'FACTORY TOOLING', title: 'LLM Wiki Skill', description: '了解知识库原理、构建过程、安装方法与公开版本。', action: '查看构建工具', href: '/llm-wiki/' },
]
const logs = [
  { title: 'LLM Wiki Skill 公开指南', href: '/llm-wiki/', date: '2026-07-12' },
  { title: 'AI 知识库', href: '/wiki/', date: '2026-07-12' },
  { title: '金融知识库', href: '/finance/', date: '2026-07-08' },
]
</script>

<template>
  <main class="factory-home">
    <nav class="factory-status" aria-label="知识工厂快捷导航">
      <a class="factory-status__brand" href="/">AI 纪元</a>
      <span class="factory-status__system">PERSONAL KNOWLEDGE FACTORY</span>
      <span class="factory-status__state"><i aria-hidden="true" />SYSTEM ONLINE</span>
      <span class="factory-status__links"><a href="/wiki/">知识库</a><a href="/ask/">问答</a><a href="/about">关于</a></span>
    </nav>

    <section class="factory-hero" aria-labelledby="factory-title">
      <p class="factory-label">PERSONAL KNOWLEDGE FACTORY</p>
      <h1 id="factory-title">个人知识工厂</h1>
      <p class="factory-hero__hello">你好，这里是 AI 纪元。</p>
      <p>这里持续整理 AI、产品、工程与金融研究中值得长期保留的知识。</p>
      <div class="factory-actions"><a class="primary" href="/ask/">向知识库提问</a><a href="#knowledge-modules">浏览知识模块</a></div>
    </section>

    <section id="knowledge-modules" class="factory-modules" aria-labelledby="modules-title">
      <header><p class="factory-label">KNOWLEDGE MODULES</p><h2 id="modules-title">知识模块</h2></header>
      <div class="factory-modules__grid">
        <article v-for="module in modules" :key="module.id" :class="['factory-module', { 'is-featured': module.featured }]">
          <p><span>{{ module.id }}</span><span>{{ module.systemLabel }}</span></p><h3>{{ module.title }}</h3><p>{{ module.description }}</p>
          <a :href="module.href">{{ module.action }} <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>

    <section class="factory-lower">
      <div class="factory-log"><p class="factory-label">RECENT LOG</p><h2>最近更新</h2><ol><li v-for="item in logs" :key="item.href"><a :href="item.href">{{ item.title }}</a><time :datetime="item.date">{{ item.date }}</time></li></ol></div>
      <aside class="factory-notes"><p class="factory-label">FACTORY NOTES</p><h2>知识如何流动</h2><p>长期来源经过整理与互链成为公开知识，再由检索问答和 LLM Wiki Skill 支持持续复用。</p><a href="/about">了解 AI 纪元 <span aria-hidden="true">→</span></a></aside>
    </section>
  </main>
</template>
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:factory`

Expected: PASS, with 2 passing subtests and no placeholder/external replacement route.

- [ ] **Step 5: Commit the semantic homepage**

```bash
git add docs/index.md docs/.vitepress/theme/components/KnowledgeFactoryHome.vue scripts/personal-knowledge-factory.test.mjs package.json
git commit -m "feat: add personal knowledge factory homepage"
```

Expected: one commit containing only homepage semantics and its focused contract.

---

### Task 2: Optional Factory Boot State and Interaction

**Files:**
- Create: `docs/.vitepress/theme/components/FactoryBoot.vue`
- Create: `docs/.vitepress/theme/components/factoryBootState.mjs`
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Modify: `docs/.vitepress/theme/index.ts`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

**Interfaces:**
- Consumes: `KnowledgeFactoryHome.vue` hero and global name `KnowledgeFactoryHome`.
- Produces: `BOOT_STORAGE_KEY`, `BOOT_STORAGE_VALUE`, `readInitialBootState(storage, reducedMotion)`, `writeBooted(storage)`, `transitionBoot(state, event)`, `isInteractiveTarget(target)`, and `shouldStartFromEnter(event, state)` from `factoryBootState.mjs`; states are exactly `'ready' | 'booting' | 'complete' | 'skipped'`, events exactly `'START' | 'COMPLETE' | 'SKIP'`.

- [ ] **Step 1: Extend the test first**

Append Node tests that import the pure helper without browser globals:

```js
import {
  BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, isInteractiveTarget,
  readInitialBootState, shouldStartFromEnter, transitionBoot, writeBooted,
} from '../docs/.vitepress/theme/components/factoryBootState.mjs'

test('boot state persists only a versioned session value and fails open', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  assert.equal(readInitialBootState(storage, false), 'ready')
  assert.equal(writeBooted(storage), true)
  assert.equal(values.get(BOOT_STORAGE_KEY), BOOT_STORAGE_VALUE)
  assert.equal(readInitialBootState(storage, false), 'skipped')
  assert.equal(readInitialBootState(storage, true), 'skipped')
  assert.equal(readInitialBootState({ getItem() { throw new Error('denied') } }, false), 'ready')
  assert.equal(writeBooted({ setItem() { throw new Error('denied') } }), false)
})

test('boot transitions and Enter activation are explicit and safe', () => {
  assert.equal(transitionBoot('ready', 'START'), 'booting')
  assert.equal(transitionBoot('booting', 'COMPLETE'), 'complete')
  assert.equal(transitionBoot('ready', 'SKIP'), 'skipped')
  assert.equal(isInteractiveTarget({ closest: () => ({ tagName: 'A' }) }), true)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => null } }, 'ready'), true)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, 'ready'), false)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => null } }, 'complete'), false)
})
```

Add source assertions for the exact key, absence of `localStorage`, `onBeforeUnmount`, `matchMedia('(prefers-reduced-motion: reduce)')`, `启动知识系统`, `跳过启动`, and no `position: fixed` in the component.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test:factory`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `factoryBootState.mjs`.

- [ ] **Step 3: Implement the browser-global-free state helper**

```js
export const BOOT_STORAGE_KEY = 'ai-era:knowledge-factory:booted'
export const BOOT_STORAGE_VALUE = 'v1'

export function readInitialBootState(storage, reducedMotion = false) {
  if (reducedMotion) return 'skipped'
  try { return storage?.getItem(BOOT_STORAGE_KEY) === BOOT_STORAGE_VALUE ? 'skipped' : 'ready' }
  catch { return 'ready' }
}
export function writeBooted(storage) {
  try { storage?.setItem(BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE); return Boolean(storage) }
  catch { return false }
}
export function transitionBoot(state, event) {
  if (event === 'SKIP') return 'skipped'
  if (state === 'ready' && event === 'START') return 'booting'
  if (state === 'booting' && event === 'COMPLETE') return 'complete'
  return state
}
export function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('a,button,input,textarea,select,summary,[contenteditable="true"],[role="button"],[role="link"]'))
}
export function shouldStartFromEnter(event, state) {
  return state === 'ready' && event?.key === 'Enter' && !event.repeat && !event.isComposing
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isInteractiveTarget(event.target)
}
```

- [ ] **Step 4: Add the component, integration, and scoped cleanup**

`FactoryBoot.vue` must initialize in `onMounted`, register one `window` keydown listener, clear its three bounded timers, and remove the listener in `onBeforeUnmount`. Use two system lines at 320 ms and 720 ms, finish at 900 ms, expose a polite status once rather than character announcements, and let the panel click call `start()` only when `isInteractiveTarget(event.target)` is false. `skip()` transitions immediately and calls `writeBooted(sessionStorage)` inside the helper's catch boundary.

Use this complete script and template contract:

```vue
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  isInteractiveTarget, readInitialBootState, shouldStartFromEnter,
  transitionBoot, writeBooted,
} from './factoryBootState.mjs'

const state = ref('ready')
const visibleLines = ref([])
const timers = new Set()
const lines = ['Loading knowledge archives', 'Connecting Ask Console']
const statusText = computed(() => ({
  ready: '知识系统可以启动，页面内容已可访问。',
  booting: '正在准备知识系统。',
  complete: 'SYSTEM READY',
  skipped: 'SYSTEM READY',
})[state.value])

function schedule(callback, delay) {
  const timer = window.setTimeout(() => { timers.delete(timer); callback() }, delay)
  timers.add(timer)
}
function clearTimers() { for (const timer of timers) window.clearTimeout(timer); timers.clear() }
function finish() { state.value = transitionBoot(state.value, 'COMPLETE'); writeBooted(window.sessionStorage) }
function start() {
  if (state.value !== 'ready') return
  state.value = transitionBoot(state.value, 'START')
  schedule(() => visibleLines.value.push(lines[0]), 320)
  schedule(() => visibleLines.value.push(lines[1]), 720)
  schedule(finish, 900)
}
function skip() { clearTimers(); state.value = transitionBoot(state.value, 'SKIP'); writeBooted(window.sessionStorage) }
function handleKeydown(event) { if (shouldStartFromEnter(event, state.value)) start() }
function handlePanelClick(event) { if (state.value === 'ready' && !isInteractiveTarget(event.target)) start() }

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  state.value = readInitialBootState(window.sessionStorage, reduced)
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => { clearTimers(); window.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <div class="factory-boot" :data-state="state" @click="handlePanelClick">
    <div class="factory-boot__lines" aria-hidden="true"><p v-for="line in visibleLines" :key="line">$ {{ line }}</p></div>
    <p class="factory-boot__status" aria-live="polite">{{ statusText }}</p>
    <div v-if="state === 'ready' || state === 'booting'" class="factory-boot__controls">
      <button type="button" :disabled="state === 'booting'" @click.stop="start">启动知识系统</button>
      <button type="button" class="quiet" @click.stop="skip">跳过启动</button>
    </div>
  </div>
</template>
```

Import `FactoryBoot` at the top of `KnowledgeFactoryHome.vue`'s existing `<script setup>` and render it immediately after `.factory-actions`:

```js
import FactoryBoot from './FactoryBoot.vue'
```

```vue
<FactoryBoot />
```

Register only the page component globally while continuing to extend the default theme:

```ts
import DefaultTheme from 'vitepress/theme'
import KnowledgeFactoryHome from './components/KnowledgeFactoryHome.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('KnowledgeFactoryHome', KnowledgeFactoryHome)
  },
}
```

- [ ] **Step 5: Verify interaction contracts and commit**

Run: `npm run test:factory && npm run docs:build`

Expected: all focused subtests PASS; VitePress builds `/index.html` without unresolved components; the build does not require browser globals during SSR.

```bash
git add docs/.vitepress/theme/components/FactoryBoot.vue docs/.vitepress/theme/components/factoryBootState.mjs docs/.vitepress/theme/components/KnowledgeFactoryHome.vue docs/.vitepress/theme/index.ts scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: add optional factory boot interaction"
```

---

### Task 3: Factory Visual Tokens, Responsive Layout, and Motion Safety

**Files:**
- Modify: `docs/.vitepress/theme/custom.css`
- Modify: `scripts/theme-validator.mjs`
- Modify: `scripts/theme-validator.test.mjs`
- Modify: `scripts/theme-color.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

**Interfaces:**
- Consumes: Task 1 DOM hooks and Task 2 `data-state` values.
- Produces: light/dark semantic tokens `--factory-bg`, `--factory-surface`, `--factory-surface-muted`, `--factory-ink`, `--factory-ink-muted`, `--factory-border`, `--factory-brand`, `--factory-data`, `--factory-signal`, `--factory-terminal`, `--factory-terminal-ink`, `--factory-focus`; responsive breakpoints `959px` and `639px`.

- [ ] **Step 1: Update tests before CSS**

Change the theme validator's required root anchors to `--vp-c-bg: #f6f3ea` and `--vp-c-brand-1: #275dad`, and dark anchors to `--vp-c-bg: #0b1020` and `--vp-c-brand-1: #8aa8ff`. Extend tests to require all twelve factory tokens in both palettes plus active rules for `.factory-status`, `.factory-hero`, `.factory-modules__grid`, `.factory-module`, and `.factory-boot`; require a `@media (max-width: 639px)` one-column module grid and `@media (prefers-reduced-motion: reduce)` with scoped factory transition/animation suppression.

Replace obsolete `garden-*` homepage assertions in `site-design.test.mjs` with factory hooks, while retaining knowledge-hub and Q&A assertions. Add focused assertions that module anchors have `:focus-visible`, cards have no fixed height, mobile actions meet `min-height: 44px`, and the stylesheet contains no neon glow, infinite canvas, or draggable-window selector.

- [ ] **Step 2: Run theme tests and verify RED**

Run: `npm run test:theme && npm run test:factory`

Expected: FAIL on the first missing factory palette token or selector, not on an unrelated knowledge/Q&A contract.

- [ ] **Step 3: Implement tokens and factory-scoped layout**

At the start of `custom.css`, set the spec's exact light and dark tokens and alias existing VitePress variables to compatible direct colors. Add focused blocks with these essential declarations:

```css
.knowledge-factory-page .VPPage { padding: 0 24px 72px; }
.factory-home { width: min(1152px, 100%); margin: 0 auto; color: var(--factory-ink); }
.factory-status { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 24px; min-height: 48px; border-bottom: 1px solid var(--factory-border); }
.factory-status__state, .factory-label, .factory-module > p:first-child, .factory-log time { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.factory-hero { margin: 40px 0 28px; padding: clamp(24px, 5vw, 48px); border: 1px solid var(--factory-border); border-radius: 12px; background: var(--factory-terminal); color: var(--factory-terminal-ink); }
.factory-hero h1 { font-family: "Noto Serif SC", "Songti SC", STSong, serif; font-size: clamp(40px, 8vw, 76px); }
.factory-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.factory-actions a, .factory-boot button { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid currentColor; border-radius: 8px; }
.factory-modules__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.factory-module { padding: 24px; border: 1px solid var(--factory-border); border-radius: 10px; background: var(--factory-surface); transition: transform 220ms ease-out, border-color 220ms ease-out; }
.factory-module:hover { transform: translateY(-3px); border-color: var(--factory-brand); }
.factory-module a:focus-visible, .factory-actions a:focus-visible, .factory-status a:focus-visible, .factory-boot button:focus-visible { outline: 2px solid var(--factory-focus); outline-offset: 3px; }
.factory-lower { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 24px; margin-top: 40px; }
.factory-log ol { margin: 0; padding: 0; list-style: none; }
.factory-log li { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--factory-border); }
@media (max-width: 959px) { .factory-lower { grid-template-columns: 1fr; } }
@media (max-width: 639px) { .knowledge-factory-page .VPPage { padding-inline: 16px; } .factory-status__system, .factory-status__links a:not(:first-child) { display: none; } .factory-modules__grid { grid-template-columns: 1fr; } .factory-actions { flex-direction: column; } .factory-actions a { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .factory-home *, .factory-home *::before, .factory-home *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } .factory-module:hover { transform: none; } }
```

Preserve all `knowledge-hub__*` and `wiki-ask__*` rules. Remove only obsolete homepage `garden-*` rules after their tests are replaced. Do not change article body typography or Q&A component markup.

- [ ] **Step 4: Verify theme and production build**

Run: `npm run test:theme && npm run test:factory && npm run docs:build`

Expected: theme validator, theme color/config tests, factory tests, and VitePress production build all PASS; no generated knowledge file changes appear in `git status --short`.

- [ ] **Step 5: Commit the visual system**

```bash
git add docs/.vitepress/theme/custom.css scripts/theme-validator.mjs scripts/theme-validator.test.mjs scripts/theme-color.test.mjs scripts/site-design.test.mjs scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: style personal knowledge factory"
```

---

### Task 4: Release Verification, Browser Acceptance, and Pull Request

**Files:**
- Verify only: all files changed in Tasks 1–3
- Do not modify: `worker/**`, quota files, `scripts/wiki-publish/**`, generated manifests/indexes, `docs/llm-wiki/**`, or the public Skill repository/release

**Interfaces:**
- Consumes: all prior task contracts.
- Produces: a clean, reviewable branch and GitHub pull request; no deployment from the feature branch because Cloudflare accepts `main` only.

- [ ] **Step 1: Audit scope before running the release gate**

Run:

```bash
git diff --name-only origin/main...HEAD
git status --short
rg -n "FIXME|XXX|infinite.canvas|draggable|localStorage|MES|项目档案|媒体库|实验室" docs/index.md docs/.vitepress/theme/components docs/.vitepress/theme/custom.css scripts/personal-knowledge-factory.test.mjs
```

Expected: changed paths are limited to the spec, plan, homepage/theme files, focused tests, and `package.json`; status is clean; `rg` finds neither placeholders/prohibited concepts nor `localStorage` usage (a negative test string may be excluded with `rg -v 'doesNotMatch'`).

- [ ] **Step 2: Run the full automated release gate**

Run:

```bash
npm test
npx wrangler deploy --dry-run
git diff --check origin/main...HEAD
```

Expected: the entire repository test suite and both knowledge validations PASS; VitePress production build completes; Wrangler reports a successful dry-run bundle without deployment; diff check prints no whitespace errors.

- [ ] **Step 3: Start the site and perform browser acceptance**

Run: `npm run docs:dev -- --host localhost`

Expected: VitePress reports a local URL such as `http://localhost:5173/`.

Use `browser:control-in-app-browser` to inspect `/` at 1440 px, 768 px, and 390 px in both light and dark modes. Verify first visit, `启动知识系统`, safe Enter activation, `跳过启动`, same-tab return, visible focus, and all four links before startup; emulate reduced motion and confirm static `SYSTEM READY`; deny session storage and confirm the page remains operable. Confirm no overflow, clipped Chinese text, fixed-height truncation, or duplicate mobile navigation.

Open `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/notes/sustainable-ai-workflow`, and `/about`. On `/ask/`, submit one normal question only if the configured development Worker/API is available; otherwise verify the unchanged form, loading/error/quota copy, citation styles, and record the API limitation in the PR without changing Worker code.

- [ ] **Step 4: Review the final diff and push**

Run:

```bash
git diff --stat origin/main...HEAD
git diff -- docs/index.md docs/.vitepress/theme/index.ts docs/.vitepress/theme/components docs/.vitepress/theme/custom.css scripts/personal-knowledge-factory.test.mjs package.json
git status --short --branch
git push -u origin feature/personal-knowledge-factory
```

Expected: only approved homepage/theme/test files differ; branch is clean; push creates or updates `origin/feature/personal-knowledge-factory`.

- [ ] **Step 5: Create the pull request and stop before merge**

Run:

```bash
gh pr create --base main --head feature/personal-knowledge-factory --title "feat: redesign homepage as personal knowledge factory" --body "## Summary
- reframe the AI 纪元 homepage as a personal knowledge factory
- add an optional, accessible session-scoped boot interaction
- add original light/dark factory tokens and responsive layouts

## Verification
- npm test
- npx wrangler deploy --dry-run
- desktop/tablet/mobile browser review in light and dark modes

## Scope safety
- no Worker, quota, retrieval, wiki publishing, generated knowledge, or public Skill changes"
```

Expected: GitHub returns a PR URL targeting `main`. Run `gh pr view --json url,baseRefName,headRefName,mergeable,statusCheckRollup`; expect base `main`, head `feature/personal-knowledge-factory`, and no failing checks. Do not merge or deploy until the user explicitly authorizes merge; Cloudflare will build only after the PR reaches `main`.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 cover semantic SSR content, exact real routes, optional stateful boot, safe input/storage/reduced-motion behavior, independent visual tokens, responsive layout, accessibility, and theme preservation. Task 4 covers regression, Cloudflare dry-run, desktop/tablet/mobile, light/dark, storage-denial, reduced-motion, route, and PR acceptance.
- **Scope boundary:** The plan explicitly excludes Worker, quota, retrieval/API, generated knowledge, wiki publishing, public Skill pages/repository/release, Wrangler configuration, and fictional modules.
- **Placeholder scan:** Every creation/modification step includes concrete code, commands, expected results, and commit scope; no deferred implementation marker remains.
- **Interface consistency:** `KnowledgeFactoryHome` is the single global registration; `FactoryBoot` is a local import. Helper names, boot states/events, storage key/value, DOM hooks, token names, and responsive breakpoints are identical across producer and consumer tasks.
