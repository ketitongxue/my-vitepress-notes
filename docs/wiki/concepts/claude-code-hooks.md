---
title: "Claude Code Hooks"
type: "concept"
tags: ["developer-tool", "workflow", "automation", "ai-coding", "safety"]
created: "2026-06-20"
updated: "2026-06-20"
---

# Claude Code Hooks

Claude Code hooks 是由生命周期事件触发的自动化点。它们让运行框架能在会话发生特定事件时执行命令、HTTP 调用、MCP 工具、提示词或智能体处理器。

## Hooks 解决什么问题

Hooks 弥合了“Claude 应该记得做某事”和“环境必须执行某事”之间的差距。[Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)中的提醒仍需模型主动遵守；hook 注册在主上下文路径之外，并在配置的生命周期事件发生时触发。

因此 hooks 适合确定性工作：

- 编辑后运行 linter 或格式化器；
- 执行前阻止高风险工具调用；
- 发布完成通知；
- 压缩前备份聊天或状态；
- 与 [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)配合实施策略。

## 上下文成本

Hooks 的主上下文成本较低，因为配置和实现都在普通对话之外。部分输出会进入主上下文，例如解释工具调用为何被拒绝的阻断错误；但除非配置为返回结果，大多数 hook 工作不会成为对话状态。

这与 [Claude Code 技能](/wiki/concepts/claude-code-skills)、规则和 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)不同：后三者通过加载指令引导 Claude，hooks 则通过给事件绑定可执行行为来控制系统。

## 设计边界

当行为必须在已知生命周期点可靠发生时使用 hooks；当行为是需要在主对话中可见、可调整的复用流程时使用技能；当任务需要独立推理上下文且只应返回最终摘要时使用 [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)。

[Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)把 hooks 视为控制平面自动化。当一条规则是护栏而非偏好时，它尤其重要。

## 相关内容

- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)
- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)
- [上下文工程](/wiki/concepts/context-engineering)
