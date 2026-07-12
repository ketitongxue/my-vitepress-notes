---
title: "AI 编程工程循环"
type: "concept"
tags: [ai-coding, workflow, planning, evaluation, synthesis]
created: "2026-06-13"
updated: "2026-07-11"
---

# AI 编程工程循环

AI 编程工程循环，是把 AI 辅助编码从一轮轮提示词推进，升级为有拆解、计划、实现、测试、评审、发布和复盘的工程系统。

## 基本机制

在 Claude Code 等编码智能体中，这个循环通过计划模式、文件定位、项目记忆、子代理、skills、hooks 和权限控制来实现。目标不是让 AI 更快地产生代码，而是让每一步都有上下文、边界和反馈。

[规格驱动开发](/wiki/concepts/spec-driven-development)提供了这个循环的控制面：先写规则，再让 AI 执行，随后按规则评审，并把缺失规则补回系统。

[智能体任务简报](/wiki/concepts/agent-task-briefing)是轻量入口；[苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)适合需求还不清楚时先问完整；[SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)则把实现循环扩展为 plan、align、execute、test、archive。

## 重型变更循环

[OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)是更重的版本，适合需要长期追溯的改动：先 explore，写 proposal，生成 spec 和 tasks，拷问 spec，apply 到代码，verify 覆盖情况，最后 archive。

它的价值在于把一次 change 的意图、边界、实现、测试和决策记录连起来。几个月后回看，不只知道改了什么，还知道为什么这么改。

## 产品和运行层

AI 编程循环还需要覆盖编码之外的现实约束：[产品数据层选型](/wiki/concepts/product-data-layer-selection)、[产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)、[产品滥用防护](/wiki/concepts/product-abuse-protection)、[产品反馈循环](/wiki/concepts/product-feedback-loop)和[产品分析迭代循环](/wiki/concepts/product-analytics-iteration-loop)都会影响最终交付。

对于周期性知识工作，[确定性数据流水线](/wiki/concepts/deterministic-data-pipeline)负责低成本采集和规整，[智能体无头执行](/wiki/concepts/agent-headless-execution)处理无人值守判断任务，[智能体成本控制](/wiki/concepts/agent-cost-control)约束 token 开销。

## 常见失败模式

- 计划不清楚就让 AI 写代码。
- 缺少红线和验收标准，让 AI 自行发明边界。
- 生成解释听起来合理，就跳过验证。
- 用高权限模式处理高风险改动。
- 把功能完成误认为产品验证完成。
- 只保存一次性对话，不沉淀记忆、skill、hook、测试或 spec。

## 相关页面

- [Claude Code](/wiki/entities/claude-code)
- [智能体无头执行](/wiki/concepts/agent-headless-execution)
- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [OpenSpec 变更工作流](/wiki/concepts/openspec-change-workflow)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
