import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage mounts the dedicated factory component', async () => {
  const page = await read('docs/index.md')
  assert.match(page, /layout:\s*page/)
  assert.match(page, /navbar:\s*false/)
  assert.match(page, /sidebar:\s*false/)
  assert.match(page, /outline:\s*false/)
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
})

test('Personal OS visual contract is exact, scoped, interactive, and responsive', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  const componentStyles = (await Promise.all([
    'DesktopSurface.vue', 'DesktopIcon.vue', 'WindowManager.vue', 'BottomOsNavigation.vue',
    'CanvasControls.vue', 'CanvasCard.vue', 'CanvasLayers.vue', 'CanvasMinimap.vue', 'InfiniteCanvas.vue',
  ].map((name) => read(`docs/.vitepress/theme/components/${name}`)))).join('\n')
  const scopedOs = css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? ''
  assert.ok(scopedOs, 'homepage OS styles must have an auditable scoped block')
  const os = `${scopedOs}\n${componentStyles}`

  assert.match(home, /class="personal-system-view__error"/)
  assert.match(scopedOs, /\.factory-home \.personal-system-view__error/)
  assert.match(scopedOs, /#F7F4EC/i)
  assert.doesNotMatch(scopedOs, /particle|illustration|portrait|<img/i)

  for (const color of [
    '#F7F4EC', '#FFFDF7', '#1E2430', '#69707D', '#315EFB',
    '#F4D758', '#EF7B45', '#3FAE78', '#192232', '#2F83D6', '#2875C5', '#3B91E1',
  ]) assert.match(os, new RegExp(color, 'i'))

  for (const source of [
    'overflow-x: clip',
    'height: 40px',
    'height: calc(100vh - 40px)',
    'height: calc(100dvh - 40px)',
    'min-width: 360px',
    'min-height: 260px',
    '@media (max-width: 767px)',
    'min-width: 44px',
    'min-height: 44px',
    '@media (prefers-reduced-motion: reduce)',
    'outline: 3px solid #315EFB',
  ]) assert.match(os, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))

  for (const selector of [
    'macbook-boot', 'desktop-surface', 'desktop-surface__menu', 'desktop-icon',
    'window-manager__window', 'bottom-os-navigation', 'knowledge-portfolio',
    'infinite-canvas', 'canvas-card', 'canvas-layers', 'canvas-minimap', 'canvas-controls',
  ]) assert.match(os, new RegExp(`\\.factory-home \\.${selector}(?:\\s|,|\\{|:)`))

  assert.match(os, /\.factory-home\s*\{[^}]*font-family:\s*var\(--vp-font-family-base\)/)
  assert.match(os, new RegExp('linear-gradient', 'i'))
  assert.match(os, new RegExp('radial-gradient', 'i'))
  assert.match(os, new RegExp('backdrop-filter:\\s*blur\\(12px\\)', 'i'))
  assert.doesNotMatch(os, /particle|illustration|character-art/i)
  for (const source of [
    '@media (max-width: 767px)',
    '@media (prefers-reduced-motion: reduce)',
    'min-width: 44px', 'min-height: 44px',
    'env(safe-area-inset-bottom)',
  ]) assert.match(os, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  assert.doesNotMatch(os, /bounce|elastic|animation:[^;]*(?:pulse|sparkle|star)/i)
  assert.doesNotMatch(os, /(?:^|\})\s*(?:html|body|\.factory-home)\s*\{[^}]*touch-action:\s*none/i)
})

