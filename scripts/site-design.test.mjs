import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage leads to the AI knowledge base and Q&A with current updates', async () => {
  const home = await read('docs/index.md')
  assert.match(home, /text:\s*浏览知识库[\s\S]*link:\s*\/wiki\//)
  assert.match(home, /text:\s*向知识库提问[\s\S]*link:\s*\/ask\//)
  assert.match(home, /\/finance\/[\s\S]*datetime="2026-07-08"/)
  assert.match(home, /\/wiki\/[\s\S]*datetime="2026-07-07"/)
})

test('knowledge pages are generated as compact accessible hubs', async () => {
  for (const path of ['docs/wiki/index.md', 'docs/finance/index.md']) {
    const page = await read(path)
    assert.match(page, /class="knowledge-hub"/)
    assert.match(page, /class="knowledge-hub__featured"/)
    assert.match(page, /<details class="knowledge-hub__all">/)
    assert.match(page, /<summary>全部条目/)
  }
})

test('Q&A clearly limits retrieval to the AI knowledge base', async () => {
  const component = await read('docs/.vitepress/theme/components/WikiAsk.vue')
  assert.match(component, /回答仅基于 AI 知识库/)
  assert.match(component, /href="\/wiki\/"/)
  assert.doesNotMatch(component, /金融知识库/)
})

test('homepage discovery labels and entries are actionable in Chinese', async () => {
  const home = await read('docs/index.md')
  assert.doesNotMatch(home, /RECENT GROWTH|POPULAR TAGS|最近生长/)
  assert.match(home, /garden-eyebrow">最新内容</)
  assert.match(home, /garden-eyebrow">站内导航</)
  assert.equal((home.match(/linkText:\s*查看专题/g) ?? []).length, 3)
  for (const href of ['/wiki/', '/finance/', '/ask/', '/notes/sustainable-ai-workflow']) {
    assert.match(home, new RegExp(`href=["']${href.replaceAll('/', '\\\/')}["']`))
  }
})

test('Q&A and local search expose Chinese interface labels', async () => {
  const [component, config] = await Promise.all([
    read('docs/.vitepress/theme/components/WikiAsk.vue'),
    read('docs/.vitepress/config.mts'),
  ])
  assert.match(component, /wiki-ask__eyebrow">知识库问答</)
  assert.match(config, /search:\s*\{[\s\S]*provider:\s*['"]local['"][\s\S]*translations:/)
  for (const label of ['搜索', '打开搜索', '没有找到相关结果', '清除搜索']) {
    assert.match(config, new RegExp(label))
  }
})

test('theme styles balance the hero and compact the knowledge and QA surfaces', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.VPHero \.main[\s\S]*max-width:\s*900px/)
  assert.match(css, /\.VPHero \.text[\s\S]*text-wrap:\s*balance/)
  assert.match(css, /\.knowledge-hub__featured/)
  assert.match(css, /\.knowledge-hub__all/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
})
