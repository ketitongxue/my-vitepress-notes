import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  beginAccess, BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, getReducedMotionPreference, getSessionStorage,
  isInteractiveTarget, readInitialBootState, shouldActivateFromEnter, shouldContainTab, transitionBoot, writeAccessed,
} from '../docs/.vitepress/theme/components/factoryBootState.mjs'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage mounts the dedicated factory component', async () => {
  const page = await read('docs/index.md')
  assert.match(page, /layout:\s*page/)
  assert.match(page, /sidebar:\s*false/)
  assert.match(page, /outline:\s*false/)
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
})

test('factory homepage exposes the static Personal OS component and copy contract', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  const components = [
    'SystemTopBar', 'DesktopCanvas', 'ProfileCard', 'CurrentStatusCard',
    'FeaturedProjectCard', 'ProjectFolder', 'NotesLauncher', 'LabLauncher',
    'ContactTerminal', 'CanvasControls',
  ]
  const componentSources = new Map()
  for (const name of components) {
    const path = `docs/.vitepress/theme/components/${name}.vue`
    await assert.doesNotReject(read(path))
    componentSources.set(name, await read(path))
  }
  const allComponentSources = `${home}\n${[...componentSources.values()].join('\n')}`
  const canvas = componentSources.get('DesktopCanvas')
  for (const name of [
    'ProfileCard', 'CurrentStatusCard', 'FeaturedProjectCard', 'ProjectFolder',
    'NotesLauncher', 'LabLauncher', 'ContactTerminal', 'CanvasControls',
  ]) {
    assert.match(canvas, new RegExp(`import\\s+${name}\\s+from\\s+["']\\./${name}\\.vue["']`))
    assert.match(canvas, new RegExp(`<${name}\\s*/>`))
  }
  const copyByComponent = new Map([
    ['SystemTopBar', ['JuZX OS', '01 HOME', '02 PROJECTS', '03 NOTES', '04 ABOUT', 'SYSTEM ONLINE', 'v1.0']],
    ['ProfileCard', ["HELLO, I'M JuZX", 'MES Product Manager', 'Industrial Digitalization Explorer']],
    ['CurrentStatusCard', ['CURRENT STATUS']],
    ['FeaturedProjectCard', ['FEATURED PROJECT / 001', '核电制造 MES 系统']],
    ['ProjectFolder', ['PROJECTS/']],
    ['NotesLauncher', ['NOTES/']],
    ['LabLauncher', ['LAB/']],
    ['ContactTerminal', ['JuZX@digital-factory ~ zsh', '$ cat contact.md', 'Ready.']],
  ])
  for (const [name, copies] of copyByComponent) {
    for (const copy of copies) {
      assert.match(componentSources.get(name), new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  }
  assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>/)
  assert.match(home, /<SystemTopBar\s*\/>/)
  assert.match(home, /<DesktopCanvas\s*\/>/)
  assert.doesNotMatch(allComponentSources, /@(?:pointerdown|pointermove|wheel)|addEventListener\(\s*["'](?:pointerdown|pointermove|wheel)["']|\bdraggable\b/i)
})

test('Personal OS clock, navigation, semantics, and contact links are real', async () => {
  const { formatLocalTime, startLocalClock } = await import('../docs/.vitepress/theme/components/SystemTopBar.mjs')
  const [topbar, profile, featured, contact] = await Promise.all([
    read('docs/.vitepress/theme/components/SystemTopBar.vue'),
    read('docs/.vitepress/theme/components/ProfileCard.vue'),
    read('docs/.vitepress/theme/components/FeaturedProjectCard.vue'),
    read('docs/.vitepress/theme/components/ContactTerminal.vue'),
  ])

  assert.equal(formatLocalTime(new Date(2026, 6, 13, 9, 5)), '09:05')
  const intervalId = Symbol('local-clock-interval')
  const events = []
  const stopClock = startLocalClock(
    () => events.push('update'),
    (callback, delay) => {
      events.push(['schedule', callback, delay])
      return intervalId
    },
    (id) => events.push(['clear', id]),
  )
  assert.equal(events[0], 'update', 'clock must update immediately before scheduling')
  assert.equal(events[1][2], 60000)
  assert.equal(typeof events[1][1], 'function')
  stopClock()
  assert.deepEqual(events[2], ['clear', intervalId])
  assert.match(topbar, /onMounted\(\(\)\s*=>\s*\{[\s\S]*stopClock\s*=\s*startLocalClock\(/)
  assert.match(topbar, /onBeforeUnmount\(\(\)\s*=>\s*\{?[\s\S]*stopClock\(\)/)
  assert.match(topbar, /<time(?:\s|>)/)
  assert.match(profile, /<h1 id="factory-title" tabindex="-1">/)

  const hrefs = (source) => [...source.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1])
  assert.match(topbar, /<nav(?:\s|>)/)
  assert.deepEqual(hrefs(topbar), ['/', '#projects', '#notes', '/about'])
  assert.deepEqual(hrefs(profile), ['/about'])
  assert.deepEqual(hrefs(featured), ['#projects'])
  assert.deepEqual(hrefs(contact), ['https://github.com/ketitongxue'])
})

test('splash state uses the exact session contract and fails open', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  assert.equal(BOOT_STORAGE_KEY, 'personal-site-accessed')
  assert.equal(BOOT_STORAGE_VALUE, 'true')
  assert.equal(readInitialBootState(storage, false, 'pending'), 'ready')
  assert.equal(writeAccessed(storage), true)
  assert.equal(values.get('personal-site-accessed'), 'true')
  assert.equal(readInitialBootState(storage, false, 'pending'), 'skipped')
  assert.equal(readInitialBootState(storage, true, 'pending'), 'skipped')
  assert.equal(readInitialBootState(storage, false, 'returning'), 'skipped')
  assert.equal(readInitialBootState(storage, false, 'none'), 'skipped')
  assert.equal(readInitialBootState(undefined, false, 'pending'), 'skipped')
  assert.equal(readInitialBootState({ getItem() { throw new Error('denied') } }, false, 'pending'), 'skipped')
  assert.equal(writeAccessed({ setItem() { throw new Error('denied') } }), false)
})

test('browser capability accessors fail open without module-level globals', () => {
  const deniedWindow = Object.defineProperty({}, 'sessionStorage', {
    get() { throw new DOMException('denied', 'SecurityError') },
  })
  assert.equal(getSessionStorage(deniedWindow), undefined)
  assert.equal(getReducedMotionPreference({ matchMedia: () => ({ matches: true }) }), true)
  assert.equal(getReducedMotionPreference({ matchMedia() { throw new Error('unavailable') } }), true)
  assert.equal(getReducedMotionPreference({}), true)
})

test('splash transitions accept one activation and no repeated input', () => {
  assert.equal(transitionBoot('ready', 'ACTIVATE'), 'leaving')
  assert.equal(transitionBoot('leaving', 'ACTIVATE'), 'leaving')
  assert.equal(transitionBoot('leaving', 'EXIT_COMPLETE'), 'complete')
  assert.equal(transitionBoot('complete', 'ACTIVATE'), 'complete')
  assert.equal(transitionBoot('ready', 'BYPASS'), 'skipped')
  assert.equal(isInteractiveTarget({ closest: () => ({ tagName: 'BUTTON' }) }), true)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => null } }, 'ready'), true)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', repeat: true, target: { closest: () => null } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', isComposing: true, target: { closest: () => null } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, 'ready'), false)
  assert.equal(shouldActivateFromEnter({ key: 'Enter', target: { closest: () => null } }, 'leaving'), false)
})

