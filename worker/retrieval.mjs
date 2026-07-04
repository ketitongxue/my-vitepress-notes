const FIELD_WEIGHTS = Object.freeze({ title: 8, section: 5, tags: 4, body: 1 })
const CURRENT_QUESTION_WEIGHT = 1
const HISTORICAL_QUESTION_WEIGHT = 0.35
const SAME_PAGE_SECOND_CHUNK_MULTIPLIER = 0.55
const MAX_CHUNKS = 6
const MAX_CHUNKS_PER_PAGE = 2
const MAX_CONTEXT_CHARS = 8_000

// The weakest relevant paraphrase in retrieval.test.mjs scores above this value,
// while the unrelated cooking fixture remains below it.
export const CONFIDENCE_SCORE_THRESHOLD = 18

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalized(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function tokenize(value, deduplicate) {
  const terms = []
  for (const token of normalized(value).split(' ').filter(Boolean)) {
    if (/^[a-z0-9]+$/i.test(token) || token.length <= 2) {
      terms.push(token)
    } else {
      for (let index = 0; index < token.length - 1; index += 1) {
        terms.push(token.slice(index, index + 2))
      }
    }
  }
  return deduplicate ? [...new Set(terms)] : terms
}

export function tokenizeQuery(value) {
  return tokenize(value, true)
}

function termFrequency(terms) {
  const frequencies = new Map()
  for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1)
  return frequencies
}

function fieldScore(chunk, term) {
  const titleTerms = new Set(tokenizeQuery(chunk.title))
  const sectionTerms = new Set(tokenizeQuery(chunk.section))
  const tagTerms = new Set(tokenizeQuery((chunk.tags ?? []).join(' ')))
  const bodyFrequencies = termFrequency(tokenize(chunk.text, false))
  return (titleTerms.has(term) ? FIELD_WEIGHTS.title : 0)
    + (sectionTerms.has(term) ? FIELD_WEIGHTS.section : 0)
    + (tagTerms.has(term) ? FIELD_WEIGHTS.tags : 0)
    + Math.min(bodyFrequencies.get(term) ?? 0, 3) * FIELD_WEIGHTS.body
}

export function scoreChunk(chunk, currentTerms, historicalTerms = []) {
  let score = 0
  for (const term of new Set(currentTerms)) score += fieldScore(chunk, term) * CURRENT_QUESTION_WEIGHT
  for (const term of new Set(historicalTerms)) score += fieldScore(chunk, term) * HISTORICAL_QUESTION_WEIGHT
  return score
}

function historyQuestions(history) {
  if (!Array.isArray(history)) return []
  return history
    .filter((entry) => entry && entry.role === 'user' && typeof entry.content === 'string')
    .map((entry) => entry.content)
}

function sourceFor(chunk, score) {
  return {
    id: chunk.id,
    title: chunk.title,
    section: chunk.section,
    url: chunk.url,
    score,
  }
}

export function retrieve(index, question, history = []) {
  const currentTerms = tokenizeQuery(question)
  const historicalTerms = tokenizeQuery(historyQuestions(history).join(' '))
  const candidates = (index?.chunks ?? [])
    .map((chunk) => ({ chunk, rawScore: scoreChunk(chunk, currentTerms, historicalTerms) }))
    .filter(({ rawScore }) => rawScore > 0)

  const highestRawScore = candidates.reduce((highest, item) => Math.max(highest, item.rawScore), 0)
  const confident = highestRawScore >= CONFIDENCE_SCORE_THRESHOLD
  const resultChunkLimit = confident ? MAX_CHUNKS : 3
  const resultPageLimit = confident ? MAX_CHUNKS_PER_PAGE : 1

  const selected = []
  const pageCounts = new Map()
  let contextLength = 0
  while (selected.length < resultChunkLimit) {
    const ranked = candidates
      .filter(({ chunk }) => !selected.some((item) => item.chunk.id === chunk.id))
      .filter(({ chunk }) => (pageCounts.get(chunk.url) ?? 0) < resultPageLimit)
      .map((candidate) => ({
        ...candidate,
        adjustedScore: candidate.rawScore
          * ((pageCounts.get(candidate.chunk.url) ?? 0) === 1 ? SAME_PAGE_SECOND_CHUNK_MULTIPLIER : 1),
      }))
      .sort((left, right) => right.adjustedScore - left.adjustedScore
        || right.rawScore - left.rawScore
        || compareText(left.chunk.url, right.chunk.url)
        || compareText(left.chunk.id, right.chunk.id))
    const next = ranked[0]
    if (!next) break
    const rendered = `[${selected.length + 1}] ${next.chunk.title} — ${next.chunk.section}\n${next.chunk.text}`
    const separatorLength = selected.length ? 2 : 0
    if (contextLength + separatorLength + rendered.length > MAX_CONTEXT_CHARS) {
      candidates.splice(candidates.findIndex(({ chunk }) => chunk.id === next.chunk.id), 1)
      continue
    }
    selected.push({ ...next, rendered })
    pageCounts.set(next.chunk.url, (pageCounts.get(next.chunk.url) ?? 0) + 1)
    contextLength += separatorLength + rendered.length
  }

  return {
    confident,
    score: highestRawScore,
    sources: selected.map(({ chunk, adjustedScore }) => sourceFor(chunk, adjustedScore)),
    chunks: selected.map(({ chunk }) => chunk),
    context: selected.map(({ rendered }) => rendered).join('\n\n'),
  }
}
