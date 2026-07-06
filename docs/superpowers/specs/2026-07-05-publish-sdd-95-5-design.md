# Publish SDD 95-5 Wiki Update

## Goal

Publish the latest public `llm_wiki` knowledge changes to the VitePress website as a coherent Chinese update.

## Scope

The source inventory contains one added concept page and four changed concept pages:

- Add `concepts/sdd-95-5-principle.md`.
- Update `concepts/spec-driven-development.md`.
- Update `concepts/sdd-layered-adoption-model.md`.
- Update `concepts/agent-task-briefing.md`.
- Update `concepts/ai-coding-engineering-loop.md`.

No raw source, private source path, `sources` metadata, query page, or local absolute path may be published.

## Translation and Linking

Preserve existing Chinese terminology and merge each changed source into its current published translation instead of overwriting it mechanically. Translate the new concept into clear Chinese, convert all wikilinks to valid `/wiki/` links, retain only public frontmatter fields, and preserve cross-page relationships among the five pages.

## Publication Flow

Run the repository sync command against the configured `LLM_WIKI_PATH`, edit the five public translations under `docs/wiki/concepts/`, then finalize atomically so `wiki-manifest.json` and `docs/wiki/index.md` update together. Regenerate the Wiki QA index, run the full validation and build suite, and publish through a pull request.

## Acceptance Criteria

- The sync report contains exactly one added page, four changed pages, and no deletion.
- The public wiki contains 43 pages after finalization.
- The five affected pages are Chinese, contain no private metadata or unresolved wikilinks, and have valid internal links.
- The generated index and manifest include the new concept.
- Full tests, VitePress production build, and the Wiki QA security scan pass.
