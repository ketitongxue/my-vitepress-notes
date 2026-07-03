import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '柯提的 AI 纪元',
  description: '探索智能时代的知识、工具与创造',
  appearance: 'force-dark',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '主题', link: '/topics/' },
      { text: '笔记', link: '/notes/sustainable-ai-workflow' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: '可持续的 AI 工作流', link: '/notes/sustainable-ai-workflow' },
            { text: '产品验证循环', link: '/notes/product-validation-loop' },
            { text: '静态网站交付', link: '/notes/static-site-delivery' }
          ]
        }
      ]
    },
    search: { provider: 'local' },
    footer: {
      message: '持续记录 AI、产品、工程与个人实践之间的连接。',
      copyright: 'Copyright © 2026 柯提'
    },
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观'
  }
})
