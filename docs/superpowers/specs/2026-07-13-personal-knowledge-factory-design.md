# Personal Knowledge Factory Design

**Date:** 2026-07-13  
**Status:** Approved direction, ready for implementation planning  
**Brand:** AI 纪元  
**Homepage theme:** `PERSONAL KNOWLEDGE FACTORY / 个人知识工厂`

## 1. Context

AI 纪元 is already a working VitePress knowledge site. Its real product surface is not a portfolio or a simulated desktop: it is an AI knowledge base, a finance knowledge base, a knowledge-base question-answering tool, and the public LLM Wiki Skill guide. The redesign therefore uses an operating-system and terminal metaphor only as a lightweight homepage frame. Long-form reading, search, sidebars, citations, and the existing publishing pipeline remain conventional and dependable.

The intended character is approximately 70% clear knowledge product, 20% editorial personality, and 10% playful system interaction. The homepage should feel like entering a maintained personal knowledge system without asking visitors to learn a novel interface before they can read.

## 2. Goals

1. Give the homepage a distinctive, coherent world view: a personal knowledge factory operating under the AI 纪元 brand.
2. Make the four real destinations immediately understandable and reachable:
   - AI 知识库 at `/wiki/`
   - 金融知识库 at `/finance/`
   - 知识库问答 at `/ask/`
   - LLM Wiki Skill at `/llm-wiki/`
3. Make question answering the primary action while keeping direct browsing equally available.
4. Preserve fast, legible VitePress document pages and all existing routes, search, sidebars, theme switching, citations, rate-limit messaging, and publishing behavior.
5. Work well with keyboard input, reduced-motion preferences, narrow screens, touch input, and unavailable client storage.
6. Keep ongoing maintenance small: homepage content and interaction should be isolated from generated knowledge pages and Worker code.
7. Create an original visual language that takes inspiration from general terminal and operating-system metaphors without copying another site's code, assets, composition, or branded design system.

## 3. Non-goals

The first version will not:

- build an infinite canvas, pan-and-zoom workspace, or spatial navigation system;
- provide draggable, resizable, overlapping, or persistent windows;
- add a desktop taskbar, fake file manager, or full operating-system simulation;
- invent MES projects, career case studies, media archives, experiments, or other sections for which the site has no published content;
- change knowledge-base content, generated wiki files, the finance collection, the question-answering Worker, retrieval behavior, quotas, or API contracts;
- redesign every documentation page into a terminal or apply monospace typography to article bodies;
- add Three.js, Canvas rendering, a database, authentication, analytics, a new UI framework, or externally hosted font dependencies;
- hide useful content behind a mandatory animation or require JavaScript merely to reach the four modules.

## 4. Information architecture

The existing route structure remains authoritative:

| Surface | Route | Role in the factory metaphor |
| --- | --- | --- |
| Homepage | `/` | Knowledge factory control room |
| AI knowledge base | `/wiki/` | AI knowledge archive |
| Finance knowledge base | `/finance/` | Finance research archive |
| Knowledge Q&A | `/ask/` | Ask Console |
| LLM Wiki Skill | `/llm-wiki/` | Factory tooling and method |
| Topics | `/topics/` | Cross-cutting topic navigation |
| Notes | `/notes/...` | Editorial notes |
| About | `/about` | Site and author context |

The global VitePress navigation continues to expose the established sections. The homepage status bar and module grid provide a second, contextual navigation layer; they do not replace the global navigation, local search, document sidebar, or mobile menu.

## 5. Homepage content structure

The homepage is a custom page composed in this order:

### 5.1 Lightweight factory status bar

A slim, non-sticky-by-default row establishes the system frame without impersonating macOS or another operating system. It contains:

- `AI 纪元` as the persistent brand;
- `PERSONAL KNOWLEDGE FACTORY` as the system label;
- a textual state such as `SYSTEM ONLINE` with a decorative status indicator hidden from assistive technology;
- direct text links `知识库` → `/wiki/`, `问答` → `/ask/`, and `关于` → `/about`;
- no live clock, fake network indicator, or status that can become inaccurate.

On narrow screens it wraps or reduces to the brand, state, and one navigation entry. It never creates horizontal scrolling and never duplicates the full VitePress mobile menu.

### 5.2 Terminal welcome panel

The hero is a compact terminal-inspired panel rather than a full-screen gate. Its durable content is:

```text
PERSONAL KNOWLEDGE FACTORY
个人知识工厂

你好，这里是 AI 纪元。
这里持续整理 AI、产品、工程与金融研究中值得长期保留的知识。
```

The primary call to action is `向知识库提问`, linking to `/ask/`. The secondary call to action is `浏览知识模块`, linking to the module grid through an in-page fragment. Both are real links and remain usable before or without the startup interaction.

