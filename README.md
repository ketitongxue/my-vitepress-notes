# AI 纪元

使用 VitePress 构建的中文个人数字花园。

## 本地开发

要求 Node.js 22 或更高版本。版本以根目录 `.node-version` 为准。

```bash
npm install
npm run worker:dev
```

网站仓库只维护个人主页、Personal OS、项目介绍和私有 Markdown 管理界面；公开知识库内容与问答接口已移除。
知识库发布脚本仍独立维护在
[`ketitongxue/llm-wiki-publisher`](https://github.com/ketitongxue/llm-wiki-publisher)
，与本网站部署解耦。

本地启动 Worker 前，在项目根目录创建不纳入 Git 的 `.dev.vars`，配置
`DEEPSEEK_API_KEY` 和 `IP_HASH_SALT`。生产环境使用 Cloudflare Secrets：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put IP_HASH_SALT
```

## 验证

```bash
npm test
```

## 知识库阅读

桌面与顶部菜单的“知识库”入口都在本站窗口中打开目录。点击文章或“完整知识库”后，
窗口内嵌入已发布的 GitHub Pages 内容，支持返回目录与窗口放大，主站地址保持不变。
文章仍从 `ketitongxue/ai-era-html-docs` 加载，图片与交互沿用原文；新增文章无需重新部署主站。

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

历史版本的配置校验失败时，管理页保留版本号和说明并标注“配置无效”，不允许载入、发布或
回滚该版本，其余有效版本仍可管理。`0014_repair_personal_os_connections.sql` 为迁移
0011 遗留的悬空连线追加修复版本，保留原始历史；它不会覆盖后续人工草稿或发布。

`01 主页` 使用同一个 D1 数据库中的独立 `home_config_versions` 版本表。公开接口为
`/api/home/config`，管理页为 `/admin/home`，可独立保存草稿、发布和回滚启动终端文案、
顶部菜单、桌面图标/默认位置/窗口内容与退出页文案。主页配置请求失败时会自动回退到仓库内
的静态配置，不影响访问；现有管理页面和管理 API 的 Access 通配规则同时保护该入口。
首页管理页也会保留并标记不再符合当前校验规则的历史版本（例如含已停用的 `#knowledge`
链接），不让它们阻塞有效版本加载，也不允许直接发布或回滚这些无效配置。

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

`npm run build` 构建 VitePress 静态资源；Wrangler 随后同时发布 Worker 和这些静态资源。
