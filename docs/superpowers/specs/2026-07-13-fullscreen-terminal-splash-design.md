# Fullscreen Terminal Splash Design

**Date:** 2026-07-13

**Status:** Approved direction, ready for implementation planning

**Scope:** Homepage `/` only (方案 A)
**Brand:** AI 纪元

## 1. Context

The personal knowledge factory homepage introduced by PR #19 already has the correct durable information architecture: one semantic homepage, four real knowledge modules, recent updates, and links into the existing VitePress site. Its current `FactoryBoot` is an optional inline panel inside the hero. The new direction replaces that inline interaction with a restrained full-viewport terminal splash shown once per browser-tab session when the homepage is loaded directly.

This is a replacement of the current `FactoryBoot` presentation and state contract, not an additional boot layer. There must never be both an inline boot panel and a full-screen splash in the rendered homepage.

The splash is a progressive enhancement. The complete homepage remains server-rendered behind it, all four modules remain unchanged, and failure of client JavaScript, storage, or motion APIs must reveal ordinary homepage content rather than leave an access gate on screen.

## 2. Goals

1. Give the direct first visit to `/` a quiet, full-screen terminal entry moment that belongs to the AI 纪元 identity.
2. Accept exactly three entry paths: `Enter`, the centered native button, or a tap/click anywhere on the splash.
3. Prevent repeated input from restarting timers or producing duplicate state transitions.
4. Fade the splash out in 400 ms, remove it from the DOM, then fade the homepage in over 600 ms.
5. Suppress the splash for the remainder of the current tab session with the exact `sessionStorage` pair `personal-site-accessed=true`.
6. Avoid server-rendering and hydration flashes for both first-time and returning direct homepage visits.
7. Keep the homepage readable when JavaScript is disabled or its client bundle fails before hydration.
8. Preserve keyboard focus, reduced-motion behavior, mobile touch access, and all existing VitePress routes and content.

## 3. Non-goals

This change will not:

- redesign the personal knowledge factory homepage, its four modules, recent log, factory notes, navigation, or copy;
- change `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/topics/`, notes, about pages, search, sidebars, or Worker behavior;
- show the splash on any route other than `/` or the equivalent direct `/index.html` request;
- turn the splash into authentication, authorization, a durable access gate, or a multi-step boot simulation;
- retain or restyle the current inline `启动知识系统` / `跳过启动` controls;
- add loading percentages, fake archive/network activity, sound, typewriter text, extra terminal commands, or replay controls;
- add a second splash component alongside `FactoryBoot`;
- add a new framework, animation library, font package, browser-test dependency, or other runtime dependency;
- add a new dark-mode treatment. The splash uses its specified fixed light palette even when the existing site preference is dark; the underlying site theme remains unchanged;
- change the established VitePress theme registration or replace `DefaultTheme`;
- promise a no-flash first splash after client-side navigation from another route. If no document-head preflight marker exists, a client-side arrival at `/` shows the homepage immediately rather than mounting the splash late.

## 4. Exact content and visual system

### 4.1 Copy

The splash contains only these visible text elements:

```text
JuZX@digital-factory ~ zsh

> Press Enter to Access System_
```

The underscore is a separate decorative cursor node, not part of the button's accessible name. The centered activation control is a native `<button type="button">` with the exact accessible name:

```text
进入个人网站
```

Its visible command text is exactly:

```text
> Press Enter to Access System
```

The separate cursor uses `_` and `aria-hidden="true"`. The button uses `aria-label="进入个人网站"`; assistive technology must not receive the English prompt followed by a repeatedly announced blinking character.

No other status, instruction, skip button, progress line, or brand slogan appears on the splash.

### 4.2 Color

The splash has a fixed, opaque palette:

```css
background: #F7F4EC;
color: #1E2430;
```

The centered button, top-left shell label, visible focus indicator, and cursor derive from these two colors. The overlay does not become translucent, reveal the homepage beneath it, use gradients, glow, scan lines, shadows, or acquire a `.dark` override.

