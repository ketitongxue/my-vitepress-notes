---
title: "SDD 分层采用模型"
type: "concept"
tags: [ai-coding, workflow, planning, evaluation, context-engineering]
created: "2026-07-02"
updated: "2026-07-11"
---

# SDD 分层采用模型

SDD 分层采用模型，是按项目复杂度逐步增加规格纪律的方式。它避免把所有项目都推向同一套重流程。

## 四层模型

| 层级 | 增加的纪律 | 典型机制 |
| --- | --- | --- |
| L1 | 澄清意图和项目常量。 | 结构化提问、项目记忆、基础任务简报。 |
| L2 | 让每次变更可追踪。 | Proposal、design、spec、tasks、archive。 |
| L3 | 用多角色视角暴露冲突。 | 产品、架构、开发、QA、UX 等角色评审。 |
| L4 | 强化工程门禁。 | TDD、隔离分支、代码评审、发布检查。 |

每一层添加的是不同状态维度：L1 添加稳定上下文，L2 添加变更历史，L3 添加专业视角，L4 添加时序和测试门禁。

## 采用规则

一个周末项目可能只需要 L1；长期个人项目或小团队项目适合 L1 + L2；争议较多的产品和架构决策适合 L3；生产核心系统和多人团队才值得完整引入 L4。

[SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)把入口再缩小：先手写最小 feature spec，包含意图、非目标、边界、验收和验证。只有当这个手动循环变成习惯，并出现重复痛点时，再引入工具。

## OpenSpec 的位置

[OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)适合 L2 以后：当团队需要 proposal、design、spec、tasks、verify、archive 这些可追踪工件时，它能把一次 change 变成明确流程。

但它不应该替代需求澄清。实践顺序仍然是先 explore，再写清 proposal，最后让命令生成后续工件。

## 机制边界

- 项目记忆文件适合规则层，不适合记录每个 change 的历史。
- Change 目录适合记录一次决策，不适合承载所有长期规则。
- 多角色评审能发现盲点，但不能替代测试。
- 测试能防行为退化，但不能补回未记录的设计理由。

## 常见失败模式

- 工具先行，规格习惯后补。
- 把命名框架当成方法本身。
- 用项目规则文件记录一次性变更决策。
- 基础 spec 不清楚时就上多智能体评审。
- 为一次性原型套完整生产流程。

## 相关页面

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)
