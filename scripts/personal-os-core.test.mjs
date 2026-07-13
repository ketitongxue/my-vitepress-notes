import assert from 'node:assert/strict'
import test from 'node:test'
import { hashForOsView, normalizeOsHash, OS_VIEWS } from '../docs/.vitepress/theme/components/personalOsRouter.mjs'
import { bootLines, canvasCards, canvasConnections, desktopEntries, knowledgeSections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'

test('OS hashes normalize without browser globals', () => {
  assert.deepEqual(OS_VIEWS, ['home', 'knowledge', 'system'])
  assert.equal(normalizeOsHash(''), 'home')
  assert.equal(normalizeOsHash('#knowledge'), 'knowledge')
  assert.equal(normalizeOsHash('#system'), 'system')
  assert.equal(normalizeOsHash('#unknown'), 'home')
  assert.equal(hashForOsView('system'), '#system')
  assert.equal(hashForOsView('unknown'), '#home')
})

test('Personal OS content is complete and internally referential', () => {
  assert.ok(bootLines.length >= 4)
  assert.deepEqual(desktopEntries.map(({ label }) => label), [
    'LLM Wiki', 'Finance Wiki', '知识问答', 'llm-wiki Skill', 'AI 实验',
    '项目档案', '关于我', '联系方式', 'GitHub', '网站更新记录',
  ])
  assert.deepEqual(desktopEntries.slice(0, 4).map(({ window }) => window.href), ['/wiki/', '/finance/', '/ask/', '/llm-wiki/'])
  assert.equal(knowledgeSections.length, 6)
  assert.ok(canvasCards.length >= 8)
  const ids = new Set(canvasCards.map(({ id }) => id))
  assert.equal(ids.size, canvasCards.length)
  for (const edge of canvasConnections) {
    assert.ok(ids.has(edge.from), edge.from)
    assert.ok(ids.has(edge.to), edge.to)
  }
})
