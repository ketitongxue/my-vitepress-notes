---
title: "长期资本管理公司 (LTCM) 崩塌"
type: "entity"
tags: ["fund","risk-management","methodology"]
created: "2026-07-06"
updated: "2026-07-08"
---

# 长期资本管理公司 (LTCM) 崩塌 (1998)

## 概述

长期资本管理公司（Long-Term Capital Management, LTCM）是量化交易史上最著名的**风险管理失败案例**。一个由诺贝尔奖得主和顶尖量化人才组成的团队，在短短几年内实现了卓越收益，又在 1998 年的几个月内亏损超过 40 亿美元，最终触发美联储组织救助。LTCM 的故事是每一个量化交易者的风险意识必修课。

## 关键事实

| 维度 | 细节 |
|------|------|
| 成立 | 1994 年，由 John Meriwether（前所罗门兄弟债券套利部门负责人）创立 |
| 核心人物 | Myron Scholes、Robert C. Merton（1997年诺贝尔经济学奖得主）|
| 策略 | 固定收益套利、相对价值交易 |
| 杠杆 | 高达 25:1 至 100:1 |
| 崩塌触发 | 1998 年俄罗斯债务违约 → 全球流动性危机 |
| 损失 | 约 46 亿美元（数月内） |
| 结局 | 美联储组织 14 家华尔街银行出资 36 亿美元救助 |

## 失败原因（量化视角）

1. **模型假设失效：** 正态分布假设低估了尾部风险；历史相关性在极端事件中崩溃。
2. **过度杠杆：** 微小的策略优势被巨大杠杆放大，一旦方向逆转，损失不可控。
3. **流动性枯竭：** 危机中无法平仓，被迫持有亏损头寸。
4. **黑天鹅事件：** 俄罗斯违约是模型训练数据中从未出现过的场景。

## 对量化交易的教训

> "一群诺贝尔奖得主，拥有当时地球上最顶尖的大脑，却在短短几个月内输掉了40亿美元。是什么样的黑天鹅击穿了天才的防线？这将是你风险意识最深刻的一课。"

| 教训 | 对应实践 |
|------|---------|
| 尾部风险不可忽视 | 压力测试、极端情景分析 |
| 杠杆是双刃剑 | 严格仓位管理（参见 [edward-thorp](/finance/entities/edward-thorp) 的凯利公式） |
| 相关性会崩溃 | 动态相关性监控，不依赖历史静态值 |
| 流动性不是免费的 | 在回测中加入流动性约束（参见 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions)） |
| 模型不是万能的 | 理解模型假设的边界条件 |

## 相关页面

- [quant-trading-thinking-paradigm](/finance/concepts/quant-trading-thinking-paradigm) — LTCM 作为风险教训出现在思维范式框架中
- [quant-performance-attribution](/finance/concepts/quant-performance-attribution) — 回撤归因与风险暴露分析
- [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) — 回测中如何模拟极端场景

## 待深入

~~本课程后续将复盘 LTCM 案例。待补充：具体的交易策略细节、Daily VaR 模型的缺陷、与 2008 金融危机的比较。~~

**第23讲已补充以下内容：**

### 收敛套利（Convergence Arbitrage）

LTCM的核心策略：寻找理论上应该收敛但当前利差偏大的债券对。

| 操作 | 具体做法 |
|------|---------|
| 做空贵的 | A债券（如美国国债，收益率5%） |
| 做多便宜的 | B债券（如同期限企业债，收益率5.5%） |
| 利润 | 利差从0.5%回归到历史均值0.3%时赚0.2% |

问题：0.2%利润太薄 → **加25-100倍杠杆** → 变成"捡硬币的推土机"。

### 正态分布陷阱（VaR模型的致命假设）

LTCM迷信VaR模型，核心假设是金融市场波动服从正态分布。模型算出：10个标准差事件 = 几百亿年才发生一次 → "宇宙毁灭前基金都不会破产"。

**真相：金融市场是尖峰肥尾分布。**正态分布里几亿年一次的黑天鹅，在金融市场每隔十年发生一次。

### 1998年：相关性 → 1

俄罗斯国债违约后，恐慌资金"逃向质量"：
- LTCM做多的资产（俄罗斯债、新兴市场债、垃圾债）全部暴跌
- LTCM做空的资产（美国国债）暴涨
- 利差不仅没收敛，反而**扩大到历史极值**

**量化史最深刻教训：在危机时刻，所有相关性都会趋向于1。**平时分散的资产在极度恐慌时全部同方向运动，分散化投资组合瞬间变成"铁索连环船"。

### 相关页面

- [fat-tail-and-convergence-arbitrage](/finance/concepts/fat-tail-and-convergence-arbitrage) — 肥尾效应与收敛套利的深度分析
- [kelly-criterion](/finance/concepts/kelly-criterion) — 杠杆的数学约束（25:1杠杆 = 必然毁灭）
- [operational-risk-fat-finger](/finance/concepts/operational-risk-fat-finger) — 另一类量化灾难：操作风险
- [flash-crash-liquidity](/finance/concepts/flash-crash-liquidity) — 流动性消失的微观机制
