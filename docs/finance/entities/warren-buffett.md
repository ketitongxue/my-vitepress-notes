---
title: "沃伦·巴菲特 (Warren Buffett)"
type: "entity"
tags: ["person","fund"]
created: "2026-07-06"
updated: "2026-07-06"
---

# 沃伦·巴菲特 (Warren Buffett, 1930–)

## 概述

美国投资家，伯克希尔·哈撒韦（Berkshire Hathaway）董事长，被誉为"股神"。[格雷厄姆](/finance/entities/benjamin-graham)的学生。在量化视角下，巴菲特不是靠直觉的诗人，而是**顶级的算法工程师**——他将格雷厄姆的单一价值因子迭代为"价值+质量+成长+杠杆"的多因子模型，并用保险浮存金低成本加杠杆，坚持执行了60年。

> "巴菲特其实是一个深度学习模型……所谓的大师直觉，本质上是大脑对海量数据进行模式识别后，沉淀下来的策略因子。巴菲特就是那个时代算力最强、算法最优的生物神经网络。"

## 从格雷厄姆到巴菲特：因子的迭代

| 维度 | 格雷厄姆（捡烟蒂） | 巴菲特（买皇冠） |
|------|------------------|----------------|
| 目标 | 便宜平庸的公司 | 合理价格的伟大公司 |
| 模型 | Score = -Price | Score = -Price + Quality + Growth |
| 因子 | 价值（低PB、低NCAV折扣） | 价值 + 质量（高ROE）+ 成长（护城河）+ 杠杆 |
| 典型标的 | 破产边缘的烟蒂 | 可口可乐、喜诗糖果 |

**转折点：** 巴菲特买入伯克希尔纺织厂（标准烟蒂），因纺织业衰退亏损，促使他在合伙人查理·芒格影响下迭代算法——从"便宜买平庸"转向"合理价买伟大"。

## AQR《巴菲特的阿尔法》(Buffett's Alpha)

AQR（全球顶尖量化对冲基金）的著名论文揭示：**巴菲特的收益完全可以被因子模型解释。** 他并非神，而是长期暴露于四个量化因子：

| 因子 | 巴菲特的做法 |
|------|------------|
| **市场因子 (Market)** | 长期做多美国国运 |
| **价值因子 (Value)** | 偏好低PE、低PB |
| **质量因子 (Quality)** | 高利润率、低波动率、高ROE |
| **杠杆因子 (Leverage)** | 利用保险浮存金低成本加杠杆 |

> 这就好比巴菲特发现了一组"黄金参数"，持之以恒地执行了50年。

该论文在 [因子投资](/finance/concepts/factor-investing) 中有更详细的风格分析实证。

## 在量化交易谱系中的定位

巴菲特继承了格雷厄姆的**价值路径**，但将其进化为多因子模型：

> "巴菲特走的是价值。"

| 巴菲特的做法 | 量化对应 |
|------------|---------|
| 找正期望值因子 | [positive-expected-value](/finance/concepts/positive-expected-value) |
| 分散持仓（早期） | [凯利公式](/finance/concepts/kelly-criterion)的仓位管理 |
| 保险浮存金加杠杆 | 低成本杠杆因子 |
| 60年长期持有 | 大数定律的极致应用 |

## 为什么散户学巴菲特会亏钱

参见 [value-trap](/finance/concepts/value-trap) 的详细分析。核心两个数学错误：

1. **价值陷阱** — 只看低PE，不看盈利趋势。便宜是因为市场预期利润下降。
2. **缺乏大数定律保护** — 资金少却全仓单只股票，违背概率论。

## 相关页面

- [benjamin-graham](/finance/entities/benjamin-graham) — 巴菲特的老师，价值投资的起源
- [factor-investing](/finance/concepts/factor-investing) — 巴菲特方法论的多因子模型视角
- [value-trap](/finance/concepts/value-trap) — 学巴菲特常犯的错误
- [quant-trading-thinking-paradigm](/finance/concepts/quant-trading-thinking-paradigm) — 价值路径的总框架
- [ltcm](/finance/entities/ltcm) — 同样使用杠杆但结局截然不同的对照

## 待深入

- 伯克希尔·哈撒韦从纺织厂到投资帝国的转型细节
- 保险浮存金（Float）的杠杆效应量化分析
- 巴菲特 vs 西蒙斯：价值路径 vs 数据路径的终极对比
