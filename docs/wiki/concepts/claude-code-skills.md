---
title: "Claude Code 技能"
type: "concept"
tags: ["developer-tool", "workflow", "context-engineering", "ai-coding", "tool-use"]
created: "2026-06-13"
updated: "2026-07-06"
---

# Claude Code 技能

Claude Code 技能是可通过语义触发的能力包。它们编码领域知识、步骤、输出规则、约束和可选资源，使智能体在正确时机加载正确流程。

## 技能解决什么问题

技能回答“这件事应该怎样做，以及何时应用该流程”。它位于静态项目记忆和实时工具调用之间：

- [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)提供始终存在的背景。
- 技能提供任务专用流程和专长。
- 工具执行动作。
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)提供独立工作者和上下文隔离。

在能力封装层面，智能体文件类似岗位说明，回答“谁来做”；技能类似标准作业程序，回答“这类工作怎样做”。一个角色可以调用多个技能，同一个技能也可以被多个权限兼容的角色复用。

## 结构

最小单元是包含 `SKILL.md` 的目录。可选的 `references/`、`scripts/`、`templates/` 和 `assets/` 支持更重或更确定性的工作。

`name` 和 `description` 是路由表面：Claude 先扫描描述，只有任务匹配时才加载技能正文。这是[渐进式披露](/wiki/concepts/progressive-disclosure)的入口。

可靠技能还应说明适用场景、原子步骤、约束、输入假设、输出格式或文件路径，以及质量检查。如果语义路由仍有歧义，应优先显式调用，而不是继续扩大相互重叠的描述。

技能元数据在会话开始时可用，正文仅在斜杠命令或语义匹配触发后加载。被调用的技能可在上下文压缩后、共享预算范围内重新注入。因此，对并非始终相关的流程，技能比根记忆更合适。

## 参考技能与任务技能

参考技能在任务匹配其领域时自动选择。任务技能更像斜杠命令，通常由用户直接调用，有时还接受参数。

实践中技能与命令逐渐融合：任务型技能可替代旧斜杠命令，同时获得捆绑资源和更丰富的 frontmatter。

## 技能与工具

技能以三种方式与工具互动：

- 通过允许工具边界约束工具；
- 通过脚本和确定性命令序列编排工具；
- 在技能提示发送前接收命令输出形成的动态上下文。

因此技能是知识与路由层，而不只是提示片段。

技能与工具的关键差异在于权限和确定性：工具通过结构化接口执行代码，技能提供仍需模型理解的操作知识。推理与流程放进技能，实际动作放进工具，访问外部系统时再通过[模型上下文协议](/wiki/concepts/model-context-protocol)连接。

## 与其他引导面的边界

可复用流程需要在主对话中展开时使用技能；工作应在隔离上下文中执行并只返回摘要时使用 [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)；行为必须确定性运行而非依赖模型记住并选择执行时使用 [Claude Code Hooks](/wiki/concepts/claude-code-hooks)。

## 相关内容

- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [技能设计模式](/wiki/concepts/skill-design-patterns)
- [Claude Code 子智能体](/wiki/concepts/claude-code-subagents)
- [Claude Code Hooks](/wiki/concepts/claude-code-hooks)
- [声明式智能体配置](/wiki/concepts/declarative-agent-configuration)
