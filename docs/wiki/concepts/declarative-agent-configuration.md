---
title: "声明式智能体配置"
type: "concept"
tags: ["agent", "context-engineering", "workflow", "tool-use", "ai-coding"]
created: "2026-07-06"
updated: "2026-07-06"
---

# 声明式智能体配置

声明式智能体配置，是把项目意图、角色、权限和可复用流程写成可审阅、可版本化的文件，而不是把每个智能体动作都硬编码进编排程序。

## 配置分层

| 层级 | 回答的问题 | 常见载体 |
| --- | --- | --- |
| 项目记忆 | 这是什么项目，哪些事实必须保持成立？ | `CLAUDE.md`、`AGENTS.md` 或作用域规则。 |
| 角色定义 | 谁负责这项工作，可以访问什么？ | 智能体或子智能体角色文件。 |
| 能力包 | 一类重复任务应怎样完成？ | `SKILL.md` 以及引用、模板和脚本。 |
| 工具界面 | 系统能够确定性执行什么动作？ | 文件、Shell、浏览器、API 或 MCP 工具。 |
| 强制层 | 哪些动作必须执行或必须阻止？ | 权限、测试和 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)。 |

这种拆分把 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)、[Claude Code 子智能体](/wiki/concepts/claude-code-subagents)和 [Claude Code 技能](/wiki/concepts/claude-code-skills)连接起来，同时避免把所有职责塞进同一个文件。

## 为什么采用声明式文件

声明式配置描述期望的运行契约，由 Harness 决定具体执行路径。相较于分散的命令式初始化代码，这些文件更容易：

- 检查与审阅；
- 版本管理和回滚；
- 多人协作维护；
- 在格式兼容的工具之间复用；
- 按项目、目录、角色和能力范围组合；
- 与底层模型或 Harness 分开演进。

这是一种[上下文工程](/wiki/concepts/context-engineering)模式，因为这些文件决定任务会激活哪些事实、约束、流程和权限。

## 职责分离规则

项目记忆应保存稳定事实和默认规则，而不是所有操作流程。角色文件应定义责任和最小权限边界，而不是塞入庞大的通用手册。技能应保存流程和输出契约，但不能冒充确定性工具。工具和 Hooks 则负责执行或强制落实仅靠文字无法保证的行为。

这样，系统能够明确回答五个问题：什么是真的？谁来行动？任务怎样完成？什么能够执行？什么必须被强制？

## 失效模式

- 把整套工作流写进始终加载的记忆文件。
- 给所有智能体相同且宽泛的工具权限。
- 在一个文件中混合角色身份、任务流程和工具实现。
- 把仍依赖模型理解的技能当作确定性组件。
- 配置文件缺少输入、输出或质量契约。

## 相关内容

- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [智能体 Harness 工程](/wiki/concepts/agent-harness-engineering)
- [智能体流水线编排](/wiki/concepts/agent-pipeline-orchestration)
- [技能设计模式](/wiki/concepts/skill-design-patterns)
- [渐进式披露](/wiki/concepts/progressive-disclosure)
