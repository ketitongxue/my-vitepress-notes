---
title: "智能体任务简报"
type: "concept"
tags: ["agent", "ai-coding", "planning", "context-engineering", "workflow"]
created: "2026-06-13"
updated: "2026-07-05"
---

# 智能体任务简报

智能体任务简报是在实现开始前，把交给 AI 编程智能体的请求转化为紧凑设计文档的实践。提示词可被视为一份微型设计文档：足够短，适合日常使用；同时又有足够结构，能减少猜测。

## 五部分检查表

轻量简报包含五项必查内容：

| 检查项 | 目的 |
| --- | --- |
| 问题陈述 | 用一句清楚的话说明用户体验或目标结果。 |
| 解决方案描述 | 具体说明行为、数量、交互和视觉细节。 |
| 技术约束 | 指明技术栈、接口、文件或平台限制。 |
| 红线 | 明确智能体不应做什么。 |
| 交付标准 | 定义何为完成；必要时包括移动端行为或工作流闭环。 |

它位于随意提示与完整的[规格驱动开发](/wiki/concepts/spec-driven-development)之间：既为智能体提供足以行动的结构，又让简报保持精简，以便快速迭代。

[苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)是生成这份简报的对话方式。用户从一句话开始，AI 每次提出一个带编号选项的问题，直到补齐简报中缺失的部分。当用户知道意图、却还不知道完整规范应是什么形态时，这种方式尤其有用。

## 升级为完整设计文档

对于较大的改动，设计文档模板会把同一思路扩展为多个章节：当前背景、功能与非功能需求、设计决策、技术设计、实现计划、测试策略、可观测性、依赖、安全、发布，以及未来考虑事项。

关键机制是显式化。完整设计文档迫使模糊工作在编码前进入命名明确的决策界面，尤其是要修改的文件、集成点、测试策略、可观测性和发布方案。

[SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)把规划与对齐区分开来。起草提案还不够：在实现前，人类与智能体应明确检查假设、边界、失败行为、性能约束、绕过路径和存在争议的决定。许多代价高昂的偏离都可在对齐阶段避免。

对于最小可用版本，[SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)把简报压缩为四个标题：构建什么、不构建什么、边界与验收、如何验证。这样，新用户无需安装任何 SDD 工具，也能得到一份可用规格。

## 与智能体工作的关系

智能体任务简报是一种[上下文工程](/wiki/concepts/context-engineering)模式，因为它在模型开始推理前塑造输入上下文。它也是 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)的一部分：先写简报，再实现；依据简报验证；发现缺口后更新简报或持久规范。

对于持久项目规则，简报可以升级为 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)。对于单次实现，它可以保持为任务局部契约。失效模式是要求智能体自行推断本应明确写出的约束。

数据库工作会放大模糊简报的代价。[产品数据层选型](/wiki/concepts/product-data-layer-selection)补充了简报应明确的字段：现有 schema 的位置、ORM、迁移命令、开发与生产数据库目标、密钥处理规则，以及管理操作是只读还是可编辑。

设计润色提出了另一类简报要求。[AI 产品设计润色工作流](/wiki/concepts/ai-product-design-polish-workflow)表明视觉任务需要具体参照：目标区块、组件或网站灵感、产品语气、设备尺寸、交互范围，以及哪些内容不可照搬。“让它显得高级”并不是实现简报。

## 相关内容

- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [上下文工程](/wiki/concepts/context-engineering)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)
- [苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)
- [产品数据层选型](/wiki/concepts/product-data-layer-selection)
- [AI 产品设计润色工作流](/wiki/concepts/ai-product-design-polish-workflow)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)
