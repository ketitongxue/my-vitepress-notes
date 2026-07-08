# Finance Wiki Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the 48-page Finance Wiki under `/finance/` through the existing incremental, atomic VitePress publication pipeline without changing the current LLM Wiki URLs or QA retrieval corpus.

**Architecture:** Introduce a small collection registry that supplies source environment variables, public roots, manifests, workspaces, locks, URL prefixes, and index copy. Refactor the current sync/finalize/validate functions to consume a collection while preserving `wiki` as the default. Add a deterministic Finance preparation step that strips private provenance and converts Finance wikilinks before the shared atomic finalizer installs the snapshot.

**Tech Stack:** Node.js 22, ESM, `node:test`, VitePress 1.6, Wrangler 4.107, MarkdownIt.

## Global Constraints

- Existing `/wiki/` URLs, `wiki-manifest.json`, `.wiki-work`, commands, and QA retrieval output must remain backward compatible.
- Finance uses `FINANCE_WIKI_PATH`, `docs/finance`, `finance-manifest.json`, `.finance-work`, and `/finance/`.
- Publish only `concepts/`, `entities/`, and `comparisons/`; never publish `raw/`, `queries/`, `_meta/`, Obsidian files, source paths, or local absolute paths.
- Finance pages remain excluded from Worker QA retrieval; VitePress local search may index them.
- Deletions require explicit per-source confirmation.
- All publication replacement remains atomic and recoverable.
- Do not add dependencies.

---

### Task 1: Collection Registry and Namespace-Aware Core Paths

**Files:**
- Create: `scripts/wiki-publish/collections.mjs`
- Create: `scripts/wiki-publish/collections.test.mjs`
- Modify: `scripts/wiki-publish/core.mjs`
- Modify: `scripts/wiki-publish/core.test.mjs`

**Interfaces:**
- Produces: `collectionConfig(name)` returning a frozen collection object.
- Produces: `publicPath(sourcePath, collection = collectionConfig('wiki'))`.
- Produces: `scanWiki(root, { collection } = {})` and `scanWikiSnapshot(root, { collection } = {})`.

- [ ] **Step 1: Write failing registry and path tests**

Add tests that require exact configurations:

```js
assert.deepEqual(collectionConfig('finance'), {
  name: 'finance',
  envKey: 'FINANCE_WIKI_PATH',
  docsDirectory: 'finance',
  manifestFile: 'finance-manifest.json',
  workDirectory: '.finance-work',
  lockName: '.finance-sync.lock',
  publishPrefix: '.finance-publish',
  urlPrefix: '/finance',
  title: '金融知识库',
  description: '量化交易、金融市场、投资与风险管理知识库。',
  mode: 'mirror',
})
assert.equal(publicPath('concepts/x.md', collectionConfig('finance')), 'docs/finance/concepts/x.md')
assert.throws(() => collectionConfig('unknown'), /Unknown wiki collection/)
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test scripts/wiki-publish/collections.test.mjs scripts/wiki-publish/core.test.mjs`

Expected: FAIL because `collections.mjs` and namespace-aware parameters do not exist.

- [ ] **Step 3: Implement the immutable registry**

Create `collections.mjs` with only `wiki` and `finance` entries. Return a defensive frozen object and reject unknown names. Keep `wiki` values exactly equal to current paths and copy.

Update `core.mjs` so path generation receives a collection. Pass that collection through inventory creation; default to `wiki` to keep existing callers and tests unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test scripts/wiki-publish/collections.test.mjs scripts/wiki-publish/core.test.mjs`

Expected: all tests pass, including existing symlink and containment tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/wiki-publish/collections.mjs scripts/wiki-publish/collections.test.mjs scripts/wiki-publish/core.mjs scripts/wiki-publish/core.test.mjs
git commit -m "refactor: add wiki collection registry"
```

---

### Task 2: Collection-Aware Sync, Locking, and Validation

**Files:**
- Modify: `.gitignore`
- Modify: `scripts/wiki-publish/sync.mjs`
- Modify: `scripts/wiki-publish/sync.test.mjs`
- Modify: `scripts/wiki-publish/validate.mjs`
- Modify: `scripts/wiki-publish/validate.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `collectionConfig(name)` and namespace-aware scan functions from Task 1.
- Produces: `sync({ collectionName = 'wiki', argv, env, site })`.
- Produces: `validatePublishedWiki({ docsRoot, manifest, collection })`.
- Produces scripts: `finance:sync` and `finance:validate`.

- [ ] **Step 1: Write failing isolation tests**

Add tests proving that Finance sync:

```js
await sync({
  collectionName: 'finance',
  env: { FINANCE_WIKI_PATH: financeRoot },
  site,
})
assert.equal(report.inventory['concepts/a.md'].publicPath, 'docs/finance/concepts/a.md')
assert.ok(await exists(path.join(site, '.finance-work', 'report.json')))
assert.equal(await exists(path.join(site, '.wiki-work')), false)
```

Also test that the Finance lock and stale-workspace recovery names cannot collide with Wiki operations, and that `finance:validate` expects `docs/finance` together with `finance-manifest.json`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test scripts/wiki-publish/sync.test.mjs scripts/wiki-publish/validate.test.mjs`

