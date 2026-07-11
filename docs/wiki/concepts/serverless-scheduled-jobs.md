---
title: "无服务器定时任务"
type: "concept"
tags: [serverless, scheduled-jobs, automation, ci]
created: "2026-07-06"
updated: "2026-07-11"
---

# 无服务器定时任务

无服务器定时任务，是用云平台或 CI 系统按时间触发自动化工作。它适合周期抓取、日报周报、健康检查、索引更新、成本统计和低风险发布前检查。

## 常见形态

- 云函数定时触发：适合稳定运行的后台任务和外部服务集成。
- GitHub Actions schedule：适合仓库内脚本、文档生成、测试和提交产物。
- workflow_dispatch：适合保留人工按钮触发的半自动流程。
- push 或 pull request 触发：适合构建、测试、校验和部署前检查。

这些形态都可以作为[智能体循环工程](/wiki/concepts/agent-loop-engineering)里的时间触发器或事件触发器。

## 自动化成本分工

定时任务不等于每次都调用模型。更稳妥的结构是：

- 用普通脚本完成采集、解析、去重、缓存和写入。
- 只有在需要摘要、判断、异常解释或综合时调用模型。
- 用 secrets 管理凭据，用环境变量控制模型档位和预算。
- 在日志里记录本次运行的处理量、调用次数和费用估算。

这和[确定性数据流水线](/wiki/concepts/deterministic-data-pipeline)及[智能体成本控制](/wiki/concepts/agent-cost-control)直接相关。

## 失败处理

定时任务必须清楚处理失败：超时、接口失败、重复数据、权限失效、预算耗尽、模型返回不合格、提交冲突。失败后应留下可读日志和明确状态，而不是静默跳过。
