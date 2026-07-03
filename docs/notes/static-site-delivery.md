---
title: 静态网站交付
date: 2026-06-30
description: 让内容变更可靠地进入生产环境。
tags:
  - 工程实践
  - 部署
---

# 静态网站交付

静态网站仍需要完整交付链：本地验证、版本控制、云端构建和线上检查。

## 发布路径

1. 本地执行生产构建。
2. 提交并推送到 GitHub。
3. Cloudflare Workers 自动构建并发布。

## 关联笔记

- [可持续的 AI 工作流](/notes/sustainable-ai-workflow)
- [产品验证循环](/notes/product-validation-loop)
