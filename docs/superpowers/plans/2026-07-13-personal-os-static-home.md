# Personal OS Static Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-splash Personal Knowledge Factory homepage with an accessible Personal OS static 14-column desktop canvas and mobile single-column layout, without adding canvas pan/zoom or changing the splash session contract.

**Architecture:** Keep VitePress `DefaultTheme`, `docs/index.md`, and the existing `FactoryBoot.vue` reveal boundary. `KnowledgeFactoryHome.vue` remains the small composition root; focused Vue components render the fixed OS bar, static canvas, seven content surfaces, and inactive canvas-control placeholder. Homepage-only CSS supplies the exact light palette, 14-column placement, mobile flow, and staggered reveal.

**Tech Stack:** VitePress 1.6.4, Vue 3 SFCs, plain CSS, Node.js built-in test runner, Node.js 22, Wrangler 4.107.0.

## Global Constraints

- Preserve `FactoryBoot.vue`, `factoryBootState.mjs`, the synchronous `config.mts` preflight, and `sessionStorage['personal-site-accessed'] = 'true'` unchanged.
- Preserve `<FactoryBoot @reveal="handleReveal" />`, `.factory-home`, `homeEntering`, and `#factory-title` so splash reveal and focus handoff keep working.
- Use exact colors: `#F7F4EC`, `#FFFDF7`, `#1E2430`, `#69707D`, `#315EFB`, `#F2C94C`, `#EF7B45`, `#3FAE78`, and `#192232`.
- System text uses `"JetBrains Mono", "Fira Code", Consolas, monospace`; Chinese body text inherits the existing sans-serif stack.
- Add no dependency, route, dark homepage variant, drag, zoom, resize, free-window manager, gradient, glass effect, strong shadow, bounce, particle, or unrelated refactor.
- Real links only: `/`, `#projects`, `#notes`, `/about`, and `https://github.com/ketitongxue`; non-existent project/note/lab/email/social destinations remain text.
- Hide VitePress native navbar only on `docs/index.md`; all inner-page navigation and theme behavior remain unchanged.
- Use TDD: each task begins with a focused failing contract, reaches green, and ends with one reviewable commit.

---

### Task 1: Lock the Personal OS Contract in Tests

**Files:**
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `scripts/theme-validator.mjs`
- Modify: `scripts/theme-validator.test.mjs`

**Interfaces:**
- Consumes: existing `read(path)` source-test helper and `npm run test:factory`.
- Produces: source contracts for component boundaries, exact copy/routes, `formatLocalTime(date): string`, 14-column/mobile CSS hooks, and unchanged splash behavior.

- [ ] **Step 1: Replace obsolete Personal Knowledge Factory assertions with failing OS component/copy contracts**

In `scripts/personal-knowledge-factory.test.mjs`, replace the test named `factory homepage exposes the real brand, actions, and exactly four modules` with a test that reads `KnowledgeFactoryHome.vue`, `DesktopCanvas.vue`, and every component below, then asserts:

```js
const components = [
  'SystemTopBar', 'DesktopCanvas', 'ProfileCard', 'CurrentStatusCard',
  'FeaturedProjectCard', 'ProjectFolder', 'NotesLauncher', 'LabLauncher',
  'ContactTerminal', 'CanvasControls',
]
for (const name of components) await assert.doesNotReject(read(`docs/.vitepress/theme/components/${name}.vue`))
for (const copy of [
  'JuZX OS', '01 HOME', '02 PROJECTS', '03 NOTES', '04 ABOUT', 'SYSTEM ONLINE', 'v1.0',
  "HELLO, I'M JuZX", 'MES Product Manager', 'Industrial Digitalization Explorer',
  'CURRENT STATUS', 'FEATURED PROJECT / 001', '核电制造 MES 系统', 'PROJECTS/',
  'NOTES/', 'LAB/', 'JuZX@digital-factory ~ zsh', '$ cat contact.md', 'Ready.',
]) assert.match(allComponentSources, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>/)
assert.match(home, /<SystemTopBar\s*\/>/)
assert.match(home, /<DesktopCanvas\s*\/>/)
assert.doesNotMatch(allComponentSources, /pointerdown|pointermove|wheel|scale\(|translate3d|drag|zoom/i)
```

- [ ] **Step 2: Add failing local-clock, navigation, semantics, and no-fake-link contracts**

Import `formatLocalTime` from `SystemTopBar.mjs`, assert `formatLocalTime(new Date(2026, 6, 13, 9, 5)) === '09:05'`, and assert the component uses `onMounted`, `onBeforeUnmount`, `setInterval(..., 60000)`, and `<time>`. Assert the Profile h1 is exactly `id="factory-title" tabindex="-1"`; top navigation uses `href="/"`, `href="#projects"`, `href="#notes"`, and `href="/about"`; Profile/Featured actions use `/about` and `#projects`; only GitHub is an external contact link.

- [ ] **Step 3: Replace obsolete site-design and theme-validator assertions**

