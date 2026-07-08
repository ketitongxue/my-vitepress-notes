---
title: "市场数据质量与量化数据洁癖"
type: "concept"
tags: ["data","data-pipeline","backtesting","risk-management","quantitative-trading"]
created: "2026-07-06"
updated: "2026-07-06"
---

# 市场数据质量与量化数据洁癖

## 核心定义

市场数据质量是量化交易的地基。模型再复杂，若输入数据存在缺失、复权错误、幸存者偏差、时间戳错误，结果也会失真。

> Garbage In, Garbage Out。一个微小的数据错误，经过高杠杆和高频交易的放大，足以导致整个基金破产。

## 西蒙斯的数据洁癖

[西蒙斯](/finance/entities/james-simons)早期做量化时，互联网尚未普及。为了获得高质量历史数据，他派人去美联储地下室、图书馆旧纸堆，人工记录100年前的棉花价格、大豆库存、国债收益率。

文艺复兴科技的博士新员工，前六个月可能都在清洗数据。哪怕拥有斯坦福物理学背景，也必须先保证喂给机器的每一口“饲料”是干净的。

## 典型数据质量问题

| 问题 | 量化后果 | 检查方式 |
|------|----------|----------|
| 缺失数据 | 将交易所休市误判为价格停滞或信号缺失 | 区分节假日、停牌、数据漏写 |
| 拆股/除权除息未处理 | 把机械价格调整误判为暴跌/暴涨 | 使用前复权/后复权并记录复权规则 |
| 时间戳不一致 | 引入未来函数或错配信号 | 明确收盘价是15:00还是16:00，所有数据对齐到可交易时点 |
| 幸存者偏差 | 回测只包含活下来的股票，收益虚高 | 纳入退市股票、历史成分股 |
| 成交约束缺失 | 回测成交价不可实现 | 加入成交量、涨跌停、滑点、手续费限制 |

这些问题与 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) 直接相连。

## 为什么数据质量是护城河

算法可以复制，公开论文可以复现，但高质量历史数据难以复制：

1. **长历史** — 更长的历史样本能识别罕见状态。
2. **清洗细节** — 缺失、复权、异常值、时间戳规则决定回测真实性。
3. **专有数据** — 另类数据、微结构数据、订单簿数据构成差异化优势。
4. **持续维护** — 数据源会漂移，字段定义会变，交易所规则会变。

后来者即使拿到同样算法，如果数据充满噪声和错误，结果也会天壤之别。

## AI/QMT 实践检查清单

当用 Cursor 写 QMT 或 Python 回测代码时，至少检查：

- [ ] 是否包含退市股票，避免幸存者偏差？
- [ ] 是否处理除权除息/前复权？
- [ ] 是否处理停牌、涨跌停、无法成交？
- [ ] 是否区分真实缺失与交易所休市？
- [ ] 信号使用的数据在交易时点是否已经可见？
- [ ] 手续费、滑点、最小成交单位是否纳入？
- [ ] 数据源是否有版本记录，便于未来复现实验？

## 与黑箱模型的关系

[black-box-correlation-models](/finance/concepts/black-box-correlation-models) 尤其依赖数据质量。因为黑箱模型可能从任何细小模式中学习，一旦数据存在系统性错误，模型很可能学到“数据供应商的错误”而不是“市场的规律”。

## 相关页面

- [james-simons](/finance/entities/james-simons) — 数据洁癖是大奖章基金护城河的一半
- [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) — 数据偏差与交易摩擦的系统清单
- [time-series-forecasting-quant-system](/finance/concepts/time-series-forecasting-quant-system) — 时间序列系统的数据工程
- [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) — QMT实盘/回测接口中的数据处理
- [black-box-correlation-models](/finance/concepts/black-box-correlation-models) — 黑箱模型为什么更怕脏数据
