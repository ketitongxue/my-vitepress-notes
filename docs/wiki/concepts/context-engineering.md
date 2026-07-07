---
title: "上下文工程"
type: "concept"
tags: ["context-engineering", "agent", "workflow", "ai-coding"]
created: "2026-06-13"
updated: "2026-07-07"
---

# 上下文工程

上下文工程是在 LLM 或智能体工作前及工作中，塑造其所见内容的实践，使正确的项目事实、规则、示例、工具和操作预期约束其行为。

## 机制

在 Claude Code 中，[Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)是最直接的形式：持久化 `CLAUDE.md` 指令减少重复提示，使项目规则跨轮次可用。[Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)中的技能、子智能体、hooks 和插件也属于该机制，因为它们控制任务会应用哪些上下文和流程。

提问质量构成输入层。[聪明的技术提问](/wiki/concepts/smart-technical-questioning)与[最小可复现问题报告](/wiki/concepts/minimal-reproducible-problem-report)为人和智能体减少推理前的歧义；[AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)则在本地 Web 调试中先区分浏览器、服务器和环境证据。

[智能体任务简报](/wiki/concepts/agent-task-briefing)构成实现层：在智能体行动前，明确期望结果、方案约束、红线和交付标准，把提示词变成紧凑设计文档。[苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)则通过结构化对话，从粗略想法中发现缺失上下文。

[长上下文失效模式](/wiki/concepts/long-context-failure-modes)构成失效层：大窗口仍会因污染、分心、混淆和冲突而降低智能体表现。上下文工程并非把更多信息塞入提示，而是控制哪些信息处于活动、可信、隔离、摘要或丢弃状态。

在[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)中，上下文是智能体的 RAM；运行框架必须把活动工具描述、压缩、外部记忆、提醒和交接当作运行时资源管理。资源放置要考虑加载时机、能否跨压缩、上下文成本和权威性，从而区分提示型控制与 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)、权限等框架级控制。

[RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)增加了按查询过滤的动态层：小型列表式模型在昂贵生成模型读取前，删除对完整答案没有贡献的检索文本块。因此，上下文工程既包括静态加载架构，也包括检索后的动态裁剪。

## 机制地图

- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)让稳定项目规则始终可用。
- [Claude Code 技能](/wiki/concepts/claude-code-skills)仅在相关时加载领域流程。
- [Claude Code Hooks](/wiki/concepts/claude-code-hooks)把确定性行为移出主上下文。
- [渐进式披露](/wiki/concepts/progressive-disclosure)避免一次加载全部知识。
- [RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)在生成前过滤高召回检索集合。
- [智能体任务简报](/wiki/concepts/agent-task-briefing)在实现前塑造任务上下文。
- [苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)通过编码前对话发现缺失上下文。
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)把嘈杂工作隔离到可丢弃窗口。
- [长上下文失效模式](/wiki/concepts/long-context-failure-modes)解释噪声历史、无关工具和矛盾答案如何造成故障。
- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)把上下文作为运行时资源。
- [聪明的技术提问](/wiki/concepts/smart-technical-questioning)先框定问题，避免专家精力用于重建上下文。
- [最小可复现问题报告](/wiki/concepts/minimal-reproducible-problem-report)保存紧凑诊断证据。
- [AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)在修复前把错误路由到正确证据面。
- [多智能体架构模式](/wiki/comparisons/multi-agent-architecture-patterns)决定上下文如何共享、隔离、交接和综合。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)
- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
