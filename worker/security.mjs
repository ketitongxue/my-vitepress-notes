export class SecurityConfigurationError extends Error {
  constructor(code) {
    super(code)
    this.name = 'SecurityConfigurationError'
    this.code = code
  }
}

export function jsonError(code, status) {
  return Response.json(
    { error: code },
    { status, headers: { 'cache-control': 'no-store' } },
  )
}

export async function hashVisitor(ip, salt) {
  if (typeof salt !== 'string' || salt.trim() === '') {
    throw new SecurityConfigurationError('SERVER_MISCONFIGURED')
  }
  if (typeof ip !== 'string' || ip.trim() === '') {
    throw new SecurityConfigurationError('INVALID_VISITOR')
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ip))
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function checkMinuteLimit(env, visitorKey) {
  const limiter = env?.QA_RATE_LIMITER
  if (!visitorKey || typeof limiter?.limit !== 'function') {
    return { ok: false, response: jsonError('SERVER_MISCONFIGURED', 503) }
  }

  try {
    const result = await limiter.limit({ key: visitorKey })
    if (result?.success !== true) {
      return { ok: false, response: jsonError('RATE_LIMITED_MINUTE', 429) }
    }
    return { ok: true }
  } catch {
    return { ok: false, response: jsonError('SERVER_MISCONFIGURED', 503) }
  }
}
