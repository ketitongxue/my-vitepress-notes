import wikiIndex from './generated/wiki-index.json' with { type: 'json' }

import { reserveDailyQuota } from './daily-quota.mjs'
import { DeepSeekError, streamDeepSeek } from './deepseek.mjs'
import { validateAskRequest } from './request.mjs'
import { retrieve } from './retrieval.mjs'
import { checkMinuteLimit, hashVisitor, jsonError } from './security.mjs'
import { createSseResponse, encodeEventBytes } from './sse.mjs'

const NO_RECALL_TEXT = '知识库中没有足够信息回答这个问题。'
const SAFE_DEEPSEEK_ERRORS = new Set([
  'DEEPSEEK_ABORTED',
  'DEEPSEEK_AUTH',
  'DEEPSEEK_BAD_RESPONSE',
  'DEEPSEEK_NETWORK',
  'DEEPSEEK_PROTOCOL',
  'DEEPSEEK_RATE_LIMITED',
  'DEEPSEEK_TIMEOUT',
  'DEEPSEEK_UNAVAILABLE',
])
const WIKI_URL = /^\/wiki\/(?:concepts|entities|comparisons)\/[a-z0-9][a-z0-9-]*$/

const defaults = {
  index: wikiIndex,
  validateAskRequest,
  hashVisitor,
  checkMinuteLimit,
  retrieve,
  reserveDailyQuota,
  streamDeepSeek,
  randomUUID: () => crypto.randomUUID(),
  now: () => Date.now(),
  logger: console,
}

function positiveLimit(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= 10_000 ? parsed : null
}

function configuredString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function validAllowedOrigin(value) {
  if (!configuredString(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value && url.pathname === '/'
  } catch {
    return false
  }
}

function productionConfig(env) {
  const perVisitorLimit = positiveLimit(env?.DAILY_PER_IP_LIMIT)
  const globalLimit = positiveLimit(env?.DAILY_GLOBAL_LIMIT)
  const apiKey = configuredString(env?.DEEPSEEK_API_KEY)
  const model = configuredString(env?.DEEPSEEK_MODEL)
  const salt = configuredString(env?.IP_HASH_SALT)
  if (!perVisitorLimit || !globalLimit || perVisitorLimit > globalLimit
    || !apiKey || !model || !salt
    || typeof env?.QA_RATE_LIMITER?.limit !== 'function'
    || typeof env?.QA_QUOTA?.idFromName !== 'function'
    || typeof env?.QA_QUOTA?.get !== 'function') return null
  return { perVisitorLimit, globalLimit, apiKey, model, salt }
}

function safeErrorCode(error) {
  return error instanceof DeepSeekError && SAFE_DEEPSEEK_ERRORS.has(error.code)
    ? error.code
    : SAFE_DEEPSEEK_ERRORS.has(error?.code) ? error.code : 'DEEPSEEK_UNAVAILABLE'
}

function safeTokenUsage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const usage = {}
  for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
    if (Number.isSafeInteger(value[key]) && value[key] >= 0) usage[key] = value[key]
  }
  return Object.keys(usage).length ? usage : null
}

function safeSources(retrieval, index) {
  const publishedUrls = new Set((index?.chunks ?? []).map(({ url }) => url))
  const chunksById = new Map((retrieval?.chunks ?? []).map((chunk) => [chunk?.id, chunk]))
  const seen = new Set()
  const sources = []
  for (const candidate of retrieval?.sources ?? []) {
    const chunk = chunksById.get(candidate?.id)
    if (!chunk || seen.has(chunk.id) || typeof chunk.id !== 'string'
      || typeof chunk.title !== 'string' || typeof chunk.section !== 'string'
      || typeof chunk.text !== 'string' || !WIKI_URL.test(chunk.url)
      || !publishedUrls.has(chunk.url) || candidate.url !== chunk.url) continue
    seen.add(chunk.id)
    sources.push({
      meta: { id: chunk.id, title: chunk.title, section: chunk.section, url: chunk.url },
      provider: { title: chunk.title, section: chunk.section, url: chunk.url, text: chunk.text },
    })
  }
  return sources
}

function noRecallResponse(sources) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encodeEventBytes('meta', { sources: sources.map(({ meta }) => meta), noAnswer: true }))
      controller.enqueue(encodeEventBytes('delta', { text: NO_RECALL_TEXT }))
      controller.enqueue(encodeEventBytes('done', { reason: 'NO_CONFIDENT_RECALL', usage: null }))
      controller.close()
    },
  })
  return createSseResponse(stream)
}

