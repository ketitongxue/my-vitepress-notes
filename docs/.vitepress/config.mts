import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 纪元',
  description: '探索智能时代的知识、工具与创造',
  appearance: 'force-dark',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['superpowers/**'],
  themeConfig: {
    nav: [
      { text: '主题', link: '/topics/' },
      { text: '笔记', link: '/notes/sustainable-ai-workflow' },
      { text: '知识库', link: '/wiki/' },
      { text: '金融知识库', link: '/finance/' },
      { text: '问答', link: '/ask/' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/finance/': [
        {
          text: '实体',
          items: [
            { text: '本杰明·格雷厄姆 (Benjamin Graham)', link: '/finance/entities/benjamin-graham' },
            { text: '爱德华·索普 (Edward Thorp)', link: '/finance/entities/edward-thorp' },
            { text: '乔治·索罗斯 (George Soros)', link: '/finance/entities/george-soros' },
            { text: '詹姆斯·西蒙斯 (James Simons) 与大奖章基金', link: '/finance/entities/james-simons' },
            { text: '长期资本管理公司 (LTCM) 崩塌', link: '/finance/entities/ltcm' },
            { text: '沃伦·巴菲特 (Warren Buffett)', link: '/finance/entities/warren-buffett' }
          ]
        },
        {
          text: '概念',
          collapsed: true,
          items: [
            { text: 'A股市场规则 (A-Share Market Rules)', link: '/finance/concepts/a-share-market-rules' },
            { text: '主动投资组合管理', link: '/finance/concepts/active-portfolio-management' },
            { text: 'AI 与机器学习基础', link: '/finance/concepts/ai-ml-foundations' },
            { text: 'AI 量化多智能体工作流', link: '/finance/concepts/ai-quant-agent-workflow' },
            { text: 'AI 量化交易学习路径', link: '/finance/concepts/ai-quant-trading-learning-path' },
            { text: '阿尔法衰减与策略容量', link: '/finance/concepts/alpha-decay-and-strategy-capacity' },
            { text: '另类数据', link: '/finance/concepts/alternative-data' },
            { text: '非对称赔率与仓位管理', link: '/finance/concepts/asymmetric-payoff-and-position-sizing' },
            { text: '回测偏差与交易摩擦', link: '/finance/concepts/backtesting-bias-and-frictions' },
            { text: '黑箱相关性模型：拒绝解释，只看数据', link: '/finance/concepts/black-box-correlation-models' },
            { text: '半人马模型：人机协作', link: '/finance/concepts/centaur-human-ai' },
            { text: '缠论的量化拆解', link: '/finance/concepts/changlun-quantitative' },
            { text: '衍生品与杠杆 (Derivatives and Leverage)', link: '/finance/concepts/derivatives-and-leverage' },
            { text: '因子投资', link: '/finance/concepts/factor-investing' },
            { text: '肥尾效应与收敛套利', link: '/finance/concepts/fat-tail-and-convergence-arbitrage' },
            { text: '闪崩与流动性危机', link: '/finance/concepts/flash-crash-liquidity' },
            { text: '分形市场结构', link: '/finance/concepts/fractal-market-structure' },
            { text: '无限游戏与长期主义', link: '/finance/concepts/infinite-game-long-termism' },
            { text: '凯利公式 (Kelly Criterion)', link: '/finance/concepts/kelly-criterion' },
            { text: '市场数据质量与量化数据洁癖', link: '/finance/concepts/market-data-quality' },
            { text: '市场微观结构', link: '/finance/concepts/market-microstructure' },
            { text: 'NLP 与金融文本解码', link: '/finance/concepts/nlp-financial-text' },
            { text: '操作风险与乌龙指', link: '/finance/concepts/operational-risk-fat-finger' },
            { text: '过拟合、未来函数与幸存者偏差', link: '/finance/concepts/overfitting-lookahead-bias' },
            { text: '正期望值与大数定律', link: '/finance/concepts/positive-expected-value' },
            { text: 'QMT 与 miniQMT 交易系统', link: '/finance/concepts/qmt-miniqmt-trading-system' },
            { text: '量化交易进阶路线图', link: '/finance/concepts/quant-learning-roadmap' },
            { text: '量化绩效归因与研报', link: '/finance/concepts/quant-performance-attribution' },
            { text: '量化策略流派分类', link: '/finance/concepts/quant-strategy-taxonomy' },
            { text: '量化思维范式：先升级思维，再指导AI', link: '/finance/concepts/quant-trading-thinking-paradigm' },
            { text: '量化投资知识体系地图', link: '/finance/concepts/quantitative-investing-knowledge-map' },
            { text: '量化交易：算法、分析、数据、模型和优化', link: '/finance/concepts/quantitative-trading-algorithms-data-models-optimization' },
            { text: '反身性理论 (Reflexivity Theory)', link: '/finance/concepts/reflexivity-theory' },
            { text: 'SDD 的 95/5 原则', link: '/finance/concepts/sdd-95-5-principle' },
            { text: '逼空与伽马挤压', link: '/finance/concepts/short-squeeze-gamma' },
            { text: '统计套利与德尔塔中性', link: '/finance/concepts/statistical-arbitrage' },
            { text: '股票画像 (Stock Profiling)', link: '/finance/concepts/stock-profiling' },
            { text: '策略三剑客：趋势 / 网格 / 动量', link: '/finance/concepts/strategy-trio-trend-grid-momentum' },
            { text: '时间序列预测量化系统', link: '/finance/concepts/time-series-forecasting-quant-system' },
            { text: '不稳定均衡交易', link: '/finance/concepts/unstable-equilibrium-trade' },
            { text: '价值陷阱 (Value Trap)', link: '/finance/concepts/value-trap' },
            { text: '视觉与多模态 K 线分析', link: '/finance/concepts/vision-multimodal-kline' }
          ]
        },
        {
          text: '对比分析',
          items: []
        }
      ],
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
            { text: '声明式智能体配置', link: '/wiki/concepts/declarative-agent-configuration' },
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
            { text: 'RAG 上下文剪枝', link: '/wiki/concepts/rag-context-pruning' },
            { text: 'SDD 95-5 原则', link: '/wiki/concepts/sdd-95-5-principle' },
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