The contrast between `#1E2430` and `#F7F4EC` is sufficient for normal text. The focus indicator must remain visibly distinct through shape and offset, not color alone.

### 4.3 Typography

All splash text and controls use exactly this local/system monospace stack:

```css
font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
```

No web-font request is added. If neither named font is installed, `Consolas` or the generic monospace fallback is accepted. The splash must not inherit the homepage serif display title or VitePress body stack.

### 4.4 Motion

- Cursor blink: CSS-only, approximately 800 ms per cycle. JavaScript does not schedule cursor frames.
- Splash exit: opacity transition lasting exactly 400 ms.
- Homepage entrance: opacity transition/animation lasting exactly 600 ms.
- Both use `cubic-bezier(0.16, 1, 0.3, 1)`.
- The phases are sequential: the 400 ms splash fade completes, the overlay is removed from the DOM, and only then does the 600 ms homepage fade begin.
- No transform, scale, blur, typing, stagger, or parallax accompanies either fade.

## 5. Full-screen layout

`FactoryBoot` becomes a fixed overlay above the VitePress navigation and homepage:

```css
position: fixed;
inset: 0;
width: 100%;
min-height: 100vh;
height: 100dvh;
min-height: 100dvh;
```

The `100vh` declaration is the compatibility fallback; the later `100dvh` declarations account for dynamic mobile browser chrome. The overlay has a dedicated z-index higher than existing VitePress navigation, covers the complete viewport, clips its own overflow, and prevents background scrolling while active.

`FactoryBoot` moves out of `.factory-hero`. `KnowledgeFactoryHome.vue` renders it as a sibling immediately before the existing `<main class="factory-home">`. This prevents an ancestor that is hidden for entrance motion from hiding the splash itself and removes the obsolete inline boot footprint from the hero.

### 5.1 Desktop

At widths `>= 640px`:

- the top-left shell label is placed 32–48 px from the viewport edges;
- its font size is 14–16 px;
- the activation button is centered on both viewport axes;
- its visible command text is 16–20 px;
- text remains on one line when it fits, without using a fixed pixel width;
- the cursor aligns to the command baseline without changing the button's centered geometry as it blinks.

Fluid `clamp()` values within those approved ranges are preferred over extra breakpoints.

### 5.2 Mobile

At widths `< 640px`:

- viewport edge spacing reduces to 20–24 px;
- the top-left label and centered command shrink proportionally while remaining legible;
- the command may wrap as a centered block if required, but never causes horizontal scrolling or clipping;
- the centered button retains at least a 44 by 44 CSS-pixel hit area;
- tapping any non-interactive point in the overlay activates entry, including the top-left label, command text, cursor area, and empty background;
- `touch-action: manipulation` is used to avoid unnecessary gesture delay without disabling browser accessibility zoom.

There is no hover-only behavior. Hover styling, if any, may only reinforce the same button affordance available to touch and keyboard users.

## 6. Interaction and input lock

### 6.1 Accepted input

While the splash is in its initial interactive state:

1. Pressing `Enter` activates entry.
2. Activating the centered native button by click, Enter, or Space activates entry.
3. Clicking or tapping anywhere else on the overlay activates entry.

The overlay click handler ignores an event originating from the button because the button's native handler owns that activation. A single state guard owns all paths. The first accepted activation atomically changes the state from `ready` to `leaving`; every subsequent click, touch-generated click, repeated Enter, key repeat, composing-key event, or timer callback becomes a no-op.

The global key handler:

- exists only while the active homepage splash is ready;
- accepts plain, non-repeating `Enter` only;
- rejects composing input and Meta, Control, Alt, or Shift modifiers;
- does not double-handle Enter when focus is already on the native button;
- is removed as soon as input locks and is also removed during component cleanup.

