# JuZX Full Personal OS Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Personal OS homepage with the approved terminal-to-MacBook launch, interactive blue JuZX desktop, long-form knowledge view, and persisted infinite-canvas “我的 OS” experience.

**Architecture:** Keep VitePress and Vue as the document/runtime shell, with `KnowledgeFactoryHome.vue` owning only hash routing and lazy view composition. Configuration and interaction math live in browser-global-free `.mjs` modules tested with Node; focused Vue components render the boot journey, desktop/window manager, knowledge portfolio, and canvas controls. Homepage CSS remains scoped between the existing Personal OS markers so wiki, finance, Q&A, Worker, and publishing behavior stay untouched.

**Tech Stack:** Node.js 22, VitePress 1.6.4, Vue 3 SFCs, ES modules, plain CSS, `@tabler/icons-vue`, Node.js built-in test runner, Wrangler 4.107.0.

## Global Constraints

- Preserve `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/about`, `https://github.com/ketitongxue`, and `https://github.com/ketitongxue/llm-wiki-skill` as authoritative destinations.
- Preserve `sessionStorage['personal-site-accessed'] = 'true'`; storage and motion-query failures fail open without console errors.
- Top-level hashes are exactly `#home`, `#knowledge`, and `#system`; missing or unknown hashes normalize to `#home`.
- The desktop background is exactly `#2B7FD8`, the brand accent is exactly `#F4D758`, and the top menu bar is exactly `30px` high.
- Do not add stars, wallpaper animation, click sparkles, character art, hotlinked/reference assets, visitor text editing, card creation, upload, or content deletion.
- Do not add React, Three.js, GSAP, Framer Motion, a state library, UI framework, or remote font.
- Desktop window minimum size is `280 x 200` CSS pixels; canvas scale is clamped to `0.15...3`; undo history is capped at `50` entries.
- Desktop entry movement becomes a drag only after more than `4` CSS pixels; keyboard Enter/Space and touch tap must open without requiring drag.
- `prefers-reduced-motion: reduce` bypasses typing, progress, zoom, and long transitions; the desktop is usable within `100ms`.
- At `390 x 844`, no horizontal page overflow is allowed; close/open controls are at least `44 x 44` CSS pixels and the canvas layer panel is collapsible.
- Do not change generated wiki content, retrieval logic, quotas, Worker bindings, publishing scripts, or unrelated documentation pages.
- Use only the locally bundled `@tabler/icons-vue` package for desktop icon art; do not remotely load icons, hand-author SVG assets, or approximate icons with emoji/CSS drawings.
- Use TDD in every task: focused RED, minimal implementation, focused GREEN, then a reviewable commit.

---

### Task 1: Hash Router, Typed Content Configuration, and Core Contract

**Files:**
- Create: `docs/.vitepress/theme/components/personalOsRouter.mjs`
- Create: `docs/.vitepress/theme/components/personalOsContent.mjs`
- Create: `scripts/personal-os-core.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `OS_VIEWS`, `normalizeOsHash(hash): 'home'|'knowledge'|'system'`, `hashForOsView(view): '#home'|'#knowledge'|'#system'`.
- Produces: immutable `bootLines`, `desktopEntries`, `knowledgeSections`, `canvasCards`, and `canvasConnections` arrays. Desktop entries have `{ id, label, icon:'folder'|'file'|'terminal'|'world', position:{x,y}, window:{title,summary,href?,external} }`; canvas cards have `{ id,title,kicker,body,x,y,width,height,visible,accent,href? }`.
- Consumes: only literal public routes from Global Constraints; no DOM/browser globals.

- [ ] **Step 1: Write the failing router/content contract**

Create `scripts/personal-os-core.test.mjs` with imports for both modules and these assertions:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { hashForOsView, normalizeOsHash, OS_VIEWS } from '../docs/.vitepress/theme/components/personalOsRouter.mjs'
import { bootLines, canvasCards, canvasConnections, desktopEntries, knowledgeSections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'

test('OS hashes normalize without browser globals', () => {
  assert.deepEqual(OS_VIEWS, ['home', 'knowledge', 'system'])
  assert.equal(normalizeOsHash(''), 'home')
  assert.equal(normalizeOsHash('#knowledge'), 'knowledge')
  assert.equal(normalizeOsHash('#system'), 'system')
  assert.equal(normalizeOsHash('#unknown'), 'home')
  assert.equal(hashForOsView('system'), '#system')
  assert.equal(hashForOsView('unknown'), '#home')
})

test('Personal OS content is complete and internally referential', () => {
  assert.ok(bootLines.length >= 4)
  assert.deepEqual(desktopEntries.map(({ label }) => label), [
    'LLM Wiki', 'Finance Wiki', '知识问答', 'llm-wiki Skill', 'AI 实验',
    '项目档案', '关于我', '联系方式', 'GitHub', '网站更新记录',
  ])
  assert.deepEqual(desktopEntries.slice(0, 4).map(({ window }) => window.href), ['/wiki/', '/finance/', '/ask/', '/llm-wiki/'])
  assert.equal(knowledgeSections.length, 6)
  assert.ok(canvasCards.length >= 8)
  const ids = new Set(canvasCards.map(({ id }) => id))
  assert.equal(ids.size, canvasCards.length)
  for (const edge of canvasConnections) {
    assert.ok(ids.has(edge.from), edge.from)
    assert.ok(ids.has(edge.to), edge.to)
  }
})
```

