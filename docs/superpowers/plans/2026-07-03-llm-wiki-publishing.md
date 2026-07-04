# LLM Wiki 中文发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `llm_wiki` 的 42 篇公开知识页安全地翻译并发布为 VitePress 中文知识库，并提供可重复的增量同步与校验流程。

**Architecture:** 外部 Wiki 是只读唯一知识源。Node.js 同步工具扫描允许目录、计算 SHA-256 并生成本地待处理报告；中文页面和不含本地路径的清单提交到网站仓库。独立校验器阻止原始来源、绝对路径、未转换 Wikilink、断链和未完成翻译进入构建。

**Tech Stack:** Node.js ESM、Node 内置测试运行器、VitePress、Markdown、Git、Cloudflare Workers Git Build

---

## 文件结构

- Create: `scripts/wiki-publish/core.mjs` — 扫描、哈希、路径映射和差异计算。
- Create: `scripts/wiki-publish/markdown.mjs` — frontmatter 解析、安全字段过滤和 Wikilink 转换。
- Create: `scripts/wiki-publish/sync.mjs` — 生成 `.wiki-work/report.json` 和只读源快照。
- Create: `scripts/wiki-publish/finalize.mjs` — 在译文通过校验后原子更新清单与索引。
- Create: `scripts/wiki-publish/validate.mjs` — 发布边界、中文、链接和清单校验。
- Create: `scripts/wiki-publish/*.test.mjs` — 对应模块的 Node 单元测试。
- Create: `wiki-manifest.json` — 仅保存相对路径、哈希、公开路径、状态和同步时间。
- Create: `docs/wiki/index.md` — 中文知识库首页。
- Create: `docs/wiki/{entities,concepts,comparisons}/*.md` — 42 篇中文发布页。
- Modify: `package.json` — 增加同步、完成和校验命令。
- Modify: `.gitignore` — 忽略 `.wiki-work/`。
- Modify: `docs/.vitepress/config.mts` — 增加知识库导航和分类侧边栏。
- Modify: `scripts/theme-config.test.mjs` — 固定知识库导航要求。

### Task 1: 建立只读清单与变更检测核心

**Files:**
- Create: `scripts/wiki-publish/core.mjs`
- Create: `scripts/wiki-publish/core.test.mjs`

- [ ] **Step 1: 写失败测试**

测试必须用 `mkdtemp` 创建临时 Wiki，覆盖：只扫描三个允许目录、忽略 `raw/` 和 `queries/`、输出 POSIX 相对路径、稳定 SHA-256，以及 `added/changed/unchanged/deleted` 四类差异。

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { diffInventory, scanWiki } from './core.mjs'

