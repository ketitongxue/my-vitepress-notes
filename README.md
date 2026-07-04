# 柯提的 AI 纪元

使用 VitePress 构建的中文个人数字花园。

## 本地开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run qa:index
npm run worker:dev
```

`qa:index` 只从 `docs/wiki/entities`、`docs/wiki/concepts` 和
`docs/wiki/comparisons` 生成公开检索索引。Worker 使用关键词检索选取相关片段，再由
DeepSeek 生成带站内引用的流式回答；不会读取本地 `llm_wiki` 或其他私有来源。

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

公开问答限制为每个 IP 5 次/分钟、30 次/天，全站 50 次/天。每日配额由单例
Durable Object 严格计数。

## Cloudflare Workers Git 部署

Cloudflare Workers 连接此 GitHub 仓库，并在 `main` 分支更新后自动构建和发布到 `workers.dev`。

- 生产分支：`main`
- Build command `npm run build`
- Deploy command `npx wrangler deploy`
- Node.js：`20`

`npm run build` 会先重新生成问答索引，再构建 VitePress 静态资源；Wrangler 随后同时发布
Worker 和这些静态资源。部署前必须已配置上述两个 Secrets。
