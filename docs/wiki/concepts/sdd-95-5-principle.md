---
title: "SDD 95-5 原则"
type: "concept"
tags: ["ai-coding", "workflow", "planning", "context-engineering", "evaluation"]
created: "2026-07-05"
updated: "2026-07-05"
---

# SDD 95-5 原则

SDD 95-5 原则是一条采用启发式：规格驱动开发的大部分价值来自在实现前澄清工作并为其建立结构，而工具的贡献要小得多，它们只是把已经理解的流程自动化。

95/5 的划分并不是经过测量的统计结论。它是在提醒人们：不要把更多精力花在比较 SDD 产品上，而应先实践其核心做法。

## 最小可用规格

原文提出了一个刻意精简的起点。为下一个功能创建一个 Markdown 文件，其中包含四个部分：

1. 构建什么。
2. 不构建什么。
3. 边界与验收标准。
4. 如何验证结果。

在每个标题下添加三到五条具体要点，并在编码前把文件交给智能体。这是[智能体任务简报](/wiki/concepts/agent-task-briefing)的紧凑形式，覆盖了 [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)中规划与对齐的入口。

## 采用顺序

这条原则建议先养成习惯，再进行自动化：

1. 手写规格，直到这套工作流成为常规习惯。
2. 留意哪些步骤重复出现或容易遗忘。
3. 只有当工具能够消除已知的重复成本时，才引入工具。
4. 根据工具自动化的具体步骤来评估它，而不是按功能数量评估。

这进一步强化了 [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)。在加入变更生命周期工具、多角色审阅或严格工程门禁之前，应先具备 L1 的意图澄清和项目规则。

## 工具选择问题

与其问“哪个 SDD 工具最好？”，不如问“当前规格流程中，哪个重复步骤值得由工具消除或强制执行？”

OpenSpec、Spec Kit、Superpowers、BMAD 或其他框架都可能有用，但没有一个能替代明确的意图、非目标、边界、验收标准和验证方式。

## 失效模式

- 写下第一份规格之前，先花数周比较工具。
- 安装复杂工作流后又放弃，因为底层习惯从未形成。
- 把生成的模板当作需求已经清晰的证明。
- 在没有具体协调问题或风险问题时增加流程层。
- 把大部分精力花在自动化层，而不是决策内容上。

## 相关内容

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