Expected: FAIL because all paths still resolve to Wiki defaults.

- [ ] **Step 3: Parameterize sync and validation**

Resolve the source path from `--wiki <path>` first, then the selected collection's `envKey`. Derive manifest, workspace, lock, docs root, backup prefixes, and diagnostics from the collection object.

Change absolute-link validation so only the selected collection's `urlPrefix` is accepted. Require each manifest `publicPath` to equal `docs/<collection.docsDirectory>/<source>`.

Add package scripts:

```json
"finance:sync": "node scripts/wiki-publish/sync.mjs --collection finance",
"finance:validate": "node scripts/wiki-publish/validate.mjs --collection finance"
```

Add `.finance-work/`, `.finance-sync.lock`, `.finance-sync.candidate-*`, and
`.finance-publish.tmp-*` to `.gitignore`; keep the tracked public Finance output
and `finance-manifest.json` visible to Git.

CLI parsing must remove `--collection <name>` before interpreting sync/finalize-specific flags, and reject missing or duplicate collection values.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test scripts/wiki-publish/sync.test.mjs scripts/wiki-publish/validate.test.mjs`

Expected: all existing Wiki tests and new Finance isolation tests pass.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json scripts/wiki-publish/sync.mjs scripts/wiki-publish/sync.test.mjs scripts/wiki-publish/validate.mjs scripts/wiki-publish/validate.test.mjs
git commit -m "refactor: isolate wiki collection state"
```

---

### Task 3: Deterministic Finance Sanitization and Atomic Finalization

