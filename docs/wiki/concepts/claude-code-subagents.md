---
title: "Claude Code 子智能体"
type: "concept"
tags: ["agent", "delegation", "context-engineering", "workflow", "ai-coding"]
created: "2026-06-13"
updated: "2026-06-20"
---

# Claude Code 子智能体

Claude Code 子智能体是拥有独立指令、工具边界、权限和上下文窗口的委派工作者。它们的持久价值不在于“更聪明”，而在于隔离嘈杂或专业化工作，并返回紧凑结果。

## 核心价值

子智能体解决三个工程问题：

- 隔离：日志、搜索结果和中间推理不污染监督者的长期上下文。
- 约束：每个智能体可拥有更窄的角色、工具集和权限模式。
- 复用：代码审查者、测试运行者或研究者等常见角色可成为具名工作者。

这是一种具体的[上下文工程](/wiki/concepts/context-engineering)机制：它控制信息存放在哪里，以及多少信息返回主 [Claude Code](/wiki/entities/claude-code) 会话。

子智能体可充当上下文隔离区。大量搜索轨迹、试探性尝试、无关工具选项和过期的中间结论留在监督者之外，避免[长上下文失效模式](/wiki/concepts/long-context-failure-modes)。在[智能体运行框架工程](/wiki/concepts/agent-harness-engineering)中，它也是协调与隔离原语。

父会话可看到子智能体名称、描述和工具列表，但正文在独立窗口运行，只有最终结果返回。这使它在主上下文中比始终加载的指令更便宜，也更适合产生大量中间状态的旁支任务。

## 何时使用

当工作高噪声、角色边界清楚、可并行，或需要工具与权限隔离时使用子智能体，例如代码审查、测试执行、日志分析、安全审计、仓库探索和独立研究。

对于极小任务、需要持续向用户澄清的任务，或步骤紧密耦合到隔离后会丢失必要状态的任务，不应使用。复用流程应留在主线程时使用技能；确定性生命周期自动化则使用 hooks。

## 配置形态

配置通常是 `.claude/agents/` 或更高优先级会话、插件位置中的 Markdown 文件。重要字段包括：

- `description`：Claude 何时应使用该智能体；
- `tools` / `disallowedTools`：允许列表或拒绝列表；
- `model`：按任务选择模型；
- `permissionMode`：自主性与审批；
- `skills`：预加载流程知识；
- `hooks`：生命周期检查。

子智能体不能递归创建更多子智能体。需要复用知识时，应预加载技能而不是嵌套委派。

## 输出契约

有用的子智能体应返回可直接决策的摘要，而非倾倒整个工作上下文：检查了什么、发现了什么、重要结论的证据，以及监督者下一步应做什么。

## 相关内容

- [智能体流水线编排](/wiki/concepts/agent-pipeline-orchestration)
- [多智能体架构模式](/wiki/comparisons/multi-agent-architecture-patterns)
- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [长上下文失效模式](/wiki/concepts/long-context-failure-modes)
- [智能体运行框架工程](/wiki/concepts/agent-harness-engineering)
