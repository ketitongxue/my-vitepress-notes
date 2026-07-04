const MAX_HISTORY_ITEMS = 6
const MAX_HISTORY_CHARACTERS = 6000
const MAX_CITATIONS = 6
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

export function sanitizeCitations(values, receivedSourceCount = Array.isArray(values) ? values.length : 0) {
  if (!Array.isArray(values)) return []
  const limit = Math.max(0, Math.min(MAX_CITATIONS, Number.isInteger(receivedSourceCount) ? receivedSourceCount : 0))
  const seenIds = new Set()
  const seenUrls = new Set()
  const result = []
  for (const value of values) {
    if (result.length >= limit) break
    if (!validCitation(value) || seenIds.has(value.id) || seenUrls.has(value.url)) continue
    seenIds.add(value.id)
    seenUrls.add(value.url)
    result.push({
      id: value.id,
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
        ? { sources: sanitizeCitations(item.sources, item.sources.length) }
        : {}),
    })
    remaining -= safeCodePoints(content).length
  }
  return result
}

export async function consumeSse(response, signal, onEvent) {
  if (!response.body) throw new Error('MALFORMED_STREAM')
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let buffer = ''
  let eventType = 'message'
  let dataLines = []
  let completed = false

  const cancel = () => { void reader.cancel().catch(() => {}) }
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
    if (signal.aborted) return
    onEvent(type, data)
    if (type === 'done') completed = true
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
    if (field === 'data') dataLines.push(value)
  }

  const drainLines = (final = false) => {
    while (buffer) {
      let boundary = -1
      for (let index = 0; index < buffer.length; index += 1) {
        if (buffer[index] === '\r' || buffer[index] === '\n') {
          boundary = index
          break
        }
      }
      if (boundary === -1) {
        if (final) {
          processLine(buffer)
          buffer = ''
        }
        return
      }
      if (buffer[boundary] === '\r' && boundary === buffer.length - 1 && !final) return
      const line = buffer.slice(0, boundary)
      const separatorLength = buffer[boundary] === '\r' && buffer[boundary + 1] === '\n' ? 2 : 1
      buffer = buffer.slice(boundary + separatorLength)
      processLine(line)
    }
  }

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      drainLines()
    }
    if (signal.aborted) return
    buffer += decoder.decode()
    drainLines(true)
    if (dataLines.length || eventType !== 'message') throw new Error('MALFORMED_STREAM')
    if (!completed) throw new Error('INCOMPLETE_STREAM')
  } catch (error) {
    if (signal.aborted) return
    throw error instanceof TypeError ? new Error('MALFORMED_STREAM') : error
  } finally {
    signal.removeEventListener('abort', cancel)
  }
}
