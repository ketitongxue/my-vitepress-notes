---
title: "因子投资"
type: "concept"
tags: ["alpha","quantitative-trading","strategy","statistics","portfolio","machine-learning"]
created: "2026-06-23"
updated: "2026-07-06"
---

# 因子投资

因子投资是在统一视角下解释资产收益差异、构建选股/配置模型并获取超额收益的方法。`因子投资：方法与实践` 的内容简介称其体系化介绍因子投资基础、方法论、主流因子、多因子模型、异象研究、因子研究现状和因子投资实践，并针对中国 A 股市场给出可复制的因子实证分析。

## 历史起源：从格雷厄姆到法玛

因子投资并非凭空诞生，它有一条清晰的思想演进路线——**从手工选股公式到学术因子模型**。

### 第一代：格雷厄姆的 NCAV 因子（1930s）

[格雷厄姆](/finance/entities/benjamin-graham)的捡烟蒂策略是量化史上最早的选股因子：
- **因子：** 市值 < NCAV × 66%（净流动资产价值折扣）
- **本质：** 极端的价值因子 + 安全边际阈值
- **局限：** 随市场有效性提升而失效（因子生命周期）

### 第二代：巴菲特的多因子迭代（1960s+）

[巴菲特](/finance/entities/warren-buffett)在格雷厄姆的价值因子基础上加入了**质量因子**和**成长因子**：

| 模型 | 公式 |
|------|------|
| 格雷厄姆 | Score = -Price |
| 巴菲特 | Score = -Price + Quality + Growth |

AQR 论文《巴菲特的阿尔法》证实：巴菲特的收益可被四个因子完全解释（市场、价值、质量、杠杆）。

### 第三代：Fama-French 三因子模型（1992）

尤金·法玛和肯尼斯·弗伦奇将"价值投资"形式化为学术因子模型：

| 因子 | 含义 | 对应直觉 |
|------|------|---------|
| **市场 (Market)** | 大盘系统性风险 | 大盘涨你也涨 |
| **规模 (Size)** | 小盘股溢价 | 流动性补偿 |
| **价值 (Value)** | 高账面市值比股票溢价 | 格雷厄姆的"便宜股" |

后来进化为五因子（加入盈利、投资风格因子）和六因子（加入动量因子）。

### 现代视角：因子投资的本质

> 在现代量化交易中，"我在做价值投资" = **"我在做多因子选股策略，并给予价值因子较高的权重。"**

AI 时代更进一步：XGBoost、Transformer 挖掘的是**非线性因子**——同一个因子在不同市场状态下权重不同（如牛市初期低PE有效，末期高PE有效，通胀>5%时低PE失效）。参见 [value-trap](/finance/concepts/value-trap)。

## 研究方法

该书前言明确把因子研究方法作为核心，包括：

- **投资组合排序法**：按因子暴露分组，比较组合收益差异。
- **Fama-MacBeth 回归**：横截面回归检验因子风险溢价。
- **Newey-West 调整**：处理时间序列相关和异方差影响。
- **广义矩估计（GMM）**：用于更一般的资产定价检验。

这些方法与 [active-portfolio-management](/finance/concepts/active-portfolio-management) 的预期收益、风险和信息率框架互补：因子研究产生 alpha 信号，组合管理决定如何把信号转化成持仓。

## 实证主题

- A 股市场中不同风格因子和市场异象的长期表现。
- 多因子模型如何整合估值、动量、质量、规模、盈利、投资等因子。
- 多重假设检验会放大“挖掘因子/异象”的伪发现风险。
- 行为金融学和机器学习为因子研究提供扩展视角。
- Smart Beta 是因子投资在指数化/产品化上的常见实践。

## 实践含义

因子不是越多越好。实务中需要处理因子共线性、换手率、交易成本、行业/风格暴露、样本外稳定性和容量约束。因子策略应先纳入 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) 检查，再通过 [quant-performance-attribution](/finance/concepts/quant-performance-attribution) 判断收益来自因子 alpha、市场 beta 还是偶然风格暴露。

## 相关页面

- [quant-strategy-taxonomy](/finance/concepts/quant-strategy-taxonomy)：因子策略在量化策略分类中的位置。
- [active-portfolio-management](/finance/concepts/active-portfolio-management)：主动组合如何使用 alpha、风险模型和约束。
- [quantitative-investing-knowledge-map](/finance/concepts/quantitative-investing-knowledge-map)：完整量化学习路径。
