---
title: "智能体无头执行"
type: "concept"
tags: ["agent", "automation", "workflow", "ai-coding"]
created: "2026-06-13"
updated: "2026-06-13"
---

# 智能体无头执行

智能体无头执行是指在没有交互式 IDE 或终端对话的情况下运行智能体，通常用于 CI 等自动化环境。

## 机制

无头模式解决了交互式工作流的一项限制：交互式智能体很有用，但工程系统也需要无人值守的运行，以执行 lint 修复、代码维护和周期性检查。

在这种模式下，提示词成为自动化指令，外围系统负责提供代码仓库、凭据、权限和验证环境。

## 设计影响

无头执行会提高以下事项的重要性：

- 清晰的 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)，使智能体继承项目规则。
- 当环境未隔离时，选择保守的 [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)。
- 使用 [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)中的 hooks 或 CI 门禁验证输出。
- 保存日志和产物，让人类可以在运行结束后复核发生了什么。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
