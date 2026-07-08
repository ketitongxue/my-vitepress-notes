---
title: "本杰明·格雷厄姆 (Benjamin Graham)"
type: "entity"
tags: ["person"]
created: "2026-07-06"
updated: "2026-07-06"
---

# 本杰明·格雷厄姆 (Benjamin Graham, 1894–1976)

## 概述

美国投资家、哥伦比亚大学教授，被誉为**"价值投资之父"**和**"华尔街的收尸人"**。在大萧条的废墟中，他发明了"捡烟蒂投资法"（Cigar Butt Investing），将投资从直觉艺术变成了可复制的数学公式——因此也被称为**世界上第一个量化交易员**。

> "所有的基本面分析，如果能被标准化为一套'如果…那么…'的规则，它就是量化。格雷厄姆可以说是世界上第一个量化交易员。"

## 核心贡献：捡烟蒂投资法

### 时代背景

1930年代大萧条，1929年大崩盘后道琼斯指数跌去89%。股票像废纸一样没人要。格雷厄姆在废墟中翻找，不看公司愿景，不听CEO故事，只看一样东西：**清算价值**。

### NCAV 公式（量化史上最早的选股因子）

$$NCAV（净流动资产价值）= 流动资产 - 总负债$$

### 格雷厄姆的硬编码算法

| 步骤 | 规则 |
|------|------|
| 1 | 计算公司的 NCAV |
| 2 | **如果** 市值 < NCAV × 66%，**则** 买入 |
| 3 | 如果不满足，不看（不管故事多好） |
| 4 | 分散买入 30–100 只这样的股票 |
| 5 | 股价涨回 NCAV，或持有满两年，卖出 |

### 量化视角拆解

| 量化要素 | 格雷厄姆的做法 |
|---------|-------------|
| **因子** | 低市净率（PB）、低流动资产折扣 |
| **阈值** | 0.66 的安全边际 |
| **风控** | 极度分散（30–100只），靠 [大数定律](/finance/concepts/positive-expected-value) 对冲个股破产风险 |
| **执行** | 只需资产负债表 + 计算器，不需拜访管理层 |

### 业绩

1936–1956年（20年），年化收益率约 **20%**，远超大盘。

## 在量化交易谱系中的定位

格雷厄姆代表**价值路径的起源**——用便宜的价格买入，等待价值回归。

> "巴菲特走的是价值。"

他的方法论是后来 [因子投资](/finance/concepts/factor-investing) 的雏形：NCAV 公式就是最早的价值因子，0.66 的阈值就是最早的因子筛选条件。

## 策略失效与进化

格雷厄姆的烟蒂策略在经济复苏后失效——跌破清算价值的便宜货越来越少。他的学生 [巴菲特](/finance/entities/warren-buffett) 在此基础上迭代，加入了质量因子，开创了价值投资的新范式。参见 [factor-investing](/finance/concepts/factor-investing) 中的因子生命周期部分。

## 相关页面

- [warren-buffett](/finance/entities/warren-buffett) — 格雷厄姆的学生，将价值因子迭代为"价值+质量+成长"
- [factor-investing](/finance/concepts/factor-investing) — 格雷厄姆的 NCAV 是价值因子的起源
- [value-trap](/finance/concepts/value-trap) — 只学格雷厄姆皮毛的散户常犯的错误
- [quant-trading-thinking-paradigm](/finance/concepts/quant-trading-thinking-paradigm) — 价值路径的总框架
- [edward-thorp](/finance/entities/edward-thorp) — 与格雷厄姆同时代但走概率路径的对照

## 待深入

- *Security Analysis* (1934) 和 *The Intelligent Investor* (1949) 的核心方法论
- 格雷厄姆-纽曼公司（Graham-Newman Corporation）的具体运作
- NCAV 策略在现代市场的实证有效性
