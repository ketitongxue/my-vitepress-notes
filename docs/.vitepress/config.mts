import { defineConfig } from 'vitepress'

const personalSiteAccessPreflight = String.raw`(function () {
  var root = document.documentElement
  var isHomepage = location.pathname === '/' || location.pathname === '/index.html'
  if (!isHomepage) return
  var view = location.hash === '#system' ? 'system' : 'home'
  root.dataset.personalOsView = view
  function syncNavigationClaim() {
    var buttons = document.querySelectorAll('[data-os-nav-target]')
    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index]
      if (button.dataset.osNavTarget === view) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncNavigationClaim, { once: true })
  } else {
    syncNavigationClaim()
  }
  if (view !== 'home') {
    root.dataset.personalSiteAccess = 'claimed'
    return
  }
  try {
    if (typeof window.matchMedia !== 'function') throw new Error('motion query unavailable')
    var stored = window.localStorage.getItem('personal-site-accessed')
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (stored === 'true' || reduced) root.dataset.personalSiteAccess = 'returning'
    else root.dataset.personalSiteAccess = 'pending'
    if (root.dataset.personalSiteAccess === 'pending' || root.dataset.personalSiteAccess === 'returning') {
      window['__personalSiteAccessFallback'] = window.setTimeout(function () {
        if (root.dataset.personalSiteAccess === 'pending' || root.dataset.personalSiteAccess === 'returning') root.dataset.personalSiteAccess = 'fallback'
        delete window['__personalSiteAccessFallback']
      }, 2500)
    }
  } catch (error) {
    root.dataset.personalSiteAccess = 'fallback'
  }
})()`

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 纪元',
  description: '探索智能时代的知识、工具与创造',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: 'https://juzxailab.com',
    transformItems: (items) => items.filter(({ url }) => !/^\/?(?:admin(?:\/|$)|404(?:\.html)?$)/.test(url)),
  },
  head: [
    ['script', {}, personalSiteAccessPreflight],
  ],
  transformHtml(html, _path, { page, content }) {
    if (page !== '404.md') return html
    // VitePress leaves the 404 app empty for client routing. Reuse its rendered
    // default layout so visitors without JavaScript can still return home.
    return html.replace('<div id="app"></div>', `<div id="app"></div><noscript>${content}</noscript>`)
  },
  transformPageData(pageData) {
    const updated = pageData.frontmatter.updated
    if (typeof updated === 'string' && Number.isFinite(Date.parse(updated))) {
      pageData.lastUpdated = Date.parse(updated)
    }

    if (/^(?:admin\/|404\.md$)/.test(pageData.relativePath)) return

    const pathname = `/${pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')}`
    const head = Array.isArray(pageData.frontmatter.head) ? [...pageData.frontmatter.head] : []
    const canonical = head.find(([tag, attrs]) => tag === 'link' && attrs.rel === 'canonical')?.[1].href
      || new URL(pathname, 'https://juzxailab.com').href
    const title = pageData.title && pageData.title !== 'AI 纪元' ? `${pageData.title} | AI 纪元` : 'AI 纪元'
    const description = pageData.description || '探索智能时代的知识、工具与创造'
    const image = 'https://juzxailab.com/og-cover.png'
    const hasImage = head.some(([tag, attrs]) => tag === 'meta' && (attrs.property || attrs.name) === 'og:image')
    const defaults: [string, Record<string, string>][] = [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:type', content: pathname === '/' ? 'website' : 'article' }],
      ['meta', { property: 'og:site_name', content: 'AI 纪元' }],
      ['meta', { property: 'og:locale', content: 'zh_CN' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:image', content: image }],
      ...(!hasImage ? [
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { property: 'og:image:alt', content: 'AI 纪元 · 探索智能时代的知识、工具与创造' }],
      ] as [string, Record<string, string>][] : []),
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: head.find(([tag, attrs]) => tag === 'meta' && (attrs.property || attrs.name) === 'og:image')?.[1].content || image }],
    ]
    for (const [tag, attrs] of defaults) {
      const key = attrs.name || attrs.property || attrs.rel
      if (!head.some(([existingTag, existingAttrs]) => existingTag === tag
        && (existingAttrs.name || existingAttrs.property || existingAttrs.rel) === key)) {
        head.push([tag, attrs])
      }
    }
    pageData.frontmatter.head = head
  },
  themeConfig: {
    nav: [],
    sidebar: {},
    notFound: {
      title: '页面未找到',
      quote: '这个页面可能已移动或不存在。你可以返回首页继续浏览。',
      linkLabel: '返回 AI 纪元首页',
      linkText: '返回首页',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '打开搜索'
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除搜索',
            backButtonTitle: '关闭搜索',
            noResultsText: '没有找到相关结果',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车键',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '向上箭头',
              navigateDownKeyAriaLabel: '向下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc 键'
            }
          }
        }
      }
    },
    footer: {
      message: '持续记录 AI、产品、工程与个人实践之间的连接。',
      copyright: 'Copyright © 2026 柯提'
    },
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题颜色'
  }
})
