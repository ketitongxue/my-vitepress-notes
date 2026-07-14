# `03 我的 OS` UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine only `03 我的 OS` into the approved warm-paper, growth-axis infinite canvas while preserving its existing safe interactions and deployment path.

**Architecture:** Keep `KnowledgeFactoryHome.vue` as the hash/lazy-load boundary and `InfiniteCanvas.vue` as the sole layout orchestrator. Move immutable narrative data, strict `v2` persistence, and geometry calculations into browser-global-free `.mjs` modules; render semantic card variants and responsive canvas chrome through focused Vue components.

**Tech Stack:** Node.js 22, VitePress 1.6.4, Vue 3 SFCs, ES modules, plain scoped CSS, Node.js built-in test runner, Wrangler 4.107.0.

---

## Execution Protocol

- Every task is implemented by a fresh subagent in this isolated worktree.
- After implementation, a fresh spec/compliance reviewer checks the task against this plan and the approved design; any findings return to the implementer.
- After compliance approval, a fresh code-quality reviewer checks correctness, maintainability, and regression risk; any findings return to the implementer.
- Do not begin the next task until both reviews approve and the focused GREEN command passes.
- Do not add stars, illustrations, photographs, editing, new-card creation, deletion, uploads, or free-form connection creation.

## Locked Contracts

- Scope is limited to `#system`; do not change the boot flow, `01 主页`, `02 知识库`, bottom navigation, wiki/Q&A content, Worker code, or deployment configuration.
- `personalOsContent.mjs` is the immutable source of trusted copy, type, routes, minimum sizes, accents, groups, and configured edges. Runtime state may change only geometry, visibility, stacking order, and transform.
- Semantic types are exactly `identity`, `timeline`, `principle`, `skills`, `project`, `knowledge`, `status`, and `next`.
- The layout key is exactly `juzx-personal-os-layout-v2`; never read, migrate, overwrite, or remove `juzx-personal-os-layout-v1`.
- Canvas scale remains clamped to `0.15...3`; history remains bounded to 50 entries; touch targets are at least `44 x 44` CSS pixels.
- Approved tokens are `#F7F4EC`, `#FFFDF7`, `#1E2430`, `#69707D`, `#315EFB`, `#F4D758`, `#EF7B45`, and `#3FAE78`. Do not add gradients, glass blur, neon, heavy shadows, bounce, or elastic motion.
- Implement each task with focused TDD. A task is complete only after a fresh implementation subagent, fresh spec/compliance review, fresh code-quality review, and a reviewable commit.

### Task 1: Canonical Growth-Axis Content Model

**Files:**
- Modify: `docs/.vitepress/theme/components/personalOsContent.mjs`
- Modify: `scripts/personal-os-core.test.mjs`

- [ ] **Step 1: Write the failing exact content and relationship contract**

Replace the current broad canvas assertions in `scripts/personal-os-core.test.mjs` with:

```js
test('growth-axis content has eleven immutable trusted nodes', () => {
  assert.deepEqual(canvasCards.map(({ id, type }) => [id, type]), [
    ['identity', 'identity'],
    ['growth-field', 'timeline'],
    ['growth-product', 'timeline'],
    ['growth-system', 'timeline'],
    ['growth-ai', 'timeline'],
    ['core-story', 'principle'],
    ['capabilities', 'skills'],
    ['project-archive', 'project'],
    ['knowledge-products', 'knowledge'],
    ['current-build', 'status'],
    ['next-direction', 'next'],
  ])
  assert.deepEqual(canvasCards.map(({ id, x, y, width, height }) =>
    [id, x, y, width, height]), [
    ['identity', 120, 360, 360, 260],
    ['growth-field', 560, 340, 240, 160],
    ['growth-product', 860, 280, 240, 160],
    ['growth-system', 1160, 340, 260, 170],
    ['growth-ai', 1500, 270, 260, 170],
    ['core-story', 780, 570, 340, 190],
    ['capabilities', 1180, 600, 380, 180],
    ['project-archive', 1190, 850, 340, 190],
    ['knowledge-products', 1830, 500, 400, 260],
    ['current-build', 1740, 850, 320, 170],
    ['next-direction', 1900, 240, 300, 150],
  ])
  assert.equal(Object.isFrozen(canvasCards), true)
  assert.equal(Object.isFrozen(canvasCards[0]), true)
})

test('growth-axis relationships and native destinations are exact', () => {
  assert.deepEqual(canvasConnections.map(({ from, to }) => [from, to]), [
    ['identity', 'growth-field'],
    ['growth-field', 'growth-product'],
    ['growth-product', 'growth-system'],
    ['growth-system', 'growth-ai'],
    ['growth-product', 'core-story'],
    ['growth-system', 'core-story'],
    ['growth-system', 'capabilities'],
    ['growth-ai', 'capabilities'],
    ['growth-system', 'project-archive'],
    ['growth-ai', 'knowledge-products'],
    ['growth-ai', 'current-build'],
    ['growth-ai', 'next-direction'],
  ])
  const knowledge = canvasCards.find(({ id }) => id === 'knowledge-products')
  assert.deepEqual(knowledge.links, [
    { label: 'LLM Wiki', href: '/wiki/' },
    { label: 'Finance Wiki', href: '/finance/' },
    { label: '知识问答', href: '/ask/' },
    { label: 'llm-wiki Skill', href: '/llm-wiki/' },
  ])
  const ids = new Set(canvasCards.map(({ id }) => id))
  assert.equal(ids.size, 11)
  for (const edge of canvasConnections) {
    assert.ok(ids.has(edge.from), edge.from)
    assert.ok(ids.has(edge.to), edge.to)
  }
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --test-name-pattern='growth-axis' scripts/personal-os-core.test.mjs`

Expected: FAIL because the current nine generic cards do not have the required IDs, semantic types, or exact links.

- [ ] **Step 3: Implement the eleven trusted nodes and relationships**

Replace only the canvas model in `personalOsContent.mjs`. Keep `bootLines`, `desktopEntries`, and `knowledgeSections` unchanged. Use this frozen shape for every node:

```js
const node = ({ id, type, kicker, title, body, x, y, width, height,
  minWidth, minHeight, accent, mark, items = [], links = [], status }) => Object.freeze({
  id, type, kicker, title, body, x, y, width, height, minWidth, minHeight,
  visible: true, accent, mark, status,
  items: Object.freeze(items.map((item) => typeof item === 'string' ? item : Object.freeze(item))),
  links: Object.freeze(links.map((link) => Object.freeze(link))),
})

export const canvasCards = Object.freeze([
  node({ id: 'identity', type: 'identity', kicker: "HELLO, I'M", title: 'JuZX', mark: 'JZ',
    body: 'MES Product Manager · Industrial Digitalization Explorer\n关注工业数字化、智能制造，以及 AI 在个人工作流中的实践。',
    x: 120, y: 360, width: 360, height: 260, minWidth: 300, minHeight: 220, accent: 'blue' }),
  node({ id: 'growth-field', type: 'timeline', kicker: '01', title: '制造现场',
    body: '理解真实业务、流程与协作约束。', x: 560, y: 340, width: 240, height: 160,
    minWidth: 220, minHeight: 140, accent: 'yellow' }),
  node({ id: 'growth-product', type: 'timeline', kicker: '02', title: '产品实践',
    body: '把业务问题转化为可落地的产品方案。', x: 860, y: 280, width: 240, height: 160,
    minWidth: 220, minHeight: 140, accent: 'blue' }),
  node({ id: 'growth-system', type: 'timeline', kicker: '03', title: '工业数字化',
    body: '连接生产、物资、质量、焊接和设备业务。', x: 1160, y: 340, width: 260, height: 170,
    minWidth: 220, minHeight: 140, accent: 'yellow' }),
  node({ id: 'growth-ai', type: 'timeline', kicker: '04', title: 'AI 工作流',
    body: '把知识、检索和 Agent 变成持续使用的系统。', x: 1500, y: 270, width: 260, height: 170,
    minWidth: 220, minHeight: 140, accent: 'blue' }),
  node({ id: 'core-story', type: 'principle', kicker: 'CORE STORY', title: '从真实问题出发',
    body: '在项目中验证，再把经验沉淀为可复用的知识。', x: 780, y: 570, width: 340, height: 190,
    minWidth: 280, minHeight: 160, accent: 'yellow' }),
  node({ id: 'capabilities', type: 'skills', kicker: 'CAPABILITIES', title: '能力与方法', body: '',
    items: ['产品规划', '工业数字化', '知识工程', 'AI 工作流'], x: 1180, y: 600,
    width: 380, height: 180, minWidth: 320, minHeight: 160, accent: 'blue' }),
  node({ id: 'project-archive', type: 'project', kicker: 'PROJECT ARCHIVE', title: 'MES 与工业数字化项目实践', body: '',
    links: [{ label: '查看项目档案 →', href: '#home' }], x: 1190, y: 850, width: 340, height: 190,
    minWidth: 280, minHeight: 170, accent: 'blue' }),
  node({ id: 'knowledge-products', type: 'knowledge', kicker: 'KNOWLEDGE SYSTEM', title: '知识系统', body: '',
    links: [{ label: 'LLM Wiki', href: '/wiki/' }, { label: 'Finance Wiki', href: '/finance/' },
      { label: '知识问答', href: '/ask/' }, { label: 'llm-wiki Skill', href: '/llm-wiki/' }],
    x: 1830, y: 500, width: 400, height: 260, minWidth: 340, minHeight: 220, accent: 'blue' }),
  node({ id: 'current-build', type: 'status', kicker: 'CURRENT BUILD', title: 'Personal Digital Factory',
    body: '持续构建中', status: 'online', x: 1740, y: 850, width: 320, height: 170,
    minWidth: 280, minHeight: 150, accent: 'green' }),
  node({ id: 'next-direction', type: 'next', kicker: 'NEXT', title: '持续演进',
    body: '持续学习、构建和记录，让个人系统保持演进。', x: 1900, y: 240, width: 300, height: 150,
    minWidth: 250, minHeight: 140, accent: 'orange' }),
])
```

Export the twelve exact frozen connections asserted in Step 1. Do not introduce any visitor-authored content field.

- [ ] **Step 4: Run focused GREEN**

Run: `node --test --test-name-pattern='growth-axis' scripts/personal-os-core.test.mjs`

Expected: PASS with 2 matching subtests; all other subtests are reported as skipped by the name filter.

- [ ] **Step 5: Complete both fresh reviews**

Dispatch a fresh compliance reviewer with the approved spec, this Task 1 section, and the diff. Require confirmation of all eleven exact nodes, eight semantic types, stable IDs, exact routes, valid edge endpoints, immutable records, and no forbidden assets/features. Then dispatch a different fresh code-quality reviewer; resolve every Important/Critical finding and rerun Step 4.

- [ ] **Step 6: Commit**

```bash
git add scripts/personal-os-core.test.mjs docs/.vitepress/theme/components/personalOsContent.mjs
git commit -m "feat: define my os growth narrative"
```

### Task 2: Strict Storage v2, Dynamic Bounds, and Fit

**Files:**
- Modify: `docs/.vitepress/theme/components/canvasPersistence.mjs`
- Modify: `docs/.vitepress/theme/components/canvasGeometry.mjs`
- Modify: `docs/.vitepress/theme/components/canvasHistory.mjs`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `scripts/personal-os-core.test.mjs`

- [ ] **Step 1: Write failing strict-v2 persistence tests**

Import the new helpers and replace persistence version-1 expectations in `scripts/personal-os-core.test.mjs`:

```js
import {
  canvasUsableViewport, computeWorldBounds, fitWorldBounds, initialFitCards,
} from '../docs/.vitepress/theme/components/canvasGeometry.mjs'

test('canvas persistence uses only complete trusted v2 geometry', () => {
  assert.equal(CANVAS_LAYOUT_KEY, 'juzx-personal-os-layout-v2')
  const defaults = {
    cards: canvasCards.map((card) => ({ ...card })),
    order: canvasCards.map(({ id }) => id),
    transform: { scale: 0.7, panX: 40, panY: 30 },
  }
  const moved = structuredClone(defaults)
  moved.cards[0].x = 222
  moved.order = [...moved.order.slice(1), moved.order[0]]
  const parsed = parseCanvasLayout(serializeCanvasLayout(moved), defaults)
  assert.equal(parsed.cards[0].x, 222)
  assert.deepEqual(parsed.order, moved.order)
  assert.equal(parsed.cards[0].title, canvasCards[0].title)

  const envelope = JSON.parse(serializeCanvasLayout(moved))
  assert.deepEqual(Object.keys(envelope).sort(), ['cards', 'order', 'transform', 'version'])
  assert.equal(envelope.version, 2)
  assert.equal('title' in envelope.cards[0], false)
  assert.equal(parseCanvasLayout(JSON.stringify({ ...envelope, version: 1 }), defaults), null)
  assert.equal(parseCanvasLayout(JSON.stringify({ ...envelope, cards: envelope.cards.slice(1) }), defaults), null)
  assert.equal(parseCanvasLayout(JSON.stringify({ ...envelope, order: [...envelope.order, envelope.order[0]] }), defaults), null)
  assert.equal(parseCanvasLayout(JSON.stringify({ ...envelope,
    cards: envelope.cards.map((card, index) => index ? card : { ...card, width: 1 }) }), defaults), null)
})

test('storage denial is silent and v1 is never accessed', () => {
  const calls = []
  const storage = {
    getItem(key) { calls.push(key); throw new Error('denied') },
    setItem() { throw new Error('quota') },
  }
  const defaults = { cards: canvasCards.map((card) => ({ ...card })),
    order: canvasCards.map(({ id }) => id), transform: { scale: 1, panX: 0, panY: 0 } }
  assert.equal(loadCanvasLayout(storage, defaults), null)
  assert.equal(saveCanvasLayout(storage, defaults), false)
  assert.deepEqual(calls, ['juzx-personal-os-layout-v2'])
})
```