test('reduced motion preserves functional Personal OS transforms in the effective cascade', async () => {
  const [css, canvas, navigation] = await Promise.all([
    read('docs/.vitepress/theme/custom.css'),
    read('docs/.vitepress/theme/components/InfiniteCanvas.vue'),
    read('docs/.vitepress/theme/components/BottomOsNavigation.vue'),
  ])
  assert.doesNotMatch(css,
    /\.factory-home \*,\s*\.factory-home \*::before,\s*\.factory-home \*::after\s*\{[^}]*transform:\s*none !important;/i)
  assert.match(canvas, /transform:\s*`translate\(\$\{transform\.value\.panX\}px, \$\{transform\.value\.panY\}px\) scale\(\$\{transform\.value\.scale\}\)`/)
  assert.match(navigation, /transform:\s*translateX\(50%\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;[\s\S]*scroll-behavior:\s*auto !important;/)
})

test('Personal OS view components expose exact navigation and desktop menu labels', async () => {
  const [home, desktop, navigation] = await Promise.all([
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/components/DesktopSurface.vue'),
    read('docs/.vitepress/theme/components/BottomOsNavigation.vue'),
  ])
  assert.match(home, /import MacbookBoot from '.\/MacbookBoot\.vue'/)
  assert.match(home, /import BottomOsNavigation from '.\/BottomOsNavigation\.vue'/)
  assert.match(home, /window\.addEventListener\('hashchange'/)
  assert.match(home, /normalizeOsHash\(window\.location\.hash\)/)
  assert.match(home, /window\.location\.hash = hashForOsView\(view\)/)
  assert.match(home, /const hydrated = ref\(false\)/)
  assert.match(home, /const activeView = ref\(initialOsView\(claimedView\)\)/)
  assert.match(home, /const bootDisabled = ref\(typeof document !== 'undefined'[\s\S]*document\.documentElement\.dataset\.personalSiteAccess === 'fallback'\)/)
  assert.doesNotMatch(home, /bootDisabled[\s\S]{0,300}personalOsView === '(?:knowledge|system)'/)
  assert.match(home, /v-show="!hydrated \|\| \(activeView === 'home' && homeEntered\)"/)
  assert.match(home, /v-show="!hydrated \|\| activeView === 'knowledge'"/)
  assert.match(home, /v-show="!hydrated \|\| activeView === 'system'"/)
  assert.match(home, /@entered="handleHomeEntered"/)
  assert.match(home, /async function handleHomeEntered[\s\S]*homeEntered\.value = true[\s\S]*await nextTick\(\)[\s\S]*window\.scrollTo\(0, 0\)/)
  assert.equal([...home.matchAll(/data-os-view="(home|knowledge|system)"/g)].length, 3)
  for (const view of ['home', 'knowledge', 'system']) {
    assert.match(home, new RegExp(`data-os-view="${view}"`))
  }
  assert.match(home, /<MacbookBoot[\s\S]*v-if="!hydrated \|\| \(activeView === 'home' && !homeEntered\)"[\s\S]*:active="activeView === 'home'"[\s\S]*:disabled="bootDisabled"[\s\S]*@entered="handleHomeEntered"[\s\S]*\/>/)
  assert.match(home, /<DesktopSurface\s*\/>[\s\S]*<MacbookExit\s*\/>/)
  assert.match(home, /<KnowledgePortfolio\s*\/>/)
  assert.match(home, /<BottomOsNavigation[\s\S]*:active-view="activeView"[\s\S]*@select="selectView"[\s\S]*\/>/)
  for (const label of ['JuZX OS', 'About', 'Knowledge', 'Now']) assert.match(desktop, new RegExp(`>${label}<`))
  assert.match(desktop, /<time :datetime="clock">\{\{ clock \}\}<\/time>/)
  assert.match(desktop, />重置桌面位置<\/button>/)
  assert.deepEqual([...navigation.matchAll(/>\s*(0[1-3] (?:主页|知识库|我的 OS))\s*<\/button>/g)].map((match) => match[1]), [
    '01 主页', '02 知识库', '03 我的 OS',
  ])
})

test('final shell integrates exit, portfolio, and retryable lazy system view', async () => {
  const [home, exit, navigation] = await Promise.all([
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/components/MacbookExit.vue'),
    read('docs/.vitepress/theme/components/BottomOsNavigation.vue'),
  ])

  for (const component of ['MacbookBoot', 'DesktopSurface', 'MacbookExit', 'KnowledgePortfolio', 'BottomOsNavigation']) {
    assert.match(home, new RegExp(`import ${component} from './${component}\\.vue'`))
  }
  assert.equal([...home.matchAll(/<DesktopSurface\s*\/>/g)].length, 1)
  assert.equal([...home.matchAll(/<MacbookExit\s*\/>/g)].length, 1)
  assert.equal([...home.matchAll(/<KnowledgePortfolio\s*\/>/g)].length, 1)
  assert.match(home, /<DesktopSurface\s*\/>[\s\S]*<MacbookExit\s*\/>/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue'\)/)
  assert.match(home, /\(\) => import\('\.\/InfiniteCanvas\.vue\?retry=1'\)/)
  assert.doesNotMatch(home, /@vite-ignore|infiniteCanvasUrl|<iframe|<object|<embed/i)
  assert.match(home, /const systemLoadState = ref\('idle'\)/)
  assert.match(home, /const currentRequest = \+\+requestId/)
  assert.match(home, /currentRequest !== requestId/)
  assert.match(home, /systemLoadState\.value = 'loading'/)
  assert.match(home, /systemLoadState\.value = 'loaded'/)
  assert.match(home, /systemLoadState\.value = 'error'/)
  assert.match(home, />\s*重新加载我的 OS\s*<\/button>/)
  assert.match(home, /aria-label="我的 OS 系统视图"/)
  assert.match(home, /id="personal-os-home"[\s\S]*tabindex="-1"[\s\S]*aria-label="JuZX OS 主页"/)
  assert.match(home, /document\.getElementById\('personal-os-home'\)\?\.focus/)
  assert.equal([...home.matchAll(/<BottomOsNavigation\b/g)].length, 1)
  assert.match(home, /v-show="!hydrated \|\| activeView !== 'home' \|\| homeEntered"/)
  assert.match(navigation, /data-os-nav-target="home"/)
  assert.match(navigation, /data-os-nav-target="knowledge"/)
  assert.match(navigation, /data-os-nav-target="system"/)

  assert.match(exit, /import \{ exitFrame, normalizeExitProgress \} from '.\/homeExitState\.mjs'/)
  assert.match(exit, /window\.addEventListener\('scroll', scheduleFrame, \{ passive: true \}\)/)
  assert.match(exit, /requestAnimationFrame/)
  assert.match(exit, /cancelAnimationFrame/)
  assert.match(exit, /window\.removeEventListener\('scroll', scheduleFrame\)/)
  assert.match(exit, /window\.removeEventListener\('resize', scheduleFrame\)/)
  for (const variable of ['--exit-panel-scale', '--exit-computer-opacity', '--exit-terminal-opacity']) {
    assert.match(exit, new RegExp(variable))
  }
  for (const line of ['JuZX@digital-factory ~ zsh', '$ logout', 'Session complete.']) {
    assert.match(exit, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(exit, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(exit, /min-height:\s*100vh;[\s\S]*min-height:\s*100dvh;/)
  assert.doesNotMatch(exit, new RegExp(
    'linear-gradient|radial-gradient|backdrop-filter|\\bstars?\\b|sparkle|particle|illustration|<svg|<img',
    'i',
  ))
})

test('knowledge portfolio preserves the six-section content and navigation contract', async () => {
  const portfolio = await read('docs/.vitepress/theme/components/KnowledgePortfolio.vue')
  const requiredHrefs = [
    '/wiki/',
    '/finance/',
    '/ask/',
    '/llm-wiki/',
    '/llm-wiki/principles',
    '/llm-wiki/build',
    'https://github.com/ketitongxue/llm-wiki-skill',
    '/notes/product-validation-loop',
    '/notes/static-site-delivery',
    '/notes/sustainable-ai-workflow',
  ]

  assert.match(portfolio, /import \{ knowledgeSections \} from '.\/personalOsContent\.mjs'/)
  assert.match(portfolio, /<main class="knowledge-portfolio" aria-labelledby="knowledge-portfolio-title">/)
  assert.equal([...portfolio.matchAll(/<h1\b/g)].length, 1)
  assert.match(portfolio, /<h1 id="knowledge-portfolio-title">/)
  const introHeading = portfolio.match(/<template v-if="section\.id === 'intro'">([\s\S]*?)<\/template>/)?.[1] ?? ''
  assert.match(introHeading, /\{\{ section\.title \}\}/, 'intro must render its source title beside the page identity')
  assert.equal([...portfolio.matchAll(/<section\b/g)].length, 1, 'one source section template must render all six records')
  assert.match(portfolio, /<section[\s\S]*v-for="section in knowledgeSections"[\s\S]*:key="section\.id"[\s\S]*:data-knowledge-section="section\.id"/)
  assert.match(portfolio, /<h2[\s\S]*\{\{ section\.title \}\}[\s\S]*<\/h2>/)
  assert.match(portfolio, /section\.id === 'intro'/)
  for (const id of ['llm-wiki', 'finance', 'qa', 'skill', 'recent']) {
    assert.match(portfolio, new RegExp(`section\\.id === '${id}'`))
  }
  for (const property of ['section.id', 'section.label', 'section.title', 'section.summary']) {
    assert.match(portfolio, new RegExp(property.replace('.', '\\.') ))
  }

  const workflow = portfolio.match(/<ol class="knowledge-portfolio__workflow">([\s\S]*?)<\/ol>/)?.[1] ?? ''
  assert.equal([...workflow.matchAll(/<li\b/g)].length, 4)
  for (const copy of ['来源接收与分流', '结构化摄取', '验证与链接检查', '发布与更新']) {
    assert.match(workflow, new RegExp(copy))
  }
  assert.match(portfolio, /<ul class="knowledge-portfolio__recent-list">/)
  assert.equal([...portfolio.matchAll(/<time datetime="\d{4}-\d{2}-\d{2}">/g)].length, 3)
  for (const [date, href, title] of [
    ['2026-07-01', '/notes/product-validation-loop', '产品验证循环'],
    ['2026-06-30', '/notes/static-site-delivery', '静态网站交付'],
    ['2026-07-02', '/notes/sustainable-ai-workflow', '可持续的 AI 工作流'],
  ]) {
    const item = `<li><time datetime="${date}">${date}</time><a href="${href}">${title}</a></li>`
    assert.match(portfolio, new RegExp(item), `${href} metadata must match its frontmatter`)
  }

  for (const href of requiredHrefs) {
    const pattern = new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')
    assert.equal([...portfolio.matchAll(pattern)].length, 1, `${href} must be one native link`)
  }
  for (const anchor of portfolio.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(anchor[0], /rel="noopener noreferrer"/)
  }
})

test('MacBook boot and bottom navigation expose the timed accessible shell contract', async () => {
  const [boot, navigation] = await Promise.all([
    read('docs/.vitepress/theme/components/MacbookBoot.vue'),
    read('docs/.vitepress/theme/components/BottomOsNavigation.vue'),
  ])

  assert.match(boot, /defineEmits\(\['entered'\]\)/)
  assert.match(boot, /defineProps\(\{[\s\S]*active:[\s\S]*disabled:/)
  assert.match(boot, /const disabled = props\.disabled \|\| document\.documentElement\.dataset\.personalSiteAccess === 'fallback'/)
  assert.match(boot, /createMacbookBootRuntime\(window, handleKeydown, disabled\)/)
  assert.match(boot, /if \(disabled\)[\s\S]*terminateBoot\(\)[\s\S]*return/)
  assert.match(boot, /function terminateBoot\(\)[\s\S]*runtime\?\.stop\(\)[\s\S]*state\.value = 'desktop'[\s\S]*visible\.value = false/)
  assert.match(boot, /import \{ bootLines \} from '.\/personalOsContent\.mjs'/)
  assert.match(boot, /class="macbook-boot__computer"/)
  assert.match(boot, /class="macbook-boot__screen"/)
  assert.equal([...boot.matchAll(/aria-live="polite"/g)].length, 1)
  assert.match(boot, /<button[\s\S]*?type="button"[\s\S]*?@click="activate"/)
  assert.match(boot, /progressCells\(progress\)/)
  for (const delay of ['220', '55', '500']) assert.match(boot, new RegExp(delay))
  assert.match(boot, /getSessionStorage\(window\)/)
  assert.match(boot, /getReducedMotionPreference\(window\)/)
  assert.match(boot, /writeAccessed\(storage\)/)
  assert.match(boot, /shouldActivateMacbookFromEnter\(event, state\.value\)/)
  assert.match(boot, /shouldSkipMacbookBoot\(storage, reduceMotion\)/)
  assert.match(boot, /if \(skipBoot\)[\s\S]*schedule\(\(\) => void enterDesktop\(\), 80\)/)
  assert.match(boot, /onBeforeUnmount/)

  assert.match(navigation, /defineProps\(\{ activeView:/)
  assert.match(navigation, /defineEmits\(\['select'\]\)/)
  assert.deepEqual([...navigation.matchAll(/@click="emit\('select', '(home|knowledge|system)'\)"/g)].map((match) => match[1]), [
    'home', 'knowledge', 'system',
  ])
})

test('VitePress head preflight is homepage-only, synchronous, exact, and bounded', async () => {
  const config = await read('docs/.vitepress/config.mts')
  for (const source of [
    "location.pathname === '/'", "location.pathname === '/index.html'",
    "location.hash === '#knowledge'", "location.hash === '#system'",
    "dataset.personalOsView", "dataset.personalSiteAccess = 'claimed'",
    "querySelectorAll('[data-os-nav-target]')", "addEventListener('DOMContentLoaded'",
    "sessionStorage.getItem('personal-site-accessed')", "stored === 'true'",
    "matchMedia('(prefers-reduced-motion: reduce)')", "dataset.personalSiteAccess = 'pending'",
    "dataset.personalSiteAccess = 'returning'", "dataset.personalSiteAccess = 'fallback'",
    "window.setTimeout", '2500', "window['__personalSiteAccessFallback']",
  ]) assert.match(config, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(config, /head:\s*\[\s*\['script',\s*\{\},\s*personalSiteAccessPreflight\]\s*\]/)
  assert.match(config, /if \(root\.dataset\.personalSiteAccess === 'pending' \|\| root\.dataset\.personalSiteAccess === 'returning'\)/)
  assert.match(config, /window\.setTimeout\(function \(\) \{[\s\S]*root\.dataset\.personalSiteAccess = 'fallback'[\s\S]*delete window\['__personalSiteAccessFallback'\][\s\S]*\}, 2500\)/)
  assert.doesNotMatch(config, /type:\s*['"]module['"]/)
})

test('head watchdog fails open and releases its pending timer id', async () => {
  const config = await read('docs/.vitepress/config.mts')
  const preflight = config.match(/const personalSiteAccessPreflight = String\.raw`([\s\S]*?)`\n\nexport default/)?.[1]
  assert.ok(preflight, 'preflight source must be extractable')

  function runPreflight(hash = '') {
    let watchdog
    let ready
    const root = { dataset: {} }
    const buttons = ['home', 'knowledge', 'system'].map((target) => {
      const attributes = new Map()
      return {
        dataset: { osNavTarget: target },
        getAttribute: (name) => attributes.get(name),
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: (name) => attributes.delete(name),
      }
    })
    const document = {
      documentElement: root,
      readyState: 'loading',
      querySelectorAll: () => buttons,
      addEventListener(type, callback) {
        assert.equal(type, 'DOMContentLoaded')
        ready = callback
      },
    }
    const browser = {
      matchMedia: () => ({ matches: false }),
      sessionStorage: { getItem: () => null },
      setTimeout(callback, delay) {
        assert.equal(delay, 2500)
        watchdog = callback
        return 42
      },
    }
    runInNewContext(preflight, {
      document,
      location: { pathname: '/', hash },
      window: browser,
    })
    return { browser, buttons, ready, root, watchdog }
  }

  const { browser, root, watchdog } = runPreflight()
  assert.equal(root.dataset.personalSiteAccess, 'pending')
  assert.equal(browser['__personalSiteAccessFallback'], 42)
  watchdog()
  assert.equal(root.dataset.personalSiteAccess, 'fallback')
  assert.equal(Object.hasOwn(browser, '__personalSiteAccessFallback'), false)

  const claimed = runPreflight()
  claimed.root.dataset.personalSiteAccess = 'returning'
  claimed.watchdog()
  assert.equal(claimed.root.dataset.personalSiteAccess, 'fallback')
  assert.equal(Object.hasOwn(claimed.browser, '__personalSiteAccessFallback'), false)

  for (const [hash, view] of [['#knowledge', 'knowledge'], ['#system', 'system']]) {
    const direct = runPreflight(hash)
    assert.equal(direct.root.dataset.personalOsView, view)
    assert.equal(direct.root.dataset.personalSiteAccess, 'claimed')
    assert.equal(direct.watchdog, undefined)
    assert.equal(Object.hasOwn(direct.browser, '__personalSiteAccessFallback'), false)
    direct.ready()
    for (const button of direct.buttons) {
      assert.equal(button.getAttribute('aria-current'), button.dataset.osNavTarget === view ? 'page' : undefined)
    }
  }
})

test('the production build audits SSR landmarks and navigation visibility', async () => {
  const packageJson = JSON.parse(await read('package.json'))
  assert.match(packageJson.scripts['docs:build'], /node scripts\/personal-os-ssr-check\.mjs/)
})

test('MacBook boot is one exact accessible fullscreen replacement', async () => {
  const [boot, home, state] = await Promise.all([
    read('docs/.vitepress/theme/components/MacbookBoot.vue'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/components/macbookBootState.mjs'),
  ])
  assert.match(boot, /bootLines\.slice\(0, visibleLineCount\.value\)/)
  assert.match(boot, /aria-label="个人系统启动页"/)
  assert.match(boot, />\s*启动 JuZX OS\s*<\/button>/)
  assert.doesNotMatch(`${boot}\n${state}`, /启动知识系统|跳过启动|Loading knowledge archives|Connecting Ask Console|ai-era:knowledge-factory:booted|localStorage/)
  assert.match(home, /<MacbookBoot[\s\S]*v-if="!hydrated \|\| \(activeView === 'home' && !homeEntered\)"[\s\S]*:active="activeView === 'home'"[\s\S]*:disabled="bootDisabled"[\s\S]*@entered="handleHomeEntered"[\s\S]*\/>/)
  assert.match(boot, /active:\s*\{ type: Boolean, default: true \}/)
  assert.match(boot, /if \(started \|\| !props\.active\) return/)
  assert.match(boot, /v-if="visible"/)
  assert.match(boot, /defineEmits\(\['entered'\]\)/)
  assert.match(boot, /schedule\(\(\) => void enterDesktop\(\), 80\)/)
  assert.match(boot, /onBeforeUnmount/)
  assert.match(boot, /focus\(\{ preventScroll: true \}\)/)
  assert.match(boot, /\.macbook-boot\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?min-height:\s*100dvh;/)
})

test('MacBook visual, mobile, reduced-motion, and fail-open rules are exact', async () => {
  const [css, boot] = await Promise.all([
    read('docs/.vitepress/theme/custom.css'),
    read('docs/.vitepress/theme/components/MacbookBoot.vue'),
  ])
  for (const source of [
    '#F7F4EC', '#1E2430', '"JetBrains Mono", "Fira Code", Consolas, monospace',
    'min-width: 44px', 'min-height: 44px',
  ]) assert.match(`${css}\n${boot}`, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(boot, /min-height:\s*100vh;[\s\S]*min-height:\s*100dvh;/)
  assert.match(boot, /transition:\s*transform 500ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/)
  assert.match(css, /\.macbook-boot\s*\{\s*display:\s*none !important;/)
  assert.match(css, /html\[data-personal-site-access="pending"\] \.macbook-boot\s*\{\s*display:\s*grid !important;/)
  assert.match(css, /html\[data-personal-site-access="pending"\] \.bottom-os-navigation\s*\{\s*display:\s*none !important;/)
  assert.match(css, /html\[data-personal-os-view="knowledge"\][\s\S]*\[data-os-nav-target="knowledge"\]/)
  assert.match(css, /html\[data-personal-os-view="system"\][\s\S]*\[data-os-nav-target="system"\]/)
  assert.match(css, /html:not\(\[data-personal-site-access="pending"\]\) \.factory-home/)
  assert.match(css, /html\[data-personal-os-view="home"\][\s\S]*\[data-os-view="knowledge"\]/)
  assert.match(css, /html\[data-personal-os-view="knowledge"\][\s\S]*\[data-os-view="home"\]/)
  assert.match(css, /html\[data-personal-os-view="system"\][\s\S]*\[data-os-view="home"\]/)
  const os = css.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1] ?? ''
  assert.match(os, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/)
  assert.doesNotMatch(css, /\.factory-boot/)
})
