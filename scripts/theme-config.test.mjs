import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveConfig } from 'vitepress'

const config = await resolveConfig('docs', 'build')

assert.equal(
  config.site.appearance,
  'dark',
  'the site must default to dark while allowing a persisted visitor choice'
)

assert.equal(
  config.site.themeConfig.darkModeSwitchLabel,
  '主题颜色',
  'the native appearance switch must have a Chinese label'
)

assert.deepEqual(
  config.site.themeConfig.footer,
  {
    message: '持续记录 AI、产品、工程与个人实践之间的连接。',
    copyright: 'Copyright © 2026 柯提'
  },
  'the site must render the configured garden footer'
)

const knowledgeNav = config.site.themeConfig.nav.find((item) => item.text === '知识库')
assert.deepEqual(
  knowledgeNav?.items,
  [
    { text: 'AI 知识库', link: '/wiki/' },
    { text: '金融知识库', link: '/finance/' }
  ],
  'the main navigation must fuse the two knowledge bases into one dropdown'
)

assert.equal(
  config.site.themeConfig.nav.some((item) => item.text === '金融知识库'),
  false,
  'the Finance landing page must not remain a separate top-level navigation button'
)

const wikiSidebar = config.site.themeConfig.sidebar['/wiki/']
assert.deepEqual(
  wikiSidebar.map((group) => group.text),
  ['实体', '概念', '对比分析'],
  'the wiki sidebar must use the three Chinese index sections'
)
assert.deepEqual(
  wikiSidebar.map(({ text, collapsed }) => ({ text, collapsed: collapsed ?? false })),
  [
    { text: '实体', collapsed: true },
    { text: '概念', collapsed: true },
    { text: '对比分析', collapsed: true }
  ],
  'every wiki sidebar group should be collapsed by default'
)

const sidebarItems = wikiSidebar.flatMap((group) => group.items)
const manifest = JSON.parse(await readFile('wiki-manifest.json', 'utf8'))
assert.equal(
  sidebarItems.length,
  manifest.pages.length,
  'the wiki sidebar must list every published manifest page'
)

const sidebarLinks = sidebarItems.map((item) => item.link)
assert.equal(
  new Set(sidebarLinks).size,
  sidebarLinks.length,
  'every wiki sidebar link must be unique'
)

const manifestLinks = manifest.pages.map(({ publicPath }) =>
  `/${publicPath.replace(/^docs\//, '').replace(/\.md$/, '')}`
)
assert.deepEqual(
  [...sidebarLinks].sort(),
  [...manifestLinks].sort(),
  'wiki sidebar links must match manifest public URLs'
)

const wikiIndex = await readFile('docs/wiki/index.md', 'utf8')
const indexHeadings = [...wikiIndex.matchAll(/^## (实体|概念|对比分析)$/gm)]
const indexGroups = indexHeadings.map((heading, index) => ({
  text: heading[1],
  items: [...wikiIndex
    .slice(heading.index + heading[0].length, indexHeadings[index + 1]?.index)
    .matchAll(/^- \[([^\]]+)\]\((\/wiki\/[^)]+)\)$/gm)].map(
    ([, itemText, link]) => ({ text: itemText, link })
  )
}))
assert.deepEqual(
  wikiSidebar.map(({ text, items }) => ({ text, items })),
  indexGroups,
  'wiki sidebar titles and order must match the Chinese wiki index'
)

const financeSidebar = config.site.themeConfig.sidebar['/finance/']
assert.ok(financeSidebar, 'the theme must define an independent /finance/ sidebar')
assert.deepEqual(
  financeSidebar.map((group) => group.text),
  ['实体', '概念', '对比分析'],
  'the Finance sidebar must use the three Chinese index sections'
)
assert.deepEqual(
  financeSidebar.map(({ collapsed }) => collapsed ?? false),
  [true, true, true],
  'every Finance sidebar group should be collapsed by default'
)

assert.deepEqual(
  financeSidebar[0].items.map((item) => item.text),
  [
    '本杰明·格雷厄姆',
    '爱德华·索普',
    '乔治·索罗斯',
    '詹姆斯·西蒙斯与大奖章基金',
    'LTCM 崩塌',
    '沃伦·巴菲特'
  ],
  'Finance entity sidebar labels must use concise Chinese names'
)

const financeSidebarItems = financeSidebar.flatMap((group) => group.items)
const financeManifest = JSON.parse(await readFile('finance-manifest.json', 'utf8'))
assert.ok(financeManifest.pages.length > 0, 'the Finance manifest must contain published pages')
assert.equal(
  financeSidebarItems.length,
  financeManifest.pages.length,
  'the Finance sidebar must list every current manifest page',
)

const financeSidebarLinks = financeSidebarItems.map((item) => item.link)
assert.equal(
  new Set(financeSidebarLinks).size,
  financeSidebarLinks.length,
  'every Finance sidebar link must be unique'
)
assert.equal(
  financeSidebarLinks.some((link) => sidebarLinks.includes(link)),
  false,
  'Finance and wiki routes must not overlap'
)

const financeManifestLinks = new Map(financeManifest.pages.map((page) => [
  `/${page.publicPath.replace(/^docs\//, '').replace(/\.md$/, '')}`,
  page.source
]))
const missingFinanceSources = [...financeManifestLinks]
  .filter(([link]) => !financeSidebarLinks.includes(link))
  .map(([, source]) => source)
assert.deepEqual(
  missingFinanceSources,
  [],
  `Finance sidebar is missing manifest sources: ${missingFinanceSources.join(', ')}`
)

const financeIndex = await readFile('docs/finance/index.md', 'utf8')
const financeIndexHeadings = [...financeIndex.matchAll(/^## (实体|概念|对比分析)$/gm)]
const financeIndexGroups = financeIndexHeadings.map((heading, index) => ({
  text: heading[1],
  items: [...financeIndex
    .slice(heading.index + heading[0].length, financeIndexHeadings[index + 1]?.index)
    .matchAll(/^- \[([^\]]+)\]\((\/finance\/[^)]+)\)$/gm)].map(
    ([, itemText, link]) => ({ text: itemText, link })
  )
}))
assert.deepEqual(
  financeSidebar.flatMap((group) => group.items.map((item) => item.link)),
  financeIndexGroups.flatMap((group) => group.items.map((item) => item.link)),
  'Finance sidebar links and order must match the generated Finance index'
)

console.log('theme config tests passed')
