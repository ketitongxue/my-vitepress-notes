import { jsonError } from './security.mjs'

export const MAX_REQUEST_BYTES = 24 * 1024

function invalid(code, status = 400) {
  return { ok: false, response: jsonError(code, status) }
}

function characterLength(value) {
  return [...value].length
}

function isTokenCharacter(character) {
  return /^[!#$%&'*+.^_`|~0-9A-Za-z-]$/.test(character)
}

function isJsonContentType(value) {
  if (typeof value !== 'string') return false

  let position = 0
  const skipWhitespace = () => {
    while (value[position] === ' ' || value[position] === '\t') position += 1
  }
  const readToken = () => {
    const start = position
    while (position < value.length && isTokenCharacter(value[position])) position += 1
    return position > start
  }
  const readQuotedString = () => {
    if (value[position] !== '"') return false
    position += 1
    while (position < value.length) {
      const code = value.charCodeAt(position)
      if (value[position] === '"') {
        position += 1
        return true
      }
      if (value[position] === '\\') {
        position += 1
        if (position >= value.length) return false
        const escaped = value.charCodeAt(position)
        if (escaped !== 9 && (escaped < 32 || escaped > 126)) return false
        position += 1
        continue
      }
      const isQuotedText = code === 9 || code === 32 || code === 33
        || (code >= 35 && code <= 91) || (code >= 93 && code <= 126)
        || (code >= 128 && code <= 255)
      if (!isQuotedText) return false
      position += 1
    }
    return false
  }

  skipWhitespace()
  const mediaType = 'application/json'
  if (value.slice(position, position + mediaType.length).toLowerCase() !== mediaType) return false
  position += mediaType.length

  while (true) {
    skipWhitespace()
    if (position === value.length) return true
    if (value[position] !== ';') return false
    position += 1
    skipWhitespace()
    if (!readToken()) return false
    skipWhitespace()
    if (value[position] !== '=') return false
    position += 1
    skipWhitespace()
    if (value[position] === '"') {
      if (!readQuotedString()) return false
    } else if (!readToken()) {
      return false
    }
  }
}

async function readBoundedBody(request) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { tooLarge: true }
  }

  if (!request.body) return { text: '' }

  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel()
      return { tooLarge: true }
    }
    chunks.push(value)
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder().decode(body) }
}

function validHistory(history) {
  if (!Array.isArray(history)) return invalid('INVALID_HISTORY')
  if (history.length > 6) return invalid('HISTORY_TOO_LONG')

  let totalLength = 0
  for (const message of history) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return invalid('INVALID_HISTORY')
    }
    const fields = Object.keys(message)
    if (fields.length !== 2 || !fields.includes('role') || !fields.includes('content')) {
      return invalid('INVALID_HISTORY')
    }
    if (!['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return invalid('INVALID_HISTORY')
    }
    totalLength += characterLength(message.content)
  }

  if (totalLength > 6000) return invalid('HISTORY_CONTENT_TOO_LONG')
  return { ok: true }
}

export async function validateAskRequest(request, allowedOrigin) {
  if (request.method !== 'POST') return invalid('METHOD_NOT_ALLOWED', 405)
  if (!allowedOrigin || request.headers.get('origin') !== allowedOrigin) {
    return invalid('INVALID_ORIGIN', 403)
  }
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return invalid('UNSUPPORTED_MEDIA_TYPE', 415)
  }

  const body = await readBoundedBody(request)
  if (body.tooLarge) return invalid('REQUEST_TOO_LARGE', 413)

  let parsed
  try {
    parsed = JSON.parse(body.text)
  } catch {
    return invalid('INVALID_JSON')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalid('INVALID_BODY')
  }
  if (Object.keys(parsed).some((field) => !['question', 'history'].includes(field))) {
    return invalid('UNKNOWN_FIELD')
  }
  if (typeof parsed.question !== 'string') return invalid('INVALID_QUESTION')

  const question = parsed.question.trim()
  if (!question) return invalid('INVALID_QUESTION')
  if (characterLength(question) > 500) return invalid('QUESTION_TOO_LONG')

  const history = parsed.history === undefined ? [] : parsed.history
  const historyResult = validHistory(history)
  if (!historyResult.ok) return historyResult

  return { ok: true, data: { question, history } }
}
