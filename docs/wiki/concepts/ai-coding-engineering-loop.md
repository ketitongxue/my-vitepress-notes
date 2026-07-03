---
title: "AI 编程工程循环"
type: "concept"
tags: ["ai-coding", "workflow", "planning", "evaluation", "synthesis"]
created: "2026-06-13"
updated: "2026-07-02"
---

# AI 编程工程循环

AI 编程工程循环代表一种转变：从逐条提示式编程，转向人类与智能体共同分解工作、设计方案、实现、测试和审查的显式软件工程工作流。

## 机制

相关方法描述了一个由头脑风暴、规划、TDD 风格实现和代码审查组成的循环。可长期复用的机制不在于某个插件名称，而在于坚持让智能体编程在编辑前后保留工程检查点。

在 [Claude Code](/wiki/entities/claude-code) 中，这个循环通过规划模式、文件定位、项目记忆、子智能体、技能、hooks 和权限体现。这些机制共同工作，避免把智能体当作盲目的代码生成器。

[规范驱动开发](/wiki/concepts/spec-driven-development)为循环提供持久控制面：写下规则，让智能体依据规则执行，依据规则审查，再在发现缺口后更新规则。

[智能体任务简报](/wiki/concepts/agent-task-briefing)为循环提供轻量入口。在智能体编写代码前，人类应说明期望的用户体验、具体解决方案形态、技术约束、明确的非目标和交付标准。对于较大工作，同一份简报可以扩展为设计文档和实现计划。

当人类还不能说清这些字段时，[苏格拉底式规范细化](/wiki/concepts/socratic-spec-refinement)会加入一个前置循环：AI 持续提出结构化问题，直到简报足够完整，可以交给实现步骤。

[Vibe Coding 商业验证](/wiki/concepts/vibe-coding-commercial-validation)增加了一项面向产品的约束：使用 AI 编程开发产品时，循环应优化需求、付费和分发证据，而不只是实现进度。

[开源工具发现](/wiki/concepts/open-source-tool-discovery)加入构建前扫描。在要求智能体重新实现功能或基础设施层之前，检查公开项目中可复用的代码、许可证适配性、维护信号和可运行示例。这让“不要重复造轮子”成为可执行流程，而不再是模糊规则。

[模型能力的公开信号](/wiki/concepts/model-capability-public-signals)加入模型选择前扫描。在围绕某个模型构建前，应检查公开能力信号、置信区间、价格、延迟和提供商可用性，再运行小规模任务专用测试。这样可避免循环围绕模型声誉而不是实际交付约束进行优化。

[产品数据层选择](/wiki/concepts/product-data-layer-selection)加入持久化检查点。在要求智能体增加用户、订单、项目或管理界面前，应确定数据库服务、schema 所有权、迁移工作流和安全管理路径，避免存储成为功能生成过程中的意外副作用。

[AI 产品设计润色工作流](/wiki/concepts/ai-product-design-polish-workflow)加入视觉质量检查点。在发布产品或要求用户评价原型前，利用组件库、参考产品、模板或设计生成工具，把原始功能转化为可信的产品界面。

[AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)加入失败响应循环。产品故障时，采集正确的错误界面，复制准确日志，解释触发操作，让智能体定位文件和行，再在修复后重复同一操作进行验证。

[产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)把循环延伸到本地实现之外。AI 辅助产品需要发布检查表、环境变量纪律、生产日志、域名与 DNS 设置，以及回滚意识，才能从“在我的机器上能运行”变成“用户可以依赖”。

[产品滥用防护](/wiki/concepts/product-abuse-protection)、[AI 产品文件持久化](/wiki/concepts/ai-product-file-persistence)、[产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)、[Serverless 定时任务](/wiki/concepts/serverless-scheduled-jobs)和[产品反馈循环](/wiki/concepts/product-feedback-loop)构成早期运营层：保护昂贵操作、持久保存生成文件、联系用户、运行定时工作，并在发布后采集用户证据。