No global touch listener is needed. A normal overlay click handler covers mouse clicks and synthesized touch clicks while preserving native button behavior.

### 6.2 Focus

- On a genuine first direct homepage visit, after hydration confirms that the splash is active, focus the centered button with `focus({ preventScroll: true })`.
- Show a clear `:focus-visible` outline with at least 2 px width and adequate offset.
- While the overlay is active, keyboard navigation must not move focus to covered VitePress navigation or homepage links. Tab and Shift+Tab keep focus on the sole splash button; this is a bounded one-control focus loop, not a reusable dialog framework.
- Do not steal focus on returning-session, reduced-motion, storage-failure, client-navigation, or JavaScript-fallback paths where the splash is not shown.
- Once the overlay has faded and been removed, focus the existing homepage `h1` (`#factory-title`) with a temporary/programmatic `tabindex="-1"` and `preventScroll: true`. Focus transfer occurs before or at the start of the homepage fade so keyboard and screen-reader users arrive at meaningful content.
- Cleanup must not restore focus to the removed button or leave `tabindex` on unrelated elements.

### 6.3 Scroll and cleanup

The preflight marker and active component lock document scrolling while the splash is displayed. Completion, reduced-motion bypass, route unmount, fallback timeout, and all error paths remove the scroll lock. Component cleanup clears the 400 ms transition timer and any failure-safety timer it owns, removes keyboard listeners, and releases temporary DOM state.

## 7. Session state and state machine

### 7.1 Exact storage contract

Use only:

```js
export const BOOT_STORAGE_KEY = 'personal-site-accessed'
export const BOOT_STORAGE_VALUE = 'true'
```

Write the string value `'true'` to `window.sessionStorage` on the first accepted activation, before starting the exit transition. An exact key/value match suppresses later splash presentation in the same browser tab. Any other or missing value is untreated.

Do not use `localStorage`, cookies, expiry timestamps, object serialization, or retain the old `ai-era:knowledge-factory:booted=v1` key. The old key is not migrated; after release, one new splash presentation is acceptable for users whose tab only contains the old value.

Storage reads and writes remain inside `try/catch`. If `sessionStorage` is unavailable or throws, fail open by revealing the homepage directly rather than risking a splash that cannot reliably persist or dismiss.

### 7.2 Runtime states

The pure state helper exposes a small explicit model:

- `ready`: overlay visible and accepting its first input;
- `leaving`: input locked and overlay fading for 400 ms;
- `complete`: overlay removed and homepage entering or visible;
- `skipped`: returning session, reduced motion, unavailable storage, non-preflight client navigation, or fail-open path; no overlay DOM after mount.

Allowed transitions are:

```text
ready --ACTIVATE--> leaving --EXIT_COMPLETE--> complete
ready --BYPASS--> skipped
```

No event transitions out of `leaving`, `complete`, or `skipped`. Existing `START`, simulated boot lines, `SKIP` control semantics, and 320/720/900 ms timers are replaced rather than retained.

## 8. Pre-paint head preflight

Reading storage only in Vue `onMounted()` would flash the homepage before the first-visit overlay and would flash the overlay for returning users. `docs/.vitepress/config.mts` therefore adds one small synchronous inline classic script to VitePress `head`. It runs before first paint and only for a direct homepage pathname (`/` or `/index.html`, respecting the current root base).

The script:

1. detects whether the current document is the homepage;
2. reads the exact `personal-site-accessed` value inside `try/catch`;
3. reads `matchMedia('(prefers-reduced-motion: reduce)')` inside `try/catch`;
4. writes one temporary state to `document.documentElement.dataset`, using a documented name such as `data-personal-site-access`;
5. sets `returning` when the stored value is exactly `'true'` or reduced motion is requested;
6. sets `pending` only for a genuine first visit when the required browser APIs are usable;
7. defaults to a fail-open value when storage or media access throws;
8. starts a short fail-open watchdog that changes `pending` to a visible-homepage fallback if Vue does not claim the splash after the client bundle has had a reasonable opportunity to hydrate.

