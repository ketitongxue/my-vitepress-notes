---
title: "规格驱动开发"
type: "concept"
tags: [workflow, ai-coding, planning, evaluation, context-engineering]
created: "2026-06-13"
updated: "2026-07-11"
---

# 规格驱动开发

规格驱动开发，简称 SDD，是让 AI 辅助编码从“写一段提示词”变成“按明确规则执行、按明确规则评审、再把经验回写规则”的闭环。

## 基本循环

SDD 的最小循环是：

1. 写清楚要做什么、不要做什么、边界和验收标准。
2. 让 AI 按这个规格实现。
3. 按规格审查输出，而不是按主观感觉审查。
4. 发现缺口后，把规则、测试、skill 或文档补上。

这个循环的核心不是文档数量，而是把隐性项目知识显式化，让 AI 不再靠猜。

## 从轻到重

小任务可以从[智能体任务简报](/wiki/concepts/agent-task-briefing)开始：问题、方案、技术约束、红线、交付标准。需求还不清楚时，可以用[苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)先把问题问完整。

更复杂的项目会进入[SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)：plan、align、execute、test、archive。[SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)决定需要引入多少流程纪律，[SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)提醒先养成手写最小规格的习惯，再讨论工具。

## OpenSpec 的具体化

[OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)把 SDD 具体化为一次 change：先 explore，写 proposal，再生成 design、spec、tasks，经过拷问后 apply，最后 verify 和 archive。

这让 SDD 不只是“写一个系统设计文档”，而是一个管理当前事实和历史决策的生命周期。Archive 决定一次变更的经验是只留在历史里，还是进入长期规则层。

## 两层 Spec

SDD 需要分清两类规格：

- 规则层：长期稳定的项目规则、工具、约定、能力说明、踩坑记录。
- 变更层：某一次具体改动的背景、方案、需求 delta、任务、执行记录和复盘。

两层混在一起会带来规则漂移：一次功能改动顺手改了全局规则，影响未来所有模块。只保留规则层会丢失历史决策，只保留变更层会让未来反复重新发现稳定知识。

## 评审方式的变化

SDD 把评审从“我喜不喜欢这段代码”变成“它是否满足明确规格”。这让[AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)更可操作，也让[AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)有材料可沉淀：评审发现的缺口可以变成记忆、skill、hook、测试或主 spec。

## 相关页面

- [上下文工程](/wiki/concepts/context-engineering)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)
- [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)