test('diffInventory classifies all states', () => {
  const previous = { 'concepts/a.md': { hash: 'old' }, 'entities/gone.md': { hash: 'x' } }
  const current = { 'concepts/a.md': { hash: 'new' }, 'concepts/b.md': { hash: 'b' } }
  assert.deepEqual(diffInventory(previous, current), {
    added: ['concepts/b.md'], changed: ['concepts/a.md'], unchanged: [], deleted: ['entities/gone.md']
  })
})
```

- [ ] **Step 2: 验证测试失败**

Run: `node --test scripts/wiki-publish/core.test.mjs`
Expected: FAIL，提示找不到 `core.mjs`。

- [ ] **Step 3: 实现最小核心**

导出 `ALLOWED_SECTIONS`、`sha256(text)`、`publicPath(sourcePath)`、`scanWiki(root)` 和 `diffInventory(previous,current)`。使用 `fs/promises`，拒绝符号链接和允许目录之外的路径；返回对象键必须排序，保证重复执行稳定。

- [ ] **Step 4: 运行测试并提交**

Run: `node --test scripts/wiki-publish/core.test.mjs`
Expected: PASS。

```bash
git add scripts/wiki-publish/core.mjs scripts/wiki-publish/core.test.mjs
git commit -m "feat: add wiki inventory scanner"
```

### Task 2: 实现安全 Markdown 转换

**Files:**
- Create: `scripts/wiki-publish/markdown.mjs`
- Create: `scripts/wiki-publish/markdown.test.mjs`

- [ ] **Step 1: 写失败测试**

覆盖：只保留 `title/type/tags/created/updated`；删除 `sources`；`[[page]]` 与 `[[page|标签]]` 转成站内链接；未发布目标转为纯文本并写入 warnings；正文中不得残留绝对路径或 `[[`。

```js
test('converts published and unpublished wikilinks', () => {
  const known = new Map([['context-engineering', '/wiki/concepts/context-engineering']])
  const result = convertWikilinks('见 [[context-engineering|上下文工程]] 和 [[private-note]]。', known)
  assert.equal(result.markdown, '见 [上下文工程](/wiki/concepts/context-engineering) 和 private-note。')
  assert.deepEqual(result.warnings, ['private-note'])
})
```

- [ ] **Step 2: 验证失败并实现**

Run: `node --test scripts/wiki-publish/markdown.test.mjs`
Expected: FAIL，缺少模块。

实现 `parseFrontmatter`、`serializePublicFrontmatter`、`convertWikilinks`、`containsPrivateData`。不得增加 YAML 依赖；按现有简单 frontmatter 格式解析标量和行内数组。

- [ ] **Step 3: 验证并提交**

Run: `node --test scripts/wiki-publish/markdown.test.mjs`
Expected: PASS。

```bash
git add scripts/wiki-publish/markdown.mjs scripts/wiki-publish/markdown.test.mjs
git commit -m "feat: sanitize wiki markdown"
```

### Task 3: 增量同步报告与本地工作区

**Files:**
- Create: `scripts/wiki-publish/sync.mjs`
- Create: `scripts/wiki-publish/sync.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: 写 CLI 失败测试**

测试临时 Wiki 和临时网站目录，断言报告只含相对路径与四类变更，源快照只存在 `.wiki-work/source/`，已有 `docs/wiki/` 不被改写，删除项只报告不删除。

- [ ] **Step 2: 实现 CLI**

解析 `--wiki <path>`，否则读取 `LLM_WIKI_PATH`；缺失时输出明确用法并退出 1。以临时目录写入后 rename 到 `.wiki-work/`。报告结构固定为：

```json
{
  "generatedAt": "ISO-8601",
  "added": [],
  "changed": [],
  "unchanged": [],
  "deleted": [],
  "inventory": {}
}
```

在 `package.json` 增加 `"wiki:sync": "node scripts/wiki-publish/sync.mjs"`，在 `.gitignore` 增加 `.wiki-work/`。

- [ ] **Step 3: 验证并提交**

Run: `node --test scripts/wiki-publish/sync.test.mjs`
Expected: PASS。

Run: `LLM_WIKI_PATH="$HOME/Documents/llm_wiki" npm run wiki:sync`
Expected: 报告 42 个 added、0 个 deleted，且 `git status` 不显示 `.wiki-work/`。

```bash
git add package.json .gitignore scripts/wiki-publish/sync.mjs scripts/wiki-publish/sync.test.mjs
git commit -m "feat: report wiki sync changes"
```

### Task 4: 发布校验器

**Files:**
- Create: `scripts/wiki-publish/validate.mjs`
- Create: `scripts/wiki-publish/validate.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**

分别构造 `sources:`、`raw/`、macOS/Windows 绝对路径、残留 Wikilink、英文空壳正文、断链、额外文件和清单缺项，断言每类产生确定错误；再构造一份合法中文页面并断言通过。去除代码块和 frontmatter 后，正文至少包含 20 个汉字且汉字占非空白字符的 10%，否则视为未完成翻译。

- [ ] **Step 2: 实现校验器**

实现 `validatePublishedWiki({docsRoot, manifest})`，返回排序后的 `{errors,warnings}`。CLI 有 errors 时逐行打印并退出 1，无 errors 时打印页面计数并退出 0。在 `package.json` 增加：

```json
"wiki:validate": "node scripts/wiki-publish/validate.mjs"
```

并将 `test` 改为先执行 `node --test scripts/wiki-publish/*.test.mjs` 和 `npm run wiki:validate`，再执行现有测试与构建。

- [ ] **Step 3: 验证并提交**

Run: `node --test scripts/wiki-publish/validate.test.mjs`
Expected: PASS。

```bash
git add package.json scripts/wiki-publish/validate.mjs scripts/wiki-publish/validate.test.mjs
git commit -m "feat: validate published wiki"
```

### Task 5: 翻译并发布首批 42 篇页面

**Files:**
- Create: `docs/wiki/index.md`
- Create: `docs/wiki/entities/*.md`（3 篇）
- Create: `docs/wiki/concepts/*.md`（37 篇）
- Create: `docs/wiki/comparisons/*.md`（2 篇）
- Create: `wiki-manifest.json`

- [ ] **Step 1: 按报告逐页翻译**

对 `.wiki-work/report.json` 中 42 个 added 页面逐一处理。每篇使用中文标题和正文，保留代码、产品名及常用缩写；只保留批准的五类元数据；将全部 Wikilink 按 Task 2 的映射转换。文件名保持源 slug 不变。

- [ ] **Step 2: 生成中文索引**

`docs/wiki/index.md` 包含“实体”“概念”“对比分析”三个分区，每篇页面恰好出现一次，链接使用 `/wiki/<section>/<slug>`。显示总数 42 和最近同步日期。

- [ ] **Step 3: 写入清单**

`wiki-manifest.json` 顶层使用 `version: 1` 和 `pages`；每项只包含 `source`、`hash`、`publicPath`、`status: "published"`、`syncedAt`。不得包含绝对路径和 `sources`。

- [ ] **Step 4: 运行隐私与内容校验**

Run: `npm run wiki:validate`
Expected: PASS，`42 published pages`，无 errors。

Run: `rg -n 'sources:|raw/|/Users/|\[\[' docs/wiki wiki-manifest.json`
Expected: 无输出。

- [ ] **Step 5: 提交内容**

```bash
git add docs/wiki wiki-manifest.json
git commit -m "content: publish Chinese LLM wiki"
```

### Task 6: 原子完成同步与删除确认

**Files:**
- Create: `scripts/wiki-publish/finalize.mjs`
- Create: `scripts/wiki-publish/finalize.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**

覆盖：只有全部 added/changed 页面存在并通过校验才更新 manifest；失败时原 manifest 字节不变；deleted 默认阻止完成；传入 `--confirm-delete <source>` 后才删除对应公开页和清单项。

- [ ] **Step 2: 实现 finalize**

读取 `.wiki-work/report.json`，在临时目录构造新 manifest 和索引，调用校验器，通过后 rename 替换。增加 `"wiki:finalize": "node scripts/wiki-publish/finalize.mjs"`。

- [ ] **Step 3: 验证并提交**

Run: `node --test scripts/wiki-publish/finalize.test.mjs`
Expected: PASS。

```bash
git add package.json scripts/wiki-publish/finalize.mjs scripts/wiki-publish/finalize.test.mjs
git commit -m "feat: finalize wiki publication safely"
```

### Task 7: 接入 VitePress 导航并完成端到端验证

**Files:**
- Modify: `docs/.vitepress/config.mts`
- Modify: `scripts/theme-config.test.mjs`

- [ ] **Step 1: 扩展失败测试**

要求 nav 包含 `{ text: '知识库', link: '/wiki/' }`，sidebar 为 `/wiki/` 提供实体、概念、对比分析三组且总计 42 个唯一链接。

- [ ] **Step 2: 运行失败测试并修改配置**

Run: `node scripts/theme-config.test.mjs`
Expected: FAIL，提示缺少知识库导航。

在 `config.mts` 增加知识库 nav 和三组 sidebar；链接与 `wiki-manifest.json` 一致。

- [ ] **Step 3: 完整验证**

Run: `npm test`
Expected: 所有 Node 测试、内容检查、主题检查及 VitePress build 均 PASS。

Run: `LLM_WIKI_PATH="$HOME/Documents/llm_wiki" npm run wiki:sync`
Expected: 42 个 unchanged，added/changed/deleted 均为 0。

Run: `git diff --check`
Expected: 无输出。

- [ ] **Step 4: 浏览器验收**

运行 `npm run docs:dev`，检查 `/wiki/`、每个分类至少一页、移动端侧边栏、站内搜索和内部链接。浏览器控制台不得有错误。

- [ ] **Step 5: 提交导航**

```bash
git add docs/.vitepress/config.mts scripts/theme-config.test.mjs
git commit -m "feat: add wiki navigation"
```

### Task 8: 发布前审计与部署

**Files:**
- Verify only

- [ ] **Step 1: 审计提交范围**

Run: `git status --short && git log --oneline -10`
Expected: 工作区干净；提交仅包含同步工具、测试、中文页面、清单和导航。

- [ ] **Step 2: 最终隐私扫描**

Run: `rg -n 'sources:|raw/|/Users/|\[\[' docs/wiki wiki-manifest.json`
Expected: 无敏感内容命中。

- [ ] **Step 3: 推送并验证线上站点**

Run: `git push origin main`
Expected: push 成功，Cloudflare 构建完成。

验证 `https://juzxailab.com/wiki/` 返回 200，随机抽查实体、概念、对比分析各一页，并验证站内搜索能找到中文标题。