- [ ] **Step 2: Write failing dynamic-bounds/Fit tests**

Append:

```js
test('dynamic bounds measure visible cards and share one Fit rectangle', () => {
  const fallback = { x: 0, y: 0, width: 1000, height: 700 }
  const cards = [
    { id: 'a', x: 100, y: 200, width: 200, height: 100, visible: true },
    { id: 'b', x: 600, y: 500, width: 300, height: 200, visible: true },
    { id: 'hidden', x: -900, y: -900, width: 50, height: 50, visible: false },
  ]
  assert.deepEqual(computeWorldBounds(cards, fallback, 50),
    { x: 50, y: 150, width: 900, height: 600 })
  assert.deepEqual(computeWorldBounds(cards.map((card) => ({ ...card, visible: false })), fallback, 50), fallback)
  const usable = canvasUsableViewport({ width: 1440, height: 900 }, false)
  assert.deepEqual(usable, { x: 72, y: 24, width: 1344, height: 780 })
  const fitted = fitWorldBounds(computeWorldBounds(cards, fallback, 50), usable, 24)
  assert.ok(Number.isFinite(fitted.scale) && Number.isFinite(fitted.panX) && Number.isFinite(fitted.panY))
  assert.deepEqual(initialFitCards(canvasCards, true).map(({ id }) => id),
    ['identity', 'growth-field', 'growth-product', 'growth-system', 'growth-ai'])
  assert.equal(initialFitCards(canvasCards, false).length, 11)
})
```

- [ ] **Step 3: Run RED**

Run: `node --test --test-name-pattern='persistence|storage denial|dynamic bounds' scripts/personal-os-core.test.mjs`

Expected: FAIL because the key/version are `v1`, stacking is absent, and the new geometry helpers are not exported.

- [ ] **Step 4: Implement strict v2 persistence, history order, and geometry helpers**

In `canvasPersistence.mjs`, set `CANVAS_LAYOUT_KEY` to the exact v2 key. Require envelope `version === 2`, an exact non-duplicated card ID set, an exact non-duplicated `order` ID set, finite transform values, and every stored dimension to be at least the trusted node's `minWidth/minHeight`. Serialize only:

```js
{
  version: 2,
  transform: { scale, panX, panY },
  order: [...layout.order],
  cards: layout.cards.map(({ id, x, y, width, height, visible }) =>
    ({ id, x, y, width, height, visible })),
}
```

On parse, restore runtime cards from trusted defaults and overlay only geometry/visibility:

```js
return {
  cards: defaults.cards.map((trusted) => {
    const saved = storedById.get(trusted.id)
    return { ...trusted, x: saved.x, y: saved.y, width: saved.width,
      height: saved.height, visible: saved.visible }
  }),
  order: [...stored.order],
  transform: { ...stored.transform },
}
```

Update `canvasHistory.mjs` so `cloneLayout()` clones `order`, `layoutsEqual()` compares it, and all history operations retain it. In `canvasGeometry.mjs`, add:

```js
const PRIMARY_IDS = new Set(['identity', 'growth-field', 'growth-product', 'growth-system', 'growth-ai'])

export function initialFitCards(cards, mobile) {
  return cards.filter((card) => card.visible !== false && (!mobile || PRIMARY_IDS.has(card.id)))
}

export function computeWorldBounds(cards, fallback, padding = 96) {
  const visible = cards.filter((card) => card.visible !== false
    && [card.x, card.y, card.width, card.height].every(Number.isFinite)
    && card.width > 0 && card.height > 0)
  if (visible.length === 0) return { ...fallback }
  const minX = Math.min(...visible.map(({ x }) => x))
  const minY = Math.min(...visible.map(({ y }) => y))
  const maxX = Math.max(...visible.map(({ x, width }) => x + width))
  const maxY = Math.max(...visible.map(({ y, height }) => y + height))
  return { x: minX - padding, y: minY - padding,
    width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }
}

export function canvasUsableViewport(viewport, mobile) {
  if (mobile) return { x: 16, y: 16,
    width: Math.max(1, viewport.width - 32), height: Math.max(1, viewport.height - 176) }
  return { x: 72, y: 24,
    width: Math.max(1, viewport.width - 96), height: Math.max(1, viewport.height - 120) }
}
```

Extend `fitWorldBounds()` to honor `viewport.x` and `viewport.y` when centering; default both to `0` so existing callers remain valid.

- [ ] **Step 5: Integrate current bounds, first Fit, restore, reset, and minimap**

In `InfiniteCanvas.vue`, make the layout shape `{ cards, order, transform }`; derive `stackingOrder` from `layout.order`; replace `stableWorldBounds` with:

```js
const canonicalBounds = Object.freeze(computeWorldBounds(defaultLayout.cards,
  { x: 0, y: 0, width: 2400, height: 1200 }, 96))
const worldBounds = computed(() => computeWorldBounds(cards.value, canonicalBounds, 96))
const mobileViewport = computed(() => viewportSize.value.width < 768)
const usableViewport = computed(() => canvasUsableViewport(viewportSize.value, mobileViewport.value))
```

After `getBoundingClientRect()` returns positive dimensions, restore a valid v2 layout unchanged; otherwise call Fit once using `initialFitCards(cards.value, mobileViewport.value)`. Recompute the computed bounds after move, resize, hide, undo, reset, or restore automatically. Make `fitCanvas()` use `worldBounds.value`, make `CanvasMinimap` receive the same `worldBounds.value`, and make reset restore default geometry/order/visibility then Fit the new defaults. Never autosave the initial default before the first Fit is committed.