test('activation behavior contains exit input and fails open when persistence fails', () => {
  let writes = 0
  const storage = { setItem() { writes += 1 } }
  assert.equal(beginAccess('ready', storage), 'leaving')
  assert.equal(writes, 1)
  assert.equal(beginAccess('leaving', storage), 'leaving')
  assert.equal(writes, 1, 'repeated exit clicks must not write or restart activation')
  assert.equal(beginAccess('ready', undefined), 'skipped')
  assert.equal(beginAccess('ready', { setItem() { throw new Error('denied') } }), 'skipped')
  assert.equal(shouldContainTab({ key: 'Tab' }, 'ready'), true)
  assert.equal(shouldContainTab({ key: 'Tab', shiftKey: true }, 'leaving'), true)
  assert.equal(shouldContainTab({ key: 'Tab' }, 'complete'), false)
  assert.equal(shouldContainTab({ key: 'Enter' }, 'leaving'), false)
})

test('VitePress head preflight is homepage-only, synchronous, exact, and bounded', async () => {
  const config = await read('docs/.vitepress/config.mts')
  for (const source of [
    "location.pathname === '/'", "location.pathname === '/index.html'",
    "sessionStorage.getItem('personal-site-accessed')", "stored === 'true'",
    "matchMedia('(prefers-reduced-motion: reduce)')", "dataset.personalSiteAccess = 'pending'",
    "dataset.personalSiteAccess = 'returning'", "dataset.personalSiteAccess = 'fallback'",
    "window.setTimeout", '2500', "window['__personalSiteAccessFallback']",
  ]) assert.match(config, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(config, /head:\s*\[\s*\['script',\s*\{\},\s*personalSiteAccessPreflight\]\s*\]/)
  assert.match(config, /window\.setTimeout\(function \(\) \{[\s\S]*delete window\['__personalSiteAccessFallback'\][\s\S]*\}, 2500\)/)
  assert.doesNotMatch(config, /type:\s*['"]module['"]/)
})

test('head watchdog fails open and releases its pending timer id', async () => {
  const config = await read('docs/.vitepress/config.mts')
  const preflight = config.match(/const personalSiteAccessPreflight = String\.raw`([\s\S]*?)`\n\nexport default/)?.[1]
  assert.ok(preflight, 'preflight source must be extractable')

  function runPreflight() {
    let watchdog
    const root = { dataset: {} }
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
      document: { documentElement: root },
      location: { pathname: '/' },
      window: browser,
    })
    return { browser, root, watchdog }
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
  assert.equal(claimed.root.dataset.personalSiteAccess, 'returning')
  assert.equal(Object.hasOwn(claimed.browser, '__personalSiteAccessFallback'), false)
})

test('factory boot is one exact accessible fullscreen replacement', async () => {
  const [boot, home, css, state] = await Promise.all([
    read('docs/.vitepress/theme/components/FactoryBoot.vue'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/theme/custom.css'),
    read('docs/.vitepress/theme/components/factoryBootState.mjs'),
  ])
  for (const copy of ['JuZX@digital-factory ~ zsh', '> Press Enter to Access System', 'aria-label="进入个人网站"']) {
    assert.match(boot, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(boot, /class="factory-boot__cursor" aria-hidden="true">_<\/span>/)
  assert.doesNotMatch(`${boot}\n${state}`, /启动知识系统|跳过启动|Loading knowledge archives|Connecting Ask Console|ai-era:knowledge-factory:booted|localStorage/)
  assert.match(home, /<FactoryBoot @reveal="handleReveal"\s*\/>\s*<main/)
  assert.doesNotMatch(home.match(/<section class="factory-hero"[\s\S]*?<\/section>/)?.[0] ?? '', /FactoryBoot/)
  assert.match(boot, /v-if="visible"/)
  assert.match(boot, /defineEmits\(\['reveal'\]\)/)
  assert.match(boot, /window\.setTimeout\(finishExit, 400\)/)
  assert.match(boot, /onBeforeUnmount/)
  assert.match(boot, /focus\(\{ preventScroll: true \}\)/)
  assert.match(css, /\.factory-boot\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?min-height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?min-height:\s*100dvh;/)
})

test('splash visual, motion, mobile, and fail-open rules are exact', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  for (const source of [
    '#F7F4EC', '#1E2430', '"JetBrains Mono", "Fira Code", Consolas, monospace',
    '400ms cubic-bezier(0.16, 1, 0.3, 1)', '600ms cubic-bezier(0.16, 1, 0.3, 1)',
    '800ms', 'touch-action: manipulation', 'min-width: 44px', 'min-height: 44px',
  ]) assert.match(css, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(css, /html\[data-personal-site-access="pending"\] \.factory-boot/)
  assert.match(css, /html:not\(\[data-personal-site-access="pending"\]\):not\(\[data-personal-site-access="leaving"\]\) \.factory-home/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.factory-boot__cursor[\s\S]*animation:\s*none !important;/)
  assert.doesNotMatch(css, /\.dark[\s\S]{0,240}\.factory-boot/)
})

test('input lock, preflight claim, cleanup, and focus handoff are explicit', async () => {
  const [boot, css] = await Promise.all([
    read('docs/.vitepress/theme/components/FactoryBoot.vue'),
    read('docs/.vitepress/theme/custom.css'),
  ])
  for (const source of [
    "state.value !== 'ready'", 'beginAccess(state.value, getSessionStorage(window))', "nextState === 'skipped'",
    "document.documentElement.dataset.personalSiteAccess = 'leaving'", "delete window['__personalSiteAccessFallback']",
    "window.removeEventListener('keydown', handleKeydown)", "document.getElementById('factory-title')",
    'shouldContainTab(event, state.value)', 'event.preventDefault()', '@click.stop="activate"', '@click="handleOverlayClick"',
  ]) assert.match(boot, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  const activate = boot.match(/function activate\(\)[\s\S]*?\n\}\n\nfunction handleOverlayClick/)?.[0] ?? ''
  assert.doesNotMatch(activate, /removeKeydown/)
  assert.match(activate, /nextState === 'skipped'[\s\S]*failOpen\(\)[\s\S]*return[\s\S]*window\.setTimeout\(finishExit, 400\)/)
  assert.match(boot, /async function finishExit[\s\S]*await nextTick\(\)[\s\S]*removeKeydown\(\)[\s\S]*getElementById\('factory-title'\)/)
  assert.match(boot, /async function failOpen[\s\S]*dataset\.personalSiteAccess = 'fallback'[\s\S]*visible\.value = false[\s\S]*await nextTick\(\)[\s\S]*removeKeydown\(\)[\s\S]*getElementById\('factory-title'\)/)
  const leavingRule = css.match(/\.factory-boot\[data-state="leaving"\]\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  assert.ok(leavingRule, 'leaving splash rule must exist')
  assert.doesNotMatch(leavingRule, /pointer-events:\s*none/)
})
