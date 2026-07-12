---
title: "智能体任务简报"
type: "concept"
tags: [agent, ai-coding, planning, context-engineering, workflow]
created: "2026-06-13"
updated: "2026-07-11"
---

# 智能体任务简报

智能体任务简报，是在 AI 编码代理开始实现之前，把请求压缩成一份小型设计文档。它比随口一句 prompt 更明确，又比完整设计文档更轻。

## 五项检查

| 检查项 | 目的 |
| --- | --- |
| 问题陈述 | 用一句话说明用户体验或目标结果。 |
| 方案描述 | 具体说明行为、数量、交互和视觉细节。 |
| 技术约束 | 点明技术栈、接口、文件、平台或集成点。 |
| 红线 | 明确哪些事情不要做。 |
| 交付标准 | 定义什么算完成，包括测试、移动端或流程闭环。 |

它位于随意 prompt 和完整[规格驱动开发](/wiki/concepts/spec-driven-development)之间，让智能体有足够结构可以行动。

## 升级为设计文档

大改动需要更完整的设计文档：当前上下文、功能和非功能需求、设计决策、技术方案、实施计划、测试策略、可观测性、依赖、安全、发布和后续考虑。

[SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)提醒，写 proposal 只是 plan；真正进入实现前，还要 align，也就是检查假设、边界、失败行为、性能约束和争议点。

## Proposal 版本

在[OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)里，任务简报会升级成 `proposal.md`。非平凡变更的 proposal 应该由人手写，或至少由人强审，因为它固定了整个后续工作流的主语。

如果 proposal 写偏，生成的 spec、代码和测试都会偏。手写 proposal 的价值，是用几分钟把未来数小时的执行方向钉住。

## 与上下文工程的关系

任务简报是[上下文工程](/wiki/concepts/context-engineering)模式：它先塑造模型看到的上下文，再让模型推理和执行。简报也属于[AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)：先 brief，再实现，再验证，最后把缺口回写到更持久的规则中。

## 常见失败模式

- 只写想要的结果，不写不做什么。
- 不说明文件、接口和集成边界。
- 把“看起来高级”这类审美要求交给 AI 猜。
- 没有验收标准，导致无法判断是否完成。
- 复杂改动没有进入 proposal/spec 生命周期。

## 相关页面

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [上下文工程](/wiki/concepts/context-engineering)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)