- [ ] **Step 6: Run GREEN and both fresh reviews**

Run:

```bash
node --test --test-name-pattern='persistence|storage denial|dynamic bounds' scripts/personal-os-core.test.mjs
node --test scripts/personal-os-core.test.mjs
```

Expected: all focused and complete Personal OS core tests PASS. Dispatch a fresh compliance reviewer for strict v2 isolation, corrupt-data rejection, first-fit/restore/reset rules, current-visible bounds, mobile primary Fit, and shared minimap/Fit bounds. Then dispatch a different code-quality reviewer; fix findings and rerun both commands.

- [ ] **Step 7: Commit**

```bash
git add scripts/personal-os-core.test.mjs docs/.vitepress/theme/components/canvasPersistence.mjs docs/.vitepress/theme/components/canvasGeometry.mjs docs/.vitepress/theme/components/canvasHistory.mjs docs/.vitepress/theme/components/InfiniteCanvas.vue
git commit -m "feat: fit and persist my os layout v2"
```

### Task 3: Semantic Rounded Card Variants and JZ Anchor

**Files:**
- Modify: `docs/.vitepress/theme/components/CanvasCard.vue`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `scripts/personal-os-core.test.mjs`

- [ ] **Step 1: Write the failing semantic-rendering and minimum-size contract**

Append to `scripts/personal-os-core.test.mjs`:

```js
test('CanvasCard renders eight read-only semantic variants', () => {
  const card = readComponent('CanvasCard.vue')
  assert.match(card, /:data-card-type="card\.type"/)
  assert.match(card, /:class="\[`canvas-card--\$\{card\.type\}`/)
  for (const type of ['identity', 'timeline', 'principle', 'skills', 'project', 'knowledge', 'status', 'next']) {
    assert.match(card, new RegExp(`canvas-card--${type}`))
  }
  assert.match(card, /class="canvas-card__mark"[\s\S]*\{\{ card\.mark \}\}/)
  assert.match(card, /v-for="item in card\.items"/)
  assert.match(card, /v-for="link in card\.links"[\s\S]*:href="link\.href"/)
  assert.match(card, /Math\.max\(props\.card\.minWidth/)
  assert.match(card, /Math\.max\(props\.card\.minHeight/)
  assert.doesNotMatch(card, /contenteditable|<textarea|<input|<img|picture|illustration|portrait/i)
})

test('identity anchor is one rounded JZ rectangle without geometry shift', () => {
  const card = readComponent('CanvasCard.vue')
  assert.match(card, /\.canvas-card--identity\s*\{[\s\S]*border-radius:\s*16px/)
  assert.match(card, /\.canvas-card\.is-selected\s*\{[\s\S]*outline:/)
  assert.match(card, /outline-offset:/)
  assert.doesNotMatch(card, /\.canvas-card\.is-selected\s*\{[^}]*border-width:/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --test-name-pattern='CanvasCard|identity anchor' scripts/personal-os-core.test.mjs`

Expected: FAIL because `CanvasCard.vue` still renders one generic title/body card with global `180 x 120` resize minimums.

- [ ] **Step 3: Render all eight semantic variants and type minimums**

Keep the existing pointer-capture gesture lifecycle, but replace the resize clamp with trusted per-node bounds:

```js
width: Math.max(props.card.minWidth, active.initial.width + dx),
height: Math.max(props.card.minHeight, active.initial.height + dy),
```

Apply a stable semantic class and use one article per record:

```vue
<article
  v-show="card.visible !== false"
  class="canvas-card"
  :class="[`canvas-card--${card.type}`, { 'is-selected': selected }]"
  :data-card-type="card.type"
  data-canvas-card
>
  <button class="canvas-card__titlebar" type="button"
    :aria-label="`选择并移动 ${card.title}`" @click="selectCard"
    @pointerdown="beginGesture('move', $event)" @pointermove="queuePoint"
    @pointerup="finishGesture" @pointercancel="cancelGesture"
    @lostpointercapture="cancelGesture">
    <span v-if="card.mark" class="canvas-card__mark" aria-hidden="true">{{ card.mark }}</span>
    <span class="canvas-card__heading"><small>{{ card.kicker }}</small><strong>{{ card.title }}</strong></span>
  </button>
  <div class="canvas-card__body">
    <p v-if="card.body" class="canvas-card__copy">{{ card.body }}</p>
    <ul v-if="card.items.length" class="canvas-card__chips" aria-label="能力标签">
      <li v-for="item in card.items" :key="item">{{ item }}</li>
    </ul>
    <nav v-if="card.links.length" class="canvas-card__links" :aria-label="`${card.title} 链接`">
      <a v-for="link in card.links" :key="link.href" :href="link.href"
        @pointerdown.stop @click.stop>{{ link.label }}</a>
    </nav>
    <span v-if="card.status" class="canvas-card__status"><i aria-hidden="true"></i>{{ card.body }}</span>
  </div>
  <button class="canvas-card__resize" type="button" :aria-label="`调整 ${card.title} 卡片大小`"
    @pointerdown="beginGesture('resize', $event)" @pointermove="queuePoint"
    @pointerup="finishGesture" @pointercancel="cancelGesture"
    @lostpointercapture="cancelGesture">调整大小</button>
</article>
```

Avoid duplicate status text by rendering `.canvas-card__copy` only when `!card.status`.

- [ ] **Step 4: Add the exact variant styling without homogenizing the cards**

In `CanvasCard.vue` scoped CSS, retain absolute geometry and focus visibility, then add these defining rules:

```css
.canvas-card { border: 1px solid #9bb6df; border-radius: 8px; background: #fffdf7; box-shadow: none; }
.canvas-card--identity { border: 2px solid #315efb; border-radius: 16px; }
.canvas-card--identity .canvas-card__titlebar { grid-template-columns: 84px 1fr; }
.canvas-card__mark { display: grid; width: 72px; height: 72px; place-items: center;
  border-radius: 14px; background: #315efb; color: #fffdf7; font: 700 28px/1 "JetBrains Mono", monospace; }
.canvas-card--timeline { border-left: 3px solid #315efb; }
.canvas-card--principle { border-color: #d8b92f; background: #fff9dc; }
.canvas-card__chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
.canvas-card__chips li { border: 1px solid #315efb; border-radius: 999px; padding: 5px 9px; }
.canvas-card--project { border-left: 6px solid #315efb; }
.canvas-card--knowledge .canvas-card__links { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.canvas-card--status { background: #eef4ff; }
.canvas-card__status i { width: 9px; height: 9px; border-radius: 50%; background: #3fae78; }
.canvas-card--next { border-color: #ef7b45; background: #fffaf6; }
.canvas-card.is-selected { outline: 3px solid #315efb; outline-offset: 3px; }
```

