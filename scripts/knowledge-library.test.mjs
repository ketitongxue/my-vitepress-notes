import test from 'node:test'
import assert from 'node:assert/strict'
import { groupLibraryDocuments } from '../docs/.vitepress/theme/components/knowledgeLibrary.mjs'

const blob = (path) => ({ path, type: 'blob', mode: '100644' })
test('groups existing topics and prefers explicit folders', () => {
  const groups = groupLibraryDocuments({ tree: [
    blob('docs/01 Claude Code 使用.html'), blob('docs/02 Claude Code 记忆.html'),
    blob('docs/obsidian + claude code.html'), blob('docs/SDD 工作流.html'),
    blob('docs/Agent/新文章.html'), blob('docs/新主题.html'),
  ] })
  const byTitle = Object.fromEntries(groups.map((group) => [group.title, group.articles]))
  assert.equal(byTitle['Claude Code'].length, 2)
  assert.equal(byTitle['工具与集成'].length, 1)
  assert.equal(byTitle['开发工作流'].length, 1)
  assert.equal(byTitle.Agent.length, 1)
  assert.equal(byTitle['其他文章'].length, 1)
  assert.match(byTitle.Agent[0].href, /docs\/Agent\/%E6/)
})
test('ignores assets, unsafe paths, symlinks and duplicate documents', () => {
  assert.deepEqual(groupLibraryDocuments({ tree: [blob('assets/image.png'), blob('index.html'), blob('docs/../x.html'), { ...blob('docs/link.html'), mode: '120000' }] }), [])
  const item = blob('docs/01 #intro.html')
  const groups = groupLibraryDocuments({ tree: [item, item] })
  assert.equal(groups[0].articles.length, 1)
  assert.match(groups[0].articles[0].href, /%23intro.html$/)
})
test('rejects unavailable or truncated trees and supports empty repositories', () => {
  assert.throws(() => groupLibraryDocuments({}))
  assert.throws(() => groupLibraryDocuments({ tree: [], truncated: true }))
  assert.deepEqual(groupLibraryDocuments({ tree: [] }), [])
})
