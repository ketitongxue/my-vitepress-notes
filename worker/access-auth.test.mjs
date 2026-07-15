import assert from 'node:assert/strict'
import test from 'node:test'

import { createAccessAuthenticator } from './access-auth.mjs'

const env = {
  ACCESS_AUD: 'audience-tag',
  ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
  ADMIN_EMAIL: 'owner@example.com',
}

test('Access authentication requires complete configuration and a JWT', async () => {
  const authenticate = createAccessAuthenticator({ verify: assert.fail })
  const missingConfig = await authenticate(new Request('https://example.com'), {})
  const missingToken = await authenticate(new Request('https://example.com'), env)

  assert.equal(missingConfig.response.status, 403)
  assert.deepEqual(await missingConfig.response.json(), { error: 'ADMIN_AUTH_MISCONFIGURED' })
  assert.equal(missingToken.response.status, 403)
  assert.deepEqual(await missingToken.response.json(), { error: 'ADMIN_FORBIDDEN' })
})

test('Access authentication verifies audience, issuer and optional owner email', async () => {
  const calls = []
  const authenticate = createAccessAuthenticator({
    async verify(token, options) {
      calls.push({ token, options })
      return { email: 'OWNER@example.com', sub: 'owner' }
    },
  })
  const request = new Request('https://example.com', {
    headers: { 'cf-access-jwt-assertion': 'signed-token' },
  })

  const result = await authenticate(request, env)

  assert.deepEqual(result, { ok: true, identity: 'owner@example.com' })
  assert.deepEqual(calls, [{
    token: 'signed-token',
    options: {
      audience: 'audience-tag',
      teamDomain: 'https://example.cloudflareaccess.com',
    },
  }])
})

test('Access authentication rejects a verified identity outside the owner allowlist', async () => {
  const authenticate = createAccessAuthenticator({
    async verify() { return { email: 'other@example.com' } },
  })
  const result = await authenticate(new Request('https://example.com', {
    headers: { 'cf-access-jwt-assertion': 'signed-token' },
  }), env)

  assert.equal(result.ok, false)
  assert.equal(result.response.status, 403)
})
