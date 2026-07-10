# Theme Color Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VitePress-native dark/light theme switch that defaults to the current dark appearance, remembers the visitor's selection, and gives every custom surface an accessible light palette.

**Architecture:** Replace the forced-dark site setting with VitePress's `dark` initial appearance so the default theme owns the switch, storage, and first-paint class. Refactor custom CSS into light values in `:root`, dark overrides in `.dark`, and shared semantic variables for card gradients, on-brand text, and floating shadows.

**Tech Stack:** VitePress 1.6.4 appearance API, CSS custom properties, Node.js 22 test runner.

## Global Constraints

- First visit defaults to the existing dark style; a saved visitor choice overrides that default on later visits.
- Use the native VitePress appearance control and persistence; do not add a custom Vue toggle or storage key.
- The switch label is exactly `主题颜色`.
- Light auxiliary text on `#f7f9fc` is `#637187`, not the rejected `#68768d`, so contrast remains at least 4.5:1.
- The existing dark palette remains visually unchanged.
- Layout, spacing, radii, breakpoints, routes, content, Wiki publication, Q&A behavior, Worker, quotas, and rate limits do not change.
- The work is appended to `feature/site-design-refinement` and PR #13.

---

### Task 1: Enable the native persistent appearance switch

**Files:**
- Modify: `scripts/theme-config.test.mjs`
- Modify: `docs/.vitepress/config.mts`

**Interfaces:**
- Consumes: VitePress `appearance: 'dark'` behavior and default-theme `darkModeSwitchLabel`.
- Produces: a native navbar appearance switch, dark initial value, and VitePress-owned persisted selection.

- [ ] **Step 1: Change the configuration contract first**

Replace the force-dark assertion with:

```js
assert.equal(
  config.site.appearance,
  'dark',
  'the site must default to dark while allowing a persisted visitor choice'
)

assert.equal(
  config.site.themeConfig.darkModeSwitchLabel,
  '主题颜色',
  'the native appearance switch must have a Chinese label'
)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/theme-config.test.mjs`

Expected: failure because the current configuration resolves to `force-dark`.

- [ ] **Step 3: Apply the minimal VitePress configuration**

In `docs/.vitepress/config.mts`:

```ts
appearance: 'dark',
```

Keep the existing theme config and set:

```ts
darkModeSwitchLabel: '主题颜色',
```

Do not create a component, client hook, storage key, or inline theme script.

- [ ] **Step 4: Run the focused theme tests and verify GREEN**

Run:

```bash
node scripts/theme-config.test.mjs
npm run test:theme
```

Expected: theme config, theme validator, and theme checks pass.

- [ ] **Step 5: Commit the appearance configuration**

```bash
git add scripts/theme-config.test.mjs docs/.vitepress/config.mts
git commit -m "feat: enable native theme switching"
```

### Task 2: Add tested light and dark semantic palettes

**Files:**
- Create: `scripts/theme-color.test.mjs`
- Modify: `package.json`
- Modify: `docs/.vitepress/theme/custom.css`

**Interfaces:**
- Consumes: `.dark` class controlled by VitePress and existing `--vp-*` variables.
- Produces: exact light/dark token maps plus `--site-card-start`, `--site-card-end`, `--site-on-brand`, and `--site-floating-shadow` used by custom components.

- [ ] **Step 1: Write the failing palette and contrast test**

Create `scripts/theme-color.test.mjs`:

```js
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

function variable(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6}|[^;]+);`, 'i'))
  assert.ok(match, `missing ${name}`)
  return match[1].trim()
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

test('light and dark palettes use the exact approved colors', () => {
  const light = block(':root')
  const dark = block('.dark')
  assert.equal(variable(light, '--vp-c-bg'), '#f7f9fc')
  assert.equal(variable(light, '--vp-c-text-3'), '#637187')
  assert.equal(variable(light, '--vp-c-brand-1'), '#137f6b')
  assert.equal(variable(light, '--site-on-brand'), '#ffffff')
  assert.equal(variable(dark, '--vp-c-bg'), '#0b1020')
  assert.equal(variable(dark, '--vp-c-text-3'), '#8f9bb0')
  assert.equal(variable(dark, '--vp-c-brand-1'), '#8be9d3')
  assert.equal(variable(dark, '--site-on-brand'), '#061512')
})

test('approved text and button pairs meet WCAG AA contrast', () => {
  for (const [foreground, background] of [
    ['#172033', '#f7f9fc'], ['#4f5d73', '#f7f9fc'],
    ['#637187', '#f7f9fc'], ['#137f6b', '#f7f9fc'],
    ['#ffffff', '#0b5f50'], ['#e7eaf3', '#0b1020'],
    ['#aab3c5', '#0b1020'], ['#8f9bb0', '#0b1020'],
    ['#8be9d3', '#0b1020'], ['#061512', '#42aa93'],
  ]) assert.ok(contrast(foreground, background) >= 4.5)
})

