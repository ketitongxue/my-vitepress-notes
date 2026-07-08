# Task 4 Report

## Status

Implemented and verified the Finance publication and independent navigation.

## Changes

- Published 48 Finance pages: 42 concepts and 6 entities, plus the generated landing page and manifest.
- Added the `金融知识库` top navigation item and independent `/finance/` sidebar with `实体`, `概念`, and `对比分析` groups.
- Added navigation completeness, exact missing-source diagnostics, uniqueness, route-isolation, and index-order tests.
- Added sanitizer regressions for prose-only source filenames, escaped table wikilinks, financial ratios/product names that resemble paths, and the legacy `ai-agent-system` Finance link.
- Preserved the existing `/wiki/` sidebar without modifications.

## TDD Evidence

- Navigation test failed first because `/finance/` was absent.
- Sanitizer tests failed first for the residual source filename and path false positives.
- Escaped-wikilink and legacy-alias tests failed first before their implementation fixes.

## Verification

- `node scripts/theme-config.test.mjs`: passed.
- `npm run finance:validate`: passed, 48 published pages.
- Focused publisher suites: 39 tests passed, 0 failed.
- `git diff --check`: passed.
- Private marker audit (source metadata, raw references, wikilinks, local paths, and Android data paths): no matches.
- Filename audit: only the intentional public template example ``specs/<功能名>.md`` remains; no source filename or `原始来源` prose remains.

## Concerns

- The source contains a legacy `ai-agent-system` link while the published page is `ai-quant-agent-workflow`; the Finance preparation step now maps that exact legacy name to the stable published route.

## Review Fixes

- Restored robust Unix absolute-path detection for quoted and backticked local paths while retaining the financial-ratio and technical-product false-positive protections.
- Scoped escaped-pipe normalization to Finance wikilinks; unrelated Markdown such as `a\|b` remains byte-for-byte unchanged.
- Added a general sanitizer rule for empty provenance headings (`来源`, `参考资料`, `参考文献`, `Source(s)`, and `Reference(s)`) and removed the orphaned generated `## 来源` heading.
- Removed the generated trailing-whitespace failure.

## Review Verification Evidence

- `node --test scripts/wiki-publish/markdown.test.mjs scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/validate.test.mjs`: 39 passed, 0 failed.
- `node scripts/theme-config.test.mjs`: `theme config tests passed`.
- `npm run finance:validate`: `48 published pages`.
- `git diff --check`: exit 0 with no output.
- Private-marker search across `docs/finance`: exit 1, no matches.
- `rg -n '`[^`]+\.md`|原始来源|^## (来源|参考资料|参考文献|Sources?|References?)\s*$|[ \t]+$' docs/finance`: only the intentional public template example ``specs/<功能名>.md`` matched; no provenance heading, source filename, `原始来源`, or trailing whitespace remained.
