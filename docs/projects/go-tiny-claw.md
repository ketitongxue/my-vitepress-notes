---
title: go-tiny-claw
description: 用 Go 探索 Agent 执行循环、工具调用与工程化边界的个人项目。
lastUpdated: false
---

# go-tiny-claw：把 Agent 的“会做事”拆成可验证的工程

这是我用 Go 持续迭代的个人项目，目标不是再做一个聊天窗口，而是把一个能调用工具、记住上下文、处理失败并留下执行证据的 Agent，拆成可以阅读、测试和替换的工程模块。

> 项目源码：[ketitongxue/go-tiny-claw](https://github.com/ketitongxue/go-tiny-claw)

## 我在这个项目里探索什么

go-tiny-claw 目前更像一个 Agent runtime 实验场：从一次用户指令开始，模型在执行循环中决定是否调用工具；工具结果再回到上下文，推动下一轮行动，直到任务结束。这样的结构让我可以分别观察模型、工具、上下文和外部系统之间的边界，而不是把所有逻辑塞进一个巨大的 handler。

项目当前以 Go 1.26.2 模块组织，入口位于 `cmd/claw`，核心代码拆分在 `internal/engine`、`internal/context`、`internal/provider`、`internal/tools`、`internal/observability` 和 `internal/feishu` 等包中。

## 核心结构

### 1. Agent 执行循环

`AgentEngine` 负责一轮轮推进任务：组装系统提示和工作记忆，调用模型生成文本或工具调用，并发执行同一轮中的工具，再把观察结果写回会话。

执行循环还保留了几个重要的工程钩子：

- 可选的 Thinking / Action 两阶段调用；
- 工具并发执行，减少相互独立操作的等待时间；
- 失败后的恢复提示和重复行为提醒；
- 主 Agent 与受限 Subagent 的不同运行边界。

### 2. 受工作区约束的工具

当前工具注册表包含文件读取、文件写入、局部编辑和 Bash 执行。工具拿到的是 Session 的工作区，而不是任意路径；Bash 还设置了 30 秒执行上限，并限制过长输出，避免一次工具调用把上下文拖垮。

这部分是我特别关注的边界：Agent 的能力不只取决于模型，还取决于工具允许它触碰哪些文件、执行哪些命令，以及失败后如何把信息交还给模型。

### 3. 上下文与技能加载

`PromptComposer` 会根据当前工作区生成系统提示，并按需读取 `AGENTS.md` 与 `.claw/skills/**/SKILL.md`。Session 负责短期工作记忆、消息追加和成本统计；上下文压缩器则在消息变长时保留近期内容，降低长任务的上下文压力。

项目还在尝试把长任务状态外置到 `PLAN.md` 和 `TODO.md`，让 Agent 在重启或切换执行者后，仍能从文件中的进度继续，而不是依赖一次对话里的短期记忆。

### 4. 模型适配与可观察性

Provider 层提供统一的 `LLMProvider` 契约，目前有基于 OpenAI SDK 的兼容实现和 Anthropic 消息格式实现。当前 CLI 示例使用智谱兼容端点与 `ZHIPU_API_KEY`，默认模型名为 `glm-5.2`；Provider 可以替换，Engine 不需要跟着重写。

每次运行还会记录任务级和 Turn 级 Trace，并统计输入/输出 token 与成本，便于复盘“模型为什么这样做”、工具调用花了多少时间，以及一次任务的成本落在哪里。

## 外部系统与实验边界

仓库中已经有飞书长连接、消息回传和高危操作审批的实现：危险命令可以先挂起当前任务，再通过 `approve <task-id>` 或 `reject <task-id>` 交回人工决定。不过当前 `cmd/claw/main.go` 仍以本地 CLI/测试链路为主，飞书 Bot 的启动和审批 Middleware 保留在实验代码中，并未作为默认启动路径。

这也是我希望保留在项目档案里的信息：它不是一个已经封装好的生产产品，而是一套正在把“模型能力、工具权限、状态恢复和人工介入”逐步工程化的个人实验。

## 我从中得到的几个结论

1. **工具边界先于 Agent 自由度。** 工作区、超时、输出长度和危险命令拦截，决定了 Agent 是否可控。
2. **上下文应该有生命周期。** 会话记忆、压缩、恢复提示和外置计划文件，分别解决短期连贯、长度控制、失败自愈和长任务续跑。
3. **可观察性不是事后日志。** 如果没有 Turn、Tool Call、成本和 Trace，Agent 的“聪明”很难被验证，也很难定位失败原因。
4. **集成要保留可替换点。** Provider、Tool Registry、Reporter 和消息入口分开后，CLI、飞书或其他入口可以共享同一个执行内核。

## 下一步

- 把本地 CLI 的示例链路整理成更小、更稳定的可运行示例；
- 完善工具权限与人工审批的默认安全策略；
- 为执行循环、上下文压缩和评测 Harness 增加更完整的自动化测试；
- 继续验证技能加载、长任务恢复和外部消息入口之间的组合方式。

## 相关源码入口

- [`cmd/claw/main.go`](https://github.com/ketitongxue/go-tiny-claw/blob/main/cmd/claw/main.go)：当前 CLI 装配入口
- [`internal/engine/loop.go`](https://github.com/ketitongxue/go-tiny-claw/blob/main/internal/engine/loop.go)：Agent 执行循环
- [`internal/context/composer.go`](https://github.com/ketitongxue/go-tiny-claw/blob/main/internal/context/composer.go)：系统提示与工作区上下文
- [`internal/provider`](https://github.com/ketitongxue/go-tiny-claw/tree/main/internal/provider)：模型适配层
- [`internal/tools`](https://github.com/ketitongxue/go-tiny-claw/tree/main/internal/tools)：工具注册与执行
