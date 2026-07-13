# JuZX Full Personal OS Clone Design

**Date:** 2026-07-13  
**Status:** Approved design, awaiting written-spec review  
**Target:** Replace the current static Personal OS homepage on `feature/personal-os-static`  
**Reference:** `https://hiesther.me/#home`

## 1. Context

The current branch implements a static warm-white Personal OS composition after the existing terminal splash. The approved direction replaces that composition with a faithful recreation of the reference site's interaction architecture, adapted to AI 纪元 content and the existing VitePress/Vue codebase.

The reference was inspected in a live browser at desktop and 390 x 844 mobile sizes. Its public implementation is a single HTML application with inline CSS and JavaScript. It uses a hash router for three top-level views, a terminal-to-MacBook zoom transition, an interactive desktop, a conventional long-form secondary page, and a separately loaded infinite-canvas document. The new implementation must reproduce those behaviors, not copy the reference's source files or branded assets.

## 2. Goals

1. Recreate the complete journey: terminal introduction, MacBook launch, full-screen OS desktop, knowledge page, and infinite canvas.
2. Replace all reference content with AI 纪元 destinations and JuZX identity.
3. Preserve the existing VitePress routes, knowledge publishing pipeline, search, theme infrastructure, Q&A behavior, and Worker contracts.
4. Provide working desktop icons, movable/resizable windows, hash navigation, touch support, reduced-motion handling, and persisted canvas layout.
5. Keep implementation modular and testable within the existing Vue theme instead of reproducing the reference's monolithic HTML.

## 3. Non-goals and asset policy

- Do not copy the reference site's personal illustration, logo, character, photographs, prose, or other branded assets.
- Do not include stars, star animations, cursor avoidance, click-generated sparkles, or a decorative character illustration.
- Do not add visitor-facing canvas text editing, new-card creation, image upload, or content deletion.
- Do not change generated wiki content, retrieval logic, quotas, deployment bindings, or unrelated documentation pages.
- Do not introduce React, Three.js, GSAP, Framer Motion, a new state library, or a new UI framework.
- Do not hotlink reference assets.

The desktop background is intentionally a plain blue field. Its spatial hierarchy comes from the menu bar, icons, open windows, and bottom navigation rather than decorative wallpaper.

## 4. Top-level information architecture

The homepage owns three hash-selected views:

| Hash | Label | Purpose |
| --- | --- | --- |
| `#home` | `01 主页` | Terminal launch, JuZX OS desktop, and scroll-driven exit sequence |
| `#knowledge` | `02 知识库` | Conventional long-form overview of the site's knowledge products |
| `#system` | `03 我的 OS` | Interactive infinite canvas of personal experience, skills, projects, learning, and knowledge relationships |

Unknown or missing hashes resolve to `#home`. Hash changes update the active view and bottom-navigation state without a full page reload. Switching views resets that view to its intended starting position. The infinite canvas mounts lazily the first time `#system` is selected.

Existing routes remain authoritative destinations:

- `/wiki/` — LLM Wiki
- `/finance/` — Finance Wiki
- `/ask/` — retrieval-based knowledge Q&A
- `/llm-wiki/` — LLM Wiki Skill guide
- `/about` — author/site context
- the public LLM Wiki Skill GitHub repository

## 5. Home journey

### 5.1 Terminal and MacBook state

The initial home view presents a centered MacBook frame on a warm off-white background. The screen contains a terminal with JuZX-specific lines, including identity, the site's purpose, and the command that opens JuZX OS. The terminal uses data-driven lines rather than hard-coded timed DOM fragments.

The interaction has explicit states:

1. `typing` — terminal lines appear in sequence on the first visit in the session.
2. `ready` — the launch affordance is visible and Enter/click can start.
3. `launching` — input is locked; a 12-cell progress line advances.
4. `zooming` — the MacBook screen scales to cover the viewport.
5. `desktop` — the hero is removed from interaction and the OS desktop is active.

Only Enter, the visible launch control, or a click on the MacBook/launch affordance triggers launch. Re-entry is guarded. Interactive controls elsewhere must not be hijacked.

### 5.2 Session behavior

The existing key `personal-site-accessed` remains the session contract. After successful entry, it stores `true` in `sessionStorage`. During the same browser-tab session, revisiting or refreshing skips line-by-line typing and lands on the desktop through a short transition. Storage access is wrapped in error handling; failure must not break or hide the site.

With `prefers-reduced-motion: reduce`, typing, progress animation, and screen zoom are skipped. The desktop becomes available in no more than 100 ms and all interaction remains usable.

### 5.3 Screen-through transition

