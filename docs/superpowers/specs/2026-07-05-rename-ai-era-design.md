# Rename Site to AI 纪元

## Goal

Replace the existing brand name `柯提的 AI 纪元` with `AI 纪元` everywhere it is currently used by the website and repository documentation.

## Scope

- VitePress site title and homepage name.
- About-page description and body copy.
- Wiki Q&A assistant identity prompt.
- Repository README title.

The domain name, repository name, URLs, content structure, styling, and behavior remain unchanged.

## Implementation

Perform an exact text replacement in the six currently identified occurrences. Add an automated consistency check that fails while the old name remains, then run the repository test suite and production build.

## Acceptance Criteria

- No tracked source file contains `柯提的 AI 纪元` or `柯提的AI纪元`.
- All six identified locations use `AI 纪元`.
- Tests and the production build pass.
