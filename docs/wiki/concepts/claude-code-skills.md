---
title: "Claude Code 技能"
type: "concept"
tags: [claude-code, skills, workflow, knowledge]
created: "2026-07-01"
updated: "2026-07-11"
---

# Claude Code 技能

Claude Code 技能，是把可复用的工作方法、项目约定、判断标准和辅助脚本封装成可调用能力。它让智能体在特定任务上少靠临场猜测，多靠已经沉淀好的流程。

## 技能解决什么问题

技能适合沉淀这些内容：

- 某类任务的入口判断和适用边界。
- 必须读取的文件、配置或参考资料。
- 标准操作步骤、验证命令和失败处理方式。
- 可复用脚本、模板、示例和质量标准。

当任务重复出现时，技能比散落在聊天记录里的经验更可靠。

## 与 Hooks 和 MCP 的区别

- Skills 负责“怎么做这类任务”。
- Hooks 负责“执行过程中何时检查和阻断”。
- MCP 负责“给模型暴露哪些外部工具和资源”。

在一个完整的[Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)里，技能通常是最上层的工作流说明，Hooks 和 MCP 则提供底层执行能力。

## 设计原则

好的技能应该足够具体：它需要说明触发条件、读取顺序、使用哪些脚本、如何验证结果，以及什么情况下停止或升级给用户。它不应该只是泛泛的最佳实践清单。

当技能被用于持续任务时，还需要和[智能体循环工程](/wiki/concepts/agent-loop-engineering)连接：明确触发、停止、验证、日志和成本边界。
