import test from 'node:test'
import assert from 'node:assert/strict'
import { getLibraryDirectoryView, groupLibraryDocuments, isLibraryRootHref, libraryUrl, loadLibraryDocuments, observeEmbeddedFrameFocus } from '../docs/.vitepress/theme/components/knowledgeLibrary.mjs'

const blob = (path) => ({ path, type: 'blob', mode: '100644' })

test('category filters show matching articles and keep a category named 全部 distinct from the all filter', () => {
  const groups = groupLibraryDocuments({ tree: [
    blob('docs/Agent/入门.html'), blob('docs/Agent/实践.html'),
    blob('docs/工具与集成/示例.html'), blob('docs/全部/真实分类.html'),
  ] })
  const all = getLibraryDirectoryView(groups)
  assert.equal(all.selectedCategory, null)
  assert.equal(all.groups.length, 3)
  assert.equal(all.total, 4)

  const filtered = getLibraryDirectoryView(groups, 'Agent')
  assert.deepEqual(filtered.groups.map((group) => group.title), ['Agent'])
  assert.equal(filtered.total, 2)
  assert.equal(filtered.selectedCategory, 'Agent')

  const namedAll = getLibraryDirectoryView(groups, '全部')
  assert.equal(namedAll.total, 1)
  assert.equal(namedAll.groups[0].articles[0].title, '真实分类')
  assert.equal(groups.length, 3)
})

test('directory refresh keeps valid category selection and returns to all when a category disappears', () => {
  const before = groupLibraryDocuments({ tree: [blob('docs/Agent/旧文章.html')] })
  const selection = getLibraryDirectoryView(before, 'Agent').selectedCategory
  const updated = groupLibraryDocuments({ tree: [blob('docs/Agent/新文章.html'), blob('docs/工具/新增.html')] })
  const retained = getLibraryDirectoryView(updated, selection)
  assert.equal(retained.selectedCategory, 'Agent')
  assert.equal(retained.groups[0].articles[0].title, '新文章')
  assert.equal(retained.total, 1)

  const removed = getLibraryDirectoryView(updated.filter((group) => group.title !== 'Agent'), selection)
  assert.equal(removed.selectedCategory, null)
  assert.equal(removed.groups[0].title, '工具')
  assert.equal(removed.total, 1)
  assert.deepEqual(getLibraryDirectoryView([], selection), { selectedCategory: null, groups: [], total: 0 })
})

test('loads the same-origin directory with cancellation and identifies a usable backup', async () => {
  const controller = new AbortController()
  const document = blob('docs/Agent/中文文章.html')
  for (const source of ['github', 'snapshot']) {
    const result = await loadLibraryDocuments({
      signal: controller.signal,
      fetchImpl: async (url, options) => {
        assert.equal(url, '/api/knowledge/tree')
        assert.equal(options.signal, controller.signal)
        return Response.json({ source, tree: [document] })
      },
    })
    assert.equal(result.groups[0].articles[0].title, '中文文章')
    assert.equal(result.usingSnapshot, source === 'snapshot')
  }
})

test('unavailable, malformed and incomplete directory responses remain retryable errors', async () => {
  for (const response of [
    new Response('unavailable', { status: 503 }),
    new Response('<html>not JSON</html>'),
    Response.json({ tree: [], truncated: true }),
    Response.json({ error: 'Not found' }),
  ]) {
    await assert.rejects(loadLibraryDocuments({ fetchImpl: async () => response }))
  }
  await assert.rejects(loadLibraryDocuments({ fetchImpl: async () => { throw new TypeError('Network error') } }))
})

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

test('recognizes only canonical library root variants for opening the in-site knowledge window', () => {
  for (const href of [
    libraryUrl,
    libraryUrl.slice(0, -1),
    `${libraryUrl}index.html`,
    `${libraryUrl}?view=all#articles`,
    `${libraryUrl}index.html#articles`,
    'https://KETITONGXUE.github.io:443/ai-era-html-docs/',
  ]) assert.equal(isLibraryRootHref(href), true, href)
})