The preflight does not write session storage, mount UI, attach input handlers, or affect non-homepage documents. `FactoryBoot` clears/claims the watchdog during `onMounted()`. A concrete watchdog delay is chosen during implementation and covered by tests; it must be long enough for normal hydration but bounded so a failed bundle cannot leave the page blocked. The watchdog is a failure recovery boundary, not part of the designed 400/600 ms motion sequence.

CSS is fail-open by default:

- without any preflight attribute, the server-rendered overlay is hidden and the homepage is visible;
- `pending` alone shows the overlay, hides the homepage, and locks scrolling;
- `returning`, `fallback`, `complete`, or no attribute shows the homepage;
- after successful activation, the runtime marker coordinates `leaving` and `entered` without revealing both layers at full opacity.

This default means `<noscript>` styling is not required for correctness, though a small regression assertion should ensure no CSS rule hides the homepage in the absence of the preflight marker.

## 9. SSR, hydration, and DOM lifecycle

The server must continue to render the complete `KnowledgeFactoryHome` markup and all four route links. `FactoryBoot` may render a deterministic overlay shell during SSR, but its Vue initial state must be identical on the server and on the client's first hydration render. Browser globals are not read during module evaluation or the initial render.

Visibility before hydration is controlled only by the head marker and CSS. In `onMounted()` the component reconciles the marker, exact storage value, and reduced-motion preference:

- `pending` plus an untreated session claims and activates the existing SSR overlay without replacing its initial DOM shape;
- `returning` or an exact stored value resolves to `skipped` and removes the CSS-hidden overlay after hydration;
- no homepage preflight marker resolves to `skipped`, preventing a late overlay flash after SPA navigation;
- any mismatch or exception resolves to visible homepage content.

After input:

1. persist `personal-site-accessed=true` when possible;
2. lock input and begin the 400 ms overlay opacity transition;
3. after 400 ms, set the component's render flag false so `FactoryBoot` is physically absent from the DOM;
4. release scroll/focus containment and mark the homepage as entering;
5. focus `#factory-title` and run the 600 ms homepage opacity entrance;
6. settle into stable visible content without retaining an invisible fixed layer.

`display: none`, `visibility: hidden`, opacity zero, or `pointer-events: none` alone does not satisfy the completion contract. A successful or bypassed hydrated state must remove the overlay node with Vue conditional rendering.

## 10. Reduced motion

When `prefers-reduced-motion: reduce` is true, the approved behavior is direct reveal:

- the head preflight uses `returning`, so no splash is painted;
- Vue resolves to `skipped` and removes the hidden overlay DOM;
- cursor blink, 400 ms splash fade, and 600 ms homepage fade do not run;
- focus is not stolen;
- the ordinary homepage is visible immediately.

CSS still includes a scoped reduced-motion safeguard that disables splash cursor animation and splash/homepage transitions. If a browser changes the preference between preflight and mount, Vue honors the mounted preference and reveals the homepage directly. Any unavoidable cleanup transition must be no more than 100 ms, but the preferred implementation uses zero duration.

## 11. Component and file boundaries

### Files to modify