- [ ] **Step 2: Run the test RED**

Run `node --test scripts/personal-os-core.test.mjs`.

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `personalOsRouter.mjs`.

- [ ] **Step 3: Implement the pure router and complete content source**

Create `personalOsRouter.mjs`:

```js
export const OS_VIEWS = Object.freeze(['home', 'knowledge', 'system'])

export function normalizeOsHash(hash = '') {
  const candidate = String(hash).replace(/^#/, '')
  return OS_VIEWS.includes(candidate) ? candidate : 'home'
}

export function hashForOsView(view) {
  return `#${OS_VIEWS.includes(view) ? view : 'home'}`
}
```

Create `personalOsContent.mjs` with all ten desktop entries and six knowledge sections. Use these exact route-bearing records and build the remaining records with the same declared shape:

```js
export const bootLines = Object.freeze([
  'JuZX@digital-factory ~ zsh',
  '$ whoami',
  'MES Product Manager / Industrial Digitalization Explorer',
  '$ open juzx-os',
])

const entry = (id, label, icon, x, y, title, summary, href, external = false) =>
  Object.freeze({ id, label, icon, position: Object.freeze({ x, y }), window: Object.freeze({ title, summary, href, external }) })

export const desktopEntries = Object.freeze([
  entry('llm-wiki', 'LLM Wiki', 'folder', 80, 84, 'LLM Wiki', 'AI、Agent 与知识工程的结构化知识库。', '/wiki/'),
  entry('finance-wiki', 'Finance Wiki', 'folder', 176, 84, 'Finance Wiki', '金融、量化与市场结构知识库。', '/finance/'),
  entry('ask', '知识问答', 'terminal', 80, 176, '知识问答', '基于 LLM Wiki 检索结果回答问题。', '/ask/'),
  entry('skill', 'llm-wiki Skill', 'file', 176, 176, 'llm-wiki Skill', '公开的知识库构建方法、流程与安装指南。', '/llm-wiki/'),
  entry('experiments', 'AI 实验', 'folder', 80, 268, 'AI 实验', '个人 AI 工具、Agent 与工作流实验。'),
  entry('projects', '项目档案', 'folder', 176, 268, '项目档案', 'MES 与工业数字化项目实践。'),
  entry('about', '关于我', 'file', 80, 360, '关于我', 'JuZX 的角色、关注方向与当前实践。', '/about'),
  entry('contact', '联系方式', 'terminal', 176, 360, '联系方式', 'GitHub: ketitongxue'),
  entry('github', 'GitHub', 'world', 80, 452, 'GitHub', '查看公开项目与提交记录。', 'https://github.com/ketitongxue', true),
  entry('changelog', '网站更新记录', 'file', 176, 452, '网站更新记录', 'AI 纪元的内容与系统更新。', '/notes/sustainable-ai-workflow'),
])
```

Define `knowledgeSections` in the exact order `intro`, `llm-wiki`, `finance`, `qa`, `skill`, `recent`; define at least `identity`, `experience`, `skills`, `projects`, `learning`, `llm-wiki`, `finance`, `qa`, and `experiments` cards; connect only declared identifiers. Freeze every exported top-level array.

- [ ] **Step 4: Register the focused test and run GREEN**

Insert `node --test scripts/personal-os-core.test.mjs &&` immediately before `npm run wiki:validate` in `package.json`'s `test` script. Run:

```bash
node --test scripts/personal-os-core.test.mjs
npm run test:factory
```

Expected: the new test passes all 2 subtests and the existing factory suite remains green.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/personal-os-core.test.mjs docs/.vitepress/theme/components/personalOsRouter.mjs docs/.vitepress/theme/components/personalOsContent.mjs
git commit -m "feat: define personal os content model"
```

---

### Task 2: MacBook Boot State Machine and Hash-Selected Shell

