---
title: "AI 调试错误分诊"
type: "concept"
tags: ["ai-coding", "workflow", "evaluation", "context-engineering", "developer-tool"]
created: "2026-06-20"
updated: "2026-06-20"
---

# AI 调试错误分诊

AI 调试错误分诊是一套工作流，用于把 bug、运行时错误或空白页面转化为结构化证据包，供 AI 编程工具诊断。

## 核心区别

有两类故障：

- Bug 表示程序仍在运行，但行为不正确。
- Error 表示执行停止，系统报告失败。

错误通常更容易处理，因为它会提供证据。Bug 可能更难，因为系统可能继续运行，却悄悄产生错误结果。

## 第一个路由问题

对于 Next.js 风格的全栈应用，分诊第一步是定位故障出现在哪里：

| 故障界面 | 典型症状 | 证据位置 |
| --- | --- | --- |
| 客户端错误 | 交互损坏、空白页面、渲染崩溃或浏览器状态错误。 | 浏览器 DevTools Console。 |
| 服务端错误 | API、数据库、AI API 调用或环境与配置失败。 | 运行开发服务器的终端。 |
| 环境错误 | 依赖、端口、Node 版本或环境变量失败。 | 终端、启动日志和配置文件。 |

这种路由可以避免浪费调试时间。前端渲染故障通常无法只靠阅读服务端日志解决；数据库或 API 故障也可能根本不会出现在浏览器控制台中。

## 证据包

向 AI 编程智能体提交问题时，应包含：

- 框架和运行模式，例如本地 Next.js 开发；
- 复制出来的错误文本，而不只是一张截图；
- 证据来自浏览器 Console 还是终端日志；
- 故障前刚刚执行的用户操作或代码改动；
- 如果堆栈追踪指出了文件和行号，也一并提供；
- 刷新或重启后能否复现。

这是面向 AI 辅助编程的[最小可复现问题报告](/wiki/concepts/minimal-reproducible-problem-report)。最小有用报告不是“坏了”，而是“我改了这部分、这里出现了这个错误、当时我正在做这件事”。

## 可重复循环

1. 判断问题是 bug 还是运行时错误。
2. 同时检查浏览器 Console 和服务端终端。
3. 复制核心错误行及其附近的堆栈行。
4. 在编辑前先让 AI 解释错误。
5. 定位相关文件和行。
6. 应用最小且合理的修复。
7. 重新执行同一用户操作，确认错误消失。

该循环与 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)一致：调试不是随机试错，而是采集证据、解释、编辑和验证。

## 环境故障线索

有些故障并非刚刚编辑的应用代码造成：

- `Cannot find module` 或 `Module not found` 通常指向依赖缺失。
- 配置附近出现 `undefined` 通常指向环境变量缺失。
- `EADDRINUSE` 或 address-in-use 消息指向端口冲突。
- `node_modules`、启动脚本或配置文件中的错误，可能表示环境不匹配，而非产品逻辑 bug。

## 生产故障线索

发布后，故障常会从本地终端转移到平台日志：

- 构建日志解释流量切换前的部署失败；
- 运行时日志解释生产环境的 API、数据库、AI 提供商和环境变量故障；
- 定时端点返回 `401` 通常表示配置的密钥不匹配；
- 定时端点返回 `500` 通常表示任务实现或下游服务失败；
- DNS 与域名问题可能需要检查记录和传播状态，而不是应用代码。

这些信息应与本地错误放进同一证据包：准确日志文本、触发操作、所在环境，以及故障仅发生在本地、仅发生在生产环境还是两边都会发生。

## 相关内容

- [最小可复现问题报告](/wiki/concepts/minimal-reproducible-problem-report)
- [聪明的技术提问](/wiki/concepts/smart-technical-questioning)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [上下文工程](/wiki/concepts/context-engineering)
- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [无服务器定时任务](/wiki/concepts/serverless-scheduled-jobs)
