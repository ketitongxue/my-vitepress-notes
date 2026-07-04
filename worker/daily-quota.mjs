const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VISITOR_KEY_PATTERN = /^[0-9a-f]{64}$/
const INPUT_FIELDS = ['date', 'globalLimit', 'perVisitorLimit', 'visitorKey']

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

function validUtcDate(value) {
  if (typeof value !== 'string' || !UTC_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

function validLimit(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 10_000
}

function validInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const fields = Object.keys(value).sort()
  if (fields.length !== INPUT_FIELDS.length
    || fields.some((field, index) => field !== INPUT_FIELDS[index])) return false
  return validUtcDate(value.date)
    && VISITOR_KEY_PATTERN.test(value.visitorKey)
    && validLimit(value.perVisitorLimit)
    && validLimit(value.globalLimit)
    && value.perVisitorLimit <= value.globalLimit
}

function validQuotaResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowedFields = value.allowed
    ? ['allowed', 'globalCount', 'visitorCount']
    : ['allowed', 'globalCount', 'reason', 'visitorCount']
  const fields = Object.keys(value).sort()
  if (fields.length !== allowedFields.length
    || fields.some((field, index) => field !== allowedFields[index])) return false
  if (typeof value.allowed !== 'boolean'
    || !Number.isSafeInteger(value.globalCount) || value.globalCount < 0
    || !Number.isSafeInteger(value.visitorCount) || value.visitorCount < 0) return false
  return value.allowed || ['GLOBAL_LIMIT', 'PER_VISITOR_LIMIT'].includes(value.reason)
}

export async function reserveQuota(storage, options) {
  if (!storage || typeof storage.transaction !== 'function' || !validInput(options)) {
    throw new TypeError('INVALID_QUOTA_INPUT')
  }

  const { date, visitorKey, perVisitorLimit, globalLimit } = options
  return storage.transaction(async (txn) => {
    const storedDate = await txn.get('date')
    if (storedDate !== date) {
      const staleVisitors = await txn.list({ prefix: 'visitor/' })
      if (staleVisitors.size > 0) await txn.delete([...staleVisitors.keys()])
      await txn.put({ date, globalCount: 0 })
    }

    const visitorStorageKey = `visitor/${visitorKey}`
    const globalCount = storedDate === date ? (await txn.get('globalCount') ?? 0) : 0
    const visitorCount = storedDate === date ? (await txn.get(visitorStorageKey) ?? 0) : 0

    if (globalCount >= globalLimit) {
      return { allowed: false, reason: 'GLOBAL_LIMIT', globalCount, visitorCount }
    }
    if (visitorCount >= perVisitorLimit) {
      return { allowed: false, reason: 'PER_VISITOR_LIMIT', globalCount, visitorCount }
    }

    const nextGlobalCount = globalCount + 1
    const nextVisitorCount = visitorCount + 1
    await txn.put({
      globalCount: nextGlobalCount,
      [visitorStorageKey]: nextVisitorCount,
    })
    return {
      allowed: true,
      globalCount: nextGlobalCount,
      visitorCount: nextVisitorCount,
    }
  })
}

export class DailyQuota {
  constructor(state) {
    this.storage = state.storage
  }

  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname !== '/reserve') return jsonResponse({ error: 'NOT_FOUND' }, 404)
    if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      return jsonResponse({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415)
    }

    let input
    try {
      input = await request.json()
    } catch {
      return jsonResponse({ error: 'INVALID_JSON' }, 400)
    }
    if (!validInput(input)) return jsonResponse({ error: 'INVALID_BODY' }, 400)

    try {
      return jsonResponse(await reserveQuota(this.storage, input))
    } catch {
      return jsonResponse({ error: 'QUOTA_UNAVAILABLE' }, 503)
    }
  }
}

export async function reserveDailyQuota(env, input) {
  if (!validInput(input)
    || typeof env?.QA_QUOTA?.idFromName !== 'function'
    || typeof env.QA_QUOTA.get !== 'function') {
    throw new Error('INVALID_QUOTA_CONFIGURATION')
  }

  const id = env.QA_QUOTA.idFromName('global')
  const stub = env.QA_QUOTA.get(id)
  if (typeof stub?.fetch !== 'function') throw new Error('INVALID_QUOTA_CONFIGURATION')

  const response = await stub.fetch(new Request('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }))
  if (!response.ok) throw new Error('QUOTA_UNAVAILABLE')

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('INVALID_QUOTA_RESPONSE')
  }
  if (!validQuotaResult(result)) throw new Error('INVALID_QUOTA_RESPONSE')
  return result
}
