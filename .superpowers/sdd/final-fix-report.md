# Final review fix report

## Status

Fixed both Important final-review findings while preserving the curated Wiki translation path and the published Finance content.

## Changes

- `prepareMirror` no longer writes into `docs/finance`. It builds the complete added/changed batch in a unique temporary directory, holds the collection lock for preparation and candidate installation, and atomically replaces `.finance-work/prepared` only after every page is successfully written.
- `finalize` reads and verifies the complete prepared mirror candidate while holding the same collection lock, overlays it onto a separately staged copy of the current publication, validates that staged result, and only then replaces the public docs and manifest pair.
- Finalization and replacement now reject a docs/manifest presence mismatch before publication mutation.
- Replacement rollback records and uses the actual `hadDocs` and `hadManifest` state instead of deriving rollback behavior from manifest absence alone.
- Initial publication creates the `docs` parent only after pair-state validation and rolls back both outputs if manifest installation fails.

## Regression coverage

- Injected failure on the second prepared-page write proves both live public bytes and the previous complete prepared candidate remain unchanged.
- A paused preparation running concurrently with finalization proves the shared collection lock serializes the operations and finalization publishes the complete candidate.
- Docs-only and manifest-only publication fixtures prove mismatched pairs are rejected without changing the surviving side.
- Existing initial and incremental manifest-install injection cases now exercise candidate composition and prove rollback restores the actual prior docs/manifest state.
- Existing curated Wiki translation tests remain unchanged and passing.

## Verification

- `node --test scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/finalize.test.mjs`
  - 49 tests, 49 passed, 0 failed.
- `node --test scripts/wiki-publish/*.test.mjs`
  - 111 tests, 111 passed, 0 failed.
- `npm test`
  - Exit 0.
  - Wiki publish: 111/111 passed.
  - Wiki QA: all passed.
  - Worker: 89/89 passed.
  - Wiki validation: 45 published pages.
  - Finance validation: 48 published pages.
  - Content and theme checks passed.
  - VitePress production build passed.
  - Security scan passed.
- `git diff --check`
  - Exit 0.

## Concerns

None known. The prepared candidate intentionally remains in the private work directory after finalization so repeated diagnostics can inspect the exact batch; a subsequent sync replaces the workspace, and a subsequent prepare atomically replaces the candidate.
