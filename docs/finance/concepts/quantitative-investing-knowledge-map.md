---
title: "量化投资知识体系地图"
type: "concept"
tags: ["quantitative-trading","methodology","strategy","backtesting","machine-learning","risk-management"]
created: "2026-06-23"
updated: "2026-06-23"
---

# 量化投资知识体系地图

量化投资可以被组织成一条从“理论—数据—策略—回测—执行—风控—复盘”的流水线。`量化投资系统化学习笔记` 把知识体系拆成量化概述、金融市场机制、经典金融理论、数学统计、技术平台、策略开发流程、高级主题、学习路径和实战案例；`量化交易` 则强调算法、分析、数据、模型和优化的跨学科方法。

## 核心模块

1. **金融市场与理论基础**：交易机制、T+1/T+0、做多做空、订单类型、交易成本、MPT、CAPM、EMH、APT 和期权定价。
2. **数学与统计基础**：概率分布、假设检验、回归、时间序列、线性代数、协方差矩阵、优化理论和统计学习。
3. **数据与工具链**：行情数据、基本面数据、另类数据、Python、Pandas/NumPy、回测平台、实盘接口和数据质量控制。
4. **策略开发**：趋势跟踪、均值回归、统计套利、多因子、事件驱动、高频/算法交易与机器学习策略。
5. **回测评估与实盘**：避免 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions)，用 [quant-performance-attribution](/finance/concepts/quant-performance-attribution) 进行归因和复盘。
6. **AI 与系统工程**：把 [ai-quant-agent-workflow](/finance/concepts/ai-quant-agent-workflow)、[time-series-forecasting-quant-system](/finance/concepts/time-series-forecasting-quant-system) 和 [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) 结合，形成可运行的智能量化系统。

## 学习顺序

先用 [quant-strategy-taxonomy](/finance/concepts/quant-strategy-taxonomy) 建立策略分类，再学习 [factor-investing](/finance/concepts/factor-investing) 与 [active-portfolio-management](/finance/concepts/active-portfolio-management) 的资产定价和组合管理框架；随后用回测和绩效归因验证策略，最后进入实盘执行、风控和系统优化。

## 常见误区

- 把量化理解成单个模型，而不是完整投资流程。
- 只看收益率，不看回撤、换手率、交易成本和风格暴露。
- 只做历史拟合，不做样本外验证和实盘可执行性检查。
- 忽视数据质量、复权、停牌、涨跌停和订单成交约束。
