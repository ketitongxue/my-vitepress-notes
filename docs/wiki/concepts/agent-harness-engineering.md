---
title: "智能体 Harness 工程"
type: "concept"
tags: ["agent", "agent-harness", "context-engineering", "tool-use", "safety", "evaluation", "cost"]
created: "2026-06-17"
updated: "2026-06-20"
---

# 智能体 Harness 工程

智能体 harness 工程是构建运行时环境的实践，使 LLM 能够在现实世界中安全、可靠地行动。可以把它理解为为模型编写一个小型操作系统：模型是 CPU，上下文是 RAM，本地工具是外设，而 harness 管理调度、记忆、工具、安全中断和可观测性。

## 核心主张

核心主张是，传统框架层正在收缩进 harness。早期智能体框架试图对规划、路由和状态进行微观管理，因为较弱的模型需要帮助。更强的模型已经具备规划和工具调用能力，因此高杠杆工作向下移动：为模型提供一个极简、可检查且受约束的执行环境。

这会使开发者从框架消费者变成智能体“物理定律”的设计者。

## 控制界面

智能体 harness 通过多种机制控制智能体：

| 控制面 | 处理的失效 | Harness 的响应 |
| --- | --- | --- |
| 上下文 | 工具膨胀、提示稀释、幻觉和注意力丢失。 | 使用[上下文工程](/wiki/concepts/context-engineering)、压缩和最少量的活跃工具描述。 |
| 状态 | 隐藏的框架状态、遗忘进度和无尽循环。 | 把计划、记忆和待办事项外置到可检查文件。 |
| 工具 | API 太多且可供性不清。 | 偏好极简工具集和清晰的工具注册表。 |
| 安全 | 危险的 shell 或文件操作。 | 在执行前加入中间件、审批和中断点。 |
| 评估 | 不知道改动是否让智能体变得更好。 | 加入追踪、成本记录和基准测试。 |
| 模型选择 | 被热度或供应商驱动的模型选择。 | 先结合[模型能力的公开信号](/wiki/concepts/model-capability-public-signals)与本地任务测试，再选择运行时模型。 |

## 与现有页面的关系

[长上下文失效模式](/wiki/concepts/long-context-failure-modes)解释了为什么把工具和历史一股脑塞入上下文会失败。[模型上下文协议](/wiki/concepts/model-context-protocol)展示工具连接层，但 harness 视角认为工具暴露必须经过筛选和治理。[Claude Code 子智能体](/wiki/concepts/claude-code-subagents)是在 harness 层隔离嘈杂工作的方式之一。[Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)则是围绕文件和命令执行建立安全边界的具体例子。

[OpenClaw](/wiki/entities/openclaw)是这一理念的典型实例：极简工具、外置状态、YOLO 本地执行，以及面向高风险部署环境的安全中间件。

模型选择相关内容把 harness 视角继续向上游扩展。Harness 不应把模型视为可以随意互换的品牌选项。在部署智能体之前，公开排名、置信区间、价格、延迟和供应商可用性都是运行时设计预算的一部分。

## 相关内容

- [框架优先与 Harness 优先的智能体架构](/wiki/comparisons/framework-vs-harness-agent-architecture)
- [OpenClaw](/wiki/entities/openclaw)
- [上下文工程](/wiki/concepts/context-engineering)
- [模型上下文协议](/wiki/concepts/model-context-protocol)
- [长上下文失效模式](/wiki/concepts/long-context-failure-modes)
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)
- [模型能力的公开信号](/wiki/concepts/model-capability-public-signals)
