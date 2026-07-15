# `03 我的 OS` UI Refinement Design

**Date:** 2026-07-14

**Status:** Approved design, ready for implementation planning

**Target:** `#system` / `03 我的 OS` in the VitePress Personal OS homepage
**Reference:** The infinite-canvas view of `https://hiesther.me/`, adapted to JuZX content without copying protected assets

## 1. Context and approved direction

The current `03 我的 OS` view is a functional infinite canvas with draggable and resizable cards, layers, minimap, zoom controls, undo, reset, and local persistence. Its blue surface and uniform cards do not yet reproduce the reference view's document-like spatial hierarchy.

This refinement keeps the existing interaction foundation and changes only the `#system` experience. The user has approved these exact choices:

- **A — warm-white dotted canvas:** use a warm-white workspace with a restrained dot grid, not the blue OS desktop background.
- **C — fused narrative:** personal growth is the primary story; projects and knowledge products branch from that story as evidence and outcomes.
- **C — `JZ` identity mark:** the center anchor combines a `JZ` letter mark and identity card. The identity container is a rounded rectangle, not a portrait or free-floating logo.
- **B — collapsible Layers:** desktop shows a 48 px collapsed Layers rail and an approximately 220 px expanded panel.
- **A — growth-axis layout:** the default composition has a clear reading direction from identity through growth stages, with secondary branches extending from the axis.

## 2. Goals

1. Make the initial viewport explain who JuZX is, how the practice evolved, and what tangible work came from it without requiring the visitor to pan first.
2. Bring the visual rhythm closer to the reference: warm paper, dot grid, mixed card forms, light connectors, generous empty space, fixed chrome, and a readable central path.
3. Preserve the existing canvas behaviors while making Layers, Fit, minimap, persistence, mobile use, and failure handling accurate for the new layout.
4. Keep content configuration-driven, accessible, reduced-motion aware, and compatible with the existing Vue/VitePress architecture.

## 3. Scope and non-goals

Only `03 我的 OS` components, their content model, their pure helpers, their scoped styles, and directly related tests are in scope. The terminal/MacBook launch, `01 主页`, `02 知识库`, bottom navigation, published wiki pages, Q&A, Worker, deployment configuration, and unrelated theme styles remain unchanged.

This work must not add:

- stars, star animation, cursor-avoidance effects, click-generated sparkles, particles, or decorative wallpaper;
- illustrations, character art, personal photographs, or reference-site assets;
- visitor text editing, new-card creation, deletion, upload, or free-form connection creation;
- gradients, glassmorphism, neon glow, heavy shadows, or bounce/elastic motion;
- a new router, state library, UI framework, or animation library.

Visitors may continue to move and resize the predefined cards, change visibility, undo, reset, and save layout. These layout actions must never mutate the canonical site content or connection definitions.

## 4. Information architecture and initial composition

### 4.1 Reading hierarchy

The default view uses one primary growth axis and four supporting branches:

1. **Identity anchor** — the visual and semantic starting point.
2. **Growth axis** — four stages that read in order.
3. **Core story and capability evidence** — explain the principle and accumulated skills beside the axis.
4. **Outcome branches** — project, knowledge, current build, and next direction nodes connect back to the relevant growth stage.

The initial desktop Fit must include this complete composition, with the identity anchor and growth axis visually dominant. Connectors indicate relationships but do not force every card into a single chain.

### 4.2 Canonical first-screen nodes

The content model uses stable IDs and the following initial copy. Labels are exact implementation content, not placeholders.

Coordinates are world-space CSS pixels and form the reset layout. Minimum size is the lower resize bound for that semantic type.

