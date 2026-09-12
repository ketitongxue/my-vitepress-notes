# AI 纪元

探索智能时代的知识、工具与创造。

**AI 纪元**是 JuZX 的个人网站，记录 AI、产品与工程实践，关注工业数字化，以及如何把 AI 工具和 Agent 融入日常工作。这里汇集学习笔记、项目探索与个人思考，把真实问题中的经验逐步整理成可复用的知识。

[访问网站](https://juzxailab.com/) · [阅读知识库](https://ketitongxue.github.io/ai-era-html-docs/)

## 网站内容

- **知识库**：持续整理 AI 工具、开发工作流与实践相关的文章，按主题浏览和阅读。
- **项目档案**：记录个人项目的探索过程。目前收录 [go-tiny-claw](https://juzxailab.com/projects/go-tiny-claw)，围绕 Agent 执行循环、工具调用、上下文管理与执行记录，分享实现思路、实验边界和实践体会。
- **Personal OS**：用相互连接的卡片呈现个人关注方向、能力方法与当前实践，串联产品规划、工业数字化、知识工程和 AI 工作流。可从 [Now](https://juzxailab.com/#system) 进入。
- **关于我**：了解 JuZX 的角色与关注方向，并通过 [GitHub](https://github.com/ketitongxue) 查看公开项目与提交记录。

## 阅读与探索

首页以个人桌面的形式组织内容，点击图标即可打开相应窗口。知识库支持在站内浏览目录、打开文章、返回目录和放大窗口，也可以直接访问完整知识库。

切换到 Personal OS 后，可以拖动画布、缩放视图，沿着卡片之间的连接了解不同实践的关系。

## 阅读组件

知识库窗口支持分类筛选与折叠，阅读后返回目录会保留筛选、折叠和滚动位置。项目档案用项目卡呈现技术主题与阅读入口。

本仓库的 Markdown 文章可在 `<div class="reading-content">` 内使用以下组件，参见 `docs/projects/go-tiny-claw.md`：

| 组件 | 用法 |
| --- | --- |
| `ReadingInsight` | `title` 指定提示标题，`tone="warning"` 用于注意事项；正文放默认插槽 |
| `ReadingSteps` | `label` 描述流程，默认插槽放有序的 `<li>` 步骤 |
| `ReadingComparison` | `before-title`、`after-title` 指定两栏标题，内容分别放 `#before`、`#after` 插槽 |
| `ReadingCode` | `filename`、`language` 描述代码；默认插槽保留 Markdown 代码围栏，复用 VitePress 高亮和单一按钮，补充复制失败反馈 |
| 静态重点 | `<mark class="reading-mark">重点短语</mark>` |

普通 `##` 标题保留目录锚点。组件按可用容器宽度排版，独立文章跟随主题，桌面窗口保持浅色。不要将步骤、对比和高亮同时用于每一段文字。

共享样式位于 `docs/public/assets/reading-components.css`，可供独立 HTML 文章使用相同类名。知识库正文来自 `ai-era-html-docs` 的跨域页面，必须在该内容仓库中接入样式；修改本仓库的窗口 CSS 不会改变 iframe 内的文章。独立 HTML 的复制按钮使用渐进增强，脚本不可用时仍可阅读和手动复制代码。
