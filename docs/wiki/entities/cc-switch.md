---
title: "CC Switch"
type: "entity"
tags: ["product", "developer-tool", "ai-coding", "workflow"]
created: "2026-06-13"
updated: "2026-06-13"
---

# CC Switch

CC Switch 是一款社区工具，用于切换模型提供商，并管理 [Claude Code](/wiki/entities/claude-code) 等终端 AI 智能体的相关配置。

## 角色

CC Switch 是一个跨平台桌面与 CLI 工具，可协助配置模型提供商、MCP 服务器和技能。它的实际价值在于：当用户在 Anthropic Claude、OpenAI GPT、DeepSeek、Qwen、GLM、MiniMax、Kimi 等提供商之间切换时，可以减少手工修改环境变量或智能体配置文件的工作。

## 机制

提供商切换本质上是一次配置改写：选择提供商模板并启用后，CC Switch 会更新项目级 Claude 配置，例如 `.claude/settings.json`。从本 Wiki 的概念体系看，它是围绕 [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)与[模型上下文协议](/wiki/concepts/model-context-protocol)配置的一层工作流封装，本身并不会赋予智能体新的能力。

## 注意事项

本页所依据的材料仅来自一份课程笔记，因此在把它当作实际安装指南之前，应重新核对当前版本说明和支持的提供商列表。
