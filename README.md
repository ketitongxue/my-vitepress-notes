# AI 纪元

使用 VitePress 构建的中文个人数字花园。

## 本地开发

要求 Node.js 22 或更高版本。版本以根目录 `.node-version` 为准。

```bash
npm install
npm run qa:index
npm run worker:dev
```

`qa:index` 只从 `docs/wiki/entities`、`docs/wiki/concepts` 和
`docs/wiki/comparisons` 生成公开检索索引。Worker 使用关键词检索选取相关片段，再由
DeepSeek 生成带站内引用的流式回答；不会读取本地 `llm_wiki` 或其他私有来源。

同步两个知识库时只通过环境变量提供本地来源，不在命令或仓库文件中写入本机绝对路径：

```bash
LLM_WIKI_PATH="$LLM_WIKI_PATH" npm run wiki:sync
FINANCE_WIKI_PATH="$FINANCE_WIKI_PATH" npm run finance:sync
```

本地启动 Worker 前，在项目根目录创建不纳入 Git 的 `.dev.vars`，配置
`DEEPSEEK_API_KEY` 和 `IP_HASH_SALT`。生产环境使用 Cloudflare Secrets：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put IP_HASH_SALT
```

浏览器只在当前标签页的 `sessionStorage` 中保留最近 6 轮对话。服务端不保存问题、回答、
完整 IP 或会话历史；IP 经过带盐 HMAC 后仅用于每日配额。

## 验证与限制

```bash
npm test
```

公开问答限制为每个 IP 3 次/分钟、5 次/天，全站 10 次/天。每日配额由单例
SQLite Durable Object 原子计数，并按 UTC 日期重置。

## D1 个人 OS 内容管理

个人 OS 的节点与连线使用 D1 保存不可变版本。公开页面访问
`/api/personal-os/config` 读取最新已发布版本；D1 请求失败时，浏览器自动使用仓库内的
`personalOsContent.mjs` 默认配置，因此数据库异常不会让首页白屏。

首次部署前创建并迁移数据库：

```bash
npx wrangler d1 migrations apply personal-os-config --remote
```

管理页位于 `/admin/personal-os`，不会出现在站点导航或搜索中。必须在 Cloudflare Zero
Trust 中创建 Self-hosted Access application，同时保护：

- `juzxailab.com/admin/*`
- `juzxailab.com/api/admin/*`

只允许站点所有者邮箱，并将 Access application 的团队域名和 AUD 写入 Worker 变量
`ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`。Worker 会再次校验 `Cf-Access-Jwt-Assertion` 的签名、
issuer、audience 和 `ADMIN_EMAIL`，不能只依赖页面地址隐藏。保存采用 `baseRevision`
乐观锁；发布新 revision 后，旧浏览器布局会自动失效并以新版默认位置重新初始化。

## Cloudflare Workers Git 部署

Cloudflare Workers 连接此 GitHub 仓库，并在 `main` 分支更新后自动构建和发布到 `workers.dev`。

- 生产分支：`main`
- Build command `npm run build`
- Deploy command `npx wrangler deploy`
- Node.js：`22`（由根目录 `.node-version` 指定）

`npm run build` 会先重新生成问答索引，再构建 VitePress 静态资源；Wrangler 随后同时发布
Worker 和这些静态资源。部署前必须已配置上述两个 Secrets。