**Files:**
- Create: `docs/.vitepress/theme/components/macbookBootState.mjs`
- Create: `docs/.vitepress/theme/components/MacbookBoot.vue`
- Create: `docs/.vitepress/theme/components/BottomOsNavigation.vue`
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Modify: `scripts/personal-os-core.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

**Interfaces:**
- Consumes: Task 1 router/content exports and the existing `personal-site-accessed` contract.
- Produces: boot states `'typing'|'ready'|'launching'|'zooming'|'desktop'`; `transitionMacbookBoot(state,event)`, `computeCoverTransform(screen,viewport)`, `progressCells(count)`, `getSessionStorage(browser)`, `getReducedMotionPreference(browser)`, and `writeAccessed(storage)`.
- Produces: `MacbookBoot` event `entered`; `BottomOsNavigation` prop `activeView` and event `select(view)`; `#factory-title` remains the post-entry focus target.

- [ ] **Step 1: Add failing pure-state and composition tests**

Append to `scripts/personal-os-core.test.mjs`:

```js
import { computeCoverTransform, progressCells, transitionMacbookBoot } from '../docs/.vitepress/theme/components/macbookBootState.mjs'

test('MacBook boot accepts one launch and computes viewport cover', () => {
  assert.equal(transitionMacbookBoot('typing', 'TYPING_COMPLETE'), 'ready')
  assert.equal(transitionMacbookBoot('ready', 'ACTIVATE'), 'launching')
  assert.equal(transitionMacbookBoot('launching', 'ACTIVATE'), 'launching')
  assert.equal(transitionMacbookBoot('launching', 'PROGRESS_COMPLETE'), 'zooming')
  assert.equal(transitionMacbookBoot('zooming', 'ZOOM_COMPLETE'), 'desktop')
  assert.equal(transitionMacbookBoot('typing', 'SKIP'), 'desktop')
  assert.equal(progressCells(4), '[####--------]')
  assert.deepEqual(computeCoverTransform(
    { left: 300, top: 200, width: 600, height: 360 },
    { width: 1440, height: 900 },
  ), { scale: 2.5, translateX: 120, translateY: 70 })
})
```

Replace static-shell assertions in `scripts/personal-knowledge-factory.test.mjs` with requirements for `MacbookBoot`, three `data-os-view` sections, and `BottomOsNavigation`.

- [ ] **Step 2: Run RED**

Run `node --test scripts/personal-os-core.test.mjs && npm run test:factory`.

Expected: FAIL on the missing boot-state module and new component imports.

- [ ] **Step 3: Implement the pure boot state**

Create `macbookBootState.mjs`:

```js
export function transitionMacbookBoot(state, event) {
  if (event === 'SKIP') return 'desktop'
  if (state === 'typing' && event === 'TYPING_COMPLETE') return 'ready'
  if (state === 'ready' && event === 'ACTIVATE') return 'launching'
  if (state === 'launching' && event === 'PROGRESS_COMPLETE') return 'zooming'
  if (state === 'zooming' && event === 'ZOOM_COMPLETE') return 'desktop'
  return state
}

export function progressCells(count) {
  const filled = Math.max(0, Math.min(12, Math.trunc(count)))
  return `[${'#'.repeat(filled)}${'-'.repeat(12 - filled)}]`
}

export function computeCoverTransform(screen, viewport) {
  const scale = Math.max(viewport.width / screen.width, viewport.height / screen.height)
  return {
    scale,
    translateX: viewport.width / 2 - (screen.left + screen.width / 2),
    translateY: viewport.height / 2 - (screen.top + screen.height / 2),
  }
}

export function getSessionStorage(browser) {
  try { return browser?.sessionStorage } catch { return undefined }
}

export function getReducedMotionPreference(browser) {
  try { return typeof browser?.matchMedia !== 'function' || browser.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return true }
}

export function writeAccessed(storage) {
  try { storage?.setItem('personal-site-accessed', 'true'); return Boolean(storage) }
  catch { return false }
}
```

- [ ] **Step 4: Implement `MacbookBoot.vue` and the three-view shell**

`MacbookBoot.vue` must render a warm background, `.macbook-boot__computer`, `.macbook-boot__screen`, one polite live region, data-driven terminal lines, a native launch button, and the 12-cell progress text. On mount, read storage/motion through the safe accessors in `macbookBootState.mjs`. First visit advances lines every `220ms`; launch advances one cell every `55ms`; then measure the screen, set CSS variables `--boot-scale`, `--boot-x`, `--boot-y`, transition for `500ms`, write the exact session value, emit `entered`, and clear every timer/listener on unmount. Returning and reduced-motion visits emit within `100ms`. Only Enter outside another interactive target and the native button activate; state guards reject repeated input.

Rewrite `KnowledgeFactoryHome.vue` to listen to `hashchange`, normalize `window.location.hash`, render exactly one active section, and lazy-load the system view:

```vue
<MacbookBoot v-if="activeView === 'home'" @entered="homeEntered = true" />
<section v-show="activeView === 'home' && homeEntered" data-os-view="home"><DesktopSurface /></section>
<section v-show="activeView === 'knowledge'" data-os-view="knowledge"><KnowledgePortfolio /></section>
<Suspense v-if="systemRequested">
  <component :is="InfiniteCanvas" v-show="activeView === 'system'" data-os-view="system" />
  <template #fallback><button type="button" @click="retrySystem">重新加载我的 OS</button></template>
</Suspense>
<BottomOsNavigation :active-view="activeView" @select="selectView" />
```

Use a rejected dynamic import to set a retryable error state without affecting home/knowledge. `selectView(view)` sets `window.location.hash = hashForOsView(view)`; a hash change scrolls the selected document-flow view to its start.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test scripts/personal-os-core.test.mjs
npm run test:factory
npm run docs:build
git add docs/.vitepress/theme/components scripts/personal-os-core.test.mjs scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: add macbook boot and os routing"
```

Expected: focused tests and SSR build pass; build emits no `window is not defined` error.

---

### Task 3: Tabler Desktop Icons and Window Manager

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/.vitepress/theme/components/desktopGeometry.mjs`
- Create: `docs/.vitepress/theme/components/windowManagerState.mjs`
- Create: `docs/.vitepress/theme/components/DesktopSurface.vue`
- Create: `docs/.vitepress/theme/components/DesktopIcon.vue`
- Create: `docs/.vitepress/theme/components/WindowManager.vue`
- Modify: `scripts/personal-os-core.test.mjs`

**Interfaces:**
- Consumes: `desktopEntries` from Task 1.
- Produces: `distance`, `isDragDistance(start,current,threshold=4)`, `constrainWindow(rect,bounds,min={width:280,height:200})`.
- Produces: immutable reducers `openWindow`, `closeWindow`, `focusWindow`, `moveWindow`, and `resizeWindow`; state shape `{ windows:Array<WindowInstance>, nextZ:number, cascade:number }`.
- Produces: `DesktopSurface` with a 30px menu, local `HH:mm` clock, configured icons, and singleton windows.

- [ ] **Step 1: Add failing geometry/reducer tests**

Add tests that `distance({x:0,y:0},{x:3,y:4}) === 5`, movement of exactly 4px is not a drag, `constrainWindow({x:-20,y:5,width:900,height:700},{width:800,height:600})` returns `{x:0,y:5,width:800,height:595}`, opening one entry creates one window, reopening it keeps length 1 and raises z-index, closing removes it, and move/resize always apply `280 x 200` minimums and viewport bounds.

- [ ] **Step 2: Run RED**

Run `node --test scripts/personal-os-core.test.mjs`.

Expected: FAIL with missing `desktopGeometry.mjs`.

- [ ] **Step 3: Implement pure geometry and reducer**

Use this immutable reducer implementation, importing `constrainWindow` from `desktopGeometry.mjs`:

```js
export const distance = (start, current) => Math.hypot(current.x - start.x, current.y - start.y)
export const isDragDistance = (start, current, threshold = 4) => distance(start, current) > threshold

export function constrainWindow(rect, bounds, min = { width: 280, height: 200 }) {
  const x = Math.max(0, Math.min(rect.x, Math.max(0, bounds.width - min.width)))
  const y = Math.max(0, Math.min(rect.y, Math.max(0, bounds.height - min.height)))
  const width = Math.max(min.width, Math.min(rect.width, bounds.width - x))
  const height = Math.max(min.height, Math.min(rect.height, bounds.height - y))
  return { x, y, width, height }
}

export const createWindowState = () => ({ windows: [], nextZ: 10, cascade: 0 })

export function focusWindow(state, id) {
  const nextZ = state.nextZ + 1
  return { ...state, nextZ, windows: state.windows.map((item) => item.id === id ? { ...item, z: nextZ } : item) }
}

export function openWindow(state, entry, bounds) {
  if (state.windows.some(({ id }) => id === entry.id)) return focusWindow(state, entry.id)
  const offset = (state.cascade % 5) * 32
  const rect = constrainWindow({ x: 96 + offset, y: 72 + offset, width: 420, height: 300 }, bounds)
  const nextZ = state.nextZ + 1
  return {
    windows: [...state.windows, { id: entry.id, entry, ...rect, z: nextZ }],
    nextZ,
    cascade: state.cascade + 1,
  }
}

export const closeWindow = (state, id) => ({ ...state, windows: state.windows.filter((item) => item.id !== id) })

export function moveWindow(state, id, point, bounds) {
  return { ...state, windows: state.windows.map((item) => item.id === id
    ? { ...item, ...constrainWindow({ ...item, x: point.x, y: point.y }, bounds) }
    : item) }
}

export function resizeWindow(state, id, size, bounds) {
  return { ...state, windows: state.windows.map((item) => item.id === id
    ? { ...item, ...constrainWindow({ ...item, width: size.width, height: size.height }, bounds) }
    : item) }
}
```