| ID | Type | Visible title/content | Default box `(x, y, w, h)` | Minimum `(w, h)` | Relationship |
| --- | --- | --- | --- | --- | --- |
| `identity` | `identity` | `JZ` / `JuZX` / `MES Product Manager` / `Industrial Digitalization Explorer` / `关注工业数字化、智能制造，以及 AI 在个人工作流中的实践。` | `(120, 360, 360, 260)` | `(300, 220)` | Start of the growth axis |
| `growth-field` | `timeline` | `01 制造现场` / `理解真实业务、流程与协作约束。` | `(560, 340, 240, 160)` | `(220, 140)` | From `identity` |
| `growth-product` | `timeline` | `02 产品实践` / `把业务问题转化为可落地的产品方案。` | `(860, 280, 240, 160)` | `(220, 140)` | From `growth-field` |
| `growth-system` | `timeline` | `03 工业数字化` / `连接生产、物资、质量、焊接和设备业务。` | `(1160, 340, 260, 170)` | `(220, 140)` | From `growth-product` |
| `growth-ai` | `timeline` | `04 AI 工作流` / `把知识、检索和 Agent 变成持续使用的系统。` | `(1500, 270, 260, 170)` | `(220, 140)` | From `growth-system` |
| `core-story` | `principle` | `CORE STORY` / `从真实问题出发，在项目中验证，再把经验沉淀为可复用的知识。` | `(780, 570, 340, 190)` | `(280, 160)` | Supports `growth-product` and `growth-system` |
| `capabilities` | `skills` | `CAPABILITIES` / `产品规划` / `工业数字化` / `知识工程` / `AI 工作流` | `(1180, 600, 380, 180)` | `(320, 160)` | Supports `growth-system` and `growth-ai` |
| `project-archive` | `project` | `PROJECT ARCHIVE` / `MES 与工业数字化项目实践` / `查看项目档案 →` | `(1190, 850, 340, 190)` | `(280, 170)` | Outcome of `growth-system` |
| `knowledge-products` | `knowledge` | `KNOWLEDGE SYSTEM` / `LLM Wiki` / `Finance Wiki` / `知识问答` / `llm-wiki Skill` | `(1830, 500, 400, 260)` | `(340, 220)` | Outcome of `growth-ai`; each available destination is a native link to its existing route |
| `current-build` | `status` | `CURRENT BUILD` / `Personal Digital Factory` / `持续构建中` | `(1740, 850, 320, 170)` | `(280, 150)` | Branch from `growth-ai` |
| `next-direction` | `next` | `NEXT` / `持续学习、构建和记录，让个人系统保持演进。` | `(1900, 240, 300, 150)` | `(250, 140)` | Continuation after `growth-ai` |

The connection configuration may contain only IDs present in the node model. A hidden node also hides every connector attached to it.

### 4.3 Spatial arrangement

- The identity anchor begins near the left-center of the default world, clear of the 48 px Layers rail.
- The four growth stages form a left-to-right, gently stepped axis rather than a rigid card grid.
- `core-story` sits below the early/middle stages; `capabilities` sits below the later stages.
- `project-archive` branches from industrial digitalization. `knowledge-products`, `current-build`, and `next-direction` branch from AI workflow.
- Cards must not overlap at the default geometry. Connectors must remain legible at initial Fit, and the composition must preserve generous blank space.
- The bottom navigation and canvas chrome are fixed to the viewport and never participate in world transforms.

## 5. Visual system

### 5.1 Canvas and chrome

- Canvas base: `#F7F4EC`.
- Dot grid: low-contrast blue-gray 1 px dots at a 24 px rhythm; dots remain subtle at every supported zoom level and never animate.
- Primary ink: `#1E2430`; secondary ink: `#69707D`.
- Primary blue: `#315EFB`; yellow: `#F4D758`; orange: `#EF7B45`; status green: `#3FAE78`.
- Cards use `#FFFDF7` where a paper surface is needed. Separation comes from keylines and surface color; cards have no box shadow.
- System labels, IDs, zoom values, and short English headings use the existing JetBrains Mono fallback stack. Chinese body copy uses the existing Chinese sans-serif stack.

### 5.2 Card variants

`CanvasCard` renders by semantic `type`; it must not reduce the composition to one repeated generic card.

| Type | Visual behavior |
| --- | --- |
| `identity` | Largest anchor; `JZ` mark and identity copy share a rounded rectangle with a 16 px radius, blue keyline, and clear internal hierarchy. No photo. |
| `timeline` | Compact vertical milestone with number, stage title, description, and blue/yellow timeline marker. |
| `principle` | Warm paper note with restrained yellow accent and editorial quote-like typography, not handwriting-dependent. |
| `skills` | Light information panel with individually readable capability chips; chips are labels, not controls. |
| `project` | Archive-style card with blue edge marker and one native route action. |
| `knowledge` | Grouped knowledge card with four distinct native links; link focus and hover states remain visible. |
| `status` | Compact blue-tinted status card with a green status indicator and no pulsing animation. |
| `next` | Small continuation note with an orange accent, visually lighter than completed outcomes. |

Selection uses a visible blue outline without shifting geometry. Hover feedback is limited to border/opacity changes. Resizing retains sensible type-specific minimum sizes so copy and actions cannot be clipped at the smallest permitted geometry.

## 6. Interaction model

### 6.1 Initial entry and transform

