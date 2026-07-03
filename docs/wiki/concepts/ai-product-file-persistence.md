---
title: "AI 产品文件持久化"
type: "concept"
tags: ["workflow", "ai-coding", "product", "cost", "developer-tool"]
created: "2026-06-20"
updated: "2026-06-20"
---

# AI 产品文件持久化

AI 产品文件持久化是一套工作流，用于把临时生成或上传的文件转化为拥有稳定 URL 的持久产品资产。

## 核心机制

典型示例是 AI 生成图片，其提供商 URL 会过期。持久化模式如下：

1. 调用 AI 提供商并接收临时文件 URL。
2. 在后端从临时 URL 下载文件。
3. 把文件字节上传到云对象存储。
4. 在数据库中保存永久对象 URL。
5. 把永久 URL 返回前端。

这会将文件存储与结构化产品数据分离。文件属于对象存储；关系状态和元数据属于[产品数据层选型](/wiki/concepts/product-data-layer-selection)中描述的数据库。

## S3 兼容存储

Cloudflare R2 提供 S3 兼容 API，同时对小型产品有较有利的出口流量成本。底层设计选择并非“总是选择 R2”，而是“优先选择拥有稳定 SDK 支持、可预测成本和清晰公有或私有访问模型的对象存储”。

S3 兼容性很重要，因为大量 SDK 和工具可以使用同一协议。对 AI 编程智能体而言，这会降低新颖性：即使后端不是 AWS，智能体也能采用已知的 S3 客户端模式。

## 数据契约

后端上传函数应定义：

- 哪个 bucket 或命名空间用于存储生成资产；
- 如何保证对象名称唯一；
- 接受哪些内容类型；
- 对象公开，还是需要签名 URL；
- 哪张数据库表存储永久 URL 与相关提示元数据。

要求智能体增加图片、音频、视频、PDF 或用户上传功能时，这些内容应写入[智能体任务简报](/wiki/concepts/agent-task-briefing)。

## 失效模式

- 直接把 AI 提供商的临时 URL 存进数据库。
- 没有充分理由就把二进制文件存进主关系数据库。
- 使用不受限制的凭据从浏览器上传。
- 忘记内容类型、文件大小或路径控制。
- 只优化演示的理想路径，最终丢失用户资产。

## 相关内容

- [产品数据层选型](/wiki/concepts/product-data-layer-selection)
- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [产品滥用防护](/wiki/concepts/product-abuse-protection)
