import { createRemoteJWKSet, jwtVerify } from 'jose'

const jwksByDomain = new Map()

function forbidden(code = 'ADMIN_FORBIDDEN') {
  return Response.json(
    { error: code },
    { status: 403, headers: { 'cache-control': 'no-store' } },
  )
}

function normalizedTeamDomain(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.pathname !== '/') return null
    return url.origin
  } catch {
    return null
  }
}

async function verifyAccessJwt(token, { audience, teamDomain }) {
  let jwks = jwksByDomain.get(teamDomain)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', teamDomain))
    jwksByDomain.set(teamDomain, jwks)
  }
  const result = await jwtVerify(token, jwks, {
    issuer: teamDomain,
    audience,
  })
  return result.payload
}

export function createAccessAuthenticator({ verify = verifyAccessJwt } = {}) {
  return async function authenticateAdmin(request, env) {
    const audience = typeof env?.ACCESS_AUD === 'string' ? env.ACCESS_AUD.trim() : ''
    const teamDomain = normalizedTeamDomain(env?.ACCESS_TEAM_DOMAIN)
    if (!audience || !teamDomain) return { ok: false, response: forbidden('ADMIN_AUTH_MISCONFIGURED') }

    const token = request.headers.get('cf-access-jwt-assertion')
    if (!token) return { ok: false, response: forbidden() }

    try {
      const payload = await verify(token, { audience, teamDomain })
      const email = typeof payload?.email === 'string' ? payload.email.toLowerCase() : ''
      const allowedEmail = typeof env?.ADMIN_EMAIL === 'string'
        ? env.ADMIN_EMAIL.trim().toLowerCase()
        : ''
      if (allowedEmail && email !== allowedEmail) return { ok: false, response: forbidden() }
      return { ok: true, identity: email || String(payload?.sub ?? 'access-user') }
    } catch {
      return { ok: false, response: forbidden() }
    }
  }
}

export const authenticateAdmin = createAccessAuthenticator()
