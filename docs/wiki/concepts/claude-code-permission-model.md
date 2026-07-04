---
title: "Claude Code 权限模型"
type: "concept"
tags: ["ai-coding", "safety", "workflow", "developer-tool"]
created: "2026-06-13"
updated: "2026-06-20"
---

# Claude Code 权限模型

Claude Code 的权限模型控制智能体编辑文件、运行命令或推进任务时拥有多大自主权。

## 模式

| 模式 | 实际含义 |
| --- | --- |
| `default` | 工具第一次使用时请求授权。 |
| `acceptEdits` | 自动接受文件编辑，但命令仍需确认。 |
| `plan` | 用于设计或审查的只读分析模式。 |
| `delegate` | 仅通过 Agent Teams 协调。 |
| `dontAsk` | 自动拒绝未预先授权的工具。 |
| `bypassPermissions` | 跳过权限检查；仅适合隔离环境。 |

## 安全边界

“YOLO”启动模式对应 `bypassPermissions`。这是一种高风险模式，应仅用于容器、虚拟机或其他受控环境。在更广义的 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)中，权限模式是平衡速度与影响半径的控制面。

Anthropic 的引导指南把权限与 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)并列，作为依赖提示词禁令之外的确定性替代方案。写在记忆中的“绝不运行此命令”可能在歧义、压力、长上下文或提示注入下失效；权限边界或工具调用前的阻断 hook 才是运行框架层护栏。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [智能体无头执行](/wiki/concepts/agent-headless-execution)
- [Claude Code Hooks](/wiki/concepts/claude-code-hooks)
