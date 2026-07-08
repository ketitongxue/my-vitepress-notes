---
title: "AI 量化多智能体工作流"
type: "concept"
tags: ["automation","trading-system","machine-learning","data-pipeline","quantitative-trading","strategy"]
created: "2026-06-23"
updated: "2026-07-08"
---

# AI 量化多智能体工作流

生成式 AI 经历三个阶段：Chatbot（知识检索）→ Copilot（辅助工具）→ **Agent（智能体，全自动驾驶）**。课程把量化系统拟人化为一个 AI 投研团队，并用 LangGraph 的 Node 与 Edge 编排流程。该模式把数据、策略、风控、执行分离，降低单体脚本复杂度，并让 [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) 的实盘接口成为团队执行层。

> **Agent = LLM（大模型大脑）+ Memory（记忆）+ Planning（规划）+ Tools（工具使用）**

## ReAct 模式（推理 + 行动）

Agent 之所以能自主工作，核心在于学会了 ReAct（Reasoning + Acting）——一个内心独白的循环，不再是死板的 if-else 脚本。每个 Loop 包含三步：

- **感知（Observation）**：监控环境变化（如财联社推送美联储加息）。
- **思考（Thought）**：利用大模型常识进行逻辑推理（加息 = 利空科技股，持仓有风险）。
- **行动（Action）**：自主调用工具解决问题（调用 `check_portfolio()` 查持仓、调用 `trade_futures()` 做空对冲、发送微信通知）。

它根据环境变化动态调整策略，不需要预设每一种情况。参见 [centaur-human-ai](/finance/concepts/centaur-human-ai) 的三明治工作流。

## Function Calling（工具调用）

这是连接自然语言和量化代码的桥梁。把函数注册给 Agent 后，你只需说"帮我买一万块钱茅台"，Agent 的大脑会：

1. **意图识别**：用户想买股票。
2. **参数提取**：茅台 → 600519.SH，金额 10000。
3. **JSON 输出**：输出标准格式给交易系统执行。

```json
{ "function": "order_target_value", "args": { "symbol": "600519.SH", "amount": 10000 } }
```

你只需定义几十个工具（查研报、算 RSI、画 K 线、下单、撤单），让 Agent 自己组合使用——像拿着瑞士军刀的特种兵。这就是**工具库思维**：把功能拆碎，而非写一个大而全的策略。

## 四个角色

- **Charles 情报官**：负责数据获取、清洗、新闻/舆情监控、RAG 读取财报与公告。
- **Zoe 分析师**：负责回测、指标计算、因子挖掘、策略复现和绩效报告。
- **Kris 风控官**：具有“一票否决权”，检查资金上限、单日最大回撤、黑名单和熔断条件。
- **Ethan 交易员**：负责 XtQuant/QMT 下单、撤单、成交回调和算法拆单。

## 典型流程

1. Charles 扫描新闻、行情和财报，生成情报。
2. Zoe 计算技术面信号、因子得分或机器学习预测概率。
3. Kris 根据 [backtesting-bias-and-frictions](/finance/concepts/backtesting-bias-and-frictions) 与实盘风控规则审核交易。
4. Ethan 通过 [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) 执行订单，并把状态反馈给团队。
5. 系统生成晨报、持仓监控、复盘报告和参数优化建议。

## 技术组件

- **LangGraph**：组织 Node、Edge 和状态共享。
- **MCP/Skill.md**：把本地数据、回测、报告等能力封装成可被大模型调用的工具。
- **RAG**：读取上市公司 PDF 财报与公告。
- **Streamlit/Web UI**：形成 CEO 控制台，支持查看晨报、监控持仓、一键清仓和暂停交易。

## 风险与双重安全锁

AI Agent 工作流不能替代回测、风控和合规。大模型主要利用逻辑能力与输入资料分析，不能依赖模型记忆做交易依据；实时数据、财报和公告应通过 RAG 或 API 提供。

### 核心风险

1. **死循环**：Agent 想买入但挂单没成交，可能陷入"撤单 → 提价 → 还没成交 → 再提价"循环。高频中可能 1 分钟刷光一年手续费，甚至拉涨停（类似 [operational-risk-fat-finger](/finance/concepts/operational-risk-fat-finger)）。
2. **幻觉执行**：LLM 本质是概率模型。可能把"卖出 100 股"幻视成"卖出 100 万股"，把"600519（茅台）"识别成"600518（康美，已退市）"，甚至编造不存在的股票代码。

### 双重安全锁

**第一道锁：确定性校验层（硬代码）**

LLM 输出的 JSON 指令中间必须隔着一层硬代码逻辑检查——不能是 AI 写的，必须是你写死的规则，没有任何商量余地：

- **金额熔断**：`if order_amount > 50000: REJECT`（单笔超 5 万直接驳回）。
- **价格偏离**：`if order_price > current_price * 1.02: REJECT`（买入价偏离现价 2% 驳回，防滑点）。
- **白名单检查**：`if symbol not in stock_pool: REJECT`（不在股票池不许买）。

这层硬代码像物理世界的保险丝——无论 Agent 多聪明多疯狂，触碰红线电流直接切断。

**第二道锁：HITL（Human-in-the-Loop，人类在环）**

通过第一道检查后，对大资金操作，Agent 发消息到手机："老板，我建议买入这 3 只股票，硬代码风控已通过，请批准/拒绝。" 你按批准，才真正发送指令给 QMT。

> **AI 负责 99% 的计算和生成，硬代码负责过滤荒谬错误，人类负责最后 1% 的责任承担。** 这就是 [centaur-human-ai](/finance/concepts/centaur-human-ai) 的半人马模式。

## 核心竞争力转移

Agent 时代，量化交易员的定义正在改变：从写策略（编写数学公式）变为管理员工（设计 Agent 的 Prompt 和工作流）。核心竞争力从代码能力转移到**系统架构能力和对金融本质的理解**。你不再需要研究怎么算 MACD（Agent 自带工具包），而是研究怎么设计更聪明的风控 Agent 拦住激进的交易 Agent。

## 相关页面

- [centaur-human-ai](/finance/concepts/centaur-human-ai) — 人机协作范式
- [operational-risk-fat-finger](/finance/concepts/operational-risk-fat-finger) — AI 幻觉循环与防弹衣代码
- [nlp-financial-text](/finance/concepts/nlp-financial-text) — Agent 如何编排 NLP 工具
- [qmt-miniqmt-trading-system](/finance/concepts/qmt-miniqmt-trading-system) — Agent 的执行层
- [overfitting-lookahead-bias](/finance/concepts/overfitting-lookahead-bias) — Agent 策略的回测验证
