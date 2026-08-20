# AI 纪元

使用 VitePress 构建的中文个人数字花园。

## 本地开发

要求 Node.js 22 或更高版本。版本以根目录 `.node-version` 为准。

```bash
npm install
npm run worker:dev
```

`docs:dev`、`worker:dev`、`build` 和 `test` 会先从公开内容仓库
[`ketitongxue/juzxailab-content`](https://github.com/ketitongxue/juzxailab-content)
安装 AI 知识库。默认优先使用同一工作区内的本地 `juzxailab-content` checkout；
Cloudflare 构建环境会克隆公开仓库的 `main`。也可以显式指定：

```bash
JUZXAILAB_CONTENT_PATH="../juzxailab-content" npm run content:sync
```

`qa:index` 只从 `docs/wiki/entities`、`docs/wiki/concepts` 和
`docs/wiki/comparisons` 生成公开检索索引。Worker 使用关键词检索选取相关片段，再由
DeepSeek 生成带站内引用的流式回答；不会读取本地 `llm_wiki` 或其他私有来源。

同步、发布与内容安全校验由独立仓库
[`ketitongxue/llm-wiki-publisher`](https://github.com/ketitongxue/llm-wiki-publisher)
维护；本仓库仅保留网站构建、问答索引和运行时代码。工具版本通过依赖锁文件固定，
公共 Markdown、索引和 manifest 写入独立内容仓库。
同步源知识库时只通过环境变量提供本地来源和发布目标，不在仓库文件中写入本机绝对路径：

```bash
PUBLICATION_ROOT="$PUBLIC_CONTENT_PATH" LLM_WIKI_PATH="$LLM_WIKI_PATH" npm run wiki:sync
```

完成翻译/净化和 `wiki:finalize` 后，在内容仓库创建 PR。
内容仓库 `main` 更新会先运行安全校验，再通过 Cloudflare Deploy Hook 自动重建网站。
内容仓库可以继续保存其他历史资料，但网站构建只安装并发布 `docs/wiki`。

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

`01 主页` 使用同一个 D1 数据库中的独立 `home_config_versions` 版本表。公开接口为
`/api/home/config`，管理页为 `/admin/home`，可独立保存草稿、发布和回滚启动终端文案、
顶部菜单、桌面图标/默认位置/窗口内容与退出页文案。主页配置请求失败时会自动回退到仓库内
的静态配置，不影响访问；现有管理页面和管理 API 的 Access 通配规则同时保护该入口。

## 私有 Markdown 笔记

管理页 `/admin/private-notes` 支持直接拖拽或选择本地 `.md`/`.markdown` 文件上传，
也支持上传一个包含一篇 Markdown 和图片资源的 `.zip` 笔记包，不需要修改代码。笔记正文
保存在 D1 的 `private_markdown_documents` 表中，图片保存在私有 R2 桶
`juzxailab-private-notes`，只能通过已验证的 Cloudflare Access 管理 API 读取；管理页会渲染
相对图片引用，也保留原始 Markdown 查看入口。它们不会进入公开知识库导航、静态构建或问答检索索引。
单篇限制为 512 KiB，使用 UTF-8；相同文件名再次上传会更新为下一版本。删除操作也只对
通过 Access 的站点所有者开放。

应用数据库迁移后即可使用：

```bash
npx wrangler d1 migrations apply personal-os-config --remote
npx wrangler r2 bucket create juzxailab-private-notes
```

Access application 继续使用上面的 `juzxailab.com/admin/*` 与
`juzxailab.com/api/admin/*` 通配规则，因此只有 `ADMIN_EMAIL` 对应的账号能看到和操作私有笔记。

## Cloudflare Workers Git 部署

Cloudflare Workers 连接此 GitHub 仓库，并在 `main` 分支更新后自动构建和发布到 `workers.dev`。

- 生产分支：`main`
- Build command `npm run build`
- Deploy command `npx wrangler deploy`
- Node.js：`22`（由根目录 `.node-version` 指定）

`npm run build` 会先安装内容仓库、重新生成问答索引，再构建 VitePress 静态资源；Wrangler
随后同时发布 Worker 和这些静态资源。构建日志会输出实际使用的内容 commit，便于回滚和审计。
部署前必须已配置上述两个 Secrets。
