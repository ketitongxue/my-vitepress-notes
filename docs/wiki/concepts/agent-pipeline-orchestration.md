---
title: "智能体流水线编排"
type: "concept"
tags: ["agent", "delegation", "workflow", "planning", "automation"]
created: "2026-06-13"
updated: "2026-07-06"
---

# 智能体流水线编排

智能体流水线编排是把子智能体组织为并行探索、顺序阶段或混合流程的模式，其中主智能体担任监督者和集成者。

## 并行探索

只有当各分支真正独立时才适合并行工作。监督者可以分派代码仓库探索、安全审查、API 分析或技术比较，再把各分支结果汇总为一个决策。

这里隐藏的必要条件是独立性：如果一个分支需要另一个分支的中间状态，那么工作尚不具备并行条件。

## 顺序流水线

当每个阶段都有清楚的目标、权限边界和输出契约时，流水线阶段很有用。例如：探索 → 规划 → 实现 → 测试 → 审查。

由于 [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)不能继续嵌套子智能体，主 [Claude Code](/wiki/entities/claude-code) 对话仍是编排者。它启动每个阶段、收集输出，并决定继续、重试还是升级处理。

## 移交契约

移交质量是核心工程问题。好的阶段输出应包括：

- 目标已完成还是未完成。
- 证据和相关文件。
- 已作出的决定。
- 尚未解决的风险。
- 下一阶段所需的输入。

对于顺序数据流程，权限边界也应跟随阶段变化：采集者可以访问网络但不能写入权威数据，分析者读取证据但不修改来源，整理者写入规范文件但不抓取新事实。结构化文件或经过校验的 JSON 通常比复制完整对话更适合作为移交契约。[声明式智能体配置](/wiki/concepts/declarative-agent-configuration)可把这些角色、权限和输出要求固化为可审阅文件。

## 相关内容

- [多智能体架构模式](/wiki/comparisons/multi-agent-architecture-patterns)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [声明式智能体配置](/wiki/concepts/declarative-agent-configuration)
- [Claude Code 技能](/wiki/concepts/claude-code-skills)
