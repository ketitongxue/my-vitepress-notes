# Cloudflare Node 22 Build Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cloudflare Workers Builds use Node.js 22 so Wrangler 4.107.0 can deploy automatically.

**Architecture:** Extend the existing Wrangler configuration test to assert the repository Node version, then update the single source of truth in `.node-version`. Keep Cloudflare commands and Wrangler dependencies unchanged.

**Tech Stack:** Node.js built-in test runner, Wrangler 4.107.0, Cloudflare Workers Builds.

---

### Task 1: Align the repository Node version with Wrangler

**Files:**
- Modify: `worker/wrangler-config.test.mjs`
- Modify: `.node-version`

- [ ] **Step 1: Write the failing configuration test**

Add this test to `worker/wrangler-config.test.mjs`:

```js
test('Cloudflare builds use a Node version supported by Wrangler', async () => {
  const nodeVersion = (await readFile(new URL('../.node-version', import.meta.url), 'utf8')).trim()

  assert.equal(nodeVersion, '22')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test worker/wrangler-config.test.mjs`

Expected: FAIL because `.node-version` currently contains `20` rather than `22`.

- [ ] **Step 3: Apply the minimal fix**

Replace the complete contents of `.node-version` with:

```text
22
```

- [ ] **Step 4: Run focused and full verification**

Run: `node --test worker/wrangler-config.test.mjs`

Expected: all tests in the file pass.

Run: `npm test`

Expected: all tests, content checks, theme checks, production build, and security scan pass.

Run: `npx wrangler deploy --dry-run`

Expected: Wrangler validates the Worker and assets without a Node version error or production deployment.

- [ ] **Step 5: Commit**

```bash
git add .node-version worker/wrangler-config.test.mjs
git commit -m "fix: use Node 22 for Cloudflare builds"
```