On launch, the component measures the MacBook screen and viewport. It computes a cover scale using the larger of viewport-width/screen-width and viewport-height/screen-height, then translates the MacBook so the screen center aligns with the viewport center. A short solid overlay hides the swap from hero to desktop. No bounce, rotation, or decorative particles are used.

### 5.4 Exit sequence

Below the desktop is a tall scroll section with a sticky viewport. Scrolling down reverses the screen metaphor: a full-screen blue panel scales down into a MacBook, then reveals a JuZX terminal goodbye state. The calculation is driven by normalized scroll progress inside `requestAnimationFrame` and uses three deterministic phases. Reduced-motion users receive a static closing section.

## 6. JuZX OS desktop

### 6.1 Surface

- Background: `#2B7FD8`.
- Top menu bar: 30 px, sticky, same blue with slight opacity.
- Surface height: `calc(100dvh - 30px)` with a `100vh` fallback.
- Desktop overflow is clipped; windows and icons must be constrained so they cannot become permanently unreachable.
- No stars, wallpaper animation, illustration, or decorative sticker.

The menu bar contains `JuZX OS`, `About`, `Knowledge`, `Now`, and a local `HH:mm` clock. Text is compact and the brand receives the yellow accent `#F4D758`.

### 6.2 Desktop entries

The initial desktop provides these configurable entries:

1. LLM Wiki
2. Finance Wiki
3. 知识问答
4. llm-wiki Skill
5. AI 实验
6. 项目档案
7. 关于我
8. 联系方式
9. GitHub
10. 网站更新记录

Entries are defined in one typed/configured data source. Each entry declares its label, icon asset, initial position, and either a window template or external/internal URL.

Desktop icons are absolutely positioned in a right-side multi-column arrangement on wide screens. Pointer dragging converts the initial right-based placement to left/top coordinates. Movement beyond four CSS pixels counts as a drag; a double-click without a drag opens the entry. Touch uses a clear single-tap open affordance because mobile has no reliable double-click convention.

Icons use real icon assets or an installed icon library. Folder and document graphics must not be approximated with emoji, CSS drawings, or copied reference assets.

### 6.3 Window manager

Opening an entry creates a window instance from local content configuration:

- a compact title/chrome region;
- close control;
- invisible/visible drag region;
- body content;
- external-open action for every route-backed window;
- bottom-right resize handle.

New windows cascade from a stable base point. Opening an existing singleton window raises it rather than duplicating it. Pointer-down raises the active window through a monotonically increasing z-index. Dragging and resizing disable iframe pointer events for the duration of the gesture. Minimum dimensions are 280 x 200 px; maximum position and size are constrained to the current surface. Mobile windows open within an inset viewport and remain fully closable.

Knowledge destinations display a concise local preview with a native link to the full VitePress route. They do not embed VitePress pages in iframes; this keeps navigation, accessibility, mobile behavior, and document ownership predictable.

## 7. Knowledge view

`#knowledge` uses ordinary document flow rather than the desktop metaphor. It adapts the reference's long-form portfolio rhythm to this site's real content:

1. JuZX/AI 纪元 headline and concise system description.
2. LLM Wiki overview and entry link.
3. Finance Wiki overview and entry link.
4. Knowledge Q&A explanation and primary action.
5. LLM Wiki Skill principles, construction workflow, website guide, and GitHub link.
6. Recent updates and category links.

The bottom pill navigation remains fixed. Content uses the site's existing readable Chinese sans-serif stack, with Caveat/Fira Code-like roles limited to short display and system labels. Remote fonts are not required unless already approved and cached by the project.

## 8. Infinite canvas view

### 8.1 Layout

`#system` lazily mounts a full-viewport `InfiniteCanvas` surface containing:

- fixed top toolbar;
- fixed left layer panel;
- transformable canvas world;
- connection layer;
- left-bottom minimap;
- right-bottom zoom controls;
- bottom pill navigation above all canvas UI.

The initial canvas data describes personal identity, experience timeline, skills, projects, current learning, LLM Wiki, Finance Wiki, Q&A, and AI experiments. Cards and relationships are configuration-driven.

### 8.2 Transform model

The canvas stores `scale`, `panX`, and `panY`. The world uses:

```text
translate(panX, panY) scale(scale)
```

The scale range is 0.15 to 3.0. Wheel zoom is centered on the pointer, preserving the world coordinate under the cursor. Zoom buttons operate around the viewport center. `Fit` computes a scale and offset from the configured canvas bounds. Grid size and minimap viewport update from the same transform state.

Blank-area mouse drag pans. Single-touch blank-area drag pans. Two-touch distance changes scale around the gesture center. Gestures use non-passive listeners only where preventing browser scrolling is necessary.

### 8.3 Cards, layers, and persistence

