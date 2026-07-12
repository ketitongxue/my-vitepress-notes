# 公开版 LLM Wiki Skill 发布设计说明

日期：2026-07-12

## 目标

把当前用于构建和维护 LLM Wiki 知识库的方法沉淀为一个可公开安装、审计和复用的 Agent Skill。公开源码由独立 GitHub 仓库 `ketitongxue/llm-wiki-skill` 维护，个人网站只介绍工作原理、从零构建过程和安装方法，并链接到 GitHub 源码及 Release，不复制 Skill 源码或发布包。

本设计同时保证现有本机 `llm-wiki` Skill、个人知识库和网站发布流程不因公开版本而改变。

## 范围

本次包含：

- 创建公开仓库 `ketitongxue/llm-wiki-skill`，作为公开版 Skill 的唯一源码。
- 发布经过脱敏和通用化的 `SKILL.md`、说明文档、模板、参考资料、脚本和测试。
- 使用 MIT License，并以 `CHANGELOG.md` 记录公开版本变化。
- 通过 GitHub Releases 发布 `v1.0.0` 的 ZIP 包和 SHA256 校验文件。
- 在个人网站新增 LLM Wiki Skill 主页、原理、构建和安装四个页面。
- 在网站顶部“工具”导航和首页增加 LLM Wiki Skill 入口。
- 对公开包执行可复现打包、敏感信息扫描、结构校验和安装验证。

本次不包含：

- 把现有本机 Skill 直接公开或迁移到新仓库。
- 公开个人知识库正文、原始资料、内部日志、绝对路径、域名、账号或密钥。
- 在网站仓库保存公开 Skill 源码、Release ZIP 或 SHA256 副本。
- 为所有 Agent 平台承诺完全相同的自动发现、权限模型或工具行为。
- 提供未经审计的 `curl | sh`、远程脚本执行或自动覆盖现有 Skill 的安装方式。
- 修改现有知识库检索、问答额度、Cloudflare Worker 或网站部署策略。

## 仓库职责与唯一来源

### `ketitongxue/llm-wiki-skill`

公开仓库是下列内容的唯一来源：

- Skill 指令和行为约定。
- 通用知识库模板。
- 跨 Agent 兼容性说明。
- 初始化、检查和打包脚本。
- 自动化测试。
- 版本号、变更记录和 Release 产物。
- Issues、贡献讨论和安全问题入口。

建议目录：

```text
llm-wiki-skill/
├── SKILL.md
├── README.md
├── LICENSE
├── CHANGELOG.md
├── templates/
│   ├── SCHEMA.md
│   ├── purpose.md
│   ├── index.md
│   └── log.md
├── references/
│   ├── agent-compatibility.md
│   ├── ingest-workflow.md
│   ├── lint-checklist.md
│   └── publishing-example.md
├── scripts/
└── tests/
```

### `ketitongxue/my-vitepress-notes`

网站仓库只负责：

- 解释 LLM Wiki 的基本原理和适用边界。
- 展示从零构建、导入、连接、检查和维护知识库的过程。
- 提供公开版 Skill 的安装和使用指南。
- 链接公开仓库、固定版本 Release 和最新版下载页面。
- 在导航和首页提供稳定的发现入口。

网站不镜像 `SKILL.md`、模板、脚本或 ZIP。需要展示的短小命令和示例由网站文章维护，并明确其对应版本；完整且可能变化的细节链接到公开仓库。这样可以避免两个仓库出现不同的 Skill 内容或版本。

## 公共版与私人版边界

公开版从现有方法中提取通用能力，但不是本机版本的逐文件复制。

公开版保留：

- Raw / Wiki / Schema 三层知识组织模型。
- `purpose.md`、`SCHEMA.md`、`index.md` 和 `log.md` 的职责与模板。
- 从来源采集到机制页、Hub、双向链接和索引维护的工作流。
- 查询、检查、冲突处理和增量维护原则。
- 本地文件系统上的显式、可审计操作。
- 可选的网站发布示例，但不绑定特定域名、账户或仓库。

