---
title: "渐进式披露"
type: "concept"
tags: ["context-engineering", "workflow", "synthesis", "ai-coding"]
created: "2026-06-13"
updated: "2026-07-07"
---

# 渐进式披露

渐进式披露是一种面向智能体的信息架构模式：先暴露紧凑的路由层，只有当前任务需要时，才加载详细指令或资源。

## 三层结构

Claude Code 技能材料描述了三层模式：

| 层级 | 加载内容 | 目的 |
| --- | --- | --- |
| 目录 | `name` 和 `description` | 让智能体判断哪个技能可能适用。 |
| 主内容 | `SKILL.md` | 提供通用工作流和路由图。 |
| 按需资源 | `references/`、`scripts/`、模板、资产 | 只为相关分支加载重量级细节。 |

这是[上下文工程](/wiki/concepts/context-engineering)对稀缺上下文窗口的回答：系统先花少量 token 正确路由，只在深度有用时才为深度付费。

长上下文材料将这一点扩展到稀缺性之外。即便模型能容纳全部材料，[长上下文失效模式](/wiki/concepts/long-context-failure-modes)也表明，不必要的活跃上下文可能污染、干扰、混淆当前任务，或与之冲突。因此，渐进式披露也是一种可靠性模式。

[RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)是检索文档的运行时对应机制：渐进式披露把信息延迟到需要时再加载，剪枝则在检索后删除对当前答案没有贡献的文本块，两者分别控制检索前后的上下文。

## 设计启发式规则

- 让 `SKILL.md` 足够短，能够充当入口。
- 将高频指令内联放置。
- 将重量级参考资料移到命名明确的文件中。
- 使用表格或速查图进行路由。
- 当确定性计算或转换优于让模型从散文中推理时，使用脚本。
- 让文件引用具有契约性：说明何时加载，以及其中包含什么。

## 失效模式

- 把 `SKILL.md` 当成长文章，而不是操作手册。
- 把所有可能的规则都加载进 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)。
- 创建大量描述重叠的技能，导致选择歧义。
- 把业务逻辑放进模板，而不是技能路由或脚本。

## 相关内容

- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [技能设计模式](/wiki/concepts/skill-design-patterns)
- [长上下文失效模式](/wiki/concepts/long-context-failure-modes)
- [RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)
