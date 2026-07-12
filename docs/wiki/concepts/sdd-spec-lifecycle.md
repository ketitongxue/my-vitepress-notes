---
title: "SDD 规格生命周期"
type: "concept"
tags: [ai-coding, workflow, planning, evaluation, context-engineering]
created: "2026-07-02"
updated: "2026-07-11"
---

# SDD 规格生命周期

SDD 规格生命周期，是把一次 AI 辅助开发从模糊想法推进到已验证代码、已归档决策和更强项目规则的五阶段循环。

## 五个阶段

1. Plan：把想法变成 proposal 和实现计划。
2. Align：拷问假设、边界、失败行为和争议点。
3. Execute：按批准后的规格实现一个有边界的变更。
4. Test：用单元、集成、回归或端到端验证行为。
5. Archive：把当前事实合并进长期规格，并保留决策历史。

最容易被跳过的是 align 和 archive。没有 align，隐藏假设会进入实现；没有 archive，下一次会话会重复旧推理和旧错误。

## 两层规格

SDD 需要两层记录：

| 层 | 生命周期 | 内容 |
| --- | --- | --- |
| 规则层 | 长期存在 | 项目常量、可复用能力、约定、工具、失败策略。 |
| 变更层 | 一次改动 | 为什么做、设计决策、需求 delta、任务、执行记录、经验。 |

规则层可以放在记忆文件、skills、hooks 和主 spec 中。变更层应该有自己的目录，并在完成后归档。灰度发布例子说明了这个边界：长期规则是“项目统一使用既有灰度工具”，一次 change 才记录某个功能如何灰度上线。

## Capability 绑定

一个稳定 capability 名可以连接 proposal、change-local delta spec、archive 后主 spec 和相关 skill。它是 SDD 文件之间的机械连接点，而不是普通标题。

在[OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)中，这个名字必须在 proposal、能力目录中的变更 spec 和主 spec 中保持一致。名字稳定，未来才能追踪一个能力从提出、变更、实现到成为当前事实的过程。

## Archive 是学习

Archive 不只是移动文件。它关闭知识反馈循环：

1. 用当前规则完成变更。
2. 评审或上线暴露缺失约束。
3. 在 archive 中记录教训。
4. 将可复用教训提升到记忆、skill、hook、测试或主 spec。
5. 下一次变更从更高起点开始。

这正是[AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)在编码工作流中的体现。

## 常见失败模式

- 写完第一版 spec 就直接实现，没有对齐阶段。
- 把多个无关功能塞进一个 change。
- 测试晚于实现，导致行为契约不清楚。
- 只归档文件，不提升可复用经验。
- 规则层和变更层混在一起，导致项目规则漂移。

## 相关页面

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
