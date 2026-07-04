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
      { text: '知识库', link: '/wiki/' },
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
      ],
      '/wiki/': [
        {
          text: '实体',
          items: [
            { text: 'CC Switch', link: '/wiki/entities/cc-switch' },
            { text: 'Claude Code', link: '/wiki/entities/claude-code' },
            { text: 'OpenClaw', link: '/wiki/entities/openclaw' }
          ]
        },
        {
          text: '概念',
          collapsed: true,
          items: [
            { text: '智能体 Harness 工程', link: '/wiki/concepts/agent-harness-engineering' },
            { text: '智能体无头执行', link: '/wiki/concepts/agent-headless-execution' },
            { text: '智能体流水线编排', link: '/wiki/concepts/agent-pipeline-orchestration' },
            { text: '智能体任务简报', link: '/wiki/concepts/agent-task-briefing' },
            { text: 'AI 编程工程循环', link: '/wiki/concepts/ai-coding-engineering-loop' },
            { text: 'AI 调试错误分诊', link: '/wiki/concepts/ai-debugging-error-triage' },
            { text: 'AI 知识工程反馈循环', link: '/wiki/concepts/ai-knowledge-engineering-feedback-loop' },
            { text: 'AI 产品设计润色工作流', link: '/wiki/concepts/ai-product-design-polish-workflow' },
            { text: 'AI 产品文件持久化', link: '/wiki/concepts/ai-product-file-persistence' },
            { text: 'Claude Code 扩展系统', link: '/wiki/concepts/claude-code-extension-system' },
            { text: 'Claude Code Hooks', link: '/wiki/concepts/claude-code-hooks' },
            { text: 'Claude Code 记忆文件', link: '/wiki/concepts/claude-code-memory-files' },
            { text: 'Claude Code 权限模型', link: '/wiki/concepts/claude-code-permission-model' },
            { text: 'Claude Code 技能', link: '/wiki/concepts/claude-code-skills' },
            { text: 'Claude Code 子智能体', link: '/wiki/concepts/claude-code-subagents' },
            { text: '上下文工程', link: '/wiki/concepts/context-engineering' },
            { text: '长上下文失效模式', link: '/wiki/concepts/long-context-failure-modes' },
            { text: '最小可复现问题报告', link: '/wiki/concepts/minimal-reproducible-problem-report' },
            { text: '模型能力公开信号', link: '/wiki/concepts/model-capability-public-signals' },
            { text: '模型上下文协议', link: '/wiki/concepts/model-context-protocol' },
            { text: 'Obsidian 与 Claude Code 工作流', link: '/wiki/concepts/obsidian-claude-code-workflow' },
            { text: '开源工具发现', link: '/wiki/concepts/open-source-tool-discovery' },
            { text: '产品滥用防护', link: '/wiki/concepts/product-abuse-protection' },
            { text: '产品分析迭代循环', link: '/wiki/concepts/product-analytics-iteration-loop' },
            { text: '产品数据层选型', link: '/wiki/concepts/product-data-layer-selection' },
            { text: '产品部署发布工作流', link: '/wiki/concepts/product-deployment-release-workflow' },
            { text: '产品邮件投递工作流', link: '/wiki/concepts/product-email-delivery-workflow' },
            { text: '产品反馈循环', link: '/wiki/concepts/product-feedback-loop' },
            { text: '渐进式披露', link: '/wiki/concepts/progressive-disclosure' },
            { text: 'SDD 分层采用模型', link: '/wiki/concepts/sdd-layered-adoption-model' },
            { text: 'SDD 规格生命周期', link: '/wiki/concepts/sdd-spec-lifecycle' },
            { text: '无服务器定时任务', link: '/wiki/concepts/serverless-scheduled-jobs' },
            { text: '技能设计模式', link: '/wiki/concepts/skill-design-patterns' },
            { text: '聪明的技术提问', link: '/wiki/concepts/smart-technical-questioning' },
            { text: '苏格拉底式规格细化', link: '/wiki/concepts/socratic-spec-refinement' },
            { text: '规格驱动开发', link: '/wiki/concepts/spec-driven-development' },
            { text: '氛围编程的商业验证', link: '/wiki/concepts/vibe-coding-commercial-validation' }
          ]
        },
        {
          text: '对比分析',
          items: [
            { text: '框架优先与 Harness 优先的智能体架构', link: '/wiki/comparisons/framework-vs-harness-agent-architecture' },
            { text: '多智能体架构模式', link: '/wiki/comparisons/multi-agent-architecture-patterns' }
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
