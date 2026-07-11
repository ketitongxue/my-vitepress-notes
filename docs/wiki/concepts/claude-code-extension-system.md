---
title: "Claude Code 扩展系统"
type: "concept"
tags: [claude-code, extension, hooks, skills, mcp]
created: "2026-07-02"
updated: "2026-07-11"
---

# Claude Code 扩展系统

Claude Code 的扩展系统，可以理解为围绕编码智能体的三类外接能力：技能、Hooks、MCP 以及它们背后的本地工具和流程。

## 三类扩展

- Skills：把可复用的操作流程、判断标准和脚本封装成显式能力。
- Hooks：把检查、记录、拦截和自动化动作挂到执行生命周期上。
- MCP：把外部工具、数据源和上下文以协议方式暴露给模型。

三者的职责不同：Skills 更像任务方法，Hooks 更像反馈节点，MCP 更像工具和上下文接口。

## 反馈循环视角

从反馈循环看，Hooks 的位置尤其关键。它们能把原本依赖人工注意力的检查变成自动门禁：

- 工具执行前检查权限、路径、预算和风险。
- 工具执行后检查测试、格式、链接、构建或部署结果。
- 停止前确认是否已经满足验收条件。
- 失败时把原因记录下来，供下一轮修复使用。

这使扩展系统不只是“增加功能”，而是在[智能体循环工程](/wiki/concepts/agent-loop-engineering)中补上可验证、可阻断、可审计的环节。

## 组合方式

一个常见组合是：用 Skill 定义工作流，用 MCP 提供工具和数据，用 Hooks 做边界检查，再用[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)把它们组织成稳定运行时。