| File | Responsibility |
| --- | --- |
| `docs/.vitepress/config.mts` | Add the homepage-only synchronous head preflight and fail-open watchdog. Do not change navigation, routes, theme selection, or content settings. |
| `docs/.vitepress/theme/components/FactoryBoot.vue` | Rewrite the existing inline boot as the full-screen shell; own mounted reconciliation, focus, input listeners, transition timer, DOM render flag, and cleanup. Do not retain the old inline controls or simulated lines. |
| `docs/.vitepress/theme/components/factoryBootState.mjs` | Replace the old key/value and boot transitions with browser-global-free exact storage helpers, reduced-motion lookup, input guards, and the `ready/leaving/complete/skipped` state machine. |
| `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue` | Move `FactoryBoot` out of the hero to a sibling before `main`; coordinate homepage reveal state and heading focus while leaving module/copy data unchanged. |
| `docs/.vitepress/theme/custom.css` | Replace inline `.factory-boot` rules with fixed full-screen layout, exact palette/type, responsive spacing, focus, cursor blink, 400/600 ms fades, scroll lock, and reduced-motion/fail-open selectors. |
| `scripts/personal-knowledge-factory.test.mjs` | Replace assertions that require an inline boot and prohibit `position: fixed`; test the new exact contract and pure state behavior. |
| `scripts/theme-validator.mjs` | Validate active full-screen splash, responsive, and reduced-motion rules without weakening existing factory/theme validation. |
| `scripts/theme-validator.test.mjs` | Update validator fixtures and negative cases for the new full-screen and reduced-motion contract. |
| `scripts/site-design.test.mjs` | Add a narrow cross-file assertion that homepage discovery remains unchanged while the splash is a replacement outside the hero. |

### Files intentionally unchanged

- `docs/index.md`: the `layout: page`, metadata, page class, and `<KnowledgeFactoryHome />` mount remain correct.
- `docs/.vitepress/theme/index.ts`: `KnowledgeFactoryHome` remains the only global registration; `FactoryBoot` remains a local child import.
- `package.json` and lockfile: the existing `test:factory` and aggregate test wiring remain sufficient; no dependency is added.
- `scripts/theme-color.test.mjs`: reuse existing colors/tokens for the homepage and test the splash's two exact literals in the focused test instead of expanding the approved theme palette.
- all content, Worker, publishing, Wrangler, and generated-index files.

### Files to add or delete

No implementation file is added or deleted. This design specification is the only new file. The existing `FactoryBoot.vue` and `factoryBootState.mjs` are rewritten in place so old and new startup systems cannot coexist.

## 12. Testing strategy

### 12.1 Focused Node contracts

Update the existing focused suite to assert:

- exact visible strings, `aria-label="进入个人网站"`, and separate `aria-hidden` cursor;
- exact `#F7F4EC`, `#1E2430`, and monospace font stack;
- exact storage key `personal-site-accessed` and value `'true'`, with no old key, `localStorage`, or cookies;
- first activation enters `leaving`, repeated inputs are ignored, and exit completion is the only path to `complete`;
- Enter rejects repeat, composition, modifiers, and the focused native button's duplicate global path;
- throwing storage/media APIs fail open;
- the head preflight is synchronous, homepage-only, exact-key-aware, reduced-motion-aware, and has a bounded fallback;
- default/no-marker CSS displays the homepage rather than the overlay;
- `.factory-boot` uses fixed positioning and full viewport dimensions;
- the overlay is rendered outside `.factory-hero` and removed through conditional Vue rendering;
- the existing four module routes are still exactly `/wiki/`, `/finance/`, `/ask/`, and `/llm-wiki/`;
- motion values are 400 ms, 600 ms, approximately 800 ms, and `cubic-bezier(0.16, 1, 0.3, 1)`;
- mobile spacing/hit-area and reduced-motion rules exist;
- timers, listeners, scroll state, and focus containment have explicit cleanup.

Pure state/storage tests continue under Node without DOM dependencies. Source contracts are acceptable for VitePress integration details already covered by the production build; do not add jsdom solely for this feature.

### 12.2 Existing regression gate

Implementation is not complete until these pass:

```bash
npm run test:factory
npm test
npx wrangler deploy --dry-run
git diff --check
```

`npm test` must still build VitePress under SSR without `window`, `document`, `sessionStorage`, or `matchMedia` module-evaluation errors. Existing theme palette, content, route, search, Q&A, Worker, wiki/finance publication, and security checks remain authoritative.

### 12.3 Browser acceptance

Review direct `/` loads around 1440 px, 768 px, and 390 px:

