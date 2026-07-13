import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage delegates current module and update discovery to the factory component', async () => {
  const [page, home] = await Promise.all([
    read('docs/index.md'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
  ])
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
  assert.match(home, /action:\s*'浏览 AI 知识'[\s\S]*href:\s*'\/wiki\/'/)
  assert.match(home, /action:\s*'向知识库提问'[\s\S]*href:\s*'\/ask\/'/)
  assert.match(home, /url:\s*'\/wiki\/'[\s\S]*date:\s*'2026-07-12'/)
  assert.match(home, /url:\s*'\/finance\/'[\s\S]*date:\s*'2026-07-08'/)
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

test('factory homepage entries still resolve after the OS component split', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  const entries = new Map([
    ['/wiki/', 'docs/wiki/index.md'],
    ['/finance/', 'docs/finance/index.md'],
    ['/ask/', 'docs/ask/index.md'],
    ['/llm-wiki/', 'docs/llm-wiki/index.md'],
  ])
  for (const [href, path] of entries) {
    assert.match(home, new RegExp(`(?:href|url):\\s*["']${href.replaceAll('/', '\\\/')}["']`))
    await assert.doesNotReject(access(new URL(path, root)), `${href} must resolve to ${path}`)
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

test('theme styles balance the factory, knowledge, and QA surfaces', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.VPHero \.main[\s\S]*max-width:\s*900px/)
  assert.match(css, /\.VPHero \.text[\s\S]*text-wrap:\s*balance/)
  assert.match(css, /\.knowledge-hub__featured/)
  assert.match(css, /\.knowledge-hub__all/)
  for (const selector of [
    '.system-topbar', '.desktop-canvas', '.profile-card', '.project-folder',
    '.notes-launcher', '.lab-launcher', '.contact-terminal', '.canvas-controls',
  ]) assert.match(css, new RegExp(`${selector.replace('.', '\\.')}(?:\\s|,|\\{|:)`))
  assert.doesNotMatch(css, /\.garden-/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
})

test('fullscreen splash replaces the inline boot without changing homepage discovery', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  const hero = home.match(/<section class="factory-hero"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.doesNotMatch(hero, /FactoryBoot/)
  assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>\s*<main/)
  for (const route of ['/wiki/', '/finance/', '/ask/', '/llm-wiki/']) assert.match(home, new RegExp(route.replaceAll('/', '\\/')))
})
