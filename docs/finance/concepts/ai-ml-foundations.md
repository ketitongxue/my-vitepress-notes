---
title: "AI 与机器学习基础"
type: "concept"
tags: ["machine-learning","model-evaluation","methodology"]
created: "2026-07-08"
updated: "2026-07-08"
---

# AI 与机器学习基础

传统量化是人告诉电脑怎么做（写死规则），AI 量化是把历史数据喂给电脑让它自己找规律。AI 不讲逻辑，讲概率；它通过学习海量数据，提取出人类语言无法描述的非线性特征。参见 [quant-trading-thinking-paradigm](/finance/concepts/quant-trading-thinking-paradigm) 中"从猜到算"的思维跃迁。

## 核心思想：概率而非规则

- **方法 A（传统编程/传统量化）**：人类预设线性规则——均线金叉买入、RSI 超卖卖出。
- **方法 B（AI/机器学习）**：把 1 万张猫的图片和 1 万张狗的图片扔给机器，让它自己学。它给出的判断是"感觉像猫"——这个"感觉"就是 AI 提取出的非线性特征。

## 信噪比的诅咒

AI 识别猫狗准确率可达 99%，但预测股价绝无可能达到 90%。如果有人告诉你 AI 模型准确率 90%，请直接报警。

- **图像识别**：像素之间强关联，高信噪比。
- **股票市场**：股价波动 90% 是噪音（随机漫步），只有 10% 是信号。
- **顶级基准**：西蒙斯（[james-simons](/finance/entities/james-simons)）的 AI 预测涨跌准确率也就 53%，足以赚成世界首富。

AI 在股市里就像在嘈杂的迪斯科舞厅里，试图听清角落的悄悄话。它算力强，但噪音太大。

## 被忽略的非线性世界

传统多因子模型（如 Fama-French）假设因子独立且线性：`收益 = a×市值 + b×估值 + c×动量`。但真实世界是非线性的：

- **经济复苏初期**：低 PE 是好事（价值回归）。
- **流动性泛滥末期**：高 PE 才是好事（泡沫炒作）。
- **美联储加息 + 油价大涨**：低 PE 制造业暴跌，高 PE 科技股暴涨。

这种"如果……且……但是……除非……"的纠缠关系超过 3 个变量人脑就处理不了。AI（特别是神经网络）天生擅长此道。**AI 的价值不在于预测点位，而在于捕捉关系。**

## 机器学习三大流派

| 流派 | 角色 | 常用模型 | 应用场景 |
|------|------|----------|----------|
| 监督学习 | 你是老师 | 随机森林、XGBoost、LSTM | 预测收益率、判断公告是否利好 |
| 无监督学习 | 你是观察者 | K-Means 聚类、PCA | **股票画像**——发现行业分类之外的隐形关联 |
| 强化学习 | 你是教练 | AlphaGo 式训练 | 高频交易、订单执行算法 |

无监督学习的经典案例：AI 可能把贵州茅台和某只电力股分到一组，因为它们都是高分红、低波动的类债券资产——这是人类行业分类看不见的关联。

## 最大敌人：过拟合

AI 太聪明，聪明到会死记硬背。量化交易振聋发聩的警句：**"如果你拷打数据的时间足够长，它总会招供的。"**

> 如果一个 AI 模型的回测曲线是一条笔直向上的直线，直接扔进垃圾桶——它一定过拟合了。

防范手段详见 [overfitting-lookahead-bias](/finance/concepts/overfitting-lookahead-bias)：交叉验证、样本外测试、要模糊的正确而非精确的错误。

## 黑箱恐惧与可解释性

传统量化亏了你知道原因（趋势反转）；AI 量化亏了你不知道为什么。神经网络输出 `Buy_Signal = 0.98`，但它无法解释为什么。华尔街推崇**可解释 AI**：

- 使用 **SHAP 值**拆解决策逻辑：动量因子贡献 40%，情绪因子贡献 30%，估值因子差但被动量覆盖。
- 人机协作新范式：人定战略（选因子、控风险、定关机时机），AI 做战术（挖非线性规律、找最优权重）。参见 [centaur-human-ai](/finance/concepts/centaur-human-ai)。

## 三条建议

1. **别神话 AI，把它当工具**——门槛降低后，竞争从写代码变成懂逻辑。你必须比 AI 更懂金融逻辑，才能指挥它。
2. **关注数据质量胜过模型复杂度**——Garbage In, Garbage Out。简单逻辑回归跑在优质数据上，吊跑超级神经网络跑在垃圾数据上。参见 [market-data-quality](/finance/concepts/market-data-quality)。
3. **培养概率思维**——AI 输出永远是一个概率分布。上涨概率 60% 不代表会涨，代表做 100 次会赢 60 次。这正是 [edward-thorp](/finance/entities/edward-thorp) 的思维：AI 是索普的终极武器。

## 相关页面

- [overfitting-lookahead-bias](/finance/concepts/overfitting-lookahead-bias) — 过拟合与未来函数的详细防范
- [centaur-human-ai](/finance/concepts/centaur-human-ai) — 人机协作范式
- [nlp-financial-text](/finance/concepts/nlp-financial-text) — AI 如何读懂金融文本
- [positive-expected-value](/finance/concepts/positive-expected-value) — 概率思维的基础
