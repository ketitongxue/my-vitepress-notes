import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { retrieve, scoreChunk, tokenizeQuery } from './retrieval.mjs'

const index = JSON.parse(await readFile(new URL('./generated/wiki-index.json', import.meta.url), 'utf8'))

const cases = [
  ['Claude Code 的权限模型是什么？', '/wiki/concepts/claude-code-permission-model'],
  ['上下文工程怎样约束智能体的行为？', '/wiki/concepts/context-engineering'],
  ['产品反馈循环应该怎么建立？', '/wiki/concepts/product-feedback-loop'],
  ['上下文工程如何结合渐进式披露来避免长上下文失效？', '/wiki/concepts/context-engineering'],
  ['怎样让用户意见持续推动产品迭代并形成闭环？', '/wiki/concepts/product-feedback-loop'],
]

test('tokenizeQuery normalizes Chinese and Latin search terms', () => {
  assert.deepEqual(tokenizeQuery('Claude_Code：权限模型！'), ['claude', 'code', '权限', '限模', '模型'])
})

test('fixed question set puts the expected page in the top three', () => {
  for (const [question, expectedUrl] of cases) {
    const result = retrieve(index, question, [])
    assert.equal(result.confident, true, question)
    assert.ok(result.sources.slice(0, 3).some((source) => source.url === expectedUrl),
      `${question}: expected ${expectedUrl}, got ${result.sources.slice(0, 3).map((source) => source.url).join(', ')}`)
  }
})

test('title and tag matches outrank body-only matches', () => {
  const result = retrieve(index, 'Claude Code 的权限模型是什么？', [])
  assert.equal(result.sources[0].url, '/wiki/concepts/claude-code-permission-model')
})

test('a cross-page question retrieves all required concepts in the top three', () => {
  const result = retrieve(index, '上下文工程如何结合渐进式披露来避免长上下文失效？', [])
  const topThree = new Set(result.sources.slice(0, 3).map((source) => source.url))
  assert.deepEqual(topThree, new Set([
    '/wiki/concepts/context-engineering',
    '/wiki/concepts/progressive-disclosure',
    '/wiki/concepts/long-context-failure-modes',
  ]))
})

test('history contributes less than the current question', () => {
  const contextChunk = index.chunks.find((chunk) => chunk.url === '/wiki/concepts/context-engineering')
  const permissionChunk = index.chunks.find((chunk) => chunk.url === '/wiki/concepts/claude-code-permission-model')
  const currentTerms = tokenizeQuery('Claude Code 权限模型')
  const historicalTerms = tokenizeQuery('上下文工程')
  assert.ok(
    scoreChunk(permissionChunk, currentTerms, historicalTerms)
      > scoreChunk(contextChunk, currentTerms, historicalTerms),
  )
})

test('retrieval applies page, chunk, and context limits deterministically', () => {
  const first = retrieve(index, '智能体 工作流 上下文 工程 Claude Code 产品 反馈', [])
  const second = retrieve(index, '智能体 工作流 上下文 工程 Claude Code 产品 反馈', [])
  assert.deepEqual(first, second)
  assert.ok(first.chunks.length <= 6)
  assert.ok(first.context.length <= 8_000)
  const counts = new Map()
  for (const chunk of first.chunks) counts.set(chunk.url, (counts.get(chunk.url) ?? 0) + 1)
  assert.ok([...counts.values()].every((count) => count <= 2))
})

test('a second chunk from the same page is penalized', () => {
  const synthetic = {
    version: 1,
    pages: [],
    chunks: [
      { id: 'a', title: '目标主题', section: '甲', tags: [], url: '/a', text: '目标主题说明' },
      { id: 'b', title: '目标主题', section: '乙', tags: [], url: '/a', text: '目标主题补充' },
      { id: 'c', title: '目标主题', section: '丙', tags: [], url: '/b', text: '目标主题' },
    ],
  }
  const result = retrieve(synthetic, '目标主题', [])
  assert.deepEqual(result.chunks.map((chunk) => chunk.id), ['a', 'c', 'b'])
})

test('irrelevant questions are not confident', () => {
  const result = retrieve(index, '红烧牛肉应该放多少八角和冰糖？', [])
  assert.equal(result.confident, false)
})
