---
title: "Claude Code"
type: "entity"
tags: ["product", "ai-coding", "developer-tool", "agent", "tool-use"]
created: "2026-06-13"
updated: "2026-06-20"
---

# Claude Code

Claude Code 是一个在命令行中使用的 AI 编程智能体。它与其说是聊天界面，不如说是一个工程环境：用户在其中设计任务、委派工作、编码项目记忆，并连接各种工具。

## 核心使用界面

它的基本操作模式以 CLI 为先：安装工具、运行 `claude`、登录，然后在操作系统终端内工作。常用控制界面包括提及文件、粘贴图片以调试 UI、使用 `clear` 和 `compact` 等上下文命令，以及规划模式和思考模式。

Claude Code 的交互方式受 [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)约束：用户可以保留常规确认提示、自动接受文件编辑、切换到只读规划模式，也可以在隔离环境中使用高信任度的绕过模式。

## 智能体工程中的角色

最值得长期保留的观点是：AI 编程工具会把用户的工作从“将自然语言翻译成代码”提升到三个更高层次的任务：

- 分解问题。
- 分配工作。
- 协调一个或多个智能体朝目标推进。

这使 Claude Code 成为 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)的实际范例：有效使用依赖明确设计、规划、测试、审查和可复用的项目指令，而不是临时拼凑提示词。

## 扩展系统

Claude Code 的扩展能力由一组相关机制构成：记忆文件、[Claude Code 子智能体](/wiki/concepts/claude-code-subagents)、[Claude Code 技能](/wiki/concepts/claude-code-skills)、hooks、无头执行、SDK、MCP 和插件。本 Wiki 将它们归入 [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)与 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)。

Anthropic 的 2026 年引导指南进一步明确了这组机制：可通过 `CLAUDE.md` 文件、规则、技能、子智能体、[Claude Code Hooks](/wiki/concepts/claude-code-hooks)、输出样式和附加系统提示来引导 Claude Code。关键的工程区别不只在于指令写在哪里，还包括它何时加载、是否能在压缩后保留、占用多少上下文，以及它是由模型遵循的指令还是由 harness 确定性执行的行为。

[CC Switch](/wiki/entities/cc-switch) 是相邻的社区工具，用于切换模型或提供商，并管理 Claude Code 及其他终端智能体周边的 MCP 或技能配置。

## 课程系列综合

后续课程笔记把 Claude Code 的角色进一步明确为 AI 辅助工程的完整操作系统：

- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)与[规格驱动开发](/wiki/concepts/spec-driven-development)定义持久的项目规则。
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)隔离高噪声或特定角色的工作。
- [Claude Code 技能](/wiki/concepts/claude-code-skills)通过[渐进式披露](/wiki/concepts/progressive-disclosure)按需提供操作流程。
- [智能体流水线编排](/wiki/concepts/agent-pipeline-orchestration)说明当工作进入并行或分阶段状态时，主对话如何继续承担监督者角色。
- [Obsidian 与 Claude Code 工作流](/wiki/concepts/obsidian-claude-code-workflow)把本地笔记和附件接入这一 Wiki 工作流。
