import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const task7Components = [
  'MacbookBoot', 'MacbookExit', 'BottomOsNavigation', 'DesktopSurface', 'DesktopIcon', 'WindowManager',
  'KnowledgePortfolio', 'InfiniteCanvas', 'CanvasCard', 'CanvasConnections', 'CanvasLayers',
  'CanvasControls',
]

function scopedStyles(source) {
  return [...source.matchAll(/<style scoped>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n')
}

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
  const [desktop, config] = await Promise.all([
    read('docs/.vitepress/theme/components/DesktopSurface.vue'),
    read('shared/home-config.mjs'),
  ])
  assert.match(desktop, /href="#home"/)
  assert.match(desktop, /configuration\.desktop\.menuLinks/)
  for (const href of ['#knowledge', '#system', '/about']) assert.match(config, new RegExp(escapeRegex(href)))
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
    '.infinite-canvas', '.canvas-card', '.canvas-layers', '.canvas-controls',
  ]) assert.match(css, new RegExp(`\\.factory-home ${selector.replace('.', '\\.')}(?:\\s|,|\\{|:)`))
  assert.match(css, /\.factory-home :where\(a, button\):focus-visible\s*\{[^}]*outline:\s*3px solid #315EFB/)
  assert.match(css, /\.factory-home \.desktop-surface__menu\s*\{[^}]*height:\s*40px/)
  assert.match(css, /\.factory-home \.desktop-surface__workspace\s*\{[^}]*height:\s*calc\(100vh - 40px\)/)
  assert.match(css, /\.factory-home \.desktop-surface__workspace\s*\{[^}]*height:\s*calc\(100dvh - 40px\)/)
  const mobileOverflowPattern = [
    '@media \\(max-width: 767px\\)[\\s\\S]*?\\.factory-home\\s*\\{[^}]*overflow-x:',
    '\\s*clip',
  ].join('')
  assert.match(css, new RegExp(mobileOverflowPattern))
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.factory-home \.canvas-controls button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px/)
  assert.match(css, /\.factory-home\s*\{[^}]*font-family:\s*var\(--vp-font-family-base\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/)
  assert.match(css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? '', new RegExp('linear-gradient', 'i'))
  assert.doesNotMatch(css, /\.garden-/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
})

