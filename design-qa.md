# My OS UI Refinement — Design QA

## Reference

- Scope: the `03 我的 OS` canvas only, exercised in the Codex in-app browser against the local VitePress development build.
- The approved reference direction is a warm paper canvas with a restrained 24 px dot rhythm, semantic rounded cards, a growth-axis hierarchy, a compact Layers rail, and fixed bottom navigation. Stars, illustrations, particle effects, and visitor editing remain excluded.
- Desktop viewport: `1440 × 900`.
- Mobile viewport: `390 × 844` with a fresh origin for the initial-fit check.
- Evidence:
  - [`qa-artifacts/my-os-ui-refinement/desktop-1440x900.png`](qa-artifacts/my-os-ui-refinement/desktop-1440x900.png)
  - [`qa-artifacts/my-os-ui-refinement/mobile-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-390x844.png)
  - [`qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png)

## Desktop

- Browser-verified at `1440 × 900`: the canvas uses `#F7F4EC` and a fixed 24 px dot grid.
- Initial Fit displayed all 11 visible nodes with 0 overlapping node pairs. The JZ identity anchor and four-stage growth axis remained the primary narrative.
- After the mobile-chrome isolation fix, document geometry was exact: `scrollWidth = innerWidth = 1440` and `scrollHeight = innerHeight = 900`.
- The collapsed Layers root measured 48 px and its panel measured 220 px. Opening Layers did not change the canvas transform.
- The minimap changed the canvas transform. Blank-canvas pan also changed the transform, and pointer-centred zoom changed the displayed scale from 56% to 67%.
- The JZ card move changed its `left` and `top`. Resize remained bounded and clamped to `300 × 220`.
- Hiding a node changed the visible count from 11 to 10; Undo restored it to 11.
- Save and the confirmed Reset flow completed. The fixed bottom navigation remained available throughout.
- The native LLM Wiki link navigated to `/wiki/`; returning to the OS restored the QA flow.
- Browser console result: `warn = []`, `error = []`.
- Screenshot: [`qa-artifacts/my-os-ui-refinement/desktop-1440x900.png`](qa-artifacts/my-os-ui-refinement/desktop-1440x900.png).

## Mobile

- Browser-verified at `390 × 844` from a fresh origin: the initial 16% Fit included the JZ identity anchor and all four timeline nodes; the branch nodes remained reachable by canvas navigation.
- After the fixes, document geometry was exact: `scrollWidth = innerWidth = 390` and `scrollHeight = innerHeight = 844`.
- `.VPLocalNav.empty.fixed` and `.VPFooter` were hidden only while the system view was active. The lifecycle class was removed when leaving the system view.
- Controls measured `x = 60…382`, `y = 710…768`. The Layers trigger occupied `y = 736…780` but had distinct horizontal space, so their hit areas no longer overlapped. The controls retained horizontal operation with `scrollbar-width: none`.
- With Layers open, the drawer panel measured `y = 216…736`; the open rail covered the controls on the shared row. Fixed navigation remained at `y = 780…834`.
- The LLM Wiki card passed hit testing. Focusing it through Layers and activating the native link both navigated successfully to `/wiki/`.
- Drawer focus and minimap navigation changed the canvas transform.
- Screenshots:
  - [`qa-artifacts/my-os-ui-refinement/mobile-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-390x844.png)
  - [`qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png)

## Reduced motion

- The in-app browser does not expose media-preference emulation, so reduced-motion rendering was not claimed as a visual browser test.
- Deterministic source contracts verify that staged card animation is disabled, animation and transition durations collapse to 1 ms, and functional canvas/navigation transforms are retained.
- The relevant Personal OS core and factory suites passed. This is a browser-tool limitation, not a product defect.

## Failure recovery

- The in-app browser does not expose request interception, so a forced initial lazy-chunk rejection was not claimed as a browser test.
- Deterministic loader and integration tests verify distinct initial/retry importer identities, the request-ID race guard, `role="alert"` and `role="status"` states, and one navigation instance outside the failure boundary.
- The relevant Personal OS core and factory suites passed. This is a browser-tool limitation, not a product defect.

## Final result

Final result: passed for all executable desktop and mobile browser scenarios.

- The verified P1/P2 mobile findings—VitePress chrome/document scrolling, controls versus Layers hit-area overlap and scrollbar presentation, and drawer stacking—were fixed and passed in-browser revalidation.
- Desktop and mobile interaction scenarios passed with no new console warnings or errors.
- Reduced-motion emulation and forced request failure were unavailable in the selected browser surface; both are covered by deterministic regression contracts and are not represented as browser-executed scenarios.
- Final evidence set:
  - [`qa-artifacts/my-os-ui-refinement/desktop-1440x900.png`](qa-artifacts/my-os-ui-refinement/desktop-1440x900.png)
  - [`qa-artifacts/my-os-ui-refinement/mobile-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-390x844.png)
  - [`qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png`](qa-artifacts/my-os-ui-refinement/mobile-drawer-390x844.png)
- Final browser console result: `warn = []`, `error = []`.

---

# Retro Journal Desktop — Design QA

## Reference and scope

- Scope: `01 主页` desktop surface only; existing routes, desktop entries, links, boot flow, and three-view navigation were preserved.
- Direction: bright-blue star texture, cream paper windows, restrained handwritten accents, tactile file icons, and a cream pill Dock.
- Desktop viewport: `1440 × 900`.
- Mobile viewport: `390 × 844`.
- Evidence:
  - [`design-qa/retro-journal-desktop/desktop-1440x900.png`](design-qa/retro-journal-desktop/desktop-1440x900.png)
  - [`design-qa/retro-journal-desktop/mobile-390x844.png`](design-qa/retro-journal-desktop/mobile-390x844.png)

## Desktop verification

- The desktop background renders a blue gradient with low-contrast dots and isolated diamond highlights; the rejected large lattice pattern was removed during visual QA.
- The project window opens as a `580 × 360` cream paper surface with traffic-light dots, tape, dashed content inset, status labels, and a labelled close control.
- All eight edge and corner resize handles are present. The old visible `调整大小` button count is `0`.
- The cream Dock remains centred and fixed. Desktop icons retain their labels and activation behavior while using folder, document, terminal, and world tile treatments.
- Document geometry passed: `scrollWidth = clientWidth = 1425` in the selected browser viewport.

## Mobile verification

- The open project window measured `x = 16`, `width = 358` within a `390` CSS-pixel viewport and did not create horizontal overflow.
- Fine edge handles are hidden on mobile (`visibleHandles = 0`); the layout remains adaptive and the Dock respects the bottom safe-area treatment.
- Document geometry passed: `scrollWidth = clientWidth = 375` in the selected browser viewport.

## Interaction, accessibility, and recovery

- Desktop keyboard resizing changed the project window dimensions through the labelled southeast separator.
- Closing the project window removed it from the DOM (`remainingWindows = 0`).
- Deterministic reducer tests cover all eight resize directions, anchored opposite edges, minimum size, and viewport constraints.
- Reduced-motion behavior is covered by source-level regression tests because the selected browser surface does not expose media-preference emulation.
- Final browser console result: `warn = []`, `error = []`.

## Final result

Final result: passed for the executable desktop and mobile browser scenarios.
