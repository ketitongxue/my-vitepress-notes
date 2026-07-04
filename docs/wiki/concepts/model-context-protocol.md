---
title: "模型上下文协议"
type: "concept"
tags: ["tool-use", "developer-tool", "agent", "workflow"]
created: "2026-06-13"
updated: "2026-06-13"
---

# 模型上下文协议

模型上下文协议（MCP）是让智能体连接外部工具和服务的机制。

## 角色

在 [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)中，MCP 是工具连接层：它把外部系统变成智能体可调用的能力；记忆保存上下文，技能封装流程，hooks 增加检查点，插件负责分发套件。

## 运作模式

[CC Switch](/wiki/entities/cc-switch)可交互管理 MCP 服务器配置。这说明 MCP 在实践中高度依赖配置；真正有用的抽象不只是协议，还包括提供商、服务器和共享配置管理。

长上下文材料提出一项可靠性警告：一次暴露过多工具定义会造成[长上下文失效模式](/wiki/concepts/long-context-failure-modes)，尤其是上下文混淆和冲突。因此 MCP 系统需要路由、过滤或动态加载，让模型只看到当前任务相关工具，而非全部已连接能力。

从[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)看，仅有工具连接还不够；运行时还要决定哪些工具可见、如何拦截命令，以及何时在人与外部系统之间加入审批或中间件。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [CC Switch](/wiki/entities/cc-switch)
- [智能体无头执行](/wiki/concepts/agent-headless-execution)
- [长上下文失效模式](/wiki/concepts/long-context-failure-modes)
- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
