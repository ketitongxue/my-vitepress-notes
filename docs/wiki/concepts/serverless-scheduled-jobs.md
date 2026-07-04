---
title: "无服务器定时任务"
type: "concept"
tags: ["workflow", "automation", "developer-tool", "safety", "observability"]
created: "2026-06-20"
updated: "2026-06-20"
---

# 无服务器定时任务

无服务器定时任务，是在应用本身没有常驻服务器进程时，运行基于时间的产品工作的模式。

## 核心机制

在传统服务器上，cron 可以在机器内部运行。在无服务器平台上，产品代码往往只在收到请求时运行。因此，原文给出的模型是：

1. 创建一个执行定时工作的 API 路由。
2. 使用密钥保护该路由。
3. 配置外部调度器，在指定时间调用该路由。
4. 每次运行后观察状态码和日志。

调度器是外部闹钟，产品端点负责实际工作。

## 常见用途

原文示例包括：

- 通过[产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)发送每日生命周期邮件；
- 召回不活跃用户；
- 清理过期临时文件、会话或验证码；
- 生成每日 AI 内容；
- 运行周期性健康检查。

这使定时任务成为产品操作系统的一部分，而不仅是基础设施细节。

## 安全边界

定时端点若不受保护，就是公开 URL。原文使用 `CRON_SECRET` 一类 bearer 密钥，并在执行工作前检查 `Authorization` 请求头。

没有这项检查，任何发现 URL 的人都能反复触发任务。对于邮件、AI 生成或存储清理，这可能造成成本、垃圾信息或数据丢失风险。这与[产品滥用防护](/wiki/concepts/product-abuse-protection)直接相连。

## 运营契约

面向定时工作的智能体简报应定义：

- 端点路径；
- 运行日程和时区；
- 授权请求头或等效密钥；
- 预期成功与失败响应；
- 在哪里查看运行日志；
- 如果被触发两次，任务是否具有幂等性。

原文按状态码指出故障诊断方向：`401` 通常意味着密钥不匹配，而 `500` 则要求开发者检查运行时日志和任务实现。

## 失效模式

- 误以为无服务器应用能在没有外部触发器时自行唤醒。
- 本地测试后忘记设置生产密钥。
- 在没有认证的情况下运行高成本任务。
- 忽略时区配置。
- 任务不具备幂等性，却把定时批处理视为可安全重试。

## 相关内容

- [产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)
- [产品滥用防护](/wiki/concepts/product-abuse-protection)
- [AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)
- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