Cards can be selected, raised, dragged, and resized. The layer list focuses the corresponding card and toggles its visibility. A minimap displays card bounds and the current viewport; clicking it navigates the canvas. Connections update after any card move or resize.

An undo stack of at most 50 entries records card movement, resize, visibility, and layout reset. Visitors can restore the default layout. The current layout is serialized to a versioned localStorage key, containing only card identifiers, positions, sizes, visibility, and canvas transform. Invalid or outdated data is ignored safely. Site content itself is never persisted from visitor input.

## 9. Responsive behavior

### Desktop

- Reproduce the spacious desktop composition with right-aligned icons and independently movable windows.
- The bottom navigation remains centered and clear of window resize handles.
- Knowledge view uses a readable centered column.
- Infinite canvas shows the full layer panel and minimap.

### Mobile at 390 x 844

- Preserve the OS metaphor rather than switching to a generic card list.
- Desktop icons use 68 px slots and 42 px icon art in a two- or three-column right-side arrangement.
- Menu bar hides nonessential labels before it overflows.
- A tap opens an icon; dragging remains available through deliberate movement.
- Windows fit within safe insets and expose close/open controls of at least 44 x 44 CSS pixels.
- Infinite canvas keeps touch pan/pinch. The layer panel becomes collapsible so the canvas is not reduced to an unusably narrow strip.
- No horizontal page overflow is allowed.

## 10. Accessibility and failure handling

- Bottom navigation is a labelled native navigation landmark with native buttons or anchors and visible active state.
- Desktop entries are keyboard focusable and support Enter/Space opening in addition to pointer behavior.
- Window focus order follows creation order; close and external-open controls have specific accessible names.
- Dragging is not the only way to reach content. Reset-position and direct-route actions remain available.
- The launch status uses one polite live region rather than announcing every typed character.
- All animations honor reduced motion; no content flashes.
- A failed icon asset falls back to an accessible text label, not a broken invisible action.
- A failed lazy canvas import shows a retryable error panel while the other two views remain functional.
- Browser storage errors are silent fallbacks and create no console error.

## 11. Component boundaries

| Component/module | Responsibility |
| --- | --- |
| `KnowledgeFactoryHome.vue` | Compose the three views and own hash routing only |
| `MacbookBoot.vue` | Terminal lines, progress, session state, zoom handoff |
| `DesktopSurface.vue` | Menu bar, desktop geometry, configured entries |
| `DesktopIcon.vue` | Icon rendering, keyboard open, drag/tap/double-click distinction |
| `WindowManager.vue` plus state helper | Window creation, singleton lookup, focus, drag, resize, constraints |
| `KnowledgePortfolio.vue` | Long-form knowledge overview and real route links |
| `InfiniteCanvas.vue` | Pan/zoom/touch orchestration and lazy canvas shell |
| `CanvasLayers.vue` | Layer navigation and visibility |
| `CanvasMinimap.vue` | World/card overview and viewport navigation |
| `CanvasControls.vue` | Zoom in/out/fit, undo, save/reset actions |
| `personalOsContent.mjs` | Desktop entries, knowledge sections, canvas cards, links, and relationships |
| pure `.mjs` helpers | Geometry, transform math, bounds, session/storage parsing |

Existing theme files are reused where their responsibilities remain valid. Static-card components with no remaining imports are removed only after their replacements are integrated and tested. Unrelated theme and documentation code remains untouched.

## 12. Verification and acceptance

The implementation is complete only when all of the following pass:

1. First session visit shows the JuZX MacBook terminal and accepts Enter/click launch.
2. Repeated input cannot trigger launch twice.
3. Screen zoom lands on a plain blue desktop without stars or illustration.
4. Same-session refresh skips the full typing sequence.
5. Hash navigation switches among home, knowledge, and system and updates the pill state.
6. Every configured desktop entry is keyboard/touch accessible and reaches the intended window or route.
7. Icons and windows drag correctly; windows close, resize, raise, and remain recoverable.
8. Knowledge view links to all four real knowledge products and recent content.
9. Infinite canvas pans, zooms around the pointer, pinches on mobile, fits, updates layers/minimap/connections, undoes, saves, and resets.
10. Invalid storage data and a failed lazy canvas load do not break the homepage.
11. Desktop and 390 x 844 mobile screenshots match the approved reference structure, with the explicit no-stars/no-illustration adaptations.
12. Reduced-motion mode is fully usable without long transitions.
13. Browser console has no new errors or warnings.
14. `npm test`, the VitePress build, and `npx wrangler deploy --dry-run` pass.

Visual QA compares the live reference and the local implementation at matching viewports and states. P0, P1, and P2 mismatches must be resolved before handoff. Reference content and protected assets are excluded from fidelity comparison.
