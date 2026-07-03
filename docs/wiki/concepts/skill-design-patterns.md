---
title: "技能设计模式"
type: "concept"
tags: ["developer-tool", "workflow", "context-engineering", "tool-use", "ai-coding"]
created: "2026-06-13"
updated: "2026-07-02"
---

# 技能设计模式

技能设计模式描述了如何拆分过程知识、参考资料、脚本、模板、权限和动态上下文，使 Claude Code 技能保持小巧、精确且实用。

## 四种实用模式

| 模式 | 适用场景 | 设计动作 |
| --- | --- | --- |
| 模板驱动 | 输出格式很重要。 | 把呈现形式放进模板，把决策留在 `SKILL.md`。 |
| 脚本增强 | 计算或转换是确定性的。 | 把可重复逻辑放进 `scripts/`，并告诉智能体何时运行。 |
| 知识分层 | 领域规则很多。 | 内联常用检查；更深分支则路由到参考资料。 |
| 工具隔离 | 不同任务的风险不同。 | 视情况使用允许工具、只读模式或分叉上下文。 |

## 与工具的关系

原文最有用的抽象是：技能与工具相互补充。技能是操作知识，工具是行动表面。当脚本能直接完成确定性工作时，优秀的技能不会要求模型依靠记忆完成它。

## 与记忆的关系

[Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)应包含始终生效的默认规则，技能则包含特定任务的流程。当某项技能永久适用于仓库中的所有工作时，其中一些原则可以提升为项目记忆；当记忆变得过大时，专门流程应移回技能。

## 活的知识资产

SDD 方法论材料把项目技能视为活的知识资产。第一版通常比较通用；它的持久价值来自反复使用、人工审阅，以及持续补充项目特定工具、业务规则、性能限制、重试行为和已知失效模式。

[AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)提供了更新机制。当审阅暴露智能体不知道的事项时，应对经验分类，并把它加入记忆、技能、钩子、测试或规范规格。对于棕地系统，技能还应从现有代码自下而上提取，而不能只从通用最佳实践中凭空设计。

## 相关内容

- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [渐进式披露](/wiki/concepts/progressive-disclosure)
- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)
- [SDD 规格生命周期](/wiki/concepts/sdd-spec-lifecycle)
