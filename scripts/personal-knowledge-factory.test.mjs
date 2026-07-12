import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, getReducedMotionPreference, getSessionStorage, isInteractiveTarget,
  readInitialBootState, shouldStartFromEnter, transitionBoot, writeBooted,
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

test('boot state persists only a versioned session value and fails open', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  assert.equal(readInitialBootState(storage, false), 'ready')
  assert.equal(writeBooted(storage), true)
  assert.equal(values.get(BOOT_STORAGE_KEY), BOOT_STORAGE_VALUE)
  assert.equal(readInitialBootState(storage, false), 'skipped')
  assert.equal(readInitialBootState(storage, true), 'skipped')
  assert.equal(readInitialBootState({ getItem() { throw new Error('denied') } }, false), 'ready')
  assert.equal(writeBooted({ setItem() { throw new Error('denied') } }), false)
})

test('session storage accessor tolerates a throwing property getter', () => {
  const deniedWindow = Object.defineProperty({}, 'sessionStorage', {
    get() { throw new DOMException('denied', 'SecurityError') },
  })
  assert.equal(getSessionStorage(deniedWindow), undefined)
  assert.equal(getSessionStorage({ sessionStorage: null }), null)
})

test('first interactive state resolves stored, reduced-motion, and denied clients without ready flicker', () => {
  const stored = { getItem: () => BOOT_STORAGE_VALUE }
  assert.equal(readInitialBootState(
    getSessionStorage({ sessionStorage: stored }),
    getReducedMotionPreference({ matchMedia: () => ({ matches: false }) }),
  ), 'skipped')
  assert.equal(readInitialBootState(
    getSessionStorage({ sessionStorage: null }),
    getReducedMotionPreference({ matchMedia: () => ({ matches: true }) }),
  ), 'skipped')

  const deniedWindow = Object.defineProperties({}, {
    sessionStorage: { get() { throw new DOMException('denied', 'SecurityError') } },
    matchMedia: { value: () => ({ matches: false }) },
  })
  assert.equal(readInitialBootState(
    getSessionStorage(deniedWindow),
    getReducedMotionPreference(deniedWindow),
  ), 'ready')
  assert.equal(getReducedMotionPreference({ matchMedia() { throw new Error('unavailable') } }), false)
})

test('boot transitions and Enter activation are explicit and safe', () => {
  assert.equal(transitionBoot('ready', 'START'), 'booting')
  assert.equal(transitionBoot('booting', 'COMPLETE'), 'complete')
  assert.equal(transitionBoot('ready', 'SKIP'), 'skipped')
  assert.equal(isInteractiveTarget({ closest: () => ({ tagName: 'A' }) }), true)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => null } }, 'ready'), true)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => ({}) } }, 'ready'), false)
  assert.equal(shouldStartFromEnter({ key: 'Enter', target: { closest: () => null } }, 'complete'), false)
})

test('global Enter ignores editable, focusable, and media control targets', () => {
  const expectedSelectors = [
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
  ]
  for (const expected of expectedSelectors) {
    const target = {
      closest(selector) {
        return selector.includes(expected) ? {} : null
      },
    }
    assert.equal(isInteractiveTarget(target), true, expected)
    assert.equal(shouldStartFromEnter({ key: 'Enter', target }, 'ready'), false, expected)
  }
})

test('factory boot stays inline, optional, and cleans up browser effects', async () => {
  const [boot, state] = await Promise.all([
    read('docs/.vitepress/theme/components/FactoryBoot.vue'),
    read('docs/.vitepress/theme/components/factoryBootState.mjs'),
  ])
  assert.match(state, /ai-era:knowledge-factory:booted/)
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
