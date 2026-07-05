# Rename Site to AI 纪元 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every active site and repository use of `柯提的 AI 纪元` with `AI 纪元` and prevent the old brand from returning.

**Architecture:** Add one focused Node test that checks the six brand-bearing files for the new name and rejects both old-name spellings. Then make exact text-only replacements in those files and include the test in the main test suite.

**Tech Stack:** Node.js built-in test runner, VitePress, Markdown, TypeScript configuration, Cloudflare Worker JavaScript.

---

### Task 1: Add a failing brand consistency test

**Files:**
- Create: `scripts/brand-name.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `scripts/brand-name.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const brandedFiles = [
  'README.md',
  'docs/index.md',
  'docs/about.md',
  'docs/.vitepress/config.mts',
  'worker/deepseek.mjs',
]

test('site branding consistently uses AI 纪元', async () => {
  const contents = await Promise.all(
    brandedFiles.map(async (file) => [file, await readFile(new URL(`../${file}`, import.meta.url), 'utf8')]),
  )

  for (const [file, content] of contents) {
    assert.doesNotMatch(content, /柯提的\s*AI 纪元/u, `${file} still contains the old brand`)
    assert.match(content, /AI 纪元/u, `${file} must contain the new brand`)
  }
})
```

Add the test to the beginning of the `test` script in `package.json` after `npm run qa:index &&`:

```json
"test": "npm run qa:index && node --test scripts/brand-name.test.mjs && node --test scripts/wiki-publish/*.test.mjs && node --test scripts/wiki-qa/*.test.mjs && node --test worker/*.test.mjs && npm run wiki:validate && npm run test:content && npm run test:theme && npm run docs:build && npm run qa:security"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/brand-name.test.mjs`

Expected: FAIL with a message such as `README.md still contains the old brand`.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/brand-name.test.mjs package.json
git commit -m "test: enforce AI era branding"
```

### Task 2: Replace the old brand and verify the site

**Files:**
- Modify: `README.md`
- Modify: `docs/index.md`
- Modify: `docs/about.md`
- Modify: `docs/.vitepress/config.mts`
- Modify: `worker/deepseek.mjs`

- [ ] **Step 1: Make the minimal replacements**

Replace every exact `柯提的 AI 纪元` occurrence in the five files with `AI 纪元`. This changes six occurrences because `docs/about.md` contains the name twice.

- [ ] **Step 2: Run the focused test**

Run: `node --test scripts/brand-name.test.mjs`

Expected: PASS with `site branding consistently uses AI 纪元`.

- [ ] **Step 3: Confirm the old name is absent from active source**

Run:

```bash
rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!docs/superpowers/**' '柯提的 AI 纪元|柯提的AI纪元' .
```

Expected: no matches and exit status 1.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm test`

Expected: all Node tests, content checks, theme checks, security scan, and VitePress production build pass.

- [ ] **Step 5: Commit the implementation**

```bash
git add README.md docs/index.md docs/about.md docs/.vitepress/config.mts worker/deepseek.mjs
git commit -m "chore: rename site to AI 纪元"
```
