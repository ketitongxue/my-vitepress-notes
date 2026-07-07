---
title: "长上下文失效模式"
type: "concept"
tags: ["llm", "agent", "context-engineering", "evaluation"]
created: "2026-06-13"
updated: "2026-07-07"
---

# 长上下文失效模式

长上下文失效模式是指上下文窗口足以容纳远超当前任务所需的历史、工具、文档和中间工作时，LLM 或智能体出现的退化方式。

核心结论是：上下文大小不等于上下文质量。大窗口支持检索与摘要，但当工作上下文包含污染状态、干扰性历史、无关工具或冲突说法时，智能体仍会失败。

## 四种失效模式

| 失效模式 | 发生什么 | 对智能体的影响 |
| --- | --- | --- |
| 上下文污染 | 幻觉或错误状态进入目标、摘要或记忆。 | 智能体反复追求不可能或无关的目标。 |
| 上下文分心 | 累积历史过于显著，模型重复过去动作而不制定新计划。 | 长期运行智能体过度拟合自己的记录。 |
| 上下文混淆 | 模型仍在考虑无关内容或工具定义。 | 智能体选择不必要文档或调用无关工具。 |
| 上下文冲突 | 早期假设、部分答案、工具或检索事实与后续信息矛盾。 | 智能体锚定过期或错误中间结果，难以恢复。 |

## 设计含义

这是直接的[上下文工程](/wiki/concepts/context-engineering)问题：系统必须决定哪些内容留在活动提示中，哪些应摘要、按需加载或与主流程隔离。

即使所有技能、规则、文档和工具定义都能放进窗口，一次全部加载仍会制造混淆和冲突。因此[渐进式披露](/wiki/concepts/progressive-disclosure)至关重要。

它也约束[模型上下文协议](/wiki/concepts/model-context-protocol)设计。连接更多工具意味着更多无关或冲突的描述，所以工具路由和动态加载属于可靠性机制，而不只是便利功能。

在智能体工作流中，[Claude Code 子智能体](/wiki/concepts/claude-code-subagents)等隔离模式充当上下文隔离区：高噪声研究、日志和试错留在监督者主上下文之外，仅返回紧凑结果。

[智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)把这些失效模式转化为运行时职责：限制活动工具描述、外部化状态、压缩或丢弃旧上下文，并在危险或重复动作循环成为生产事故前打断它们。

[RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)把同一原则应用于检索输出。列表式剪枝器在生成前删除旁支和无关文本块，同时保留只有与其他证据组合时才有价值的内容，从而在不依赖更大窗口的情况下减少混淆和分心。

## 相关内容

- [上下文工程](/wiki/concepts/context-engineering)
- [渐进式披露](/wiki/concepts/progressive-disclosure)
- [模型上下文协议](/wiki/concepts/model-context-protocol)
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)
- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
- [RAG 上下文剪枝](/wiki/concepts/rag-context-pruning)
