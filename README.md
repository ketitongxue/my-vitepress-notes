# 柯提的 AI 纪元

使用 VitePress 构建的中文个人数字花园。

## 本地开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run docs:dev
```

## 验证

```bash
npm test
```

## Cloudflare Workers Git 部署

Cloudflare Workers 连接此 GitHub 仓库，并在 `main` 分支更新后自动构建和发布到 `workers.dev`。

- 生产分支：`main`
- 构建命令：`npm run docs:build`
- 输出目录：`docs/.vitepress/dist`
- Node.js：`20`