Every function returns a new state and new changed window object; no function mutates input. Cascade origin is `{x:96,y:72}` and wraps after five windows.

- [ ] **Step 4: Install the local icon dependency**

Run `npm install @tabler/icons-vue --save`.

Expected: `package.json` and `package-lock.json` record `@tabler/icons-vue`; installation completes without adding a second Vue runtime or changing the Node.js 22/Wrangler versions.

- [ ] **Step 5: Implement desktop/icon/window interaction**

`DesktopIcon.vue` imports `IconFolder`, `IconFileText`, `IconTerminal2`, and `IconWorld` from `@tabler/icons-vue` and uses this explicit mapping:

```js
const iconComponents = Object.freeze({
  folder: IconFolder,
  file: IconFileText,
  terminal: IconTerminal2,
  world: IconWorld,
})
const iconComponent = computed(() => iconComponents[props.entry.icon] ?? IconFileText)
```

Render `<component :is="iconComponent" aria-hidden="true" />` inside a native `<button>` plus the visible label. Pointer capture records start/current positions; more than 4px emits `move`; pointer-up without drag emits `open` on touch; desktop uses `dblclick`; Enter/Space emits `open`. The visible text label remains the accessible fallback for an unknown icon key. No icon is fetched remotely and no handwritten SVG is added to the repository.

`WindowManager.vue` renders native close and external-open controls with exact accessible names `关闭 ${title}` and `在新页面打开 ${title}`. Titlebar drag and bottom-right resize use pointer capture; iframe pointer suppression is represented by `.is-manipulating`; local previews use text and native links, never iframes. Pointer-down focuses. Resize/drag use `requestAnimationFrame`, cancel on pointer-up/unmount, and call the pure reducer.

`DesktopSurface.vue` owns icon positions and reducer state, observes its surface size, re-constrains windows after resize, renders brand/menu/clock, and offers “重置桌面位置”. Wide-screen initial icon positions are anchored to the right by applying `right: entry.position.x`; mobile uses the responsive CSS from Task 7.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test scripts/personal-os-core.test.mjs
npm run test:factory
npm run docs:build
git add package.json package-lock.json docs/.vitepress/theme/components scripts/personal-os-core.test.mjs
git commit -m "feat: add interactive juzx desktop"
```

Expected: pure tests and build pass; no remote asset URL or iframe appears in desktop components.

---

### Task 4: Long-Form Knowledge Portfolio

**Files:**
- Create: `docs/.vitepress/theme/components/KnowledgePortfolio.vue`
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `scripts/site-design.test.mjs`

**Interfaces:**
- Consumes: `knowledgeSections` from Task 1.
- Produces: `.knowledge-portfolio` ordinary document flow with six labelled sections and native links to all four knowledge products plus the public Skill repository.

- [ ] **Step 1: Add failing semantic/content tests**

Read `KnowledgePortfolio.vue`; assert a single `<h1>`, six `v-for` sections keyed by `section.id`, and exact links `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/llm-wiki/principles`, `/llm-wiki/build`, `https://github.com/ketitongxue/llm-wiki-skill`, and three existing `/notes/` pages. Assert no iframe and no `target="_blank"` without `rel="noopener noreferrer"`.

- [ ] **Step 2: Run RED**

Run `npm run test:factory && node --test scripts/site-design.test.mjs`.

Expected: FAIL because `KnowledgePortfolio.vue` does not exist.

- [ ] **Step 3: Implement the six-section document**

Render intro as the only h1, LLM/Finance as differentiated feature articles, Q&A as a primary callout, Skill as a four-step ordered workflow with website and GitHub actions, and recent updates as a dated list. Use data from `knowledgeSections`; links remain native `<a>` elements so VitePress owns navigation. The fixed bottom nav is not duplicated inside this component.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm run test:factory
node --test scripts/site-design.test.mjs
npm run docs:build
git add docs/.vitepress/theme/components/KnowledgePortfolio.vue scripts/personal-knowledge-factory.test.mjs scripts/site-design.test.mjs
git commit -m "feat: add personal os knowledge view"
```

Expected: component contracts and build pass; every specified destination appears once as an actionable link.

---

### Task 5: Infinite Canvas Transform, Cards, Connections, and Touch Gestures

**Files:**
- Create: `docs/.vitepress/theme/components/canvasGeometry.mjs`
- Create: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Create: `docs/.vitepress/theme/components/CanvasCard.vue`
- Create: `docs/.vitepress/theme/components/CanvasConnections.vue`
- Modify: `scripts/personal-os-core.test.mjs`

**Interfaces:**
- Consumes: `canvasCards` and `canvasConnections` from Task 1.
- Produces: `clampScale`, `screenToWorld`, `zoomAtPoint`, `fitWorldBounds`, `touchGesture`, and `connectionEndpoints`.
- `InfiniteCanvas` transform is exactly `translate(panX, panY) scale(scale)` and emits layout changes using `{ cards, transform:{scale,panX,panY} }`.

- [ ] **Step 1: Add failing transform tests**

Assert clamping at `0.15` and `3`, pointer-centered zoom preserves the world coordinate under `{x:400,y:300}`, fit leaves 64px padding, two touches produce a center plus distance, and connection endpoints use card centers. Use exact floating comparisons with tolerance `1e-9`.

- [ ] **Step 2: Run RED**

Run `node --test scripts/personal-os-core.test.mjs`.

Expected: FAIL with missing `canvasGeometry.mjs`.

- [ ] **Step 3: Implement pure transform math**

```js
export const clampScale = (scale) => Math.min(3, Math.max(.15, scale))
export const screenToWorld = (point, transform) => ({
  x: (point.x - transform.panX) / transform.scale,
  y: (point.y - transform.panY) / transform.scale,
})