In `scripts/site-design.test.mjs`, replace expectations for `.factory-status`, `.factory-modules__grid`, `.factory-module`, `KNOWLEDGE MODULES`, and `RECENT LOG` with `.system-topbar`, `.desktop-canvas`, `.profile-card`, `.project-folder`, `.notes-launcher`, `.lab-launcher`, `.contact-terminal`, and `.canvas-controls`. Keep all knowledge hub, Q&A, search, splash, and route-resolution assertions unchanged.

In `scripts/theme-validator.mjs`, replace only the legacy homepage structural rules for `.factory-status`, `.factory-hero`, `.factory-modules__grid`, `.factory-module`, the old `max-width: 639px` factory fallback, and the single 600ms `.factory-home.is-entering` animation. Require the new `.system-topbar`, `.desktop-canvas`, eight placement selectors, `repeat(14, minmax(0, 1fr))`, the `max-width: 767px` single-column fallback, stagger-delay selectors, and the reduced-motion OS override. Preserve all `:root`/`.dark` token validation, splash validation, VitePress article styles, knowledge hub styles, Q&A styles, focus checks, and unrelated forbidden-pattern checks.

Update `scripts/theme-validator.test.mjs` fixtures and assertions to exercise those exact new requirements: one valid OS fixture; failures for a non-fixed topbar, non-14-column desktop canvas, missing placement selector, missing 767px single-column rule, missing stagger/reduced-motion rule, and forbidden drag/zoom behavior. Retain the existing factory-token, splash, article-theme, knowledge-hub, Q&A, contrast, and malformed-CSS cases.

- [ ] **Step 4: Run focused tests and verify RED for the intended missing files/selectors**

Run:

```bash
npm run test:factory
node --test scripts/site-design.test.mjs
node --test scripts/theme-validator.test.mjs
```

Expected: FAIL because the new Vue components and `SystemTopBar.mjs` do not exist and the old CSS lacks `.desktop-canvas`; the revised theme validator test itself passes against its fixtures, while running it against the current `custom.css` reports the missing new OS selectors. No splash-state, factory-token, article-theme, knowledge-hub, or Q&A assertion should fail.

- [ ] **Step 5: Commit the red contract**

```bash
git add scripts/personal-knowledge-factory.test.mjs scripts/site-design.test.mjs scripts/theme-validator.mjs scripts/theme-validator.test.mjs
git commit -m "test: define static personal os homepage"
```

---

### Task 2: Build the Semantic OS Shell and Content Components

**Files:**
- Create: `docs/.vitepress/theme/components/SystemTopBar.vue`
- Create: `docs/.vitepress/theme/components/SystemTopBar.mjs`
- Create: `docs/.vitepress/theme/components/DesktopCanvas.vue`
- Create: `docs/.vitepress/theme/components/ProfileCard.vue`
- Create: `docs/.vitepress/theme/components/CurrentStatusCard.vue`
- Create: `docs/.vitepress/theme/components/FeaturedProjectCard.vue`
- Create: `docs/.vitepress/theme/components/ProjectFolder.vue`
- Create: `docs/.vitepress/theme/components/NotesLauncher.vue`
- Create: `docs/.vitepress/theme/components/LabLauncher.vue`
- Create: `docs/.vitepress/theme/components/ContactTerminal.vue`
- Create: `docs/.vitepress/theme/components/CanvasControls.vue`
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`

**Interfaces:**
- Consumes: `FactoryBoot` event `reveal`; DOM focus target `#factory-title`; existing `/about` route.
- Produces: `formatLocalTime(date)` returning zero-padded local `HH:mm`; `.system-topbar`; `.desktop-canvas`; `#projects`; `#notes`; seven distinct content component roots; `.canvas-controls` as non-interactive phase-two reservation.

- [ ] **Step 1: Implement and unit-check the clock helper**

Create `SystemTopBar.mjs`:

```js
export function formatLocalTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
```

Run `npm run test:factory`; expected: clock subtest PASS while component-file assertions remain RED.

- [ ] **Step 2: Implement the fixed-bar semantics and lifecycle**

Create `SystemTopBar.vue` with `ref('--:--')`, an `updateClock()` using `formatLocalTime(new Date())`, `onMounted` immediate update plus `window.setInterval(updateClock, 60000)`, and `onBeforeUnmount` cleanup. Render `<header class="system-topbar">`, a labelled `<nav>`, exact left/center/right copy, a decorative green status dot, and `<time aria-live="off">`.

- [ ] **Step 3: Implement the seven differentiated content components**

Use semantic roots and exact supplied copy: Profile is the only h1 and contains `/about` plus `#projects`; Current Status has Working/Learning/Building definition groups; Featured Project has ROLE/STATUS and `OPEN ARCHIVE →`; ProjectFolder has the four project names and `id="projects"`; NotesLauncher has the four `.md` names and `id="notes"`; LabLauncher has the four experiment names; ContactTerminal contains the exact terminal transcript, plain Email/Social Media labels, and the known GitHub link. Keep decorative markers `aria-hidden="true"` and all actionable links keyboard reachable.

- [ ] **Step 4: Compose the canvas and preserve the boot boundary**

