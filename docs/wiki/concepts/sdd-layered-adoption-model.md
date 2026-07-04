---
title: "SDD 分层采用模型"
type: "concept"
tags: ["ai-coding", "workflow", "planning", "evaluation", "context-engineering"]
created: "2026-07-02"
updated: "2026-07-02"
---

# SDD 分层采用模型

SDD 分层采用模型是一套成熟度框架，用于在 AI 辅助开发中逐步加入规格纪律，而不强迫所有项目采用同等程度的流程。

## 四层结构

| 层级 | 新增纪律 | 典型机制 |
| --- | --- | --- |
| L1 | 澄清意图并加载项目常量。 | 结构化提问，加上 `AGENTS.md` 或 `CLAUDE.md`。 |
| L2 | 为每次变更赋予可追踪生命周期。 | 提案、设计、契约、任务、应用和归档。 |
| L3 | 通过多个专业视角暴露冲突。 | 产品、架构、开发、测试和 UX 审阅角色。 |
| L4 | 强制执行有时间顺序的工程门禁。 | 头脑风暴、隔离、规划、实现、TDD、审阅和发布。 |

每一层都新增一种状态维度。L1 增加稳定上下文，L2 增加变更历史，L3 增加角色视角，L4 增加测试与阶段门禁。因此，这套框架关注的是逐步提高纪律，而不是收集工具。

## 采用规则

原文建议按比例采用：

- 周末项目可能只需要 L1；
- 长期维护的个人项目或小团队可受益于 L1 和 L2；
- 有争议的产品或架构决策值得使用 L3；
- 核心生产系统和大型团队可能需要全部四层。

这样可以避免把[规格驱动开发](/wiki/concepts/spec-driven-development)变成仪式。流程成本应与项目寿命、协作成本和失败风险相匹配。

## 机制边界

L1 将稳定项目事实映射到 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)，并将可重复的澄清过程映射到技能。L2 把当前变更映射到 [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)。L3 使用类似 [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)的隔离角色。L4 则以测试和明确的转换门禁强化 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)。

持久结论是：这些表面彼此互补。项目记忆文件无法替代变更历史；多角色讨论无法替代测试；测试套件也无法恢复没有记录的决策。

## 失效模式

- 在项目需要相应纪律之前，就安装所有 SDD 工具。
- 把某个有名字的框架当成方法本身，而不是承载方法的容器。
- 用 L1 项目规则记录一次性的变更决策。
- 基础规格尚未清晰，就引入多智能体审阅。
- 要求一次性原型采用沉重的生产工作流。

## 相关内容

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)
