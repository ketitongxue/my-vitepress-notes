---
title: "产品部署发布工作流"
type: "concept"
tags: ["workflow", "ai-coding", "automation", "developer-tool", "observability"]
created: "2026-06-20"
updated: "2026-06-20"
---

# 产品部署发布工作流

产品部署发布工作流，是把一个在本地运行正常的 AI 构建产品，转变为公开、可观测且能够回滚的 Web 服务的过程。

## 核心机制

原文把部署视为一次边界变化：本地开发证明产品能在开发者机器上运行；部署则证明其他人能通过公开 URL 访问它。

对于 Next.js 一类的产品，发布循环是：

1. 将项目推送到 GitHub。
2. 把仓库导入 Vercel 或类似部署平台。
3. 配置构建设置和环境变量。
4. 由平台构建并发布站点。
5. 通过 DNS 连接域名。
6. 生产环境出错时，使用平台日志、重新部署和回滚能力。

这样，部署就成为 [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)的一部分，而非功能开发结束后的手工补充。

## 部署前清单

在要求智能体“部署这个项目”之前，项目应具备：

- 已推送当前代码的 GitHub 仓库；
- 一次成功的本地构建，例如 `pnpm build`；
- 已复制到部署平台的生产环境变量；
- 没有通过 `.env` 或 `.env.local` 提交任何密钥；
- 明确的生产 URL，以及必要时的域名方案。

关键失效模式，是误以为本地配置会随代码一起迁移。环境变量通常不会自动迁移，必须在托管平台中另行配置。

## 自动化表面

Vercel 式部署以 GitHub 作为发布触发器。推送到主分支会启动构建、发布新版本，并在部署成功后切换流量。

只有生产故障可观测时，这种自动化才真正有用。因此工作流依赖两类日志表面：

| 表面 | 用途 |
| --- | --- |
| 构建日志 | 定位发布前的依赖、TypeScript、lint 或编译错误。 |
| 运行时日志 | 定位发布后的 API、数据库、AI 提供商或环境配置错误。 |

这与 [AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)相连：生产故障需要准确的日志文本，不能只有损坏页面的截图。

## 域名与 DNS 边界

部署会提供平台 URL，自定义域名则赋予产品稳定的公开身份。运营路径是：

1. 购买或注册域名。
2. 将域名添加到部署平台。
3. 在域名注册商或 DNS 托管商处配置 DNS 记录。
4. 等待解析传播。
5. 由平台签发 HTTPS 证书。

原文强调了常见 DNS 记录类型：

- `CNAME`：将 `www` 等子域名指向托管平台；
- `A` 记录：将域名指向某个 IP 地址；
- `ALIAS` 或 `ANAME`：根域名需要类似 CNAME 的行为时使用。

在[智能体任务简报](/wiki/concepts/agent-task-briefing)中，域名工作应注明注册商、DNS 托管商、目标部署平台、期望的根域名／子域名行为，以及该域名是否已经承载邮件或其他服务。

## 失效模式

- 本地应用正常，但生产构建失败。
- 密钥存在于 `.env.local`，却没有配置到部署平台。
- 更新环境变量后没有重新部署应用。
- 只从浏览器调试 API 故障，没有查看运行时日志。
- 将 DNS 指向错误目标，或忘记解析传播需要时间。
- 上线时并不知道如何重新部署或回滚。

## 相关内容

- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)
- [产品反馈循环](/wiki/concepts/product-feedback-loop)