function modelResponse({ streamFactory, meta, onComplete }) {
  let providerReader = null
  let cancelled = false
  let started = false
  let finished = false

  const output = new ReadableStream({
    start(controller) {
      controller.enqueue(encodeEventBytes('meta', { sources: meta }))
    },
    async pull(controller) {
      if (finished || cancelled) return
      try {
        if (!started) {
          started = true
          const providerStream = await streamFactory()
          if (cancelled) {
            await providerStream.cancel().catch(() => {})
            return
          }
          providerReader = providerStream.getReader()
        }

        const { done, value } = await providerReader.read()
        if (cancelled) return
        if (done) {
          finished = true
          controller.enqueue(encodeEventBytes('done', { usage: null }))
          controller.close()
          onComplete(200, null)
          return
        }
        if (value?.type === 'delta' && typeof value.text === 'string') {
          controller.enqueue(encodeEventBytes('delta', { text: value.text }))
          return
        }
        if (value?.type === 'done') {
          finished = true
          const usage = safeTokenUsage(value.usage)
          controller.enqueue(encodeEventBytes('done', { usage }))
          controller.close()
          onComplete(200, usage)
        }
      } catch (error) {
        if (cancelled) return
        finished = true
        controller.enqueue(encodeEventBytes('error', { code: safeErrorCode(error) }))
        controller.close()
        onComplete(502, null)
      }
    },
    async cancel() {
      if (cancelled || finished) return
      cancelled = true
      finished = true
      try {
        await providerReader?.cancel()
      } catch {
        // Cancellation is best-effort. Provider details must never leave the Worker.
      }
      onComplete(499, null)
    },
  })
  return createSseResponse(output)
}

export async function handleAsk(request, env, _ctx, injected = {}) {
  const deps = { ...defaults, ...injected }
  const startedAt = deps.now()
  const requestId = deps.randomUUID()
  let retrievalCount = 0
  let logged = false
  const log = (status, tokenUsage = null) => {
    if (logged) return
    logged = true
    const entry = {
      requestId,
      status,
      duration: Math.max(0, deps.now() - startedAt),
      retrievalCount,
      tokenUsage,
    }
    try {
      deps.logger?.info?.(entry)
    } catch {
      // Logging must never change the API response.
    }
  }
  const finish = (response) => {
    log(response.status)
    return response
  }

  if (!validAllowedOrigin(env?.ALLOWED_ORIGIN)) {
    return finish(jsonError('SERVER_MISCONFIGURED', 503))
  }

  let validation
  try {
    validation = await deps.validateAskRequest(request, env?.ALLOWED_ORIGIN)
  } catch {
    return finish(jsonError('SERVER_MISCONFIGURED', 503))
  }
  if (!validation.ok) return finish(validation.response)

  const config = productionConfig(env)
  if (!config) return finish(jsonError('SERVER_MISCONFIGURED', 503))

  let visitorKey
  try {
    visitorKey = await deps.hashVisitor(request.headers.get('cf-connecting-ip'), config.salt)
  } catch {
    return finish(jsonError('SERVER_MISCONFIGURED', 503))
  }

  let minute
  try {
    minute = await deps.checkMinuteLimit(env, visitorKey)
  } catch {
    return finish(jsonError('SERVER_MISCONFIGURED', 503))
  }
  if (!minute?.ok) return finish(minute?.response ?? jsonError('SERVER_MISCONFIGURED', 503))

  let recalled
  try {
    recalled = deps.retrieve(deps.index, validation.data.question, validation.data.history)
  } catch {
    return finish(jsonError('SERVER_MISCONFIGURED', 503))
  }
  const sources = safeSources(recalled, deps.index)
  retrievalCount = sources.length
  if (!recalled?.confident || sources.length === 0) {
    const response = noRecallResponse(sources.slice(0, 3))
    log(200)
    return response
  }

  let quota
  try {
    quota = await deps.reserveDailyQuota(env, {
      visitorKey,
      perVisitorLimit: config.perVisitorLimit,
      globalLimit: config.globalLimit,
    })
  } catch {
    return finish(jsonError('QUOTA_UNAVAILABLE', 503))
  }
  if (!quota?.allowed) {
    const code = quota?.reason === 'GLOBAL_LIMIT' ? 'DAILY_GLOBAL_LIMIT'
      : quota?.reason === 'PER_VISITOR_LIMIT' ? 'DAILY_VISITOR_LIMIT'
        : 'QUOTA_UNAVAILABLE'
    return finish(jsonError(code, code === 'QUOTA_UNAVAILABLE' ? 503 : 429))
  }

  return modelResponse({
    meta: sources.map(({ meta }) => meta),
    streamFactory: () => deps.streamDeepSeek({
      apiKey: config.apiKey,
      model: config.model,
      question: validation.data.question,
      history: validation.data.history,
      sources: sources.map(({ provider }) => provider),
      signal: request.signal,
    }),
    onComplete: log,
  })
}
