---
title: "产品滥用防护"
type: "concept"
tags: ["safety", "workflow", "automation", "developer-tool", "product"]
created: "2026-06-20"
updated: "2026-06-20"
---

# 产品滥用防护

产品滥用防护是防止机器人或不受信任调用者耗尽配额、骚扰用户或触发昂贵操作的产品工程层。

## 核心机制

Cloudflare Turnstile 是入口示例，但机制更广：任何会消耗 AI token、发送邮件或创建用户可见状态的公开动作，都需要在后端执行前验证。

人机验证的正确流程是：

1. 浏览器渲染挑战组件并获得短期 token。
2. 前端把 token 随受保护请求一起发送。
3. 后端使用密钥向提供商验证 token。
4. 只有后端验证成功后，应用才执行昂贵动作。

只做前端验证无效，因为浏览器由调用者控制；后端必须是强制执行点。

## 密钥边界

- site key 可以暴露给浏览器，并可使用 `NEXT_PUBLIC_` 前缀；
- secret key 必须只留在服务器端，绝不能打包进前端代码。

这是把 [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)的思维应用于产品：信任按环境划分，特权动作需要明确边界。

## 模式权衡

| 模式 | 何时使用 | 权衡 |
| --- | --- | --- |
| Managed | 默认产品流程。 | 提供商决定是否展示挑战。 |
| Non-interactive | 希望尽量少打断用户。 | 对用户而言不够明确。 |
| Invisible | 不希望出现可见组件。 | 验证阻断时更难解释。 |

早期产品应从 managed 模式开始，因为它能平衡保护和可用性。

## 失效模式

- 只保护前端，让直接 API 调用绕过检查。
- 通过公开环境变量泄露密钥。
- 重用过期或已使用 token。
- UI 加了验证，却忘记在 API 路由强制执行。
- 把人机验证当作定时任务、邮件、上传或其他公开端点的唯一保护。

## 相关内容

- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [无服务器定时任务](/wiki/concepts/serverless-scheduled-jobs)
- [产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)
- [AI 编程工程循环](/wiki/concepts/ai-coding-engineering-loop)
- [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)
