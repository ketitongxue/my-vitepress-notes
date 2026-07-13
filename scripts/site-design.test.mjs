import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('homepage delegates its Personal OS shell to focused components', async () => {
  const [page, home, canvas] = await Promise.all([
    read('docs/index.md'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/components/DesktopCanvas.vue'),
  ])
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
  assert.match(home, /<SystemTopBar\s*\/>/)
  assert.match(home, /<DesktopCanvas\s*\/>/)
  for (const name of [
    'ProfileCard', 'CurrentStatusCard', 'FeaturedProjectCard', 'ProjectFolder',
    'NotesLauncher', 'LabLauncher', 'ContactTerminal', 'CanvasControls',
  ]) assert.match(canvas, new RegExp(`<${name}\\s*/>`))
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

test('factory homepage links and local anchors resolve after the OS component split', async () => {
  const [topbar, canvas, profile, featured] = await Promise.all([
    read('docs/.vitepress/theme/components/SystemTopBar.vue'),
    read('docs/.vitepress/theme/components/DesktopCanvas.vue'),
    read('docs/.vitepress/theme/components/ProfileCard.vue'),
    read('docs/.vitepress/theme/components/FeaturedProjectCard.vue'),
  ])
  assert.match(topbar, /href="#projects"/)
  assert.match(topbar, /href="#notes"/)
  assert.match(profile, /href="\/about"/)
  assert.match(profile, /href="#projects"/)
  assert.match(featured, /href="#projects"/)
  assert.match(canvas, /<ProjectFolder\s*\/>/)
  assert.match(canvas, /<NotesLauncher\s*\/>/)
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

test('theme styles balance the factory, knowledge, and QA surfaces', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.VPHero \.main[\s\S]*max-width:\s*900px/)
  assert.match(css, /\.VPHero \.text[\s\S]*text-wrap:\s*balance/)
  assert.match(css, /\.knowledge-hub__featured/)
  assert.match(css, /\.knowledge-hub__all/)
  for (const selector of [
    '.system-topbar', '.desktop-canvas', '.profile-card', '.project-folder',
    '.notes-launcher', '.lab-launcher', '.contact-terminal', '.canvas-controls',
  ]) assert.match(css, new RegExp(`\\.factory-home ${selector.replace('.', '\\.')}(?:\\s|,|\\{|:)`))
  assert.match(css, /\.factory-home a:focus-visible\s*\{[^}]*outline:\s*2px solid #315EFB/)
  assert.match(css, /\.factory-home \.desktop-canvas\s*\{[^}]*grid-template-columns:\s*repeat\(14, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.factory-home \.desktop-canvas\s*\{[^}]*grid-template-columns:\s*1fr/)
  assert.match(css, /\.factory-home\s*\{[^}]*font-family:\s*var\(--vp-font-family-base\)/)
  assert.match(css, /\.factory-home \.system-topbar\s*\{[^}]*font-family:\s*"JetBrains Mono", "Fira Code", Consolas, monospace/)
  for (const selector of [
    '.profile-card__summary', '.current-status-card dd', '.featured-project-card h2 + p',
    '.notes-launcher li', '.lab-launcher li',
  ]) {
    assert.match(css, new RegExp(`\\.factory-home ${escapeRegex(selector)}(?:\\s|,)[\\s\\S]*?\\{[^}]*font-family:\\s*var\\(--vp-font-family-base\\)`))
  }
  assert.doesNotMatch(css, /\.garden-/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
})

test('MacBook splash and hash shell preserve homepage discovery', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  assert.doesNotMatch(home, /FactoryBoot/)
  assert.match(home, /<MacbookBoot v-if="activeView === 'home'" @entered="homeEntered = true"\s*\/>/)
  assert.deepEqual([...home.matchAll(/data-os-view="(home|knowledge|system)"/g)].map((match) => match[1]), [
    'home', 'knowledge', 'system',
  ])
  assert.match(home, /<BottomOsNavigation :active-view="activeView" @select="selectView"\s*\/>/)
  assert.match(home, /<SystemTopBar\s*\/>/)
  assert.match(home, /<DesktopCanvas\s*\/>/)
})
