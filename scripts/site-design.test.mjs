import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('homepage keeps the Personal OS route shell and focused view components available', async () => {
  const [page, home, desktop, knowledge, system] = await Promise.all([
    read('docs/index.md'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/components/DesktopSurface.vue'),
    read('docs/.vitepress/theme/components/KnowledgePortfolio.vue'),
    read('docs/.vitepress/theme/components/InfiniteCanvas.vue'),
  ])
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
  for (const view of ['home', 'knowledge', 'system']) assert.match(home, new RegExp(`data-os-view="${view}"`))
  assert.match(desktop, /<DesktopIcon\b/)
  assert.match(desktop, /<WindowManager\b/)
  assert.match(knowledge, /<main class="knowledge-portfolio"/)
  assert.match(system, /<CanvasControls\b/)
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

test('Personal OS menu destinations and local routes resolve', async () => {
  const desktop = await read('docs/.vitepress/theme/components/DesktopSurface.vue')
  assert.match(desktop, /href="#home"/)
  assert.match(desktop, /href="#knowledge"/)
  assert.match(desktop, /href="#system"/)
  assert.match(desktop, /href="\/about"/)
  await assert.doesNotReject(access(new URL('docs/about.md', root)), '/about must resolve')
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

test('theme styles balance the Personal OS, knowledge, and QA surfaces', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.VPHero \.main[\s\S]*max-width:\s*900px/)
  assert.match(css, /\.VPHero \.text[\s\S]*text-wrap:\s*balance/)
  assert.match(css, /\.knowledge-hub__featured/)
  assert.match(css, /\.knowledge-hub__all/)
  for (const selector of [
    '.macbook-boot', '.desktop-surface', '.desktop-surface__menu', '.desktop-icon',
    '.window-manager__window', '.bottom-os-navigation', '.knowledge-portfolio',
    '.infinite-canvas', '.canvas-card', '.canvas-layers', '.canvas-minimap', '.canvas-controls',
  ]) assert.match(css, new RegExp(`\\.factory-home ${selector.replace('.', '\\.')}(?:\\s|,|\\{|:)`))
  assert.match(css, /\.factory-home :where\(a, button\):focus-visible\s*\{[^}]*outline:\s*3px solid #315EFB/)
  assert.match(css, /\.factory-home \.desktop-surface__menu\s*\{[^}]*height:\s*30px/)
  assert.match(css, /\.factory-home \.desktop-surface__workspace\s*\{[^}]*height:\s*calc\(100vh - 30px\)/)
  assert.match(css, /\.factory-home \.desktop-surface__workspace\s*\{[^}]*height:\s*calc\(100dvh - 30px\)/)
  const mobileOverflowPattern = [
    '@media \\(max-width: 767px\\)[\\s\\S]*?\\.factory-home\\s*\\{[^}]*overflow-x:',
    '\\s*clip',
  ].join('')
  assert.match(css, new RegExp(mobileOverflowPattern))
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.factory-home \.canvas-controls button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px/)
  assert.match(css, /\.factory-home\s*\{[^}]*font-family:\s*var\(--vp-font-family-base\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/)
  assert.doesNotMatch(css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? '', /linear-gradient|radial-gradient|backdrop-filter|\bstars?\b|sparkle|particle|illustration|character-art/i)
  assert.doesNotMatch(css, /\.garden-/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
})

test('MacBook splash and hash shell preserve homepage discovery', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  assert.doesNotMatch(home, /FactoryBoot/)
  assert.match(home, /<MacbookBoot[\s\S]*v-if="activeView === 'home'"[\s\S]*:disabled="bootDisabled"[\s\S]*@entered="handleHomeEntered"[\s\S]*\/>/)
  assert.deepEqual([...home.matchAll(/data-os-view="(home|knowledge|system)"/g)].map((match) => match[1]), [
    'home', 'knowledge', 'system',
  ])
  assert.match(home, /<BottomOsNavigation :active-view="activeView" @select="selectView"\s*\/>/)
  assert.match(home, /<SystemTopBar\s*\/>/)
  assert.match(home, /<DesktopCanvas\s*\/>/)
})

test('knowledge portfolio is semantic document flow without copied visual effects', async () => {
  const portfolio = await read('docs/.vitepress/theme/components/KnowledgePortfolio.vue')

  assert.match(portfolio, /<main class="knowledge-portfolio" aria-labelledby="knowledge-portfolio-title">/)
  assert.match(portfolio, /<article class="knowledge-portfolio__(?:feature|callout|method)"/)
  assert.match(portfolio, /<ol class="knowledge-portfolio__workflow">/)
  assert.match(portfolio, /<ul class="knowledge-portfolio__recent-list">/)
  assert.match(portfolio, /<time datetime="\d{4}-\d{2}-\d{2}">/)
  assert.doesNotMatch(portfolio, /<iframe\b|<object\b|<embed\b|<svg\b|v-html|contenteditable/i)
  assert.doesNotMatch(portfolio, /BottomOsNavigation|DesktopSurface|window\.location|hashchange|sessionStorage/i)
  assert.doesNotMatch(portfolio, /position:\s*(?:fixed|absolute)|transform:|touch-action:\s*none|dragg|resize|canvas/i)
  assert.doesNotMatch(portfolio, /star|sparkle|particle|illustration|sticker|photograph|gradient|backdrop-filter|data:image|emoji/i)
  assert.doesNotMatch(portfolio, /https?:\/\/(?!github\.com\/ketitongxue\/llm-wiki-skill)/i)
})
