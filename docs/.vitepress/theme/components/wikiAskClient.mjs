const MAX_HISTORY_ITEMS = 6
const MAX_HISTORY_CHARACTERS = 6000
const MAX_CITATIONS = 6
const MAX_SSE_LINE_CHARS = 64 * 1024
const MAX_SSE_EVENT_CHARS = 96 * 1024
const MAX_SSE_PENDING_CHARS = 128 * 1024
const MAX_ASSISTANT_CHARS = 32 * 1024
const MAX_VIEW_SCROLL = 10_000_000
const PUBLISHED_WIKI_ROUTE = /^\/wiki\/(?:concepts|entities|comparisons)\/[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isActiveRequest(signal, requestVersion, currentVersion) {
  return !signal.aborted && requestVersion === currentVersion
}

function safeCodePoints(value) {
  return Array.from(value).filter((character) => {
    if (character.length !== 1) return true
    const code = character.charCodeAt(0)
    return code < 0xD800 || code > 0xDFFF
  })
}

function validCitation(value) {
  return value
    && typeof value === 'object'
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && (value.section === undefined || typeof value.section === 'string')
    && typeof value.url === 'string'
    && PUBLISHED_WIKI_ROUTE.test(value.url)
}

export function sanitizeCitations(
  values,
  receivedSourceCount = Array.isArray(values) ? values.length : 0,
  preserveNumbers = false,
) {
  if (!Array.isArray(values)) return []
  const limit = Math.max(0, Math.min(
    MAX_CITATIONS,
    values.length,
    Number.isInteger(receivedSourceCount) ? receivedSourceCount : 0,
  ))
  const seenIds = new Set()
  const seenNumbers = new Set()
  const result = []
  for (let index = 0; index < limit; index += 1) {
    const value = values[index]
    const number = preserveNumbers ? value?.number : index + 1
    if (!Number.isInteger(number) || number < 1 || number > MAX_CITATIONS) continue
    if (preserveNumbers && seenNumbers.has(number)) continue
    if (!validCitation(value) || seenIds.has(value.id)) continue
    seenIds.add(value.id)
    seenNumbers.add(number)
    result.push({
      id: value.id,
      number,
      title: value.title,
      ...(value.section === undefined ? {} : { section: value.section }),
      url: value.url,
    })
  }
  return result
}

export function normalizeStoredHistory(values) {
  if (!Array.isArray(values)) return []
  const valid = values.filter((item) => {
    return item
      && typeof item === 'object'
      && (item.role === 'user' || item.role === 'assistant')
      && typeof item.content === 'string'
      && item.content.trim()
  }).slice(-MAX_HISTORY_ITEMS)

  const result = []
  let remaining = MAX_HISTORY_CHARACTERS
  for (const item of valid.reverse()) {
    if (remaining === 0) break
    const characters = safeCodePoints(item.content)
    const content = characters.slice(Math.max(0, characters.length - remaining)).join('')
    if (!content) continue
    result.unshift({
      role: item.role,
      content,
      ...(Array.isArray(item.sources)
        ? { sources: sanitizeCitations(item.sources, item.sources.length, true) }
        : {}),
    })
    remaining -= safeCodePoints(content).length
  }
  return result
}

export function getSessionStorage(windowLike = globalThis) {
  try {
    return windowLike?.sessionStorage ?? null
  } catch {
    return null
  }
}

export function removeSessionHistory(storage, key) {
  try {
    if (!storage) return false
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function loadSessionHistory(storage, key) {
  try {
    return normalizeStoredHistory(JSON.parse(storage?.getItem(key) ?? '[]'))
  } catch {
    removeSessionHistory(storage, key)
    return []
  }
}

export function saveSessionHistory(storage, key, values) {
  try {
    if (!storage) return false
    storage.setItem(key, JSON.stringify(normalizeStoredHistory(values)))
    return true
  } catch {
    return false
  }
}

export function normalizeSessionView(value) {
  const source = value && typeof value === 'object' ? value : {}
  const question = typeof source.question === 'string'
    ? safeCodePoints(source.question).slice(0, 500).join('')
    : ''
  const scroll = (candidate) => Number.isFinite(candidate)
    ? Math.min(MAX_VIEW_SCROLL, Math.max(0, Math.round(candidate)))
    : 0
  return {
    question,
    rootScrollTop: scroll(source.rootScrollTop),
    conversationScrollTop: scroll(source.conversationScrollTop),
  }
}

export function loadSessionView(storage, key) {
  try {
    if (!storage) return normalizeSessionView(null)
    return normalizeSessionView(JSON.parse(storage.getItem(key) ?? '{}'))
  } catch {
    try { storage?.removeItem(key) } catch {}
    return normalizeSessionView(null)
  }
}

export function saveSessionView(storage, key, value) {
  try {
    if (!storage) return false
    storage.setItem(key, JSON.stringify(normalizeSessionView(value)))
    return true
  } catch {
    return false
  }
}

export function removeSessionView(storage, key) {
  try {
    if (!storage) return false
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export async function consumeSse(response, signal, onEvent) {
  if (!response.body) throw new Error('MALFORMED_STREAM')
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let eventType = 'message'
  let dataLines = []
  let eventDataLength = 0
  let lineParts = []
  let lineLength = 0
  let skipLeadingLf = false
  let terminal = false
  let assistantCharacters = 0
  let cleanupPromise

  const cleanup = () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        try {
          await reader.cancel()
        } catch {
          // Cancellation is best-effort; the original parse result takes precedence.
        } finally {
          try {
            reader.releaseLock?.()
          } catch {
            // Some stream implementations release automatically after cancellation.
          }
        }
      })()
    }
    return cleanupPromise
  }
  const cancel = () => { void cleanup() }
  signal.addEventListener('abort', cancel, { once: true })

  const dispatch = () => {
    if (!dataLines.length) {
      eventType = 'message'
      return
    }
    let data
    try {
      data = JSON.parse(dataLines.join('\n'))
    } catch {
      throw new Error('MALFORMED_STREAM')
    }
    const type = eventType
    eventType = 'message'
    dataLines = []
    eventDataLength = 0
    if (signal.aborted) return
    if (type === 'delta' && data && typeof data === 'object' && typeof data.text === 'string') {
      assistantCharacters += safeCodePoints(data.text).length
      if (assistantCharacters > MAX_ASSISTANT_CHARS) throw new Error('MALFORMED_STREAM')
    }
    if (type === 'done' || type === 'error') terminal = true
    onEvent(type, data)
  }

  const processLine = (line) => {
    if (line === '') {
      dispatch()
      return
    }
    if (line.startsWith(':')) return
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') eventType = value
    if (field === 'data') {
      const added = value.length + (dataLines.length ? 1 : 0)
      eventDataLength += added
      if (eventDataLength > MAX_SSE_EVENT_CHARS || eventDataLength + lineLength > MAX_SSE_PENDING_CHARS) {
        throw new Error('MALFORMED_STREAM')
      }
      dataLines.push(value)
    }
  }

  const appendLinePart = (part) => {
    if (!part) return
    lineLength += part.length
    if (lineLength > MAX_SSE_LINE_CHARS || lineLength + eventDataLength > MAX_SSE_PENDING_CHARS) {
      throw new Error('MALFORMED_STREAM')
    }
    lineParts.push(part)
  }

  const finishLine = () => {
    const line = lineParts.length === 1 ? lineParts[0] : lineParts.join('')
    lineParts = []
    lineLength = 0
    processLine(line)
  }

  const ingest = (text, final = false) => {
    let segmentStart = 0
    for (let index = 0; index < text.length && !terminal; index += 1) {
      const character = text[index]
      if (skipLeadingLf) {
        skipLeadingLf = false
        if (character === '\n') {
          segmentStart = index + 1
          continue
        }
      }
      if (character !== '\r' && character !== '\n') continue
      appendLinePart(text.slice(segmentStart, index))
      finishLine()
      if (character === '\r') skipLeadingLf = true
      segmentStart = index + 1
    }
    if (!terminal) appendLinePart(text.slice(segmentStart))
    if (final && !terminal) {
      skipLeadingLf = false
      if (lineLength) finishLine()
    }
  }

  try {
    while (!signal.aborted && !terminal) {
      const { done, value } = await reader.read()
      if (done) break
      ingest(decoder.decode(value, { stream: true }))
    }
    if (signal.aborted) return
    if (terminal) return
    ingest(decoder.decode(), true)
    if (dataLines.length || eventType !== 'message') throw new Error('MALFORMED_STREAM')
    throw new Error('INCOMPLETE_STREAM')
  } catch (error) {
    if (signal.aborted) return
    throw error instanceof TypeError ? new Error('MALFORMED_STREAM') : error
  } finally {
    signal.removeEventListener('abort', cancel)
    await cleanup()
  }
}
