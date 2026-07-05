# Cloudflare Node 22 Build Fix

## Goal

Restore automatic Cloudflare Workers deployments by making the repository's declared Node.js version compatible with Wrangler 4.107.0.

## Root Cause

Cloudflare successfully completes `npm run build`, then reads `.node-version` and runs the deploy step with Node.js 20.20.2. Wrangler 4.107.0 requires Node.js 22 or newer, so `npx wrangler deploy` exits before uploading the Worker.

## Design

Change `.node-version` from `20` to `22`. Keep the Wrangler version and Cloudflare build commands unchanged. Add an automated configuration test that asserts the repository declares Node 22, then run the full test suite and a Wrangler dry-run deployment.

## Acceptance Criteria

- `.node-version` contains `22`.
- The automated test rejects Node 20 and accepts Node 22.
- The complete test suite passes.
- `npx wrangler deploy --dry-run` succeeds.
- A PR build reaches the Wrangler deployment step without the Node version error.
