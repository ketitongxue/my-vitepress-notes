---
title: "产品邮件投递工作流"
type: "concept"
tags: ["workflow", "automation", "product", "developer-tool", "safety"]
created: "2026-06-20"
updated: "2026-06-20"
---

# 产品邮件投递工作流

产品邮件投递工作流，是让 Web 产品无需人工逐封发送，也能联系用户的机制。

## 核心机制

原文将产品邮件分为两大类：

| 类别 | 触发方式 | 示例 |
| --- | --- | --- |
| 事务邮件 | 用户操作或账户事件。 | 欢迎邮件、密码重置、订单收据。 |
| 营销或生命周期邮件 | 产品设定的日程或用户分群。 | 每日消息、召回邮件、发布公告。 |

两者都使用邮件服务 API。应用把收件人、主题和内容发送给提供商，由提供商处理投递及与邮件服务器的交互。

## 域名验证

投入生产前，应验证发信域名。通常需要把邮件提供商给出的 DNS 记录添加到域名的 DNS 托管处。

域名验证可以提高可信度和送达率。它也把邮件投递与[产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)连接起来，因为同一个域名现在可能同时承载网站托管、DNS 路由和产品邮件。

## 后端边界

邮件 API 密钥是服务器端密钥。原文明确避免为邮件密钥使用公开环境变量前缀，因为浏览器绝不能获得通过产品账户任意发信的能力。

在[智能体任务简报](/wiki/concepts/agent-task-briefing)中，提示词应明确：

- 已选择哪个提供商；
- 本地和生产环境变量在哪里配置；
- 哪些消息属于事务邮件，哪些属于生命周期邮件；
- 投递失败是否应该阻断用户操作；
- 邮件模板存放在哪里。

## 非阻断式失败处理

对于注册等流程，即使欢迎邮件发送失败，主要产品事件通常也应该成功。原文建议把邮件发送包裹在错误处理中，避免提供商的短暂故障破坏账户创建。

定时或生命周期邮件具有不同的失败模型：应记录日志，在合适时重试，并与[无服务器定时任务](/wiki/concepts/serverless-scheduled-jobs)连接。

## 失效模式

- 使用未验证的域名发送生产邮件。
- 将邮件 API 密钥暴露给客户端代码。
- 让非关键邮件投递阻断关键用户流程。
- 大批量发送生命周期邮件，却没有退订机制或频率约束。
- 忘记定时邮件端点也需要滥用防护。

## 相关内容

- [无服务器定时任务](/wiki/concepts/serverless-scheduled-jobs)
- [产品滥用防护](/wiki/concepts/product-abuse-protection)
- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [产品反馈循环](/wiki/concepts/product-feedback-loop)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