Create `DesktopCanvas.vue` importing the seven components plus `CanvasControls.vue`, with each child receiving one placement class (`desktop-canvas__profile`, `__status`, `__featured`, `__projects`, `__notes`, `__lab`, `__contact`, `__controls`). Replace old modules/logs in `KnowledgeFactoryHome.vue` with:

```vue
<FactoryBoot @reveal="handleReveal" />
<main :class="['factory-home', { 'is-entering': homeEntering }]">
  <SystemTopBar />
  <DesktopCanvas />
</main>
```

Retain the existing `ref(false)` and `handleReveal()` logic unchanged.

- [ ] **Step 5: Run semantic tests GREEN and commit**

Run `npm run test:factory`; expected: component/copy/clock/splash tests PASS, with only CSS-specific assertions still pending in `site-design.test.mjs`.

```bash
git add docs/.vitepress/theme/components scripts/personal-knowledge-factory.test.mjs
git commit -m "feat: compose personal os homepage"
```

---

### Task 3: Add the Static Canvas, Responsive Layout, and Reveal Motion

**Files:**
- Modify: `docs/index.md`
- Modify: `docs/.vitepress/theme/custom.css`
- Modify: `scripts/personal-knowledge-factory.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `scripts/theme-validator.mjs`
- Modify: `scripts/theme-validator.test.mjs`

**Interfaces:**
- Consumes: Task 2 placement classes and `.factory-home.is-entering`; existing splash selectors remain intact.
- Produces: homepage-only `navbar: false`; exact light OS palette; desktop 14-column canvas; fixed 56px bar; mobile two-row bar and single column; staggered reveal; reduced-motion override.

- [ ] **Step 1: Add failing exact visual/responsive assertions**

Assert `docs/index.md` contains `navbar: false`. Assert scoped CSS contains all nine exact colors, `grid-template-columns: repeat(14, minmax(0, 1fr))`, fixed `.system-topbar`, `overflow-x: clip`, each placement class, `@media (max-width: 767px)` with `grid-template-columns: 1fr`, `min-width: 0`, `overflow-wrap: anywhere`, `@media (prefers-reduced-motion: reduce)`, and no `linear-gradient`, `backdrop-filter`, `@keyframes` transform using rotate, or pointer/wheel cursor rules inside the OS block.

Run `npm run test:factory`; expected: FAIL on `navbar: false` and missing OS CSS.

- [ ] **Step 2: Implement exact desktop layout and differentiated surfaces**

Set homepage-scoped variables to the required palette without changing `:root`/`.dark` theme tokens. Make `.system-topbar` fixed at 56px. Make `.desktop-canvas` `width: min(1360px, calc(100vw - 48px))`, `min-height: 1040px`, 14 columns, 14 rows, and 16px gaps; place Profile `1/8,1/5`, Status `9/13,1/4`, Projects `11/15,4/8`, Featured `4/11,5/10`, Notes `1/4,6/10`, Lab `11/15,9/13`, Contact `3/10,11/15`, Controls `12/15,14/15`. Use window, status rail, folder tab, archive, file sheet, lab directory, dark terminal, and static control-panel treatments; no uniform card class.

- [ ] **Step 3: Implement reveal, mobile, focus, and overflow rules**

On `.factory-home.is-entering`, animate the bar and canvas children using only opacity, `translateY(8px)`, and `scale(.995)` for about 420ms with `cubic-bezier(0.16, 1, 0.3, 1)` and delays `0/50/110/170/230/290/350/410/470ms`. At `max-width: 767px`, use an 88px two-row bar and single-column flow ordered Profile, Status, Featured, Projects, Notes, Lab, Contact, Controls, with 16px edges and no absolute positioning. Add 2px `#315EFB` focus-visible outlines, `scroll-margin-top`, wrapping/min-width guards, and a reduced-motion rule that removes all OS animation/transition/transform.

- [ ] **Step 4: Run focused and full release gates GREEN**

```bash
npm run test:factory
node --test scripts/site-design.test.mjs
node --test scripts/theme-validator.test.mjs
npm run test:theme
npm test
npx wrangler deploy --dry-run
git diff --check origin/main..HEAD
git diff --exit-code origin/main -- docs/.vitepress/config.mts docs/.vitepress/theme/components/FactoryBoot.vue docs/.vitepress/theme/components/factoryBootState.mjs
```

Expected: all tests and VitePress build PASS; Wrangler reports a successful dry-run bundle; both git diff checks print nothing. Start `npm run docs:dev -- --host localhost`, inspect 1440×900 and 390×844, confirm no horizontal scrolling or console errors, then stop the server.

- [ ] **Step 5: Commit the completed static homepage**

```bash
git add docs/index.md docs/.vitepress/theme/custom.css scripts/personal-knowledge-factory.test.mjs scripts/site-design.test.mjs scripts/theme-validator.mjs scripts/theme-validator.test.mjs
git commit -m "feat: style static personal os canvas"
```

Expected: the branch is clean and contains three focused commits: red contract, semantic shell, and responsive visual implementation.
