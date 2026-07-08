---
title: "QMT 与 miniQMT 交易系统"
type: "concept"
tags: ["broker-api","trading-system","execution","automation","data","quantitative-trading"]
created: "2026-06-23"
updated: "2026-06-23"
---

# QMT 与 miniQMT 交易系统

QMT/miniQMT 在课程中是从研究走向实盘的核心接口。材料称 Python + QMT 是国内量化私募常见基建，QMT 终端提供历史数据、实时 Level-1 行情、回测和官方合规交易接口。它连接 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) 的策略验证与 [ai-quant-agent-workflow](/finance/concepts/ai-quant-agent-workflow) 的自动化执行。

## 标准 QMT 与 miniQMT

| 维度 | 标准 QMT | miniQMT |
|---|---|---|
| 运行方式 | 策略运行在券商客户端内部 | Python 脚本作为独立“大脑”，QMT 负责传递交易指令 |
| 优势 | 稳定、托管、部分风控由终端处理 | 灵活，可接 LangChain/LangGraph/外部 Python 库 |
| 局限 | 外部库受限，扩展性较差 | 订单状态机、断线重连、重启恢复、应用层风控需自行实现 |
| 适合场景 | 简单托管策略 | AI 量化、复杂工作流、可视化控制台 |

## 数据与部署

- 数据通常来自券商 QMT 终端底层行情源，开通 QMT 权限后，历史数据与实时 Level-1 行情通常无需额外付费。
- QMT 仅支持 Windows；Mac 用户可考虑 Parallels、Boot Camp 或云端 Windows 服务器。
- 学习阶段可先用 QMT 模拟交易环境，不必立即更换券商账户。

## miniQMT 必做工程能力

- 订单状态机：跟踪“未报→已报→部成→全成”等状态，必要时撤单重发。
- 重启恢复：启动时调用 `get_positions()` 对齐真实持仓，避免重复买入。
- 应用层风控：在下单前检查最大亏损、资金上限、黑名单和熔断条件。
- 监控与交互：通过 Streamlit/Web UI 做持仓监控、一键清仓、暂停交易和晨报展示。

## 注意

课程不聚焦高频交易。材料认为 HFT 通常需要 C++/FPGA 等低延迟能力，Python 与大模型更适合中低频趋势、波段、投研和事件驱动工作流。