test('custom components consume semantic theme variables', () => {
  assert.match(css, /linear-gradient\(145deg, var\(--site-card-start\), var\(--site-card-end\)\)/)
  assert.match(css, /color:\s*var\(--site-on-brand\)/)
  assert.match(css, /box-shadow:\s*var\(--site-floating-shadow\)/)
})
```

- [ ] **Step 2: Register the palette test and verify RED**

Add `node --test scripts/theme-color.test.mjs` to `test:theme` before `node scripts/check-theme.mjs`.

Run: `node --test scripts/theme-color.test.mjs`

Expected: failures because `:root` still contains dark values and semantic site variables do not exist.

- [ ] **Step 3: Move approved light values into `:root`**

Set the exact light variables:

```css
:root {
  --vp-c-bg: #f7f9fc;
  --vp-c-bg-alt: #eef3f8;
  --vp-c-bg-soft: #e8eff6;
  --vp-c-border: #cbd6e4;
  --vp-c-divider: #d8e1ec;
  --vp-c-text-1: #172033;
  --vp-c-text-2: #4f5d73;
  --vp-c-text-3: #637187;
  --vp-c-brand-1: #137f6b;
  --vp-c-brand-2: #0f6f5d;
  --vp-c-brand-3: #0b5f50;
  --vp-home-hero-name-color: #137f6b;
  --vp-home-hero-name-background: none;
  --site-card-start: #ffffff;
  --site-card-end: #eef3f8;
  --site-on-brand: #ffffff;
  --site-floating-shadow: 0 14px 40px rgb(23 32 51 / 14%);
  --wiki-ask-error-border: #b42342;
  --wiki-ask-error-bg: #fff0f3;
  --wiki-ask-error-text: #8b1e35;
}
```

- [ ] **Step 4: Preserve the exact current dark appearance in `.dark`**

Override every corresponding variable:

```css
.dark {
  --vp-c-bg: #0b1020;
  --vp-c-bg-alt: #10182a;
  --vp-c-bg-soft: #121a2d;
  --vp-c-border: #273451;
  --vp-c-divider: #25304a;
  --vp-c-text-1: #e7eaf3;
  --vp-c-text-2: #aab3c5;
  --vp-c-text-3: #8f9bb0;
  --vp-c-brand-1: #8be9d3;
  --vp-c-brand-2: #64cdb5;
  --vp-c-brand-3: #42aa93;
  --vp-home-hero-name-color: #8be9d3;
  --site-card-start: #121a2d;
  --site-card-end: #0f1627;
  --site-on-brand: #061512;
  --site-floating-shadow: 0 14px 40px rgb(0 0 0 / 28%);
  --wiki-ask-error-border: #c75b70;
  --wiki-ask-error-bg: #3a1720;
  --wiki-ask-error-text: #ffd5dc;
}
```

- [ ] **Step 5: Replace component hard-coding with semantic variables**

Use:

```css
.VPFeature {
  background: linear-gradient(145deg, var(--site-card-start), var(--site-card-end));
}

.wiki-ask button {
  color: var(--site-on-brand);
}

.wiki-ask__composer {
  box-shadow: var(--site-floating-shadow);
}
```

Keep all existing borders, layout, focus styles, responsive rules, and error variables.

- [ ] **Step 6: Run focused tests and build, then verify GREEN**

Run:

```bash
node --test scripts/theme-color.test.mjs
npm run test:theme
npm run docs:build
```

Expected: palette tests, theme checks, client/server bundle, and page rendering pass.

- [ ] **Step 7: Commit the semantic palettes**

```bash
git add scripts/theme-color.test.mjs package.json docs/.vitepress/theme/custom.css
git commit -m "feat: add accessible light theme palette"
```

### Task 3: Full verification and PR update

**Files:**
- Modify only if verification exposes a regression in Task 1 or Task 2 files.

**Interfaces:**
- Consumes: complete theme-switch branch state.
- Produces: fresh automated evidence and an updated PR #13 branch.

- [ ] **Step 1: Check repository scope**

Run:

```bash
git status -sb
git diff --check origin/main...HEAD
git diff --stat origin/feature/site-design-refinement...HEAD
```

Expected: a clean worktree, no whitespace errors, and only theme-switch specification/config/test/CSS changes since the last pushed PR head.

- [ ] **Step 2: Run the complete suite**

Run: `npm test`

Expected: all design, Wiki publication, Wiki Q&A, Worker, content, theme, build, and security checks pass; Wiki reports 45 pages and Finance reports 48 pages.

- [ ] **Step 3: Perform browser acceptance when preview binding is available**

Run: `npm run docs:dev -- --host localhost`

At desktop and 390 × 844, verify dark initial paint, native switch label, light palette, refresh persistence, homepage, both knowledge hubs, article, and Q&A. If the sandbox still rejects local binding, record the limitation and rely on the Cloudflare preview after push.

- [ ] **Step 4: Push the current branch and verify PR checks**

Run:

```bash
git push origin feature/site-design-refinement
gh pr checks 13
```

Expected: PR #13 updates to the new HEAD and Cloudflare Workers Build passes.
