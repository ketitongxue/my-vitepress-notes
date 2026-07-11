---
title: "AI 编程工程循环"
type: "concept"
tags: [ai-coding, engineering-loop, sdd, automation]
created: "2026-06-29"
updated: "2026-07-11"
---

# AI 编程工程循环

AI 编程工程循环，是把需求、规格、实现、验证、发布和复盘组织成一个可重复系统，而不是把 AI 当作一次性的代码生成器。

## 基本循环

一个健康的循环通常包括：

- 需求澄清：把目标、约束、验收标准说清楚。
- 规格化：用任务书、设计文档或 SDD 规约固定边界。
- 实现：让 AI 在真实代码库中做小步变更。
- 验证：运行测试、lint、构建、预览和必要的人工检查。
- 发布：通过 CI、部署和回滚机制交付。
- 复盘：把失败模式、提示词、脚本和知识沉淀回系统。

这条循环的重点不是“让 AI 多写代码”，而是让 AI 的每一步都有上下文、边界和反馈。

## V2 操作层

新的工程层把循环进一步自动化：

- [确定性数据流水线](/wiki/concepts/deterministic-data-pipeline)负责零 token 的资料采集、归档和索引更新。
- [无服务器定时任务](/wiki/concepts/serverless-scheduled-jobs)或 GitHub Actions 负责周期触发。
- [智能体无头执行](/wiki/concepts/agent-headless-execution)负责需要语义判断的整理、审计和总结。
- [智能体成本控制](/wiki/concepts/agent-cost-control)负责模型档位、预算、缓存和降级。

这样，AI 编程不只是一次会话里的交互，而是可以进入持续改进的工程流水线。

## 与 SDD 的关系

[规格驱动开发](/wiki/concepts/spec-driven-development)提供循环前半段的清晰输入，[SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)提醒我们把更多精力放在前置规格和验收设计上。实现只是循环的一段，验证和反馈决定系统能否长期稳定。
