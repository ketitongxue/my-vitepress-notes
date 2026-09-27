# Crisp 聊天配置

在 `theme/crispConfig.mjs` 中填写 Crisp 后台 **Settings → Workspace Settings → Setup & Integrations** 提供的 Website ID，保留 `enabled: true`，然后重新构建和部署。Website ID 是公开站点标识，可以提交；不要填 API Key、密码或聊天会话令牌。

```js
export const crispConfig = Object.freeze({
  enabled: true,
  websiteId: '在这里填写你的 Website ID',
})
```

将 `enabled` 改为 `false` 后重新部署可关闭新打开页面的聊天入口。ID 为空或格式无效时也不会显示入口或加载 SDK。已打开的浏览器页面需要刷新才会应用新配置。

访客在公开页面点击“联系我”后才加载 `crisp-sdk-web` 和 Crisp 远程脚本；首页开机期间不显示入口。首页、Personal OS 和阅读窗口共享会话，关闭聊天后回到自定义入口，收到新消息时显示未读数量。手机上的聊天窗口使用 Crisp 自带的全屏模式。

`/admin` 和 `/admin/*` 管理页不加载 Crisp。主题在进入或离开后台时使用整页导航，覆盖站内链接、程序导航及浏览器前进/后退，避免已经加载的第三方脚本继续运行于后台页面。接入代码不向 Crisp 传递管理员身份、私有笔记或 D1 数据。

嵌在主站的 iframe 不重复挂载聊天入口；`ai-era-html-docs` 独立知识库站点不在此次接入范围。远程聊天连接超时会提供刷新重试提示，站内阅读、画布和导航仍可使用。

## 验证

- `node --test scripts/crisp-chat.test.mjs`：配置开关、延迟加载、重复初始化、失败、后台导航边界。
- `npm test`：现有功能回归和完整 VitePress SSR 构建。
- `npx wrangler deploy --dry-run`：部署产物检查。
- 浏览器：检查开机、首页与画布切换、阅读 iframe、手机和横屏、直接进入后台及浏览器前进/后退。点击前不应有 Crisp 网络请求。
- 配置真实 ID 后，在网站打开聊天，再到 Crisp Inbox 核实；消息双向收发需另行执行，代码和界面检查不能代替实际送达验证。

官方文档：[Crisp Web SDK](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/npm/)、[VitePress 路由 API](https://vitepress.dev/reference/runtime-api)。