The panel may display short system lines such as `Loading knowledge archives` and `Connecting Ask Console`, but must not claim to load data that is not actually used. The copy must not introduce a fictional profession, project portfolio, or product status.

### 5.3 Four real modules

The main grid, labelled `KNOWLEDGE MODULES / 知识模块`, contains exactly four primary cards:

1. **AI 知识库** — concepts, entities, comparisons, tools, and engineering workflows; link `/wiki/`.
2. **金融知识库** — investors, quantitative research, market structures, and risk concepts; link `/finance/`.
3. **知识库问答 / ASK CONSOLE** — retrieval-based answers with source citations; link `/ask/`.
4. **LLM Wiki Skill** — principles, construction process, installation, and public Skill release; link `/llm-wiki/`.

Each card has a stable module identifier, a concise description grounded in published content, a plain-language action label, and a native link covering the card's principal action. Cards may use window-like borders and status labels, but they do not open modal windows. Hover is an enhancement only; the same information and action are available to keyboard and touch users.

### 5.4 Recent log

`RECENT LOG / 最近更新` retains the existing site's small, curated list of current destinations or entries. Each item has a title, destination, and machine-readable date. The first implementation may keep this list explicit in the homepage source rather than adding a new content database or runtime query. Dates and links must be real and must be updated through the same review process as other homepage copy.

### 5.5 Factory notes

A compact closing section explains the system in ordinary language: the site connects long-lived source notes, published knowledge collections, retrieval-based Q&A, and the reusable LLM Wiki Skill. It may link to `/about`, `/topics/`, or a relevant existing note. It is supporting context, not a fifth primary module.

## 6. Terminal startup interaction

### 6.1 Principle

The startup treatment is optional ambience, not access control. It is contained within the welcome panel; it is never a fixed full-viewport overlay, dialog, focus trap, scroll lock, or required step. The heading, description, module grid, and real links are server-rendered and visible regardless of the startup state.

### 6.2 State model

The client interaction has four explicit states:

- `ready`: first session visit; compact startup prompt is available and page content is already readable.
- `booting`: a short sequence is in progress; content remains readable and links remain operable.
- `complete`: terminal reports readiness and the prompt becomes a quiet replay-free status.
- `skipped`: equivalent to complete when prior session state or reduced-motion preference suppresses the sequence.

The sequence target is 600–1200 ms and must never delay navigation. It must not rely on network requests or artificial multi-second timers.

### 6.3 Session persistence

- Use one namespaced key: `ai-era:knowledge-factory:booted` in `sessionStorage`.
- On successful completion or explicit skip, write a versioned value such as `v1`.
- If the key is present, hydrate directly into `skipped`/complete presentation for the rest of that browser tab session.
- Wrap reads and writes in error handling. Storage denial, server-side rendering, or an unavailable `window` must fall back to an operable page and must not log an error to visitors.
- Do not use local storage or cookies; a later browser session may show the welcome treatment again.

### 6.4 Input behavior

- A visible button labelled `启动知识系统` activates the sequence by click or keyboard.
- A quiet `跳过启动` button is available in `ready` and `booting`; it immediately enters `skipped`, records the session value when possible, and never hides or disables the real navigation links.
- `Enter` may activate it while the homepage is in `ready`, but only when the event target is not a link, button, form control, editable region, or other interactive element.
- Clicking the terminal panel may activate the sequence only when the click did not originate on a link or control. Clicking elsewhere on the page does nothing.
- The interaction must not intercept `Enter` after completion, on other routes, or while a visitor is using search or the Q&A composer.
- The button exposes its state through text and, where useful, `aria-live="polite"`; it does not use rapid character-by-character announcements.

### 6.5 Reduced motion

When `prefers-reduced-motion: reduce` is active:

- initialize directly into `skipped` with a static complete presentation, without timed typing, stagger, scale, rotation, or animated progress;
- retain the real links and a concise `SYSTEM READY` message;
- disable non-essential transitions across the homepage with a scoped media query;
- never require the visitor to activate the startup control.

## 7. Visual system

The visual language combines warm editorial surfaces with restrained system notation. It should not resemble a traditional MES dashboard, cyberpunk interface, macOS clone, or neon terminal.

### 7.1 Light tokens

The current VitePress variables remain the integration boundary. Homepage-specific semantic tokens alias them or extend them:

```css
--factory-bg: #f6f3ea;
--factory-surface: #fffdf7;
--factory-surface-muted: #edf1f5;
--factory-ink: #1d2433;
--factory-ink-muted: #596579;
--factory-border: #cfd6df;
--factory-brand: #275dad;
--factory-data: #137f6b;
--factory-signal: #b77900;
--factory-terminal: #172033;
--factory-terminal-ink: #edf3fb;
--factory-focus: #155eef;
```

Light mode uses warm off-white rather than pure white for the page background, deep blue-gray rather than pure black for body text, blue for primary actions, teal for data/status accents, and amber sparingly for identifiers or system signals.