export function zoomAtPoint(transform, nextScale, point) {
  const world = screenToWorld(point, transform)
  const scale = clampScale(nextScale)
  return { scale, panX: point.x - world.x * scale, panY: point.y - world.y * scale }
}
```

Implement `fitWorldBounds(bounds,viewport,padding=64)`, `touchGesture(touches)` returning `{center,distance}`, and center-to-center connection endpoints without reading DOM.

- [ ] **Step 4: Implement canvas orchestration**

`InfiniteCanvas.vue` uses a fixed viewport and one world element. Blank-area mouse drag pans; wheel zoom calls `zoomAtPoint` with `Math.exp(-deltaY * .001)`; one-touch blank drag pans; two-touch pinch compares distance and calls `zoomAtPoint` around the gesture center. Set `passive:false` only on wheel/touch handlers that call `preventDefault`; remove all listeners and pending animation frames on unmount.

`CanvasCard.vue` renders configured copy and optional native link, supports select/raise, titlebar drag, and bottom-right resize, and never exposes text editing/contenteditable. `CanvasConnections.vue` renders an SVG with `pointer-events:none`, keyed lines computed from current card bounds, and excludes hidden endpoints.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test scripts/personal-os-core.test.mjs
npm run docs:build
git add docs/.vitepress/theme/components scripts/personal-os-core.test.mjs
git commit -m "feat: add infinite personal os canvas"
```

Expected: geometry tests and SSR build pass; scale cannot leave `0.15...3`.

---

### Task 6: Canvas Layers, Minimap, Versioned Persistence, and 50-Step Undo

**Files:**
- Create: `docs/.vitepress/theme/components/canvasPersistence.mjs`
- Create: `docs/.vitepress/theme/components/canvasHistory.mjs`
- Create: `docs/.vitepress/theme/components/CanvasLayers.vue`
- Create: `docs/.vitepress/theme/components/CanvasMinimap.vue`
- Replace: `docs/.vitepress/theme/components/CanvasControls.vue`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `scripts/personal-os-core.test.mjs`

**Interfaces:**
- Produces: `CANVAS_LAYOUT_KEY = 'juzx-personal-os-layout-v1'`, `serializeCanvasLayout(layout): string`, `parseCanvasLayout(raw, defaults): layout|null`.
- Produces: `createHistory(initial)`, `pushHistory(history,next)`, `undoHistory(history)`, and `resetHistory(history,defaults)` with at most 50 past entries.
- `CanvasLayers` emits `focus(id)` and `visibility({id,visible})`; `CanvasMinimap` emits `navigate(worldPoint)`; `CanvasControls` emits `zoom-in`, `zoom-out`, `fit`, `undo`, `save`, and `reset`.

- [ ] **Step 1: Add failing history/storage tests**

Test a serialize/parse round trip containing only id/x/y/width/height/visible plus transform. Assert malformed JSON, wrong `version`, missing card IDs, `NaN`, and scale 9 return `null`; storage exceptions are caught by wrapper functions. Push 55 layouts and assert `past.length === 50`; undo returns the preceding present; reset clears past/future and restores defaults.

- [ ] **Step 2: Run RED**

Run `node --test scripts/personal-os-core.test.mjs`.

Expected: FAIL on missing persistence/history modules.

- [ ] **Step 3: Implement strict persistence and bounded history**

Serialize this exact envelope:

```js
{
  version: 1,
  transform: { scale, panX, panY },
  cards: cards.map(({ id, x, y, width, height, visible }) => ({ id, x, y, width, height, visible })),
}
```

Parsing accepts only finite numbers, boolean visibility, known unique IDs, and scale inside `0.15...3`; merge accepted geometry onto current default card content so stored text/routes never replace site content. Export safe `loadCanvasLayout(storage,defaults)` and `saveCanvasLayout(storage,layout)` that return `null/false` on access errors without logging.

