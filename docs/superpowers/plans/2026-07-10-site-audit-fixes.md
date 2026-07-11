# Site Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复知识库 hub、问答初始态和全站关键文案中已确认的审查问题。

**Architecture:** 保持现有 VitePress 默认主题与发布流水线；生成内容在 finalizer 修复，交互在单一 Vue 组件内渐进披露，首页和搜索仅使用现有配置能力。每个任务先写契约测试，再做最小实现。

**Tech Stack:** Node.js test runner、VitePress 1.6、Vue 3、Markdown、CSS。

## Global Constraints

- 不改变问答 API、限流、SSE 或 sessionStorage 协议。
- 不新增路由、依赖或自定义搜索组件。
- 快速入口只能指向现有页面。
- 推迟页内知识库搜索、侧栏重构和文章元数据组件。

---

### Task 1: Suppress generated hub update footer

**Files:**
- Modify: `scripts/wiki-publish/finalize.test.mjs`
- Modify: `scripts/wiki-publish/finalize.mjs`
- Modify: `docs/wiki/index.md`
- Modify: `docs/finance/index.md`

**Interfaces:**
- Consumes: `indexMarkdown(docsRoot, pages, date, collection)`。
- Produces: hub Markdown frontmatter with `lastUpdated: false`。

- [ ] **Step 1: Write the failing test**

在 `scripts/wiki-publish/finalize.test.mjs` 的 AI 与 Finance finalize 断言中读取生成的 `index.md`，加入：

```js
assert.match(index, /^---\n[\s\S]*\nlastUpdated: false\n---/)
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/wiki-publish/finalize.test.mjs`
Expected: FAIL，生成 frontmatter 缺少 `lastUpdated: false`。

- [ ] **Step 3: Implement the minimum fix**

在 `indexMarkdown()` 的 `lines` frontmatter 中、结束 `---` 前加入 `'lastUpdated: false'`；对 `docs/wiki/index.md` 和 `docs/finance/index.md` 做相同同步修改，不运行需要本地知识库路径的 sync。

- [ ] **Step 4: Run GREEN and commit**

Run: `node --test scripts/wiki-publish/finalize.test.mjs`
Expected: PASS。

```bash
git add scripts/wiki-publish/finalize.mjs scripts/wiki-publish/finalize.test.mjs docs/wiki/index.md docs/finance/index.md
git commit -m "fix: suppress generated hub update footer"
```

### Task 2: Compact the Q&A initial state

**Files:**
- Modify: `scripts/wiki-qa/ui-contract.test.mjs`
- Modify: `scripts/site-design.test.mjs`
- Modify: `docs/.vitepress/theme/components/WikiAsk.vue`
- Modify: `docs/.vitepress/theme/custom.css`

**Interfaces:**
- Consumes: existing `messages`, `busy`, `state`, `statusText`, `errorText` refs.
- Produces: conditional conversation, status and action controls without changing request behavior.

- [ ] **Step 1: Write the failing contract tests**

断言模板包含以下条件，并将旧的 `min-height: 190px` 断言替换为紧凑布局断言：

```js
assert.match(component, /v-if="messages\.length > 0 \|\| busy"[^>]*class="wiki-ask__conversation"/)
assert.match(component, /v-if="messages\.length > 0 \|\| busy"[^>]*class="wiki-ask__status"/)
assert.match(component, /v-if="busy"[^>]*>停止生成<\/button>/)
assert.match(component, /v-if="messages\.length > 0"[^>]*>清空对话<\/button>/)
assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/wiki-qa/ui-contract.test.mjs scripts/site-design.test.mjs`
Expected: FAIL on unconditional nodes and 190px minimum height.

- [ ] **Step 3: Implement the minimum fix**

给 conversation 和 status 添加 `v-if="messages.length > 0 || busy"`；停止按钮改为 `v-if="busy"`，清空按钮改为 `v-if="messages.length > 0"`，删除对应 disabled 条件。保留发送按钮。将 conversation 的 190px minimum height 移除或降为内容驱动的合理值，不改 sticky、mobile 或 reduced-motion 规则。

- [ ] **Step 4: Run GREEN and commit**

Run: `node --test scripts/wiki-qa/ui-contract.test.mjs scripts/site-design.test.mjs`
Expected: PASS。

```bash
git add scripts/wiki-qa/ui-contract.test.mjs scripts/site-design.test.mjs docs/.vitepress/theme/components/WikiAsk.vue docs/.vitepress/theme/custom.css
git commit -m "fix: compact wiki ask empty state"
```

### Task 3: Localize labels and make homepage entries actionable

**Files:**
- Modify: `scripts/site-design.test.mjs`
- Modify: `docs/index.md`
- Modify: `docs/.vitepress/theme/components/WikiAsk.vue`
- Modify: `docs/.vitepress/config.mts`

**Interfaces:**
- Consumes: VitePress home `features[].linkText` and `themeConfig.search.options.translations` when supported by VitePress 1.6.
- Produces: Chinese labels and existing-route quick links.

- [ ] **Step 1: Write the failing tests**

```js
assert.doesNotMatch(home, /RECENT GROWTH|POPULAR TAGS|最近生长/)
assert.equal((home.match(/linkText:\s*查看专题/g) ?? []).length, 3)
for (const href of ['/wiki/', '/finance/', '/ask/', '/notes/sustainable-ai-workflow']) {
  assert.match(home, new RegExp(`href=["']${href.replaceAll('/', '\\/')}["']`))
}
assert.match(component, /wiki-ask__eyebrow">知识库问答</)
assert.match(config, /search:[\s\S]*provider:\s*['"]local['"][\s\S]*translations:/)
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/site-design.test.mjs`
Expected: FAIL on English labels, missing link text/anchors and search translations.

- [ ] **Step 3: Implement the minimum fix**

将两个首页 eyebrow 与“最近生长”中文化；三个 feature 各加 `linkText: 查看专题`；用四个站内 `<a>` 快速入口替换静态标签文字；问答 eyebrow 改为“知识库问答”。按 VitePress 1.6 类型/API 给 `search` 添加 `options.translations`，覆盖 button、modal、no-results 等当前可用键；若 `npm run docs:build` 报该字段不兼容，则移除该字段及仅针对它的断言，不升级 VitePress。

- [ ] **Step 4: Run GREEN and full verification**

Run: `node --test scripts/site-design.test.mjs`
Expected: PASS。

Run: `npm test`
Expected: PASS。

Run: `npm run docs:build`
Expected: VitePress build complete。

Run: `git diff --check`
Expected: no output。

```bash
git add scripts/site-design.test.mjs docs/index.md docs/.vitepress/theme/components/WikiAsk.vue docs/.vitepress/config.mts
git commit -m "fix: localize site discovery labels"
```

## Final review

- [ ] Confirm `git status --short` contains only intended changes.
- [ ] Confirm both hub indexes retain `lastUpdated: false` after fixture finalize.
- [ ] Confirm deferred work is absent from the diff.