### 7.2 Dark tokens

```css
--factory-bg: #0b1020;
--factory-surface: #11192b;
--factory-surface-muted: #162138;
--factory-ink: #e8edf6;
--factory-ink-muted: #aab5c8;
--factory-border: #2b3956;
--factory-brand: #8aa8ff;
--factory-data: #8be9d3;
--factory-signal: #f2c94c;
--factory-terminal: #060a12;
--factory-terminal-ink: #edf3fb;
--factory-focus: #9db5ff;
```

Dark mode evolves the current AI 纪元 palette rather than replacing it with a different brand. Both modes must meet WCAG AA contrast for ordinary text and controls. Color never carries module identity or system state by itself.

### 7.3 Typography

- **Body and navigation:** the existing VitePress/system sans-serif stack, optimized for Chinese long-form reading.
- **Homepage display title:** an optional system serif stack (`Noto Serif SC`, `Songti SC`, `STSong`, serif) used only for the large Chinese editorial title; layout must remain stable when it falls back.
- **System labels, module identifiers, terminal lines, and dates:** a system monospace stack (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, monospace).
- **Article headings and body:** remain governed by VitePress; no global conversion to display or monospace type.
- No remote font download is introduced in the first version.

Font size, weight, spacing, and borders establish hierarchy before color. Uppercase English labels remain short and are paired with clear Chinese labels where needed.

### 7.4 Shape and motion

- Use 1 px borders, 6–12 px corner radii, restrained shadows, and deliberately aligned cards.
- Hover may lift a card by no more than 3 px and strengthen its border; no bounce, elastic motion, glow, glass-heavy blur, or large rotation.
- Default transitions target 160–320 ms and use ease-out timing.
- Window controls, if decorative, are not copied from the macOS red/yellow/green pattern.

## 8. Responsive behavior

### Desktop (`>= 960px`)

- Homepage content width stays aligned with the existing VitePress content grid.
- The four modules form a balanced two-column grid, with the Ask Console allowed stronger visual emphasis without changing document order.
- Status-bar links remain visible if they fit without crowding.
- Recent log and factory notes may form an asymmetric two-column lower section.

### Tablet (`640–959px`)

- Module cards remain two columns where their text can wrap comfortably; otherwise they collapse to one column.
- Status items wrap as groups rather than shrinking below readable sizes.
- No interaction depends on hover.

### Mobile (`< 640px`)

- The page becomes a normal vertical flow: status, welcome, actions, four modules, recent log, factory notes.
- The module order remains AI, finance, Q&A, Skill so navigation is predictable.
- The terminal is a styled content panel, not a scrollable viewport within the page.
- Tap targets are at least 44 by 44 CSS pixels, text never requires horizontal scrolling, and cards do not use fixed heights.
- The VitePress mobile menu and search remain the authoritative global controls; the factory status bar reduces rather than duplicating them.

## 9. Accessibility requirements

1. Use semantic landmarks: one main heading, labelled navigation, sections with headings, lists for logs, and native anchors/buttons.
2. Preserve a logical DOM and tab order matching the visible mobile order.
3. Every module remains discoverable without hover and has a specific accessible link name.
4. Visible focus rings use `--factory-focus` with adequate offset and contrast in both themes.
5. Decorative glyphs, grid marks, and status dots use `aria-hidden="true"`; meaningful status is also expressed as text.
6. Startup changes use at most a polite live region and never stream each simulated terminal character to screen readers.
7. Respect `prefers-reduced-motion`; do not autoplay sound or use flashing content.
8. Theme controls, VitePress search, mobile navigation, and the Q&A form retain their current keyboard behavior.
9. The homepage remains meaningful in server-rendered HTML and navigable if client JavaScript fails.

## 10. Component and implementation boundaries

The implementation should be localized to the homepage theme layer:

| File | Responsibility |
| --- | --- |
| `docs/index.md` | Replace the generic VitePress home frontmatter with the custom homepage mount and stable page metadata only. |
| `docs/.vitepress/theme/index.ts` | Register the homepage component while continuing to extend `DefaultTheme`. |
| `docs/.vitepress/theme/components/KnowledgeFactoryHome.vue` | Own semantic homepage composition, copy, four-module data, recent log, and factory notes. No Worker or content-generation logic. |
| `docs/.vitepress/theme/components/FactoryBoot.vue` | Own the optional startup UI, scoped event listeners, session state, storage fallback, and reduced-motion behavior. |
| `docs/.vitepress/theme/components/factoryBootState.mjs` | Optional small pure state/storage helper if needed to make state behavior independently testable. It must not import browser globals at module evaluation time. |
| `docs/.vitepress/theme/custom.css` | Add factory-scoped tokens and responsive/accessibility styles without changing generated article markup contracts. |
| `scripts/personal-knowledge-factory.test.mjs` | Verify homepage content/route contracts and, if a pure helper exists, boot-state behavior. |
| `package.json` | Add the focused test to the existing `npm test` chain. |