test('does not route unrelated, credential-bearing, article, or unsafe URLs into the root window', () => {
  for (const href of [
    undefined, null, 42, {}, '', '#knowledge', '/ai-era-html-docs/',
    'javascript:alert(1)',
    'http://ketitongxue.github.io/ai-era-html-docs/',
    '//ketitongxue.github.io/ai-era-html-docs/',
    'https:ketitongxue.github.io/ai-era-html-docs/',
    'https:////ketitongxue.github.io/ai-era-html-docs/',
    'https://ketitongxue.github.io.evil.example/ai-era-html-docs/',
    'https://evil.example/ai-era-html-docs/',
    'https://ketitongxue.github.io:444/ai-era-html-docs/',
    'https://owner@ketitongxue.github.io/ai-era-html-docs/',
    'https://owner:password@ketitongxue.github.io/ai-era-html-docs/',
    'https://@ketitongxue.github.io/ai-era-html-docs/',
    'https://ketitongxue.github.io/other-repo/',
    'https://ketitongxue.github.io/ai-era-html-docs-other/',
    `${libraryUrl}docs/article.html`,
    `${libraryUrl}index.html/extra`,
    `${libraryUrl}docs/`,
    'https://ketitongxue.github.io\\ai-era-html-docs\\',
    'https://ketitongxue.github.io/ai-era-html-docs/\n',
  ]) assert.equal(isLibraryRootHref(href), false, String(href))
})

test('article URLs preserve relative content roots and encoded filenames without becoming root routes', () => {
  const path = 'docs/Claude Code/07 Hooks #1 & 配置.html'
  const [group] = groupLibraryDocuments({ tree: [blob(path)] })
  const [article] = group.articles
  const url = new URL(article.href)
  assert.equal(url.origin, new URL(libraryUrl).origin)
  assert.equal(decodeURIComponent(url.pathname), `/ai-era-html-docs/${path}`)
  assert.equal(url.hash, '')
  assert.equal(url.search, '')
  assert.equal(isLibraryRootHref(article.href), false)
  assert.equal(new URL('./assets/diagram.png', article.href).pathname, '/ai-era-html-docs/docs/Claude%20Code/assets/diagram.png')
})

test('embedded frame activation waits for focus to settle, ignores unrelated blur, and cleans up', () => {
  const browser = new EventTarget()
  browser.document = { activeElement: null }
  const pending = new Map()
  let nextFrameId = 0
  browser.requestAnimationFrame = (callback) => { pending.set(++nextFrameId, callback); return nextFrameId }
  browser.cancelAnimationFrame = (id) => pending.delete(id)
  const flush = () => {
    const callbacks = [...pending.values()]
    pending.clear()
    callbacks.forEach((callback) => callback())
  }
  let frame = {}
  let activations = 0
  const stop = observeEmbeddedFrameFocus({ windowLike: browser, getFrame: () => frame, activate: () => activations++ })

  browser.dispatchEvent(new Event('blur'))
  assert.equal(activations, 0)
  browser.document.activeElement = frame
  flush()
  assert.equal(activations, 1)

  browser.dispatchEvent(new Event('blur'))
  browser.document.activeElement = {}
  flush()
  assert.equal(activations, 1)

  browser.document.activeElement = frame
  browser.dispatchEvent(new Event('blur'))
  browser.dispatchEvent(new Event('blur'))
  assert.equal(pending.size, 1)
  frame = null
  flush()
  assert.equal(activations, 1)

  frame = {}
  browser.document.activeElement = frame
  browser.dispatchEvent(new Event('blur'))
  stop()
  assert.equal(pending.size, 0)
  browser.dispatchEvent(new Event('blur'))
  assert.equal(pending.size, 0)
  assert.equal(activations, 1)
})
