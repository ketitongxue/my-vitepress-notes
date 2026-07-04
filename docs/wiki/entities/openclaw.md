---
title: "OpenClaw"
type: "entity"
tags: ["project", "open-source", "agent-harness", "developer-tool"]
created: "2026-06-17"
updated: "2026-06-17"
---

# OpenClaw

OpenClaw 是工业级智能体 harness 设计的开源参考项目。它的价值不在于庞大的功能面，而在于一种极简运行时理念：把 harness 视为智能体的操作环境。

## 设计理念

OpenClaw 为[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)提供了实例：

- 极简工具集：提供少量但完备的原语，例如读取、写入、编辑和 bash，而不是大量狭窄 API。
- 外置状态：把计划、待办事项和工作记忆写入人类可以检查和编辑的文件。
- YOLO 本地执行：在可信的本地开发环境中让智能体快速行动。
- 纵深防御：当操作风险升高时，使用中间件和审批路径。

这一思路与工具繁多的[模型上下文协议](/wiki/concepts/model-context-protocol)用法和框架中的黑盒状态形成对照。OpenClaw 的立场是：强模型已经能够规划和调用工具，harness 应负责管理记忆、工具、安全和可观测性。

## 与 Claude Code 的关系

[Claude Code](/wiki/entities/claude-code) 和 OpenClaw 都是原生编程智能体的例子，其架构指向 harness 层面的工程实践。在这一框架下，Claude Code 是生产工具，而 OpenClaw 是理解底层运行时思想的源码级学习对象。

## 相关内容

- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
- [框架优先与 Harness 优先的智能体架构](/wiki/comparisons/framework-vs-harness-agent-architecture)
- [上下文工程](/wiki/concepts/context-engineering)
- [Claude Code](/wiki/entities/claude-code)