公开版删除或泛化：

- 用户主目录或其他私人绝对路径。
- 个人知识库目录、文章内容、原始资产和内部维护记录。
- GitHub 用户、Cloudflare 账户、Worker、域名、API Token 和 Secret 名称。
- `my-vitepress-notes` 专属的同步、策展、侧栏和部署约束。
- Telegram、Hermes 或其他个人自动化集成。
- 本机特殊权限、已批准命令和个人偏好。

本机 Skill 继续独立运行，并可以包含个人网站发布规则。公开仓库的更新不会自动覆盖本机版本；如需吸收公开版改进，应经过人工比较和明确合并。

## Skill 功能模型

公开 Skill 覆盖五类核心任务：

1. 初始化：创建知识库骨架、Purpose、Schema、双语或单语索引和维护日志。
2. 采集：保存来源，提炼可复用机制，建立 Hub、概念页和双向链接。
3. 查询：优先遍历索引和链接网络，引用已有页面，并指出知识缺口。
4. 检查：验证 Frontmatter、链接、索引覆盖、日志顺序、孤立页和敏感信息。
5. 维护：增量更新现有机制页，处理冲突，记录变更并保持知识结构一致。

网站发布属于参考流程，不是核心运行时依赖。没有 VitePress、GitHub 或 Cloudflare 的用户仍可完整使用初始化、采集、查询、检查和维护能力。

## 通用 Agent 兼容边界

公开包以标准 Markdown 指令、相对路径和普通文件操作为基础。兼容性分为三层：

- 原生 Skill 兼容：支持读取 `SKILL.md` 并按目录发现 Skill 的 Agent，可直接安装到各自规定的 Skill 目录。
- 手动指令兼容：不支持自动发现但能够读取本地文件的 Agent，可把 `SKILL.md` 作为项目指令或上下文手动加载。
- 方法兼容：没有本地工具权限的聊天模型只能参考流程，不能承诺完成落盘、链接检查或发布。

公开文档必须说明：

- Codex 示例路径仅是一个已验证的安装方式，不代表通用标准。
- 其他 Agent 的目录、Frontmatter、触发规则、工具权限和上下文长度可能不同。
- Agent 必须在用户明确授权的知识库范围内读写，不应自行扩大路径或发布范围。
- 涉及网络抓取、安装依赖、创建仓库、推送或发布时，仍受宿主平台权限和用户确认约束。
- 自动化效果取决于 Agent 的文件系统、Shell、浏览器和网络能力，Skill 不绕过这些边界。

## 网站信息架构

网站新增四个稳定路由：

```text
/llm-wiki/
/llm-wiki/principles
/llm-wiki/build
/llm-wiki/install
```

### Skill 主页 `/llm-wiki/`

- 说明 Skill 解决的问题、适用对象和核心能力。
- 展示 Raw / Wiki / Schema 的简要结构。
- 显示当前文档对应的公开版本。
- 提供“查看 GitHub 源码”“查看最新 Release”和“开始安装”三个入口。
- 明确公开仓库是唯一源码，网站不托管安装包。

### 原理页 `/llm-wiki/principles`

- 解释从资料收藏到知识复利的转变。
- 说明为什么优先维护机制页和 Hub，而不是逐来源摘要。
- 解释人负责方向、筛选和判断，Agent 负责结构化、互链和一致性检查。
- 比较 LLM Wiki 与临时搜索、长上下文和 RAG 的边界。
- 注明该方法受到 Andrej Karpathy 的 LLM Wiki pattern 启发，并区分启发来源与本 Skill 的具体实现。

### 构建页 `/llm-wiki/build`

