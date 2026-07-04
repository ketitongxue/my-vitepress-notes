---
title: "框架优先与 Harness 优先的智能体架构"
type: "comparison"
tags: ["comparison", "agent-harness", "architecture", "workflow"]
created: "2026-06-17"
updated: "2026-06-17"
---

# 框架优先与 Harness 优先的智能体架构

这一比较记录了一个判断：智能体架构正在从高层框架转向更底层的 harness 工程。

| 维度 | 框架优先的智能体 | Harness 优先的智能体 |
| --- | --- | --- |
| 主要任务 | 通过抽象来教导模型或为模型路由。 | 为有能力的模型提供可靠的执行环境。 |
| 状态 | 常隐藏在框架对象和记忆图中。 | 外置到文件、日志、计划、待办事项和可检查的运行时状态中。 |
| 工具 | 大量包装 API 和工具描述。 | 由工具注册表治理的少量完备原语。 |
| 上下文 | 包含框架指令和许多工具的大型提示。 | 通过[上下文工程](/wiki/concepts/context-engineering)，把活跃上下文作为稀缺记忆进行管理。 |
| 安全 | 提示规则和包装层检查。 | 中间件、命令拦截、审批流程和运行时中断。 |
| 调试 | 开发者同时调试框架行为和模型行为。 | 开发者分别检查 harness 状态、追踪、操作和模型输出。 |
| 评估 | 常由演示驱动。 | 依靠追踪、基准脚本、成本审计和可测量的回归。 |

## 综合判断

框架风格适合快速演示，但它可能隐藏决定长时间运行智能体行为的准确状态、上下文和工具选择。Harness 风格承认模型本身已经具备能力，于是把工程投入集中到模型周围的物理环境：工具、文件、权限、上下文压缩、提醒、追踪和基准循环。

这一比较强化了[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)，并连接到[长上下文失效模式](/wiki/concepts/long-context-failure-modes)：更多抽象和工具会让提示更沉重，同时降低开发者对模型实际所见所为的控制。

## 相关内容

- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
- [OpenClaw](/wiki/entities/openclaw)
- [上下文工程](/wiki/concepts/context-engineering)
- [模型上下文协议](/wiki/concepts/model-context-protocol)