[产品分析迭代循环](/wiki/concepts/product-analytics-iteration-loop)闭合发布后循环。用户可以访问产品后，智能体辅助工作流应安装测量工具、检查真实行为、依据假设修改产品，再次测量同一信号。

[SDD 规范生命周期](/wiki/concepts/sdd-spec-lifecycle)把实现循环进一步明确为规划、对齐、执行、测试和归档。[SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)决定项目需要多少纪律，而 [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)确保审查发现能够改进未来的记忆、技能、hooks 和规范。

## 为什么重要

用户的职责会提升一个层级：

- 把模糊目标拆解为具体任务。
- 实现前把任务写成[智能体任务简报](/wiki/concepts/agent-task-briefing)。
- 把工作路由到合适的智能体或技能。
- 自定义实现前检查是否可以复用或研究现有开源项目。
- 检查候选模型是否真的足够强、足够便宜，并且对目标任务可用。
- 生成持久化代码前决定产品数据层和迁移路径。
- 要求智能体润色界面前，提供产品设计参考和视觉验收标准。
- 编码项目约束，避免智能体每轮重新发现它们。
- 通过测试、命令或浏览器与 API 检查来验证行为。
- 出现故障时，先采集浏览器和服务端证据，再要求智能体编辑。
- 把部署、域名、环境变量、存储、邮件、定时任务和反馈渠道当作产品需求，而不是发布后的杂务。
- 使用分析、会话录制、热图和漏斗证据决定下一次产品迭代。
- 合并改动前进行审查。
- 只有任务自然拆分为独立或分阶段工作时，才使用[智能体流水线编排](/wiki/concepts/agent-pipeline-orchestration)。
- 对产品工作，先验证用户、付费意愿和获客，再扩展技术完整性。

## 失效模式

- 计划尚不清楚就让智能体开始编写。
- 省略红线或交付标准，迫使智能体自行发明。
- 使用一次性提示，而不是持久的 [Claude Code 记忆文件](/wiki/concepts/claude-code-memory-files)。
- 因生成的解释听起来合理就跳过验证。
- 在未隔离或高风险环境中使用 [Claude Code 权限模型](/wiki/concepts/claude-code-permission-model)的高信任权限。
- 简单技能或记忆规则已能以更低协调开销解决问题时，仍委派给子智能体。
- 把功能完成误认为市场验证。

## 相关内容

- [Claude Code](/wiki/entities/claude-code)
- [Claude Code 扩展系统](/wiki/concepts/claude-code-extension-system)
- [智能体无头执行](/wiki/concepts/agent-headless-execution)
- [规范驱动开发](/wiki/concepts/spec-driven-development)
- [智能体任务简报](/wiki/concepts/agent-task-briefing)
- [苏格拉底式规范细化](/wiki/concepts/socratic-spec-refinement)
- [开源工具发现](/wiki/concepts/open-source-tool-discovery)
- [模型能力的公开信号](/wiki/concepts/model-capability-public-signals)
- [产品数据层选择](/wiki/concepts/product-data-layer-selection)
- [AI 产品设计润色工作流](/wiki/concepts/ai-product-design-polish-workflow)
- [AI 调试错误分诊](/wiki/concepts/ai-debugging-error-triage)
- [产品部署发布工作流](/wiki/concepts/product-deployment-release-workflow)
- [产品滥用防护](/wiki/concepts/product-abuse-protection)
- [AI 产品文件持久化](/wiki/concepts/ai-product-file-persistence)
- [产品邮件投递工作流](/wiki/concepts/product-email-delivery-workflow)
- [Serverless 定时任务](/wiki/concepts/serverless-scheduled-jobs)
- [产品反馈循环](/wiki/concepts/product-feedback-loop)
- [产品分析迭代循环](/wiki/concepts/product-analytics-iteration-loop)
- [SDD 分层采用模型](/wiki/concepts/sdd-layered-adoption-model)
- [SDD 规范生命周期](/wiki/concepts/sdd-spec-lifecycle)
- [AI 知识工程反馈循环](/wiki/concepts/ai-knowledge-engineering-feedback-loop)
