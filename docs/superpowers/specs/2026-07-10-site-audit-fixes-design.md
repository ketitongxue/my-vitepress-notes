# Site Audit Fixes Design

**Date:** 2026-07-10
**Status:** Approved for implementation

## Goal

修复审查中已确认、低风险且可直接验证的体验问题：知识库首页出现空的更新时间、问答初始态占用过多空间、首页与问答文案语言不一致，以及本地搜索界面未中文化。

## Decisions

### Generated knowledge hubs

`scripts/wiki-publish/finalize.mjs` 是 AI 与金融知识库首页的唯一生成源。`indexMarkdown()` 生成的 frontmatter 增加 `lastUpdated: false`，避免 VitePress 在生成页底部渲染无日期的“最后更新”。同步修改当前 `docs/wiki/index.md` 与 `docs/finance/index.md`，确保修复无需等待下一次发布。

### Q&A empty state

`WikiAsk.vue` 在没有消息时不渲染对话容器和状态行。表单保持首屏可见；错误仍单独以 `role="alert"` 展示。控制项按状态渐进披露：仅 `busy` 时显示“停止生成”，仅 `messages.length > 0` 时显示“清空对话”。有历史消息或请求开始后，对话区和实时状态恢复原有行为。CSS 移除对空白对话区的固定占位，并保持已有移动端、sticky composer 与 reduced-motion 行为。

### Chinese copy and useful entry points

首页将 `RECENT GROWTH`、`POPULAR TAGS` 和“最近生长”改为一致的中文。每个 feature 增加 `linkText: 查看专题`。原本不可交互但形似链接的热门标签改为指向站内现有页面的快速入口，不增加新路由。问答 eyebrow 改为“知识库问答”。

`docs/.vitepress/config.mts` 在当前 VitePress 本地搜索配置 API 支持时配置中文 translations；若已安装版本不接受该字段，则保留 provider 配置并通过现有全站中文标签完成本轮，不引入自定义搜索组件或升级依赖。

## Accessibility and compatibility

- 条件渲染不能移除问答 textarea 的 `<label for>` 关联。
- 状态行存在时继续使用 `aria-live="polite"`；错误继续使用 `role="alert"`。
- 快速入口使用真实 `<a>`，链接只能指向仓库内已存在的页面。
- 不改变问答 API、限流、历史存储或 SSE 状态机。

## Explicitly deferred

- 知识库页内专用搜索与筛选。
- 长文章侧栏分组、过滤或重构。
- 文章更新时间、来源和标签元数据组件。
- 任何新路由、依赖升级或主题结构重写。

## Acceptance criteria

1. 两个生成 hub 的 frontmatter 都包含 `lastUpdated: false`，且未来 finalize 仍会生成它。
2. 空问答页没有 conversation/status/停止/清空节点；busy 与有消息状态分别显示正确控件。
3. 首页和问答审查涉及的英文 eyebrow 均已中文化，feature 有“查看专题”，快速入口全部可访问。
4. 支持时本地搜索按钮、输入占位和结果提示为中文。
5. Node 测试、站点设计测试、构建及 `git diff --check` 通过。
