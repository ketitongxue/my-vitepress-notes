---
title: "OpenSpec 变更工作流"
type: "concept"
tags: [ai-coding, workflow, planning, evaluation, context-engineering]
created: "2026-07-11"
updated: "2026-07-11"
---

# OpenSpec 变更工作流

OpenSpec 变更工作流，是把一次 AI 辅助开发改动放进可追溯目录：从探索、proposal、design、能力 spec、tasks，到 apply、verify、archive。它把[规格驱动开发](/wiki/concepts/spec-driven-development)从原则变成可执行的变更生命周期。

## 工作流形态

一个完整流程通常是：

1. 先 explore，把模糊边界问清楚，不急着落盘。
2. 创建一个具名 change 目录。
3. 对非平凡改动，人工写或至少人工钉住 `proposal.md`。
4. 由 proposal 生成 design、tasks 和能力 spec。
5. 在 apply 前拷问 spec，找矛盾、遗漏和不可测试条款。
6. 按 spec 生成代码和测试。
7. 用 verify 反向检查需求是否都有实现和测试覆盖。
8. merge 后 archive，把 delta 合并到当前主 spec，并保留变更史。

这条链路对应[SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)里的 plan、align、execute、test、archive。

## Proposal 控制范围

`proposal.md` 是最高杠杆的人工步骤。它要钉住这次 change 的主语：为什么做、改什么、不改什么、边界在哪里、失败行为如何处理。主语一旦漂移，后面的 spec、代码和测试都会跟着漂移。

因此，复杂变更不适合一开始就让 AI 全自动写 proposal。更稳妥的方式是先用探索问答澄清边界，再由人手写或强审 proposal，最后让工具生成后续工件。

## Capability 名是脊椎

OpenSpec 用稳定的 capability 名连接三类文件：

- proposal 里的能力声明。
- change-local 的 delta spec。
- archive 后的 canonical spec。

这个名字不是装饰，而是 join key。名字不一致，验证和归档就会断。名字稳定，未来就能从一个能力追踪到它为什么改、怎么改、何时成为当前事实。

## 两层 Spec

OpenSpec 的价值来自两层分离：

| 层 | 作用 | 典型内容 |
| --- | --- | --- |
| 规则层 | 长期稳定的项目知识。 | Skills、记忆文件、主 spec、项目约定。 |
| 变更层 | 一次具体改动的上下文和记录。 | Proposal、design、delta spec、tasks、执行记录、archive。 |

规则层让下一次 change 起点更高；变更层保留这一次为什么这么做。Archive 把可复用教训回写到规则层，连接到[技能设计模式](/wiki/concepts/skill-design-patterns)和[AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)。

## Apply 前先拷问

生成的 spec 不应该直接进入实现。拷问阶段要检查：

- 是否有无法实现的条款。
- 是否有内部矛盾。
- 是否遗漏边界和失败流。
- 每个 scenario 是否能写成测试。
- out of scope 是否又偷偷进入 spec。

这个阶段的目标不是追求文档好看，而是防止 AI 把含糊需求变成更大范围的含糊实现。

## Verify 与 Archive

实现后，测试最好能对应 requirement ID 或 scenario 名称。Verify 反向检查每条要求是否有实现和测试覆盖。若接受某个 warning 而不修改，应把判断写进 design 的决策记录，方便未来理解取舍。

Archive 不是文件清理。它一方面把 delta 合并进主 spec，另一方面保留这次变更的历史。如果这次变更暴露了可复用规则，就应该同步更新 skill、记忆文件、hook 或测试。

## 常见失败模式

- 需求主语还没清楚，就让工具生成 proposal。
- Capability 名在 proposal、delta spec、主 spec 之间不一致。
- 未拷问 spec 就 apply。
- 把 archive 当成收尾动作，而不是学习回写。
- 只保留变更史，却不更新长期规则。

## 相关页面

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)
- [技能设计模式](/wiki/concepts/skill-design-patterns)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