Use border/opacity only for hover, retain `:focus-visible`, and do not add transform-based card hover or animation. In `InfiniteCanvas.vue`, keep DOM order equal to `canvasCards` and use `zIndexFor()` only for visual stacking.

- [ ] **Step 5: Run focused GREEN and both fresh reviews**

Run:

```bash
node --test --test-name-pattern='CanvasCard|identity anchor' scripts/personal-os-core.test.mjs
node --test --test-name-pattern='growth-axis' scripts/personal-os-core.test.mjs
```

Expected: both commands PASS. Dispatch a fresh compliance reviewer to check the eight variants, one rounded JZ identity container, exact native links, narrative DOM order, type minimums, selection without layout shift, and exclusions. Then use a different fresh code-quality reviewer; fix findings and rerun both commands.

- [ ] **Step 6: Commit**

```bash
git add scripts/personal-os-core.test.mjs docs/.vitepress/theme/components/CanvasCard.vue docs/.vitepress/theme/components/InfiniteCanvas.vue
git commit -m "feat: render semantic my os cards"
```

### Task 4: Collapsible Layers Rail, Panel, Drawer, and Minimap

**Files:**
- Modify: `docs/.vitepress/theme/components/CanvasLayers.vue`
- Modify: `docs/.vitepress/theme/components/CanvasMinimap.vue`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `scripts/personal-os-core.test.mjs`

- [ ] **Step 1: Write the failing Layers/minimap composition contract**

Append:

```js
test('Layers is a 48px rail, 220px overlay, and mobile bottom drawer', () => {
  const layers = readComponent('CanvasLayers.vue')
  const canvas = readComponent('InfiniteCanvas.vue')
  assert.match(layers, /import CanvasMinimap from '.\/CanvasMinimap\.vue'/)
  assert.match(layers, /aria-controls="canvas-layers-panel"/)
  assert.match(layers, /:aria-expanded="expanded"/)
  assert.match(layers, /id="canvas-layers-panel"/)
  assert.match(layers, /<CanvasMinimap[\s\S]*:world-bounds="worldBounds"/)
  assert.match(layers, /width:\s*48px/)
  assert.match(layers, /width:\s*220px/)
  assert.match(layers, /@media \(max-width:\s*767px\)[\s\S]*position:\s*fixed[\s\S]*bottom:/)
  assert.match(layers, /min-width:\s*44px[\s\S]*min-height:\s*44px/)
  assert.equal([...canvas.matchAll(/<CanvasMinimap\b/g)].length, 0)
  assert.equal([...canvas.matchAll(/<CanvasLayers\b/g)].length, 1)
})

test('Layers exposes selection and visibility state by accessible name', () => {
  const layers = readComponent('CanvasLayers.vue')
  assert.match(layers, /:aria-current="selectedCardId === card\.id \? 'true' : undefined"/)
  assert.match(layers, /:aria-label="`\$\{card\.visible !== false \? '隐藏' : '显示'\} \$\{card\.title\}`"/)
  assert.match(layers, /@click="emit\('visibility', \{ id: card\.id, visible: card\.visible === false \}\)"/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test --test-name-pattern='Layers' scripts/personal-os-core.test.mjs`

Expected: FAIL because Layers is a 240px panel, the minimap is a sibling, and mobile uses a top-left popover.

- [ ] **Step 3: Implement 48px rail, 220px overlay, and mobile drawer**

In `CanvasLayers.vue`, import `CanvasMinimap`, accept `cards`, `selectedCardId`, `transform`, `viewport`, and `worldBounds`, and emit `focus`, `visibility`, and `navigate`. Keep `expanded` local because opening chrome must never mutate/persist world geometry.

Use this structure:

```vue
<aside class="canvas-layers" :class="{ 'is-open': expanded }" aria-label="画布图层" data-canvas-control>
  <div class="canvas-layers__rail">
    <button type="button" class="canvas-layers__toggle" :aria-expanded="expanded"
      aria-controls="canvas-layers-panel" aria-label="展开或收起画布图层" @click="expanded = !expanded">图层</button>
    <output :aria-label="`当前显示 ${visibleCount} 个图层`">{{ visibleCount }}</output>
  </div>
  <div id="canvas-layers-panel" class="canvas-layers__panel" :aria-hidden="!expanded">
    <header><strong>LAYERS</strong><button type="button" aria-label="收起画布图层" @click="expanded = false">×</button></header>
    <ol class="canvas-layers__list">
      <li v-for="card in cards" :key="card.id">
        <button type="button" class="canvas-layers__focus"
          :disabled="card.visible === false"
          :aria-current="selectedCardId === card.id ? 'true' : undefined"
          :aria-label="`聚焦 ${card.title}`" @click="emit('focus', card.id)">{{ card.title }}</button>
        <button type="button" class="canvas-layers__visibility"
          :aria-label="`${card.visible !== false ? '隐藏' : '显示'} ${card.title}`"
          :aria-pressed="card.visible !== false"
          @click="emit('visibility', { id: card.id, visible: card.visible === false })">◉</button>
      </li>
    </ol>
    <CanvasMinimap :cards="cards" :transform="transform" :viewport="viewport"
      :world-bounds="worldBounds" @navigate="emit('navigate', $event)" />
  </div>
</aside>
```

When collapsed, make the component `width: 48px`; when open, keep the rail at 48px and place `.canvas-layers__panel` at `left: 48px; width: 220px`. The panel overlays the viewport and must not update transform or viewport measurements.

- [ ] **Step 4: Implement the mobile drawer and embedded minimap**

Add exact CSS behavior:

```css
.canvas-layers { position: fixed; inset: 0 auto 0 0; z-index: 30; width: 48px; }
.canvas-layers__rail { width: 48px; height: 100%; background: #fffdf7; border-right: 1px solid #b9c7db; }
.canvas-layers__panel { position: absolute; top: 0; bottom: 0; left: 48px; width: 220px;
  overflow: auto; border-right: 1px solid #b9c7db; background: #fffdf7; }
.canvas-layers:not(.is-open) .canvas-layers__panel { visibility: hidden; pointer-events: none; }
@media (max-width: 767px) {
  .canvas-layers { position: fixed; inset: auto 0 max(64px, calc(env(safe-area-inset-bottom) + 56px));
    width: 100%; height: 44px; pointer-events: none; }
  .canvas-layers__rail { width: 100%; height: 44px; border: 0; background: transparent; }
  .canvas-layers__toggle { min-width: 44px; min-height: 44px; pointer-events: auto; }
  .canvas-layers__panel { position: absolute; right: 0; bottom: 44px; left: 0; top: auto;
    width: 100%; max-height: min(62dvh, 520px); padding-bottom: env(safe-area-inset-bottom);
    border: 1px solid #b9c7db; border-radius: 16px 16px 0 0; }
}
```

Change `CanvasMinimap.vue` from viewport-positioned chrome to a normal panel child (`position: static; width: 100%`). Keep its native button, keyboard-centering behavior, visible cards, viewport rectangle, and exact supplied `worldBounds` viewBox.

Update `InfiniteCanvas.vue` to pass all five props to `CanvasLayers`, forward `@navigate="navigateToPoint"`, and remove the sibling `<CanvasMinimap>` import/render. The canvas world and bottom navigation must not move when Layers toggles.

- [ ] **Step 5: Run GREEN and complete both fresh reviews**

Run:

```bash
node --test --test-name-pattern='Layers' scripts/personal-os-core.test.mjs
node --test scripts/personal-os-core.test.mjs
```

Expected: all tests PASS. Dispatch a fresh compliance reviewer for 48px default rail, approximately 220px overlay, `aria-expanded/controls`, ordered narrative list, visibility/selection state, embedded minimap, safe-area mobile drawer, and zero world-transform jump. Then use a separate fresh code-quality reviewer; fix findings and rerun both commands.

- [ ] **Step 6: Commit**

```bash
git add scripts/personal-os-core.test.mjs docs/.vitepress/theme/components/CanvasLayers.vue docs/.vitepress/theme/components/CanvasMinimap.vue docs/.vitepress/theme/components/InfiniteCanvas.vue
git commit -m "feat: refine my os layers navigation"
```

### Task 5: Controls, Read-Only Contract, Responsive Accessibility, and Reduced Motion

**Files:**
- Modify: `docs/.vitepress/theme/components/CanvasControls.vue`
- Modify: `docs/.vitepress/theme/components/CanvasCard.vue`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `scripts/personal-os-core.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

- [ ] **Step 1: Write failing complete-controls and read-only contracts**

Append to `scripts/personal-os-core.test.mjs`:

```js
test('canvas controls retain seven named native actions', () => {
  const controls = readComponent('CanvasControls.vue')
  assert.deepEqual([...controls.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1])
    .filter((label) => ['缩小画布', '当前画布缩放比例', '放大画布', '适应全部内容',
      '撤销上一步', '保存画布布局', '恢复默认布局'].includes(label)), [
    '缩小画布', '当前画布缩放比例', '放大画布', '适应全部内容',
    '撤销上一步', '保存画布布局', '恢复默认布局',
  ])
  for (const event of ['zoom-out', 'zoom-in', 'fit', 'undo', 'save', 'reset']) {
    assert.match(controls, new RegExp(`'${event}'`))
  }
  assert.match(controls, /role="group" aria-label="确认恢复默认布局"/)
})