- [ ] **Step 4: Implement layers, minimap, and controls**

Layers use native buttons and checkboxes, show current selection, focus a card by fitting its bounds, and collapse behind a 44px button at 767px. Minimap uses the same world bounds/transform, renders card rectangles and current viewport, and converts click coordinates back to world coordinates. Controls contain labelled native buttons for `−`, `+`, `适应`, `撤销`, `保存`, and `恢复默认`; disable undo when no history exists.

Wire changes in `InfiniteCanvas.vue`: drag/resize/visibility/reset each push one history entry at gesture completion; selection/focus do not; save writes explicitly and normal layout changes also debounce-save at 250ms; initial invalid storage uses defaults; `恢复默认` requires one confirmation button inside the panel rather than `window.confirm`.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test scripts/personal-os-core.test.mjs
npm run test:factory
npm run docs:build
git add docs/.vitepress/theme/components scripts/personal-os-core.test.mjs
git commit -m "feat: persist personal os canvas layout"
```

Expected: all focused tests pass; malformed storage never throws and history never exceeds 50 past states.

---

### Task 7: Approved Visual System, Responsive OS, and Accessibility Contracts

**Files:**
- Modify: `docs/.vitepress/theme/custom.css`
- Modify: `scripts/theme-validator.mjs`
- Modify: `scripts/theme-validator.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

**Interfaces:**
- Consumes: all Task 2–6 class names and states.
- Produces: scoped plain-blue desktop, MacBook transitions, differentiated knowledge flow, canvas chrome, mobile safe insets, focus visibility, and reduced-motion behavior.

- [ ] **Step 1: Replace the static-home CSS contract with failing full-OS assertions**

Require the Personal OS block to contain `.macbook-boot`, `.desktop-surface`, `.desktop-icon`, `.os-window`, `.bottom-os-navigation`, `.knowledge-portfolio`, `.infinite-canvas`, `.canvas-layers`, `.canvas-minimap`, and `.canvas-controls`; exact `#2B7FD8`, `#F4D758`, `height: 30px`, `100dvh`, `min-width: 280px`, `min-height: 200px`, `@media (max-width: 767px)`, `@media (prefers-reduced-motion: reduce)`, `44px`, and no horizontal overflow. Reject `star`, `sparkle`, `particle`, `illustration`, `linear-gradient`, `backdrop-filter`, and unscoped homepage selectors.

- [ ] **Step 2: Run validator RED**

Run:

```bash
node --test scripts/theme-validator.test.mjs
node --test scripts/site-design.test.mjs
npm run test:factory
```

Expected: validator fixtures pass after their contract update, while site/factory checks fail because current CSS still describes the static warm grid.

- [ ] **Step 3: Replace only the scoped Personal OS CSS block**

Keep global VitePress/wiki/QA styles unchanged. Style MacBook on `#F7F4EC`; desktop/menu at `#2B7FD8`; brand and active accents at `#F4D758`; window surfaces at `#FFFDF7`; terminal areas at `#192232`. Use plain fills, 1px borders, restrained shadows only for window separation, and no decorative wallpaper. The desktop surface is `height: calc(100vh - 30px); height: calc(100dvh - 30px); overflow:hidden`. Bottom navigation is fixed, centered, and above window/canvas chrome.

At 767px: 68px icon slots/42px art, two right-side columns, hidden nonessential menu labels, inset windows, collapsible layers, no page overflow, and 44px controls. Add visible `:focus-visible` outlines. Reduced motion sets boot/canvas/desktop transition and animation durations to at most `100ms`, disables typing cursor animation, and keeps content visible.

- [ ] **Step 4: Run focused GREEN and audit forbidden assets**

```bash
node --test scripts/theme-validator.test.mjs
node --test scripts/site-design.test.mjs
npm run test:factory
rg -n "star|sparkle|particle|illustration|hiesther|https://hiesther" docs/.vitepress/theme
rg -n "<svg|\.svg|https?://.*(?:icon|svg)" docs/.vitepress/theme/components/DesktopIcon.vue docs/.vitepress/theme/components/personalOsContent.mjs
git diff --check
```

