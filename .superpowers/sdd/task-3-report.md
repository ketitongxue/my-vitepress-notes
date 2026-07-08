# Task 3 Report

## Outcome

Implemented deterministic Finance mirror preparation and collection-aware atomic finalization while retaining curated Wiki translation behavior.

## TDD evidence

- RED: focused tests failed because `prepare.mjs` and `stripProvenance` did not exist.
- RED: Finance finalizer tests failed because finalization was hard-coded to `.wiki-work` and Wiki output paths.
- GREEN: focused sanitizer, Wiki compatibility, Finance initial publication, rollback, and baseline tests pass.

## Implementation

- Added `prepareMirror({ collectionName, site })` and Finance CLI scripts.
- Built wikilink targets from the complete staged Finance inventory before transforming affected pages.
- Serialized only public frontmatter, removed inline and standalone raw provenance, converted Finance wikilinks, and rejected unresolved/private output before writing.
- Generalized finalization paths, locks, recovery prefixes, manifests, URL prefixes, metadata, validation, and generated indexes by collection.
- Preserved Wiki translation confirmation semantics; Finance rejects unchanged prepared bytes and translation confirmations.
- Supported missing initial manifests and rollback that removes both Finance outputs after an injected manifest-install failure.

## Verification

`node --test scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/markdown.test.mjs scripts/wiki-publish/finalize.test.mjs`

Result: 46 tests passed, 0 failed.

`git diff --check`

Result: clean.

## Self-review

- Preparation transforms all affected pages before any writes, so unresolved links cannot cause a partial prepared batch.
- Identical source input produces identical bytes; only added and changed pages are written.
- Existing Wiki tests cover translation baselines, acknowledgements, recovery, deletion confirmation, and incremental replacement.
- Finance index headings use the existing required section labels and collection URL prefix.
