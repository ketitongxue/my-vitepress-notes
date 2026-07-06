---
title: "规格驱动开发"
type: "concept"
tags: ["workflow", "ai-coding", "planning", "evaluation", "context-engineering"]
created: "2026-06-13"
updated: "2026-07-05"
---

# 规格驱动开发

规格驱动开发（SDD）是使 AI 辅助编程更加一致的闭环：定义项目规则，要求智能体遵循规则，对照规则审阅，然后在发现缺口时完善规则。

## 循环

1. 在编写业务代码前定义规格。
2. 要求智能体按照规格实现。
3. 对照意图、质量和边界审阅输出。
4. 当审阅发现规则缺失或含糊时，更新规格。

原文把它视为持续系统，而非一次性文档。

设计文档材料进一步提供了规模阶梯。小型请求可以从一份[智能体任务简报](/wiki/concepts/agent-task-briefing)开始，其中包含问题陈述、方案描述、技术约束、红线和交付标准。大型变更则应扩展为完整设计文档，涵盖当前上下文、需求、设计决策、技术设计、实施计划、测试策略、可观测性、依赖、安全、发布和参考资料。

规格细化材料在书面规格之前加入一个交互步骤：[苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)通过每次只问一个问题的对话，在智能体编写实现代码前发现缺失需求、非目标、约束和成功标准。

四层方法论材料把这个简单循环扩展为 [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)：规划、对齐、执行、测试和归档。其核心观点是，SDD 不只是更好的第一条提示词或静态系统设计文档，而是一个同时保留当前事实和决策历史的受管理变更生命周期。

[SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)让采用程度与项目相称。小型项目可能只需要澄清和项目常量，长期或争议较大的系统则可加入变更跟踪、多角色审阅和强制 TDD 门禁。

[SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)补充了采用顺序：先养成编写小型结构化规格的习惯，再比较或安装工作流工具。只有反复手工使用暴露出值得消除或强制执行的具体步骤后，才应引入自动化。

## 规格中应包含什么

最有价值的规则，是 [Claude Code](/wiki/entities/claude-code) 原本需要猜测的地方：命名、API 响应形态、错误码、依赖边界、抽象风格和项目特定的设计原则。

[Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)是这类规格的默认归宿，因为它们会在新会话开始时加载。

较新的材料增加了一条重要边界：稳定项目规则属于记忆文件、技能和规范规格；单次变更的提案、设计、任务、增量和执行记录则属于独立的变更层。归档必须把变更层中反复出现的经验提升回规则层。

任务局部规格还应列出受影响文件、集成点、非功能性需求和测试。这些细节会把提示词从愿望转化为智能体可执行的契约。

对于需要持久化的产品，[产品数据层选型](/wiki/concepts/product-data-layer-selection)应成为规格的一部分。在智能体编辑存储相关代码之前，规格应写明数据库服务、ORM、模式文件、迁移命令、环境隔离和管理数据边界。

## 审阅方式的转变

SDD 把审阅从主观品味转化为清单验证。人类不再问“我喜欢这段代码吗？”，而是问“它符合明确规则吗？”这让 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)更容易操作和改进。

审阅也会推动 [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)。每个暴露项目知识缺失的审阅发现，都可能转化为记忆、技能、钩子、测试或规范规格的更新。正是这样，反复进行的 SDD 循环才会越来越快、越来越可靠，而不是一堆彼此孤立的文档。

## 相关内容

- [上下文工程](/wiki/concepts/context-engineering)
- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [苏格拉底式规格细化](/wiki/concepts/socratic-spec-refinement)
- [产品数据层选型](/wiki/concepts/product-data-layer-selection)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)
- [SDD 95-5 原则](/wiki/concepts/sdd-95-5-principle)
