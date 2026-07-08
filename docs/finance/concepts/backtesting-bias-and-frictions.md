---
title: "回测偏差与交易摩擦"
type: "concept"
tags: ["backtesting","quantitative-trading","risk-management","strategy","model-evaluation"]
created: "2026-06-23"
updated: "2026-06-23"
---

# 回测偏差与交易摩擦

课程强调：好的回测引擎必须遵循“只见过去，不见未来”的信息隔离原则，并把真实交易摩擦纳入结果，否则策略容易成为“模拟盘股神，实盘韭菜”。它是 [ai-quant-trading-learning-path](/finance/concepts/ai-quant-trading-learning-path) 中最基础的质量控制环节，也是 [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) 落地前必须验证的部分。

## 未来函数的典型来源

1. **行情数据穿越**：例如用当天收盘价决定当天开盘买入。修正方式是使用 T-1 数据指导 T 日交易，或只使用当前时刻之前的 Tick/分钟数据。
2. **财务数据抢跑**：不能按报告期直接使用财报数据，必须按公告日索引；在公告前，回测引擎不能“看到”这份财报。
3. **幸存者偏差**：不能只用当前指数成分股回测，应使用动态历史成分股，恢复当时真实股票池。

## 必须纳入的交易摩擦

- **佣金与印花税**：材料给出的示例是买入佣金万分之三，卖出印花税千分之一加佣金万分之三；高换手策略可能被成本吞噬。
- **滑点**：下单看到的价格与实际成交价可能存在差异，打板和追涨策略尤其需要更高滑点假设。
- **涨跌停与停牌**：涨停买不进、跌停卖不出、停牌无法交易；专业引擎应处理这些历史状态。
- **最小成交单位**：A 股买入必须是 100 股整数倍，代码中需按手数取整。

## 实践含义

回测不是证明策略赚钱，而是排除明显错误：如果忽略成本、未来函数和交易限制，策略结果通常会严重高估。后续的 [quant-performance-attribution](/finance/concepts/quant-performance-attribution) 应继续用收益归因、回撤归因和换手率检查策略质量。


## Bulk ingest cross-reference

Additional ingested sources connect this page to [quantitative-investing-knowledge-map](/finance/concepts/quantitative-investing-knowledge-map), [factor-investing](/finance/concepts/factor-investing), [active-portfolio-management](/finance/concepts/active-portfolio-management), and [quantitative-trading-algorithms-data-models-optimization](/finance/concepts/quantitative-trading-algorithms-data-models-optimization). These pages provide broader context from systematic learning notes, factor investing methodology, and active portfolio management.
