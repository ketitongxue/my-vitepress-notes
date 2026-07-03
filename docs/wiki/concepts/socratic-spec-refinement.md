---
title: "苏格拉底式规格细化"
type: "concept"
tags: ["ai-coding", "planning", "context-engineering", "workflow"]
created: "2026-06-13"
updated: "2026-06-13"
---

# 苏格拉底式规格细化

苏格拉底式规格细化，是一种编码前对话模式：AI 每次只问一个问题，帮助用户把模糊的一句话想法转化为完整任务规格。

重要约束是，智能体在这一阶段不得编写代码。它的职责是澄清意图、呈现选项，并最终形成具体到足以实施的[智能体任务简报](/wiki/concepts/agent-task-briefing)。

## 交互模式

原文提出了一份简单的对话契约：

- 从描述想法的一句话开始。
- 使用苏格拉底式提问，不要直接跳到实现。
- 每次只问一个问题。
- 为每个问题提供带编号的选项。
- 持续提问，直到规格覆盖问题陈述、拟议方案、技术约束、非目标和成功标准。

这使初学者更容易创建规格，因为用户不必预先知道所有必填字段。智能体提供结构，用户提供偏好和决策。

## 为何有效

该模式把发现歧义提前到编码之前。这会强化[规格驱动开发](/wiki/concepts/spec-driven-development)，因为规格不是只写一次，而是在实现开始前经过主动协商。

它也是一种[上下文工程](/wiki/concepts/context-engineering)模式：对话逐步构建后续实现智能体依赖的上下文，同时把过早代码和错误假设排除在工作上下文之外。

## 相关内容

- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [上下文工程](/wiki/concepts/context-engineering)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