test('Personal OS components keep approved local textures without remote visual assets', async () => {
  const components = new Map(await Promise.all(task7Components.map(async (name) => [
    name,
    await read(`docs/.vitepress/theme/components/${name}.vue`),
  ])))
  const forbiddenEffects = /particle|illustration|character-art/i
  const remoteVisual = /url\(\s*['"]?(?:(?:https?:)?\/\/)|https?:\/\/[^\s'"()<>]+\.(?:svg|png|jpe?g|webp|gif)(?:[?#][^\s'"()<>]*)?/i
  const approvedGridUri = "data:image/svg+xml,%3Csvg xmlns='%68%74%74%70%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='1.2' cy='1.2' r='1.2' fill='%235087BE' fill-opacity='.16'/%3E%3C/svg%3E"
  const approvedGridDeclaration = `background-image: url("${approvedGridUri}");`
  const inlineImageDeclarations = (source) => source.match(
    /background-image:\s*url\("data:image[^\"]+"\);/gi,
  ) ?? []
  const hasOnlyApprovedGrid = (source) => {
    const declarations = inlineImageDeclarations(source)
    return declarations.length === 1 && declarations[0] === approvedGridDeclaration
  }

  for (const [name, source] of components) {
    const styles = scopedStyles(source)
    assert.doesNotMatch(styles, forbiddenEffects, `${name} scoped styles must not add forbidden visual effects`)
    assert.doesNotMatch(source, /<(?:img|picture)\b/i, `${name} must not add image elements`)
    assert.doesNotMatch(source, remoteVisual, `${name} must not load remote visual assets`)

    const inlineImageCount = [...source.matchAll(/data:image/gi)].length
    if (name === 'InfiniteCanvas') {
      assert.equal(inlineImageCount, 1, 'InfiniteCanvas keeps one approved inline grid primitive')
      assert.equal(hasOnlyApprovedGrid(styles), true)
      assert.match(styles, /background-size:\s*28px 28px/)
    } else {
      assert.equal(inlineImageCount, 0, `${name} must not add inline image data`)
    }

    const inlineSvgCount = [...source.matchAll(/<svg\b/gi)].length
    if (name === 'CanvasConnections') {
      assert.equal(inlineSvgCount, 1, `${name} keeps exactly one approved structural SVG`)
      assert.doesNotMatch(source, /<(?:path|image|foreignObject)\b/i, `${name} SVG must stay structural`)
    } else {
      assert.equal(inlineSvgCount, 0, `${name} must not add decorative inline SVG`)
    }
  }

  assert.match(scopedStyles(components.get('DesktopSurface')), new RegExp('linear-gradient'))
  assert.match(scopedStyles(components.get('DesktopSurface')), new RegExp('radial-gradient'))
  assert.match(scopedStyles(components.get('BottomOsNavigation')), new RegExp('backdrop-filter:\\s*blur\\(12px\\)'))
  assert.match(scopedStyles(components.get('DesktopIcon')), new RegExp('linear-gradient'))
  assert.match(scopedStyles(components.get('WindowManager')), /repeating-linear-gradient/)
  assert.match(scopedStyles(components.get('MacbookBoot')), /\.macbook-boot__launch\s*\{[^}]*background:\s*#F4D758;/)
  const canvasCard = scopedStyles(components.get('CanvasCard'))
  assert.doesNotMatch(canvasCard, /\.canvas-card__resize\s*\{/)
  assert.match(canvasCard, /\.canvas-card__resize-handle--nw\s*\{[^}]*cursor:\s*nw-resize;/)
  assert.match(canvasCard, /\.canvas-card__resize-handle--se\s*\{[^}]*cursor:\s*se-resize;/)
  assert.match('background-image: url("data:image/png;base64,invalid")', /data:image/i)
  assert.match('background-image: url("https://example.invalid/remote.png")', remoteVisual)
  assert.match('background-image: url("//cdn.example.invalid/remote.png")', remoteVisual)
  assert.doesNotMatch('background-image: url("/assets/local.png")', remoteVisual)
  assert.equal(hasOnlyApprovedGrid(
    `background-image: url("data:image/svg+xml,%3Csvg xmlns='%68%74%74%70%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M0 0h28v28H0z'/%3E%3Ccircle cx='1.2' cy='1.2' r='1.2' fill='%235087BE' fill-opacity='.16'/%3E%3C/svg%3E");`),
  false)
  assert.equal(hasOnlyApprovedGrid(
    `background-image: url("data:image/svg+xml,%3Csvg xmlns='%68%74%74%70%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cimage href='remote.png'/%3E%3Ccircle cx='1.2' cy='1.2' r='1.2' fill='%235087BE' fill-opacity='.16'/%3E%3C/svg%3E");`),
  false)
})

test('every required mobile Personal OS target keeps a 44 by 44 hit area', async () => {
  const [boot, windows, navigation, layers, controls, card] = await Promise.all([
    'MacbookBoot', 'WindowManager', 'BottomOsNavigation', 'CanvasLayers',
    'CanvasControls', 'CanvasCard',
  ].map(async (name) => scopedStyles(await read(`docs/.vitepress/theme/components/${name}.vue`))))

  assert.match(boot, /\.macbook-boot__launch\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/)
  assert.match(windows, /@media \(max-width: 767px\)[\s\S]*?\.window-manager__traffic-control\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/)
  assert.doesNotMatch(windows, /\.window-manager__controls/)
  assert.match(windows, /@media \(max-width: 767px\)[\s\S]*?\.window-manager__resize-handle\s*\{[^}]*display:\s*none;/)
  assert.match(navigation, /@media \(max-width: 767px\)[\s\S]*?\.bottom-os-navigation button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/)
  assert.match(layers, /@media \(max-width: 767px\)[\s\S]*?\.canvas-layers__toggle\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/)
  assert.match(controls, /@media \(max-width: 767px\)[\s\S]*?\.canvas-controls button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/)
  assert.doesNotMatch(card, /\.canvas-card__resize\s*\{/)
  assert.match(card, /@media \(max-width: 767px\)[\s\S]*?\.canvas-card__resize-handle--e\s*\{[^}]*width:\s*14px;/)
  assert.match(card, /@media \(max-width: 767px\)[\s\S]*?\.canvas-card__resize-handle--s\s*\{[^}]*height:\s*14px;/)
  assert.match(card, /@media \(max-width: 767px\)[\s\S]*?\.canvas-card__resize-handle--se\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/)
})

test('MacBook splash and hash shell preserve homepage discovery', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  assert.match(home, /<MacbookBoot[\s\S]*v-if="!hydrated \|\| \(activeView === 'home' && !homeEntered\)"[\s\S]*:active="activeView === 'home'"[\s\S]*:disabled="bootDisabled"[\s\S]*@entered="handleHomeEntered"[\s\S]*\/>/)
  assert.deepEqual([...home.matchAll(/data-os-view="(home|knowledge|system)"/g)].map((match) => match[1]), [
    'home', 'knowledge', 'system',
  ])
  assert.match(home, /<BottomOsNavigation[\s\S]*:active-view="activeView"[\s\S]*@select="selectView"[\s\S]*\/>/)
  assert.match(home, /<DesktopSurface :configuration="homeConfiguration\.config" \/>[\s\S]*<MacbookExit :configuration="homeConfiguration\.config" \/>/)
  assert.match(home, /<KnowledgePortfolio\s*\/>/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue'\)/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue\?retry=1'\)/)
  assert.doesNotMatch(home, /@vite-ignore/)
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
