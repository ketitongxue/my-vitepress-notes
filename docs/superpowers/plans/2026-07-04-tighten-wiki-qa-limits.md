# Tighten Wiki QA Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change production Wiki Q&A limits to 3 validated requests per IP per 60 seconds, 5 reliable answers per IP per UTC day, and 10 reliable answers globally per UTC day.

**Architecture:** Keep the existing two-layer design. Cloudflare's Rate Limiting binding remains the fast, permissive short-window guard; the singleton SQLite Durable Object remains the strict atomic daily accounting system. Only configuration values, boundary expectations, and documentation change.

**Tech Stack:** Cloudflare Workers, Wrangler 4.107.0, SQLite Durable Objects, Node.js test runner, VitePress.

---

### Task 1: Lock the new limits into tests and configuration

**Files:**
- Modify: `worker/wrangler-config.test.mjs`
- Modify: `worker/daily-quota.test.mjs`
- Modify: `worker/ask.test.mjs`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Add failing Wrangler configuration assertions**

Extend `worker/wrangler-config.test.mjs` so the configuration test includes:

```js
assert.deepEqual(config.ratelimits, [{
  name: 'QA_RATE_LIMITER',
  namespace_id: '20260704',
  simple: { limit: 3, period: 60 },
}])
assert.equal(config.vars.DAILY_PER_IP_LIMIT, '5')
assert.equal(config.vars.DAILY_GLOBAL_LIMIT, '10')
```

- [ ] **Step 2: Change daily quota boundary fixtures to 5 and 10**

In `worker/daily-quota.test.mjs`, change the default input and boundary tests:

```js
function input(overrides = {}) {
  return {
    date,
    visitorKey,
    perVisitorLimit: 5,
    globalLimit: 10,
    ...overrides,
  }
}
```

The per-visitor test must issue 6 reservations, assert 5 allowed, and assert the final counts remain 5. The global test must issue 11 distinct visitors, assert the 11th is rejected with `globalCount: 10`, and verify storage remains 10. Update the concurrency fixture to begin at 8 and assert only 2 of 20 concurrent reservations succeed.

- [ ] **Step 3: Update API orchestration fixtures**

Change the default environment in `worker/ask.test.mjs`:

```js
DAILY_PER_IP_LIMIT: '5',
DAILY_GLOBAL_LIMIT: '10',
```

Keep the existing assertion that `reserveDailyQuota` receives these parsed values, proving the deployed configuration reaches strict accounting.

- [ ] **Step 4: Run targeted tests and verify RED**

Run:

```bash
node --test worker/wrangler-config.test.mjs worker/daily-quota.test.mjs worker/ask.test.mjs
```

Expected: FAIL because `wrangler.jsonc` still contains 5/minute, 30/day, and 50/day.

- [ ] **Step 5: Apply the minimal configuration change**

Update `wrangler.jsonc`:

```jsonc
"vars": {
  "ALLOWED_ORIGIN": "https://juzxailab.com",
  "DEEPSEEK_MODEL": "deepseek-v4-flash",
  "DAILY_PER_IP_LIMIT": "5",
  "DAILY_GLOBAL_LIMIT": "10"
},
"ratelimits": [
  {
    "name": "QA_RATE_LIMITER",
    "namespace_id": "20260704",
    "simple": {
      "limit": 3,
      "period": 60
    }
  }
]
```

- [ ] **Step 6: Run targeted tests and verify GREEN**

Run:

```bash
node --test worker/wrangler-config.test.mjs worker/daily-quota.test.mjs worker/ask.test.mjs
```

Expected: all targeted tests pass, including 5/6, 10/11, and concurrent hard-limit boundaries.

- [ ] **Step 7: Commit the tested configuration**

```bash
git add wrangler.jsonc worker/wrangler-config.test.mjs worker/daily-quota.test.mjs worker/ask.test.mjs
git commit -m "fix: tighten wiki qa limits"
```

### Task 2: Synchronize documentation and verify deployment

**Files:**
- Modify: `README.md`
- Modify: `scripts/wiki-qa/security-scan.test.mjs`

- [ ] **Step 1: Write the failing README contract**

Replace the old required limit strings in `scripts/wiki-qa/security-scan.test.mjs` with:

```js
'3 次/分钟',
'5 次/天',
'10 次/天',
```

Also assert the obsolete combined statement is absent:

```js
assert.ok(!readme.includes('5 次/分钟、30 次/天，全站 50 次/天'))
```

- [ ] **Step 2: Run the README contract and verify RED**

Run:

```bash
node --test scripts/wiki-qa/security-scan.test.mjs
```

Expected: FAIL because README still documents the old limits.

- [ ] **Step 3: Update README production limits**

Replace the production-limit sentence with:

```md
公开问答限制为每个 IP 3 次/分钟、5 次/天，全站 10 次/天。每日配额由单例
SQLite Durable Object 原子计数，并按 UTC 日期重置。
```

- [ ] **Step 4: Run the complete local verification**

Run:

```bash
npm test
WRANGLER_LOG_PATH="$TMPDIR/wiki-qa-limit-dry-run.log" npx wrangler deploy --dry-run
git diff --check
```

Expected: all tests, VitePress build, security scan, and Wrangler dry-run pass; binding output shows `QA_RATE_LIMITER (3 requests/60s)`, `DAILY_PER_IP_LIMIT ("5")`, and `DAILY_GLOBAL_LIMIT ("10")` without printing Secrets.

- [ ] **Step 5: Commit documentation and verification contracts**

```bash
git add README.md scripts/wiki-qa/security-scan.test.mjs
git commit -m "docs: document tighter wiki qa limits"
```

- [ ] **Step 6: Publish and verify production**

Push the branch and open a Draft PR. After merge, deploy with:

```bash
WRANGLER_LOG_PATH="$TMPDIR/wiki-qa-limit-deploy.log" npm run deploy
```

Verify `/ask/` returns HTTP 200, one normal knowledge question streams `meta`, `delta`, and `done`, and Wrangler reports the new non-secret binding values. Do not consume repeated production requests merely to exhaust the global daily quota.
