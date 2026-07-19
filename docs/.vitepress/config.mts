import { defineConfig } from 'vitepress'

import { knowledgeSidebars } from './knowledge-navigation.mjs'

const personalSiteAccessPreflight = String.raw`(function () {
  var root = document.documentElement
  var isHomepage = location.pathname === '/' || location.pathname === '/index.html'
  if (!isHomepage) return
  var view = location.hash === '#knowledge' ? 'knowledge' : location.hash === '#system' ? 'system' : 'home'
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
    var stored = window.sessionStorage.getItem('personal-site-accessed')
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
  srcExclude: ['superpowers/**'],
  head: [['script', {}, personalSiteAccessPreflight]],
  transformPageData(pageData) {
    const updated = pageData.frontmatter.updated
    if (typeof updated === 'string' && Number.isFinite(Date.parse(updated))) {
      pageData.lastUpdated = Date.parse(updated)
    }
  },
  themeConfig: {
    nav: [
      {
        text: '知识库',
        items: [
          { text: 'AI 知识库', link: '/wiki/' },
          { text: '金融知识库', link: '/finance/' }
        ]
      },
      {
        text: '工具',
        items: [
          { text: 'LLM Wiki Skill', link: '/llm-wiki/' }
        ]
      },
      { text: '问答', link: '/ask/' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/llm-wiki/': [
        {
          text: 'LLM Wiki Skill',
          items: [
            { text: '概览', link: '/llm-wiki/' },
            { text: '原理', link: '/llm-wiki/principles' },
            { text: '构建知识库', link: '/llm-wiki/build' },
            { text: '安装与使用', link: '/llm-wiki/install' }
          ]
        }
      ],
      ...knowledgeSidebars
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