- 从空目录开始建立 Purpose、Schema、Index 和 Log。
- 说明 Raw / Wiki / Schema 三层目录职责。
- 演示导入一份来源、创建机制页、补充双向链接、更新索引和日志。
- 说明 lint、冲突、孤立页、敏感信息和增量维护策略。
- 使用通用占位路径和虚构示例，不暴露个人知识库内容。

### 安装页 `/llm-wiki/install`

- 提供 Git clone、下载 GitHub Release ZIP 两种可审计安装方式。
- 提供 SHA256 校验和手动解压示例。
- 说明 Codex 的已验证目录以及其他 Agent 的手动加载方式。
- 提供初始化、采集、查询和检查的自然语言示例。
- 链接完整兼容说明、版本说明和安全策略。

顶部导航在“工具”下加入“LLM Wiki Skill”，首页增加简短产品入口。两个入口均先进入网站 Skill 主页，使读者理解用途后再前往 GitHub。

## 版本与 Release 设计

首个公开版本为 `v1.0.0`。版本号同时体现在：

- Git tag `v1.0.0`。
- `CHANGELOG.md`。
- Release 标题和说明。
- ZIP 顶层目录或包内版本元数据。
- 网站 Skill 主页的文档对应版本。

Release 附件：

```text
llm-wiki-skill-v1.0.0.zip
SHA256SUMS.txt
```

ZIP 解压后必须得到单一顶层目录 `llm-wiki/`，其中 `SKILL.md` 位于顶层，便于安装到 Agent 的 Skill 根目录。压缩包不包含 `.git`、测试缓存、系统元数据、软链接或开发环境文件。

安装文档优先链接固定版本 Release，另提供 GitHub 的 Latest Release 页面用于发现新版。网站不把 Latest Release URL 当成不可变构建依赖。

## 可复现打包

Release 包由仓库内脚本从明确的允许列表生成，而不是直接压缩工作目录。打包过程要求：

- 文件集合、顶层目录、路径分隔符和排序固定。
- 文件权限归一化；普通文件不可携带可执行权限，必要脚本显式列入可执行允许列表。
- 时间戳归一化到固定值或基于版本提交确定的值。
- 文本换行和编码固定为 UTF-8/LF。
- ZIP 不包含绝对路径、`..`、软链接、设备文件或隐藏缓存。
- 在干净环境中连续打包两次，产物 SHA256 完全一致。
- `SHA256SUMS.txt` 由最终 ZIP 生成，并与 GitHub Release 附件一致。

Release 工作流只从受保护的版本 tag 或明确批准的提交运行。工作流生成产物后执行全部测试，校验通过才允许上传 Release。

## 安全与隐私检查

公开仓库和 Release 在发布前执行以下检查：

- 扫描用户名、邮箱、主目录、绝对路径、个人域名、仓库名、账户 ID 和内部服务名。
- 扫描 API Key、Token、Secret、私钥、Cookie、环境变量值和常见凭据格式。
- 检查 Git 历史，避免只从当前文件删除而旧提交仍包含敏感内容。
- 校验所有模板只包含虚构值和明确占位符。
- 校验 ZIP 项目名，拒绝路径穿越、绝对路径、重复覆盖和软链接。
- 解压到临时空目录，再次扫描解压结果并验证 `llm-wiki/SKILL.md` 存在。
- 检查 Markdown 相对链接、Frontmatter、脚本权限和许可证覆盖。
- 使用干净的临时 HOME 做一次 Codex 发现测试，并记录其他 Agent 仅为文档级兼容。

如果扫描命中无法确认的内容，Release 默认失败，由维护者人工判断；不能以忽略规则绕过未知凭据命中。

## 两个仓库的实施顺序

实施按依赖顺序分两阶段进行。

### 第一阶段：公开 Skill 仓库

