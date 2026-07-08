---
title: "量化策略流派分类"
type: "concept"
tags: ["strategy","quantitative-trading","alpha","machine-learning","statistics"]
created: "2026-06-23"
updated: "2026-07-08"
---

# 量化策略流派分类

课程覆盖多种策略流派，目标是避免迷信单一指标，而是形成可组合的策略武器库。策略研究应先经过 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) 检验，再纳入 [ai-quant-agent-workflow](/finance/concepts/ai-quant-agent-workflow) 的执行闭环。

## 主要流派

| 流派 | 课程示例 | 核心思想 | 适用市场 |
|---|---|---|---|
| 趋势跟踪 | [海龟法则](/finance/concepts/strategy-trio-trend-grid-momentum)、唐奇安通道、ATR 加仓、考夫曼自适应均线 | 高买更高卖，截断亏损让利润奔跑，低胜率高盈亏比 | 趋势明显的行情 |
| 结构/形态 | [缠论量化](/finance/concepts/changlun-quantitative)、笔、线段、中枢、背驰、三类买卖点 | 分形递归 + 动量衰竭判断 | 技术结构清晰的品种 |
| 统计/均值回归 | [统计套利](/finance/concepts/statistical-arbitrage)、[网格交易](/finance/concepts/strategy-trio-trend-grid-momentum)、多因子、小市值轮动 | 利用震荡或横截面差异获取收益 | 震荡市或选股场景 |
| 动量/轮动 | [截面动量](/finance/concepts/strategy-trio-trend-grid-momentum)、板块轮动、打板策略 | 强者恒强，去弱留强 | 有明显主线或热点的行情 |
| 机器学习 | [XGBoost/LightGBM](/finance/concepts/ai-ml-foundations)、Transformer、[多模态视觉](/finance/concepts/vision-multimodal-kline) | 从"看指标"升级为"看概率"、非线性因子 | 有足够样本与稳定特征时 |
| 论文复现/策略进化 | Paper-to-Code、遗传/优胜劣汰式参数优化 | 将研究结论转成代码，并用目标函数迭代 | 研究驱动策略开发 |

## 机器学习因子

材料提到可将 Talib 的大量技术指标作为特征，用 XGBoost/LightGBM 训练次日涨跌概率，产出“上涨概率因子”。这类方法需要特别注意样本外验证、过拟合、交易成本和标签泄漏。

## 与 AI 投研的关系

AI 不只用于预测价格，也可用于 RAG 财报阅读、舆情事件抽取、研报生成和策略代码复现。策略信号最终仍应由 [quant-performance-attribution](/finance/concepts/quant-performance-attribution) 与真实交易约束评估。


## Bulk ingest cross-reference

Additional ingested sources connect this page to [quantitative-investing-knowledge-map](/finance/concepts/quantitative-investing-knowledge-map), [factor-investing](/finance/concepts/factor-investing), [active-portfolio-management](/finance/concepts/active-portfolio-management), and [quantitative-trading-algorithms-data-models-optimization](/finance/concepts/quantitative-trading-algorithms-data-models-optimization). These pages provide broader context from systematic learning notes, factor investing methodology, and active portfolio management.
