import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  BOOT_STORAGE_KEY, BOOT_STORAGE_VALUE, getSessionStorage, isInteractiveTarget,
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
  assert.match(boot, /readInitialBootState\(getSessionStorage\(window\), reduced\)[\s\S]*addEventListener\('keydown'/)
  assert.match(boot, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
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
  assert.match(css, /@media \(max-width:\s*639px\)[\s\S]*\.factory-actions a\s*\{[\s\S]*min-height:\s*44px/)
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.factory-home \*[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/)
  assert.doesNotMatch(css, /neon|glow|infinite[-_ ]?canvas|draggable[-_ ]?window/i)
})