1. 从经过审计的空仓库开始，不复制私人仓库 Git 历史。
2. 编写通用化 `SKILL.md`、README、MIT License、CHANGELOG、模板和参考文档。
3. 实现初始化、检查、打包脚本与自动化测试。
4. 完成敏感信息、兼容性、安装和可复现构建验证。
5. 创建 `v1.0.0` tag 和 GitHub Release，上传 ZIP 与 SHA256。
6. 从公开 Release 执行一次全新安装和最小知识库初始化验收。

### 第二阶段：网站仓库

1. 仅在公开仓库和 `v1.0.0` Release 可访问后编写四个网站页面。
2. 页面链接固定的仓库、Release、下载和校验文件地址。
3. 增加顶部工具导航和首页入口。
4. 运行站点测试、链接检查、VitePress 构建和 Cloudflare dry-run。
5. 通过网站 PR 合并到 `main`，等待 Cloudflare 生产部署。
6. 在线验证四个路由、GitHub 链接和下载校验流程。

先发布 Skill 再发布网站，可防止网站出现指向不存在仓库、Release 或附件的死链接。两个仓库各自使用独立 PR 和提交历史，不在一个提交中跨仓库混合变更。

## 失败处理与回滚

### 公开仓库失败

- 脱敏、测试或可复现构建失败时，不创建 tag 和 Release。
- Release 附件上传不完整时，将该 Release 保持为草稿或删除失败附件，修复后使用新构建重新发布；已经公开且内容错误的版本不静默替换，使用补丁版本更正。
- 发现敏感信息时立即停止发布；若已经进入 Git 历史，应撤销暴露的凭据、净化历史并记录安全处理，而不是只新增删除提交。
- 新版本兼容性回归时保留旧 Release，不让 Latest Release 链接替代网站已记录的稳定版本。

### 网站失败

- 在公开 Release 未就绪前不合并网站 PR。
- 构建或链接检查失败时保持 PR 未合并，公开仓库不受影响。
- Cloudflare 部署失败时继续由上一个 `main` 版本提供服务，修复后重新走 PR。
- 页面上线后发现错误链接或误导性兼容声明时，用网站补丁 PR 修复；若影响安装安全，临时移除下载按钮但保留原理文档。
- 网站回滚不删除 GitHub Release；公开 Skill 回滚也不要求回滚不依赖该版本的网站原理文章。

## 测试与验收

公开仓库验收：

- `SKILL.md`、README、MIT License、CHANGELOG、templates、references、scripts 和 tests 均存在。
- Skill Frontmatter、相对链接、模板结构和脚本行为通过测试。
- 私人路径、配置、域名、仓库和凭据扫描无命中。
- 连续打包两次得到相同 SHA256。
- ZIP 项目安全检查通过，并能在干净临时目录解压。
- Codex 能在记录的目录发现 `llm-wiki/SKILL.md`。
- `v1.0.0` Release 同时提供 ZIP 和匹配的 `SHA256SUMS.txt`。

网站仓库验收：

- 四个 `/llm-wiki/` 路由可构建且互相导航完整。
- 顶部“工具”和首页均能进入 Skill 主页。
- 源码、固定版本 Release、最新版 Release、ZIP 和 SHA256 链接有效。
- 网站仓库不包含公开 Skill 源码或 Release 二进制副本。
- 文档明确公共/私人边界和通用 Agent 兼容边界。
- 桌面和手机布局、深浅主题、键盘焦点和链接文本通过检查。
- 完整站点测试、VitePress 构建、安全扫描和 Cloudflare dry-run 通过。

## 成功标准

- `ketitongxue/llm-wiki-skill` 成为公开版 Skill 的唯一可信源码。
- 用户能阅读原理、从零构建知识库，并从 GitHub Release 验证和安装 `v1.0.0`。
- 公开源码、Git 历史和 Release 不包含个人或敏感信息。
- 公开包能够可复现构建，ZIP 与 SHA256 对应且结构安全。
- 网站只承担介绍和导航职责，不产生第二份 Skill 实现。
- 本机 `llm-wiki` Skill、个人知识库和既有网站发布流程保持不变。