**Files:**
- Create: `scripts/wiki-publish/prepare.mjs`
- Create: `scripts/wiki-publish/prepare.test.mjs`
- Modify: `scripts/wiki-publish/markdown.mjs`
- Modify: `scripts/wiki-publish/markdown.test.mjs`
- Modify: `scripts/wiki-publish/finalize.mjs`
- Modify: `scripts/wiki-publish/finalize.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `.finance-work/source/**`, `.finance-work/report.json`, and the Finance collection config.
- Produces: `prepareMirror({ collectionName, site })` writing sanitized changed/added pages under `docs/finance` before finalization.
- Produces: `stripProvenance(markdown)` and collection-aware `convertWikilinks(markdown, known)`.
- Produces: `finalize({ collectionName = 'wiki', argv, site })` and `finance:finalize`.

- [ ] **Step 1: Write failing sanitizer tests**

Use a fixture containing all observed Finance forms:

```md
---
title: 测试页
type: concept
tags: [strategy]
created: 2026-07-08
updated: 2026-07-08
sources: [raw/articles/source.md]
confidence: medium
contested: false
---

正文参见 [[other|其他页面]]。^[raw/articles/source.md]
> ^[raw/papers/book.md]
```

Assert that output keeps only public frontmatter, links to `/finance/concepts/other`, removes both provenance markers, contains Chinese body text, and contains none of `sources:`, `raw/`, `[[`, or a local absolute path.

Add a failure test for unresolved wikilinks and a test proving Wiki translation mode is not auto-overwritten.

Add finalizer fixtures for both states: an initial Finance publication where
`docs/finance` and `finance-manifest.json` are absent, and an incremental update
where both exist. The initial case must install both outputs atomically; an
injected failure must leave both absent rather than a partial publication.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/markdown.test.mjs scripts/wiki-publish/finalize.test.mjs`

Expected: FAIL because mirror preparation and collection finalization do not exist.

- [ ] **Step 3: Implement minimal mirror preparation**

Build a known-target map from the complete Finance inventory before transforming any page. Serialize only public frontmatter, remove inline and standalone `^[raw/...]` markers, convert wikilinks to Finance URLs, and reject unresolved targets.

Write only `added` and `changed` files; do not mutate source snapshots or unchanged published files. The preparation command must be idempotent for identical source input.

Add:

```json
"finance:prepare": "node scripts/wiki-publish/prepare.mjs --collection finance",
"finance:finalize": "node scripts/wiki-publish/finalize.mjs --collection finance"
```

- [ ] **Step 4: Generalize atomic finalization**

Use collection-specific docs roots, manifests, workspaces, lock names, backup prefixes, URL prefixes, title, and description. Preserve Wiki translation-baseline enforcement; Finance mirror mode instead requires each affected page hash to differ from its previous public baseline after preparation.

Generate Finance index links under `/finance/` and label sections `实体`, `概念`, and `对比分析`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/markdown.test.mjs scripts/wiki-publish/finalize.test.mjs`

Expected: all sanitizer, atomic replacement, recovery, deletion-confirmation, and existing Wiki translation tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/wiki-publish/prepare.mjs scripts/wiki-publish/prepare.test.mjs scripts/wiki-publish/markdown.mjs scripts/wiki-publish/markdown.test.mjs scripts/wiki-publish/finalize.mjs scripts/wiki-publish/finalize.test.mjs
git commit -m "feat: prepare finance wiki mirror"
```

---

### Task 4: Import the 48 Finance Pages and Add Independent Navigation

**Files:**
- Create: `docs/finance/index.md`
- Create: `docs/finance/concepts/*.md` from the 42 public concepts
- Create: `docs/finance/entities/*.md` from the 6 public entities
- Create: `finance-manifest.json`
- Modify: `docs/.vitepress/config.mts`
- Modify: `scripts/theme-config.test.mjs`

**Interfaces:**
- Consumes: Finance commands from Tasks 2 and 3 and the source supplied through `FINANCE_WIKI_PATH`.
- Produces: stable `/finance/`, `/finance/concepts/<slug>`, and `/finance/entities/<slug>` routes.

- [ ] **Step 1: Write failing navigation tests**

Extend theme config tests to require a top navigation item `{ text: '金融知识库', link: '/finance/' }`, a `/finance/` sidebar, exactly 48 Finance page links, and zero overlap with `/wiki/` routes.

Add manifest/sidebar completeness logic that reports the exact missing Finance source when a manifest page is absent from navigation.

- [ ] **Step 2: Run tests and verify RED**

Run: `node scripts/theme-config.test.mjs`

Expected: FAIL because `/finance/` navigation does not exist.

- [ ] **Step 3: Run the initial incremental pipeline**

Run:

```bash
FINANCE_WIKI_PATH="$FINANCE_WIKI_PATH" npm run finance:sync
npm run finance:prepare
npm run finance:finalize
```

Expected: `48 added, 0 changed, 0 deleted`; 48 published pages; no source paths or residual wikilinks in `docs/finance`.

- [ ] **Step 4: Add Finance navigation**

Add the Finance top-nav item and an independent sidebar with `实体`, `概念`, and `对比分析` groups. List the 48 generated routes using their Chinese titles. Keep the existing `/wiki/` sidebar byte-for-byte unchanged apart from surrounding syntax required by formatting.

- [ ] **Step 5: Audit generated public content**

Run:

```bash
rg -n 'sources:|raw/|\[\[|/Users/' docs/finance
rg -n '`[^`]+\.md`|原始来源' docs/finance
```

Expected: no private markers. If the second audit identifies prose-only source filenames, remove those clauses from the generated public copy and add an exact sanitizer regression fixture before proceeding.

- [ ] **Step 6: Run navigation tests and verify GREEN**

Run: `node scripts/theme-config.test.mjs && npm run finance:validate`

Expected: 48 Finance pages, complete sidebar, no duplicate routes, all links valid.

- [ ] **Step 7: Commit**

```bash
git add docs/finance finance-manifest.json docs/.vitepress/config.mts scripts/theme-config.test.mjs
git commit -m "content: publish finance knowledge base"
```

---

### Task 5: Cross-Collection Security, Regression Gates, and Deployment

**Files:**
- Modify: `scripts/wiki-qa/security-scan.mjs`
- Modify: `scripts/wiki-qa/security-scan.test.mjs`
- Modify: `worker/wrangler-config.test.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: both manifests and both public document roots.
- Produces: one test command that validates Wiki and Finance while QA indexing remains Wiki-only.

- [ ] **Step 1: Write failing cross-collection security tests**

Add fixtures proving the scan rejects private metadata, raw paths, absolute paths, residual wikilinks, broken links, extra files, and missing manifest pages under `docs/finance` exactly as it does for `docs/wiki`.

Add a regression assertion that `qa:index` still reports only `docs/wiki` inputs and never indexes `docs/finance`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test scripts/wiki-qa/security-scan.test.mjs worker/wrangler-config.test.mjs`

Expected: FAIL because Finance is not part of the security/build contract.

- [ ] **Step 3: Extend project verification**

Update the main test script to run `finance:validate` before the VitePress build. Update the security scan to iterate over the two registered collections while retaining existing artifact and `docs/superpowers/**` checks.

Document only environment-variable commands in README; never commit either local Wiki path.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npx wrangler deploy --dry-run
git diff --check
```

Expected:

- 45 LLM Wiki pages validated.
- 48 Finance pages validated.
- QA index remains 45 pages and 68 chunks.
- VitePress builds all `/finance/` routes.
- Wrangler dry-run succeeds.
- No whitespace errors or private source paths.

- [ ] **Step 5: Commit**

```bash
git add package.json README.md scripts/wiki-qa/security-scan.mjs scripts/wiki-qa/security-scan.test.mjs worker/wrangler-config.test.mjs
git commit -m "test: secure multiple wiki collections"
```

- [ ] **Step 6: Publish and verify production**

Push `feature/finance-wiki-publishing`, open a PR against `main`, wait for the Cloudflare check, merge after success, then wait for the `main` production build.

Verify:

```bash
curl -fsS https://juzxailab.com/finance/
curl -fsS https://juzxailab.com/finance/concepts/quantitative-investing-knowledge-map
curl -fsS https://juzxailab.com/finance/entities/edward-thorp
curl -fsS https://juzxailab.com/wiki/concepts/sdd-95-5-principle
```

Expected: all return HTTP 200 with the expected titles; the existing `/ask` endpoint behavior and Wiki URLs remain unchanged.