- On the first visit with no valid `v2` layout, wait until the viewport has a real size, compute dynamic bounds, and Fit the approved default composition into the usable viewport.
- A valid `v2` saved layout restores its saved transform instead of being overwritten by automatic Fit.
- Blank-area pointer drag pans. Wheel zoom remains centered on the pointer. On touch, one blank-area finger pans and two fingers pinch around the gesture center.
- Card drag and bounded resize remain available. Starting a card gesture selects and raises it. Cancelling restores the gesture-start geometry atomically.
- Fit, reset, undo, and save remain explicit actions. Reset restores the new default node geometry, visibility, stacking, and fitted transform after confirmation.

### 6.2 Dynamic world bounds

World bounds are recomputed from the current geometry of **visible** cards after movement, resize, visibility change, reset, and restored persistence. Fit and minimap always consume the same computed bounds; neither may use a frozen default rectangle.

- Add consistent world padding around the measured union so edge cards are not flush against chrome.
- Hidden cards and their connections do not enlarge the bounds.
- If every card is hidden, fall back to the canonical default bounds rather than producing zero/invalid dimensions.
- Viewport fitting accounts for the collapsed desktop rail, bottom navigation, controls, and safe-area insets.

### 6.3 Layers, minimap, and controls

On desktop, Layers is fixed at the left edge:

- collapsed state: 48 px rail with a labelled expand control and compact group/visibility affordances;
- expanded state: approximately 220 px panel with heading, ordered node list, selection, visibility controls, and the minimap at the bottom;
- expansion overlays the canvas instead of changing world coordinates or causing a transform jump;
- the toggle exposes `aria-expanded` and references the panel with `aria-controls`.

Layer focus selects the card and centers it without altering card geometry. The minimap represents every visible card plus the current viewport and supports pointer and keyboard activation to navigate. The right-bottom controls retain zoom out, percentage, zoom in, Fit, reset, undo, and save. Their labels may condense on narrow screens, but their accessible names remain complete.

## 7. Responsive behavior

### Desktop

- At 1280 px and wider, the full growth axis is visible after first Fit and remains clear of fixed chrome.
- The collapsed Layers rail is the default. Expanding it does not reflow cards or move the bottom navigation.
- Controls remain in the lower right and the bottom three-part OS navigation remains centered above canvas content.

### Mobile

- The canvas metaphor is preserved; the page must not become an unrelated vertical card feed.
- Layers becomes a bottom drawer rather than a 48 px side rail. The closed drawer exposes one 44 x 44 px minimum trigger; the open drawer contains the node list and minimap and respects bottom safe-area insets.
- Controls show only essential visible labels while retaining zoom out/in, Fit, reset, undo, and save through accessible buttons. No control or drawer may collide with the fixed bottom navigation.
- On a first mobile visit without valid `v2` storage, Fit the primary story group (`identity` plus the four `timeline` nodes). Outcome branches remain reachable through pan, Layers focus, and minimap.
- Single-touch pan, two-touch pinch, native link tapping, and card selection must not steal ownership from one another. No horizontal document overflow is allowed.

## 8. Accessibility and reduced motion

- `03 我的 OS` remains a named region. Layers, minimap, controls, and bottom navigation retain distinct semantic landmarks or groups.
- Every control is a native button/input/link with a specific accessible name and a visible `:focus-visible` treatment. Pointer dragging is never the only path to content: Layers can focus any visible node, Fit recovers the layout, and card actions use native links.
- Layer visibility controls expose both card name and current state. Selected layer/card state uses `aria-current` or an equivalent state, not color alone.
- The visual connection SVG is hidden from assistive technology; the DOM/card order follows the growth narrative so reading order remains meaningful without the lines.
- Interactive targets are at least 44 x 44 CSS px on touch layouts. Text and focus indicators meet WCAG AA contrast against their actual surfaces.
- With `prefers-reduced-motion: reduce`, cancel staged node fade-ins, animated panel/drawer transitions, transform smoothing, and decorative hover transitions. State changes complete directly or within 100 ms. Dot grid and status indicator remain static.

## 9. Component boundaries and data flow

