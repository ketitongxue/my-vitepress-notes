import { isJsonContentType } from './request.mjs'

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VISITOR_KEY_PATTERN = /^[0-9a-f]{64}$/
const INPUT_FIELDS = ['date', 'globalLimit', 'perVisitorLimit', 'visitorKey']
const REQUEST_FIELDS = ['globalLimit', 'perVisitorLimit', 'visitorKey']

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

function hasExactFields(value, expectedFields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const fields = Object.keys(value).sort()
  return fields.length === expectedFields.length
    && fields.every((field, index) => field === expectedFields[index])
}

function validRequest(value) {
  return hasExactFields(value, REQUEST_FIELDS)
    && VISITOR_KEY_PATTERN.test(value.visitorKey)
    && validLimit(value.perVisitorLimit)
    && validLimit(value.globalLimit)
    && value.perVisitorLimit <= value.globalLimit
}

function validInput(value) {
  return hasExactFields(value, INPUT_FIELDS)
    && validUtcDate(value.date)
    && validRequest({
      globalLimit: value.globalLimit,
      perVisitorLimit: value.perVisitorLimit,
      visitorKey: value.visitorKey,
    })
}

function validCounter(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function validQuotaResult(value, limits) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowedFields = value.allowed
    ? ['allowed', 'globalCount', 'visitorCount']
    : ['allowed', 'globalCount', 'reason', 'visitorCount']
  const fields = Object.keys(value).sort()
  if (fields.length !== allowedFields.length
    || fields.some((field, index) => field !== allowedFields[index])) return false
  if (typeof value.allowed !== 'boolean'
    || !validCounter(value.globalCount)
    || !validCounter(value.visitorCount)
    || value.visitorCount > value.globalCount) return false

  if (value.allowed) {
    return value.globalCount > 0
      && value.visitorCount > 0
      && value.globalCount <= limits.globalLimit
      && value.visitorCount <= limits.perVisitorLimit
  }
  if (value.reason === 'GLOBAL_LIMIT') return value.globalCount >= limits.globalLimit
  if (value.reason === 'PER_VISITOR_LIMIT') {
    return value.globalCount < limits.globalLimit
      && value.visitorCount >= limits.perVisitorLimit
  }
  return value.reason === 'STALE_DATE'
}

async function readStoredState(txn, requestDate, visitorKey) {
  const date = await txn.get('date')
  const globalCount = await txn.get('globalCount')
  const isEmpty = date === undefined && globalCount === undefined
  if (isEmpty) {
    const orphanCount = await txn.get(`visitor/${requestDate}/${visitorKey}`)
    if (orphanCount !== undefined) throw new Error('CORRUPT_QUOTA_STATE')
    return { date: undefined, globalCount: 0, visitorCount: 0 }
  }
  if (!validUtcDate(date) || !validCounter(globalCount)) throw new Error('CORRUPT_QUOTA_STATE')

  const visitorCount = await txn.get(`visitor/${date}/${visitorKey}`) ?? 0
  if (!validCounter(visitorCount) || visitorCount > globalCount) {
    throw new Error('CORRUPT_QUOTA_STATE')
  }
  if (requestDate > date) {
    const targetCount = await txn.get(`visitor/${requestDate}/${visitorKey}`)
    if (targetCount !== undefined) throw new Error('CORRUPT_QUOTA_STATE')
  }
  return { date, globalCount, visitorCount }
}

function utcDate(clock) {
  const value = clock()
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('INVALID_QUOTA_CLOCK')
  }
  return value.toISOString().slice(0, 10)
}

export async function reserveQuota(storage, options) {
  if (!storage || typeof storage.transaction !== 'function' || !validInput(options)) {
    throw new TypeError('INVALID_QUOTA_INPUT')
  }

  const { date, visitorKey, perVisitorLimit, globalLimit } = options
  return storage.transaction(async (txn) => {
    const stored = await readStoredState(txn, date, visitorKey)
    if (stored.date !== undefined && date < stored.date) {
      return {
        allowed: false,
        reason: 'STALE_DATE',
        globalCount: stored.globalCount,
        visitorCount: stored.visitorCount,
      }
    }
    if (stored.date !== date) {
      // Date-prefixed visitor keys make prior days unreachable without a hot-path scan.
      await txn.put({ date, globalCount: 0 })
    }

    const visitorStorageKey = `visitor/${date}/${visitorKey}`
    const globalCount = stored.date === date ? stored.globalCount : 0
    const visitorCount = stored.date === date ? stored.visitorCount : 0

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
  constructor(state, _env, clock = () => new Date()) {
    this.storage = state.storage
    this.clock = clock
  }

  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname !== '/reserve') return jsonResponse({ error: 'NOT_FOUND' }, 404)
    if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
    if (!isJsonContentType(request.headers.get('content-type'))) {
      return jsonResponse({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415)
    }

    let input
    try {
      input = await request.json()
    } catch {
      return jsonResponse({ error: 'INVALID_JSON' }, 400)
    }
    if (!validRequest(input)) return jsonResponse({ error: 'INVALID_BODY' }, 400)

    try {
      return jsonResponse(await reserveQuota(this.storage, {
        ...input,
        date: utcDate(this.clock),
      }))
    } catch {
      return jsonResponse({ error: 'QUOTA_UNAVAILABLE' }, 503)
    }
  }
}

export async function reserveDailyQuota(env, input) {
  if (!validRequest(input)
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
  if (!validQuotaResult(result, input)) throw new Error('INVALID_QUOTA_RESPONSE')
  return result
}