test('system canvas is read-only content with alternate navigation paths', () => {
  const sources = ['InfiniteCanvas.vue', 'CanvasCard.vue', 'CanvasLayers.vue', 'CanvasControls.vue']
    .map(readComponent).join('\n')
  assert.doesNotMatch(sources,
    /contenteditable|<textarea|type="file"|new card|新建|删除卡片|上传|自由连线|createConnection/i)
  assert.match(sources, /aria-label="JuZX OS 无限画布"/)
  assert.match(sources, /aria-describedby="canvas-instructions"/)
  assert.match(sources, /id="canvas-instructions"/)
  assert.match(sources, /聚焦 \$\{card\.title\}/)
  assert.match(sources, /适应全部内容/)
})
```

In `scripts/personal-knowledge-factory.test.mjs`, add these system-only CSS contracts:

```js
for (const source of [
  '@media (max-width: 767px)',
  '@media (prefers-reduced-motion: reduce)',
  'min-width: 44px', 'min-height: 44px',
  'env(safe-area-inset-bottom)',
]) assert.match(os, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
assert.doesNotMatch(os, /bounce|elastic|animation:[^;]*(?:pulse|sparkle|star)/i)
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test --test-name-pattern='canvas controls|read-only' scripts/personal-os-core.test.mjs
npm run test:factory
```

Expected: the new core contract FAILS on the missing instructions/condensed-label structure; the factory suite may additionally fail until responsive selectors are added.

- [ ] **Step 3: Implement complete native controls and mobile-safe chrome**

Keep every `CanvasControls.vue` action as a native button and render concise visible text inside a hideable span while preserving the full accessible name:

```vue
<button type="button" aria-label="缩小画布" @click="emit('zoom-out')">−</button>
<output aria-label="当前画布缩放比例">{{ percentage }}</output>
<button type="button" aria-label="放大画布" @click="emit('zoom-in')">+</button>
<button type="button" aria-label="适应全部内容" @click="emit('fit')"><span>适应</span></button>
<button type="button" aria-label="撤销上一步" :disabled="!canUndo" @click="emit('undo')"><span>撤销</span></button>
<button type="button" aria-label="保存画布布局" @click="emit('save')"><span>保存</span></button>
<button type="button" aria-label="恢复默认布局" @click="requestReset"><span>重置</span></button>
```

Keep the existing explicit reset confirmation; Escape cancels it and focus returns to the reset button. Position controls above the fixed bottom navigation:

```css
.canvas-controls { position: fixed; right: 18px; bottom: max(76px, calc(env(safe-area-inset-bottom) + 68px)); }
.canvas-controls button { min-width: 44px; min-height: 44px; }
@media (max-width: 767px) {
  .canvas-controls { right: 8px; left: auto; max-width: calc(100vw - 64px); overflow-x: auto; }
  .canvas-controls__actions { width: max-content; }
  .canvas-controls output { min-width: 44px; }
  .canvas-controls button span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
}
```

- [ ] **Step 4: Add semantic instructions, gesture ownership, and reduced-motion behavior**

In `InfiniteCanvas.vue`, add a named region and visually hidden instructions without changing the gesture surface:

```vue
<section class="infinite-canvas" aria-label="JuZX OS 无限画布" aria-describedby="canvas-instructions">
  <p id="canvas-instructions" class="infinite-canvas__instructions">
    拖动画布浏览，滚轮或双指缩放；也可通过图层聚焦节点，通过适应按钮恢复全局视图。
  </p>
  <!-- existing viewport and chrome -->
</section>
```

Keep `isInteractiveTarget()` matching `[data-canvas-card], a, button, [data-canvas-control]` so links and controls retain touch/click ownership. Keep connectors `aria-hidden="true"` and DOM order from Task 1. Add a visible `:focus-visible` outline for every card link, layer/control button, and minimap button. Add:

```css
.infinite-canvas__instructions { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (prefers-reduced-motion: reduce) {
  .infinite-canvas, .infinite-canvas *, .canvas-layers, .canvas-controls {
    animation-duration: 1ms !important; animation-delay: 0ms !important;
    transition-duration: 1ms !important; scroll-behavior: auto !important;
  }
}
```

Ensure no fixed chrome causes document overflow: `infinite-canvas` stays `max-width: 100vw; overflow: hidden`, and only `.infinite-canvas__viewport` uses `touch-action: none`.

- [ ] **Step 5: Run GREEN and both fresh reviews**

Run:

```bash
node --test --test-name-pattern='canvas controls|read-only' scripts/personal-os-core.test.mjs
npm run test:factory
```

Expected: both commands PASS. Dispatch a fresh compliance reviewer for all seven controls, reset confirmation, read-only exclusions, native links, 44px targets, semantic landmarks/states, keyboard recovery, touch ownership, safe-area chrome, no horizontal document overflow, and reduced motion under 100ms. Then use a separate fresh code-quality reviewer; resolve findings and rerun both commands.

- [ ] **Step 6: Commit**

```bash
git add scripts/personal-os-core.test.mjs scripts/personal-knowledge-factory.test.mjs docs/.vitepress/theme/components/CanvasControls.vue docs/.vitepress/theme/components/CanvasCard.vue docs/.vitepress/theme/components/InfiniteCanvas.vue
git commit -m "feat: harden my os canvas controls"
```

### Task 6: Lazy Error Boundary, Integration, and Visual System

**Files:**
- Modify: `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue`
- Modify: `docs/.vitepress/theme/components/InfiniteCanvas.vue`
- Modify: `docs/.vitepress/theme/components/CanvasCard.vue`
- Modify: `docs/.vitepress/theme/custom.css`
- Modify: `scripts/personal-os-core.test.mjs`
- Modify: `scripts/personal-knowledge-factory.test.mjs`

- [ ] **Step 1: Write the failing lazy-boundary and visual contract**

Append to `scripts/personal-os-core.test.mjs`:

```js
test('system lazy boundary keeps navigation usable and retries a distinct chunk', () => {
  const home = readComponent('KnowledgeFactoryHome.vue')
  assert.match(home, /class="personal-system-view__error"/)
  assert.match(home, /role="alert"/)
  assert.match(home, />\s*重新加载我的 OS\s*</)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue'\)/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue\?retry=1'\)/)
  assert.equal([...home.matchAll(/<BottomOsNavigation\b/g)].length, 1)
  assert.doesNotMatch(home, /@vite-ignore|location\.reload|<iframe|<object|<embed/i)
})

test('my os visual system is warm dotted paper without forbidden assets', () => {
  const canvas = readComponent('InfiniteCanvas.vue')
  const card = readComponent('CanvasCard.vue')
  const css = readFileSync(new URL('../docs/.vitepress/theme/custom.css', import.meta.url), 'utf8')
  const os = css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? ''
  const system = [canvas, card, os].join('\n')
  for (const token of ['#F7F4EC', '#FFFDF7', '#1E2430', '#69707D', '#315EFB',
    '#F4D758', '#EF7B45', '#3FAE78']) assert.match(system, new RegExp(token, 'i'))
  assert.match(canvas, /background-size:\s*24px 24px/)
  assert.match(canvas, /data:image\/svg\+xml/)
  assert.match(canvas, /--node-order/)
  assert.match(canvas, /calc\(var\(--node-order\) \* 55ms\)/)
  assert.doesNotMatch(system,
    /linear-gradient|radial-gradient|backdrop-filter|\bstars?\b|sparkle|particle|illustration|portrait|<img/i)
})
```

Extend the factory visual test to require `.personal-system-view__error`, `#F7F4EC`, and no forbidden terms inside the Personal OS scoped block.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test --test-name-pattern='system lazy boundary|visual system' scripts/personal-os-core.test.mjs
npm run test:factory
```

Expected: FAIL because the boundary is an unstyled lone button, the canvas is blue, and there is no fixed 24px dot grid or staged node entrance.

- [ ] **Step 3: Implement OS-styled retry boundary and approved visual tokens**

In `KnowledgeFactoryHome.vue`, keep the current request-ID race guard and `systemCanvasLoader.mjs` distinct initial/retry importer identities. Replace only the system loading/error presentation:

```vue
<section v-show="!hydrated || activeView === 'system'" class="personal-system-view"
  aria-label="我的 OS 系统视图" data-os-view="system">
  <component v-if="InfiniteCanvas" :is="InfiniteCanvas" />
  <div v-else-if="systemLoadState === 'loading'" class="personal-system-view__status" role="status">
    正在加载我的 OS…
  </div>
  <div v-else-if="systemLoadState === 'error'" class="personal-system-view__error" role="alert">
    <strong>我的 OS 暂时无法加载</strong>
    <p>其他页面仍可正常使用，你可以重新请求画布模块。</p>
    <button type="button" @click="retrySystem">重新加载我的 OS</button>
  </div>
  <div v-else class="personal-system-view__status" role="status">准备加载我的 OS…</div>