1. Fresh session: the first painted frame is the complete splash, never the homepage beneath it.
2. Enter: one activation, 400 ms splash fade, overlay DOM removal, then 600 ms homepage fade.
3. Center button: correct visible English text, accessible Chinese name, native Enter/Space, and visible focus.
4. Pointer/touch: every non-button point on the overlay activates once; no double activation from bubbling.
5. Input lock: rapid clicks, taps, Enter repeats, and mixed input do not restart or shorten the sequence.
6. Completion: no `.factory-boot` node, scroll lock, global listener, hidden homepage, or trapped focus remains.
7. Same tab reload: homepage is the first painted frame with no splash flash and no entrance animation.
8. New tab/session: splash is eligible again.
9. Reduced motion: homepage is immediately visible with no blink or fades and no focus theft.
10. Storage denied: homepage remains usable and is not permanently covered.
11. JavaScript disabled or bundle deliberately blocked: homepage becomes/remains visible; the fallback cannot leave an inert splash.
12. Direct loads of `/wiki/`, `/finance/`, `/ask/`, `/llm-wiki/`, `/about`, and notes never receive splash state, hidden content, or scroll lock.
13. Navigate from another route to `/` without a preflight marker: homepage appears directly; no late overlay flash.
14. Four modules, navigation, theme control, search, mobile menu, and Q&A behavior remain unchanged after entry.

## 13. Acceptance criteria

The feature is accepted when all of the following are true:

1. A fresh direct homepage load presents one full-screen splash with only the approved top-left shell label and centered command.
2. The exact palette, type stack, desktop/mobile spacing, and viewport sizing match this specification without a dark variant or new font request.
3. Enter, the central native button, and any overlay tap/click all converge on one input-locked activation path.
4. The cursor blinks through CSS at approximately 800 ms and is hidden from assistive technology.
5. The splash fades for 400 ms with the approved easing, is then absent from the DOM, and the homepage fades in for 600 ms with the same easing.
6. `sessionStorage` uses exactly `personal-site-accessed=true`; the old key and local storage are absent.
7. Returning-session and reduced-motion direct loads never paint the splash.
8. SSR emits the full homepage and deterministic splash shell without browser-global evaluation or hydration mismatch warnings.
9. Default CSS and the bounded preflight fallback ensure disabled or failed JavaScript exposes the homepage.
10. Focus begins on the splash button only when the splash is genuinely active, remains contained while covered, and moves to `#factory-title` after removal.
11. Mobile tap targets and any-location activation work without horizontal overflow or blocking zoom.
12. The current inline boot UI and its old state/timers are gone; no second component or layered legacy behavior remains.
13. The homepage's four module definitions, all non-home routes, DefaultTheme registration, theme behavior, and existing dependencies are unchanged.
14. Focused, full regression, build, dry-run packaging, and whitespace checks pass.

## 14. Design consistency review

- **Placeholder review:** all visible splash strings, colors, font stack, durations, easing, storage pair, route scope, breakpoints, and focus target are exact. The watchdog delay is intentionally left to implementation planning because it is failure recovery rather than designed motion; it must be bounded and tested.
- **Contradiction review:** the overlay is visually gating only while healthy client code owns it, while SSR content remains present and fail-open CSS/watchdog expose it on failure. DOM removal occurs after, not instead of, the 400 ms exit. Homepage motion starts after removal, satisfying both ordered motion and no invisible input-blocking layer.
- **Scope review:** only homepage theme/configuration and their focused validators change. The four modules, content collections, other routes, Worker, deployment configuration, global theme registration, and dependencies stay outside scope.
- **Ambiguity review:** “first visit” means a direct document load of `/` with no exact session value and no reduced-motion request. A first client-side navigation to `/` without head preflight deliberately bypasses the splash. “Any touch” means any touch-generated click within the overlay, while the native centered button owns its own event. “Input lock” means the first activation is the only state-changing input and focus cannot move behind the covering layer.
