---
title: "Claude Code"
type: "entity"
tags: [claude-code, ai-coding, agent]
created: "2026-07-01"
updated: "2026-07-11"
---

# Claude Code

Claude Code 是 Anthropic 面向软件工程场景的编码智能体。它的关键价值不只是生成代码，而是在真实代码库中读取上下文、调用工具、修改文件、运行验证，并围绕工程目标持续推进。

## 常用能力

Claude Code 的实践通常围绕几类能力展开：

- 项目理解：读取代码、配置、文档和历史约定。
- 修改执行：编辑文件、运行命令、修复测试、整理提交。
- 工程循环：从需求、规格、实现到验证和发布。
- 扩展能力：通过 Skills、Hooks、MCP 和本地脚本复用工作流。

## 循环与自动化

近期围绕 Claude Code 的讨论，重点已经从“如何写提示词”扩展到“如何构建循环”。常见形态包括目标循环、时间循环、计划任务、无头执行和由事件触发的自动化流程。

这使 Claude Code 和以下主题紧密相关：

- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [Claude Code Hooks](/wiki/concepts/claude-code-hooks)
- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [智能体循环工程](/wiki/concepts/agent-loop-engineering)
- [智能体反馈循环](/wiki/concepts/agent-feedback-loop)

## 工程边界

Claude Code 越强，越需要明确边界：权限、文件范围、验证命令、成本预算、提交策略和发布流程。成熟用法不是让它自由行动，而是把它放进[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)和[AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)中。