</section>
```

Do not conditionally render or move `BottomOsNavigation`; the fixed navigation must stay after all three view landmarks and outside the error branch.

In the Personal OS block of `custom.css`, add:

```css
.factory-home .personal-system-view { position: fixed; inset: 0; overflow: hidden; background: #F7F4EC; color: #1E2430; }
.factory-home .personal-system-view__status,
.factory-home .personal-system-view__error { position: absolute; inset: 50% auto auto 50%; width: min(420px, calc(100vw - 32px));
  transform: translate(-50%, -50%); border: 1px solid #315EFB; border-radius: 12px;
  padding: 24px; background: #FFFDF7; }
.factory-home .personal-system-view__error button { min-width: 44px; min-height: 44px;
  border: 1px solid #315EFB; background: #315EFB; color: #FFFDF7; }
```

- [ ] **Step 4: Implement the warm paper grid and restrained staged entrance**

Replace the blue `InfiniteCanvas.vue` background with a static repeated 1px dot SVG; this is a grid primitive, not an illustration:

```css
.infinite-canvas { background-color: #f7f4ec; color: #1e2430; }
.infinite-canvas__viewport {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='1' cy='1' r='1' fill='%239AAECC' fill-opacity='.34'/%3E%3C/svg%3E");
  background-size: 24px 24px;
}
.infinite-canvas:not(.is-ready) .canvas-card { opacity: 0; }
.infinite-canvas.is-ready .canvas-card { animation: canvas-node-enter 360ms cubic-bezier(.16, 1, .3, 1) both;
  animation-delay: calc(var(--node-order) * 55ms); }
@keyframes canvas-node-enter { from { opacity: 0; transform: translateY(8px) scale(.995); }
  to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .infinite-canvas:not(.is-ready) .canvas-card { opacity: 1; }
  .infinite-canvas.is-ready .canvas-card { animation: none; }
}
```

In `InfiniteCanvas.vue`, set `ready` in one `requestAnimationFrame` after mount and cancel it before unmount. Bind `:class="{ 'is-ready': ready }"`. Pass `:order="index"` from the canonical `v-for="(card, index) in cards"`. In `CanvasCard.vue`, add numeric prop `order` and include `'--node-order': order` in its existing geometry style object. Do not animate the grid, connectors, status dot, Layers, or controls.

- [ ] **Step 5: Run focused and integration GREEN**

Run:

```bash
node --test --test-name-pattern='system lazy boundary|visual system' scripts/personal-os-core.test.mjs
npm run test:factory
npm run docs:build
```

Expected: focused tests and factory tests PASS; VitePress completes client/server bundles and `Personal OS SSR checks passed.`

- [ ] **Step 6: Complete both fresh reviews**

Dispatch a fresh compliance reviewer for system-only scope, warm paper/dot rhythm, approved tokens, mixed semantic hierarchy, background-before-cards entrance, reduced motion, OS-styled error/retry, distinct retry identity, usable fixed navigation, and every excluded asset/effect. Then use a different fresh code-quality reviewer; resolve findings and rerun all Step 5 commands.

- [ ] **Step 7: Commit**

```bash
git add scripts/personal-os-core.test.mjs scripts/personal-knowledge-factory.test.mjs docs/.vitepress/theme/components/KnowledgeFactoryHome.vue docs/.vitepress/theme/components/InfiniteCanvas.vue docs/.vitepress/theme/components/CanvasCard.vue docs/.vitepress/theme/custom.css
git commit -m "feat: apply my os paper visual system"
```

### Task 7: Desktop/Mobile Browser QA, Release Gates, Reviews, and PR

**Files:**
- Create: `design-qa.md`
- Modify only if QA finds a defect: files introduced or modified in Tasks 1-6

- [ ] **Step 1: Run desktop browser QA at 1440 x 900**

Start `npm run docs:dev -- --host localhost`, open `http://localhost:<port>/#system` with the browser-control skill at `1440 x 900`, clear only `juzx-personal-os-layout-v2`, and verify: warm 24px dot grid; first Fit shows all eleven non-overlapping nodes; JZ identity and four-stage axis dominate; links work; 48px Layers expands to about 220px without transform movement; minimap, pan, pointer-centered zoom, move, bounded resize, hide, focus, Fit, undo, save, and confirmed reset work; navigation remains fixed; console has no new errors/warnings. Save the screenshot path in `design-qa.md`.

- [ ] **Step 2: Run mobile and reduced-motion browser QA at 390 x 844**

At `390 x 844`, clear the v2 key and verify first Fit includes identity plus four timeline nodes, single-touch pan and two-touch pinch work, links remain tappable, the 44px Layers trigger opens a safe-area bottom drawer, controls do not collide with bottom navigation, and `document.documentElement.scrollWidth <= window.innerWidth`. Emulate `prefers-reduced-motion: reduce`; confirm cards/controls appear within 100ms without staged transitions. Force the initial canvas import to reject, confirm the OS error panel and other navigation remain usable, then activate retry and confirm the distinct retry chunk recovers. Record viewport, console result, and screenshots in `design-qa.md` under `Reference`, `Desktop`, `Mobile`, `Reduced motion`, `Failure recovery`, and `Final result` headings.

- [ ] **Step 3: Fix verified defects with RED/GREEN regression tests**

For each P0/P1/P2 finding, first add the smallest failing assertion to `scripts/personal-os-core.test.mjs` or `scripts/personal-knowledge-factory.test.mjs`; run the named test and record the expected failure, apply the minimum in-scope fix, rerun it to PASS, then repeat the affected browser check. Do not change home, knowledge, boot, Worker, wiki, Q&A, or deployment files. `design-qa.md` may state `Final result: passed` only after every P0/P1/P2 item is resolved.

- [ ] **Step 4: Run full release gates and fresh whole-branch reviews**

Run:

```bash
npm test
npx wrangler deploy --dry-run
git diff --check main...HEAD
```

Expected: all Node/factory/theme/content/security tests PASS; VitePress build and SSR audit PASS; Wrangler reports a successful dry run without publishing; `git diff --check` prints nothing. Dispatch a fresh whole-branch compliance reviewer against the approved spec and all seven tasks, then a different fresh code-quality reviewer. Resolve all Important/Critical findings with focused RED/GREEN tests and rerun the complete gates.

- [ ] **Step 5: Commit the verified QA evidence**

```bash
git add design-qa.md scripts/personal-os-core.test.mjs scripts/personal-knowledge-factory.test.mjs docs/.vitepress/theme/components docs/.vitepress/theme/custom.css
git commit -m "test: verify my os UI refinement"
```

Expected: the commit contains only QA evidence and any review/QA fixes; no generated `docs/.vitepress/dist` assets.

- [ ] **Step 6: Push and create or update the feature PR**

Run `git push -u origin feature/my-os-ui-refinement`, then `gh pr view feature/my-os-ui-refinement --json url,state`. If no PR exists, run:

```bash
gh pr create --base main --head feature/my-os-ui-refinement \
  --title "feat: refine my os growth canvas" \
  --body "Refines only 03 我的 OS with the approved growth-axis canvas, strict layout v2, responsive Layers, and verified browser/release gates."
```

Expected: one open PR targeting `main`; do not merge it in this task.