| Component/module | Responsibility |
| --- | --- |
| `KnowledgeFactoryHome.vue` | Preserve hash routing and lazy loading; continue to host the system loading/error/retry boundary only. |
| `InfiniteCanvas.vue` | Own cards, transform, selection, stacking, history, gesture orchestration, current dynamic bounds, initial Fit, storage load/save, and composition of canvas chrome. |
| `CanvasCard.vue` | Render the approved semantic variants and emit selection/geometry gesture events; never own canonical content or persistence. |
| `CanvasConnections.vue` | Derive visible connectors from current card geometry and configured relationships. |
| `CanvasLayers.vue` | Own collapsed rail/expanded panel and mobile drawer presentation; emit focus and visibility intent. |
| `CanvasMinimap.vue` | Render visible card bounds and viewport from the bounds supplied by `InfiniteCanvas`; emit navigation intent. On desktop it is presented inside the expanded Layers panel. |
| `CanvasControls.vue` | Emit zoom, Fit, reset, undo, and save intent and own reset confirmation UI. |
| `personalOsContent.mjs` | Single source of truth for immutable node copy, semantic types, default geometry/minimum size, accents, routes, groups, and relationships. |
| `canvasGeometry.mjs` | Pure transform, touch, connection, dynamic-bounds, padding, and Fit calculations. |
| `canvasPersistence.mjs` | Strict `v2` serialization/parsing and silent storage access. |
| `canvasHistory.mjs` | Bounded immutable layout history; no content history. |

The content model flows into `InfiniteCanvas`, which creates mutable layout copies. Child components receive derived props and emit user intent upward. Only `InfiniteCanvas` commits layout/history/persistence changes. Canonical `type`, copy, links, relationship endpoints, and minimum sizes are always reattached from trusted configuration when saved geometry is restored.

## 10. Persistence, failures, and recovery

- Use a new key, `juzx-personal-os-layout-v2`, with envelope version `2`.
- Do not read, migrate, overwrite, or delete `juzx-personal-os-layout-v1`; this prevents an old layout from displacing the approved new default.
- Persist only trusted node IDs, finite position/size, visibility, and finite clamped transform. Do not persist copy, routes, type, accent, connections, or visitor-supplied data.
- Reject the complete saved layout if its version, node set, duplicate IDs, numbers, dimensions, or transform are invalid. Recover silently to the new default and initial Fit; never partially apply corrupt geometry.
- Storage denial, quota failure, and parse failure are non-fatal and create no uncaught exception or noisy console output.
- If the lazy `InfiniteCanvas` import fails, the `#system` region displays a warm-white OS-styled error panel with a clear `重新加载我的 OS` button. The fixed three-view navigation remains usable, and retry uses the existing distinct retry module identity rather than replaying a cached failed import.

## 11. Verification and acceptance

Implementation is complete only when all of the following are verified:

1. The first `03 我的 OS` visit shows the warm-white dot grid and automatically Fits the approved growth-axis composition.
2. `JZ` plus the identity copy appears in one rounded rectangular anchor; no photo, illustration, stars, or sparkle behavior exists.
3. All eleven canonical nodes and only valid configured connections render, with DOM order matching the narrative.
4. Identity, timeline, principle, skills, project, knowledge, status, and next cards are visually distinct and remain readable at their minimum sizes.
5. Desktop Layers defaults to a 48 px rail, expands to approximately 220 px without moving the world, and contains the minimap; mobile uses a safe-area-aware bottom drawer.
6. Drag, bounded resize, pan, pointer-centered wheel zoom, touch pan/pinch, layer focus/visibility, minimap navigation, Fit, undo, save, and reset remain functional.
7. Dynamic bounds follow current visible geometry after move, resize, hide, reset, and restore. Fit and minimap use the same bounds; hiding every node safely uses default bounds.
8. First entry uses automatic Fit, while a valid `v2` layout restores without being overwritten. `v1` is ignored and malformed `v2` data fails closed.
9. A forced lazy-import failure shows the error panel, retry can recover, and other OS views remain usable.
10. Keyboard focus, native links/buttons, accessible names/states, 44 px mobile targets, semantic reading order, and visible focus indicators pass accessibility inspection.
11. Reduced-motion mode removes staged/long transitions without removing content or controls.
12. At 1440 x 900 and 390 x 844, fixed chrome does not cover required content, the document has no horizontal overflow, and the local result matches the approved reference structure with the stated content and asset exclusions.
13. Unit/contract tests cover exact node/type/link configuration, valid relationships, forbidden assets/features, dynamic/empty bounds, Fit/minimap consistency, Layers rail/drawer states, strict `v2` persistence, storage failure, lazy failure/retry, reduced motion, and responsive rules.
14. The complete existing `npm test`, VitePress production build, and `npx wrangler deploy --dry-run` pass with no new browser console errors or warnings.

Visual QA compares the reference and local implementation at matching viewports, but fidelity excludes reference copy, portraits, illustrations, stars, decorative character assets, and visitor authoring tools. P0, P1, and P2 visual or interaction regressions must be resolved before merge.