Expected: tests pass; both `rg` commands return exit 1 with no matches; diff check prints nothing.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/theme/custom.css scripts/theme-validator.mjs scripts/theme-validator.test.mjs scripts/site-design.test.mjs scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: style responsive full personal os"
```

---

### Task 8: Scroll Exit Sequence, Integration Verification, and Obsolete Static-Home Cleanup

**Files:**
- Create: `docs/.vitepress/theme/components/homeExitState.mjs`
- Create: `docs/.vitepress/theme/components/MacbookExit.vue`
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Modify: `scripts/personal-os-core.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Delete: `docs/.vitepress/theme/components/DesktopCanvas.vue`
- Delete: `docs/.vitepress/theme/components/ProfileCard.vue`
- Delete: `docs/.vitepress/theme/components/CurrentStatusCard.vue`
- Delete: `docs/.vitepress/theme/components/FeaturedProjectCard.vue`
- Delete: `docs/.vitepress/theme/components/ProjectFolder.vue`
- Delete: `docs/.vitepress/theme/components/NotesLauncher.vue`
- Delete: `docs/.vitepress/theme/components/LabLauncher.vue`
- Delete: `docs/.vitepress/theme/components/ContactTerminal.vue`
- Delete: `docs/.vitepress/theme/components/FactoryBoot.vue`
- Delete: `docs/.vitepress/theme/components/factoryBootState.mjs`

**Interfaces:**
- Produces: `normalizeExitProgress(scrollTop,start,end): number` and `exitFrame(progress): {panelScale,computerOpacity,terminalOpacity}` using three deterministic phases.
- `MacbookExit` consumes normalized progress and renders the sticky blue-panel-to-MacBook-to-terminal goodbye sequence; reduced motion renders the final static goodbye.

- [ ] **Step 1: Add failing exit/obsolete-import tests**

Assert progress clamps to 0/1. Assert exact frames: at 0 `{panelScale:1,computerOpacity:0,terminalOpacity:0}`, at `.55` `{panelScale:.42,computerOpacity:1,terminalOpacity:0}`, and at 1 `{panelScale:.42,computerOpacity:1,terminalOpacity:1}`. Assert `KnowledgeFactoryHome.vue` renders `MacbookExit` below `DesktopSurface`. Assert no repository source imports any deleted static component.

- [ ] **Step 2: Run RED**

Run `node --test scripts/personal-os-core.test.mjs && npm run test:factory`.

Expected: FAIL because `homeExitState.mjs` and `MacbookExit.vue` do not exist and static imports remain.

- [ ] **Step 3: Implement the deterministic exit sequence**

Create `homeExitState.mjs`:

```js
const clamp01 = (value) => Math.min(1, Math.max(0, value))
export const normalizeExitProgress = (scrollTop, start, end) => clamp01((scrollTop - start) / (end - start))
export function exitFrame(progress) {
  const p = clamp01(progress)
  const shrink = clamp01(p / .55)
  const terminal = clamp01((p - .82) / .18)
  return { panelScale: 1 - .58 * shrink, computerOpacity: shrink, terminalOpacity: terminal }
}
```

`MacbookExit.vue` uses a tall section and sticky viewport, reads its section bounds in one passive scroll listener, batches calculations in `requestAnimationFrame`, writes the three values as CSS variables, and removes listener/frame on unmount. The terminal ends with `JuZX@digital-factory ~ zsh`, `$ logout`, and `Session complete.`.

- [ ] **Step 4: Remove obsolete components only after import verification**

Run `rg -n "DesktopCanvas|ProfileCard|CurrentStatusCard|FeaturedProjectCard|ProjectFolder|NotesLauncher|LabLauncher|ContactTerminal|FactoryBoot|factoryBootState" docs scripts` and update all remaining intentional test references to the new components. Delete the nine obsolete Vue files and old helper only when `rg` identifies no runtime import. Do not delete `CanvasControls.vue`, which Task 6 replaced with the real canvas controller.

- [ ] **Step 5: Run the full release gate**

```bash
node --test scripts/personal-os-core.test.mjs
npm test
npx wrangler deploy --dry-run
git diff --check origin/main..HEAD
git status --short
```

Expected: all Node suites, content validation, VitePress rendering, security scan, and Wrangler dry-run pass; no whitespace errors; status lists only the final uncommitted Task 8 changes before commit.

- [ ] **Step 6: Perform browser acceptance at matching viewports**

Run `npm run docs:dev -- --host 127.0.0.1`, then inspect `http://127.0.0.1:5173/` with browser tooling at `1440 x 900` and `390 x 844`. In a fresh session verify Enter/click launch, one launch only, blue no-star/no-illustration desktop, all ten keyboard/touch entries, drag/resize/close/raise/reset, all three hashes, four knowledge-product links, wheel/pinch/fit/layers/minimap/undo/save/reset, invalid storage fallback, lazy-load retry, reduced motion, no horizontal overflow, and a clean console. Capture home/knowledge/system screenshots at both sizes; compare structure rather than protected reference content/assets. Resolve every P0/P1/P2 mismatch, rerun the focused test for each fix, and stop the server.

- [ ] **Step 7: Commit the integrated feature**

```bash
git add docs/.vitepress/theme/components scripts/personal-os-core.test.mjs scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: complete full personal os journey"
git status --short --branch
```

Expected: clean branch with eight feature commits after this plan commit, and no remaining references to deleted static-home components.