The preferred page frontmatter is a standard VitePress page without sidebar or outline, with a page-specific class. The globally registered Vue component supplies the homepage. This avoids building a second router or replacing the default theme. The component must render the four module links in SSR output; `FactoryBoot` enhances but does not gate them.

Do not modify these surfaces for this redesign unless a regression test proves a narrowly related integration fix is necessary:

- `docs/wiki/**`
- `docs/finance/**`
- `docs/ask/**` and the Q&A component behavior
- `docs/llm-wiki/**`
- `worker/**`
- `scripts/wiki-publish/**`
- `scripts/wiki-qa/**`
- Wrangler bindings, secrets, routes, rate limits, or deployment configuration

## 11. Testing strategy

### Automated contract tests

Add focused Node tests that fail before implementation and assert:

- the homepage contains the `AI 纪元` brand and both `PERSONAL KNOWLEDGE FACTORY` and `个人知识工厂`;
- exactly the four primary module definitions exist with the routes `/wiki/`, `/finance/`, `/ask/`, and `/llm-wiki/`;
- the Q&A action points to `/ask/` and no primary module points to a placeholder or external replacement;
- the startup uses the namespaced session key, does not use `localStorage`, and has explicit storage-failure handling;
- the Enter handler excludes interactive/editable targets and is removed when the component unmounts;
- reduced-motion styling and logic exist;
- prohibited first-version concepts such as infinite-canvas libraries, draggable-window code, and fictional project modules are absent from the homepage implementation;
- the existing VitePress theme and appearance switch remain enabled.

If `factoryBootState.mjs` is introduced, test transitions among `ready`, `booting`, `complete`, and `skipped`, including unavailable storage and existing session state, using Node's built-in test runner. Avoid adding a browser-test dependency solely for this feature.

### Existing regression suite

The release gate remains:

```bash
npm test
npx wrangler deploy --dry-run
git diff --check
```

The existing suite must continue to validate both knowledge collections, the generated Q&A index, security scanning, brand name, theme switching, content links, Worker behavior, and the VitePress production build.

### Browser acceptance

Review the built site at representative widths around 1440 px, 768 px, and 390 px in both light and dark themes. Verify:

- first session visit, startup activation by button, safe `Enter` activation, and same-session return;
- direct use of all four links before starting the animation;
- storage-denied fallback;
- reduced-motion presentation;
- keyboard-only navigation and visible focus;
- no mobile overflow, clipped Chinese copy, fixed-height card truncation, or duplicated navigation;
- direct navigation to existing AI, finance, Q&A, Skill, note, and about pages;
- Q&A submission, loading, quota/error messaging, citations, and page-specific styling are visually and functionally unchanged.

## 12. Acceptance criteria

The redesign is complete when all of the following are true:

1. `/` clearly presents `AI 纪元` and `PERSONAL KNOWLEDGE FACTORY / 个人知识工厂` above the primary module grid.
2. A visitor can reach each of the four real modules with one activation from the homepage, with or without running the startup sequence.
3. The startup is inline and optional, persists only for the tab session, responds safely to Enter/click, fails open when storage is unavailable, and becomes static under reduced motion.
4. Light and dark modes use the documented semantic palette, keep readable contrast, and preserve the existing theme switch.
5. Desktop uses a structured control-room grid while mobile uses a conventional vertical reading flow with no canvas gestures or window manipulation.
6. Existing knowledge content, routes, local search, sidebars, publishing scripts, Q&A retrieval/API behavior, limits, citations, Worker bindings, and Cloudflare deployment behavior are unchanged.
7. No fictional project, career, experiment, or media module appears in the homepage information architecture.
8. Focus, keyboard, touch, screen-reader labelling, reduced motion, SSR content, and JavaScript-failure behavior meet the requirements above.
9. Focused tests, the full existing test suite, VitePress production build, Wrangler dry run, and diff check pass.

## 13. Originality and licensing boundary

The redesign may use general, non-exclusive ideas such as a terminal welcome, system status labels, modular cards, and an operating-system metaphor. It must be independently implemented from the existing VitePress codebase and this specification.

It must not copy or extract the reference site's source code, CSS, illustrations, icons, photographs, fonts, written copy, component geometry, window composition, animation timing sequence, distinctive three-color allocation, or other identifiable design assets. Do not present the result as an adaptation or clone of that site. The AI 纪元 implementation uses its own brand, copy, content hierarchy, blue/teal system palette, component structure, and interaction states.

If a future implementation intentionally incorporates an asset or adaptation governed by a third-party license, that asset must be separately reviewed, attributed, and licensed before merge. No such third-party asset is required or approved by this specification.
