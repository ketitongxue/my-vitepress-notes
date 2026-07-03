---
title: "Claude Code 扩展系统"
type: "concept"
tags: ["ai-coding", "developer-tool", "agent", "tool-use", "workflow"]
created: "2026-06-13"
updated: "2026-06-20"
---

# Claude Code 扩展系统

Claude Code 扩展系统是一组机制，可把基础终端智能体变成了解项目和工作流的工程工具。

## 组件

| 机制 | 在系统中的角色 |
| --- | --- |
| 记忆文件 | 持久保存项目约定与用户偏好；参见 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)。 |
| 规则 | 存储作用域约束，可以全局加载，也可以在文件路径匹配时加载。 |
| 子智能体 | 隔离嘈杂或专业化工作；参见 [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)。 |
| 技能 | 通过 [Claude Code 技能](/wiki/concepts/claude-code-skills)封装可复用流程。 |
| Hooks | 添加确定性的生命周期自动化和强制执行；参见 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)。 |
| 无头模式 | 在自动化或 CI 中运行智能体任务；参见[智能体无头执行](/wiki/concepts/agent-headless-execution)。 |
| Agent SDK | 把智能体行为嵌入更大的程序或工作流。 |
| MCP | 通过[模型上下文协议](/wiki/concepts/model-context-protocol)连接外部工具和服务。 |
| 插件 | 打包命令、技能、智能体和 hooks，以便复用和分发。 |
| 输出样式与附加系统提示 | 改变系统层行为，或增加本次调用专用指令。 |

## 综合判断

这些机制解决不同的协调问题。记忆负责持久上下文；子智能体负责角色和上下文隔离；技能负责可复用专长；hooks 负责控制点；MCP 负责外部工具连接；插件负责打包和共享。

官方引导指南增加了第二条设计轴：每个控制面在加载时机、压缩行为、上下文成本和权威性方面各不相同。因此，扩展设计变成了一项放置工作。稳定事实应放入记忆；路径绑定约束放入规则；可重复流程放入技能；隔离的高噪声工作交给子智能体；确定性强制执行则交给 hooks 或权限。

插件示例仍然重要，因为它展示了扩展系统如何组成套件：团队可以把审查命令、代码质量技能、测试运行子智能体和编辑前 hook 组合成可共享的软件包。

## 架构分工

后续材料进一步明确了边界：

- 记忆是始终加载的项目上下文。
- 技能是按需加载的知识和流程。
- 子智能体提供执行与上下文隔离。
- Hooks 是生命周期控制点和确定性护栏。
- MCP 提供工具连接。
- 插件是分发容器。

这种分工有助于避免一种机制承担过多职责。例如，简单提示模板通常应成为技能，而不是子智能体；高噪声测试运行器通常应成为子智能体，而不是永久加载的记忆规则。同样，“总是运行格式化器”应成为 hook，而不是记忆中的提醒，因为需要的是执行，而不是回忆指令。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)
- [多智能体架构模式](/wiki/comparisons/multi-agent-architecture-patterns)
