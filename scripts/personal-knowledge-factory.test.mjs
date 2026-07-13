import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, getReducedMotionPreference, getSessionStorage, isInteractiveTarget,
  readInitialBootState, shouldActivateFromEnter, transitionBoot, writeAccessed,
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

test('factory homepage exposes the real brand, actions, and exactly four modules', async () => {
  const home = await read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue')
  for (const copy of ['AI 纪元', 'PERSONAL KNOWLEDGE FACTORY', '个人知识工厂', '向知识库提问', '浏览知识模块']) {
    assert.match(home, new RegExp(copy))
  }
  const routes = [...home.matchAll(/href:\s*['"](\/(?:wiki|finance|ask|llm-wiki)\/?)['"]/g)].map((match) => match[1])
  assert.deepEqual(routes.sort(), ['/ask/', '/finance/', '/llm-wiki/', '/wiki/'])
  assert.match(home, /href="#knowledge-modules"/)
  assert.doesNotMatch(home, /MES|项目档案|媒体库|实验室|infinite.canvas|draggable/i)
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

test('factory boot stays inline, optional, and cleans up browser effects', async () => {
  const [boot, state] = await Promise.all([
    read('docs/.vitepress/theme/components/FactoryBoot.vue'),
    read('docs/.vitepress/theme/components/factoryBootState.mjs'),
  ])
  assert.match(state, /personal-site-accessed/)
  assert.doesNotMatch(`${boot}\n${state}`, /localStorage/)
  assert.match(boot, /onBeforeUnmount/)
  assert.equal([...boot.matchAll(/getSessionStorage\(window\)/g)].length, 3)
  assert.match(boot, /const hydrated = ref\(false\)/)
  assert.match(boot, /const state = ref\('complete'\)/)
  assert.match(boot, /state\.value = readInitialBootState\(getSessionStorage\(window\), getReducedMotionPreference\(window\)\)[\s\S]*hydrated\.value = true/)
  assert.match(boot, /v-if="hydrated && \(state === 'ready' \|\| state === 'booting'\)"/)
  assert.match(state, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(boot, /启动知识系统/)
  assert.match(boot, /跳过启动/)
  assert.doesNotMatch(boot, /position:\s*fixed/)
})

test('factory styles keep cards fluid, controls touchable, and motion optional', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.factory-module a:focus-visible[\s\S]*outline:\s*2px solid var\(--factory-focus\)/)
  const card = css.match(/\.factory-module\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  assert.ok(card, 'factory module card rule must exist')
  assert.doesNotMatch(card, /(?:^|\s)(?:height|min-height|max-height)\s*:/)
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.factory-home \*[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/)
  assert.doesNotMatch(css, /neon|glow|infinite[-_ ]?canvas|draggable[-_ ]?window/i)
})

test('every mobile factory link and boot control has a 44 by 44 hit area', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  const mobileStart = css.indexOf('@media (max-width: 639px)')
  const mobileEnd = css.indexOf('@media (prefers-reduced-motion: reduce)', mobileStart)
  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart, 'mobile factory media block must be present')
  const mobile = css.slice(mobileStart, mobileEnd)
  for (const selector of [
    '.factory-status a',
    '.factory-actions a',
    '.factory-module a',
    '.factory-log a',
    '.factory-notes a',
    '.factory-boot button',
  ]) assert.match(mobile, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(mobile, /min-width:\s*44px;/)
  assert.match(mobile, /min-height:\s*44px;/)
})
