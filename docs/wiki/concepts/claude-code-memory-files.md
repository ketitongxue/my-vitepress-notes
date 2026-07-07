---
title: "Claude Code 记忆文件"
type: "concept"
tags: ["ai-coding", "memory", "context-engineering", "workflow"]
created: "2026-06-13"
updated: "2026-07-06"
---

# Claude Code 记忆文件

Claude Code 记忆文件是持久化 Markdown 指令，在工作开始时向智能体提供项目上下文、编码规则、偏好和操作约束。

## 层级

记忆采用分层结构：

```text
user-level/.claude/CLAUDE.md
project-root/CLAUDE.md
project-root/.claude/rules/*.md
```

一般模式是：全局记忆保存跨项目偏好，项目记忆保存仓库规则，模块级规则保存更窄的局部约束。进一步的职责划分如下：

- 用户级记忆保存个人沟通偏好、代码风格和常用工具。
- 项目级 `CLAUDE.md` 保存团队共享的架构、技术栈、目录、API 和回复约定。
- 本地工作区笔记保存不应成为团队策略的私有环境细节、测试账号、当前工作和调试提示。
- 主文件过于宽泛时，用规则目录拆分为按主题限定的文件。

## 机制

记忆文件减少重复提示，使智能体行为更可预测。它是具体的[上下文工程](/wiki/concepts/context-engineering)机制：项目携带自己的工作契约，而不是期望智能体从聊天中推断约束。

从[声明式智能体配置](/wiki/concepts/declarative-agent-configuration)看，记忆不是数据库或聊天记录，而是经过版本管理的项目意图与约束说明，类似每个新智能体会话开始前都会阅读的入职手册。

根目录 `CLAUDE.md` 在会话开始时加载，并在压缩后持续相关，所以每一行都有反复出现的 token 与注意力成本。子目录 `CLAUDE.md` 仅在 Claude 读取该目录下文件时按需加载。因此根记忆应放稳定的全局事实，而不是冗长流程或狭窄规则。

## 哪些内容属于记忆

模板强调的规则包括：写代码前确认计划、避免无关改动、优先复用现有函数、不把配置硬编码、实现后测试、清理调试日志，以及不要占用用户拥有的端口或浏览器实例。

这些规则通过让验证和范围控制成为环境的一部分，支撑 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)。

实用的项目记忆通常覆盖六类稳定信息：项目目标、技术栈、编码约定、目录职责、开发流程，以及特殊的安全、性能或合规约束。共享记忆应像代码一样接受审阅，及时删除陈旧规则。

## 写作原则

有效记忆应简洁、具体、可操作：

- 少即是多：每一行都会注入未来上下文。
- 具体胜过泛泛：明确约定，不写模糊的质量目标。
- 对必须可靠执行的规则说明原因、内容和方法。
- 使用[渐进式披露](/wiki/concepts/progressive-disclosure)：`CLAUDE.md` 只放默认规则，通过链接指向详细文档。

记忆应在错误后迭代。Claude 反复违反某条规则时，持久修复是更新相应记忆或规格，而不是只在聊天中不断纠正。

行为若是流程，应迁移到 [Claude Code 技能](/wiki/concepts/claude-code-skills)；若需确定性强制执行，则迁移到 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)或[Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)。这样记忆保持为索引和稳定契约，而不会成为所有指令的倾倒场。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [规格驱动开发](/wiki/concepts/spec-driven-development)
- [Claude Code 技能](/wiki/concepts/claude-code-skills)
- [Claude Code Hooks](/wiki/concepts/claude-code-hooks)
- [声明式智能体配置](/wiki/concepts/declarative-agent-configuration)
