# Finance Wiki 多知识库发布设计

## 目标

将 `/Users/keti/Documents/finance-wiki` 的 42 个概念页和 6 个实体页发布到现有 VitePress 网站，同时保留现有 LLM Wiki 的发布、导航和问答行为。

## 方案选择

采用集合化发布器。现有 `wiki` 集合继续发布到 `/wiki/`，新增 `finance` 集合发布到 `/finance/`。两个集合拥有独立源路径、公开目录、同步工作区和 manifest，但复用同一套扫描、链接转换、原子写入和校验逻辑。

未采用：

- 复制 Finance 专用脚本：初期较快，但两套安全与同步逻辑会漂移。
- 一次性静态复制：无法可靠支持后续增量更新。

## 公开边界

Finance 只发布：

- `concepts/`
- `entities/`
- `comparisons/`

不发布 `raw/`、`queries/`、`log.md`、`SCHEMA.md`、`_meta/`、Obsidian 配置和附件。公开页面仅保留 `title`、`type`、`tags`、`created`、`updated`。

源正文中的 `^[raw/...]` 来源标记和其他原始文件引用必须移除。`[[target]]` 与 `[[target|label]]` 必须转换为 `/finance/<type>/<slug>` 链接。无法解析的链接使发布失败，不生成静默断链。

## 路由与导航

公开结构：

```text
docs/finance/
├── index.md
├── concepts/
├── entities/
└── comparisons/
```

网站顶栏增加“金融知识库”，Finance 使用独立侧边栏。英文文件名继续作为稳定 slug，中文标题和正文原样保留。

`/wiki/concepts/sdd-95-5-principle` 与 `/finance/concepts/sdd-95-5-principle` 可以同时存在，不发生文件或链接冲突。

## 发布配置

发布器接受集合参数，而不是复制脚本。集合配置只包含可提交的相对规则：

| 集合 | 环境变量 | 公开根目录 | Manifest | 工作目录 |
| --- | --- | --- | --- | --- |
| `wiki` | `LLM_WIKI_PATH` | `docs/wiki` | `wiki-manifest.json` | `.wiki-work` |
| `finance` | `FINANCE_WIKI_PATH` | `docs/finance` | `finance-manifest.json` | `.finance-work` |

仓库不得记录本地绝对路径。package scripts 提供 `finance:sync`、`finance:finalize` 和 `finance:validate`；现有 Wiki 命令保持兼容。

## 数据流

1. `finance:sync` 扫描允许目录、计算哈希并生成新增、变化、未变化和删除报告。
2. Finance 页面已是中文，因此由确定性转换步骤生成安全公开副本：过滤私有 frontmatter、移除来源标记、转换 wikilinks。
3. `finance:finalize` 在临时目录验证完整快照后，原子替换 `docs/finance` 和 `finance-manifest.json`。
4. 新页面自动进入 Finance 索引；VitePress 侧边栏由 manifest 完整性检查约束。
5. Cloudflare 继续从同一 VitePress 构建产物部署。

删除仍需逐项确认。源页面缺失时只报告，不自动删除线上页面。

## 问答与搜索

本次不修改 `/ask` 的检索范围，Worker 问答继续只索引 `docs/wiki`。VitePress 本地全文搜索会自然覆盖 `/finance` 页面。

未来若启用金融问答，应增加显式知识域选择，而不是把两个领域无差别混入同一个检索集合。

## 安全与错误处理

以下情况阻止发布：

- `sources`、`raw/`、本地绝对路径或残留 wikilink 出现在公开 Finance 页面；
- manifest 与公开文件不一致；
- 内部链接指向不存在的 Finance 页面；
- 新页面缺少有效中文正文；
- 同名 slug 在同一 Finance 类型目录内冲突；
- 未确认的删除。

任何失败保留上一版可部署内容。

## 测试与验收

测试覆盖：

- 两个集合配置与路径隔离；
- Finance 来源标记清理和 wikilink 转换；
- 增量哈希、幂等同步、删除确认和原子回滚；
- 两份 manifest 与导航完整性；
- 安全扫描同时覆盖 `/wiki` 与 `/finance`；
- VitePress 生产构建和 Wrangler dry-run。

验收标准：

- 48 个 Finance 页面均可通过 `/finance/` 导航访问；
- LLM Wiki 的 45 个页面、现有 URL 和问答索引保持不变；
- 同名页面在两个命名空间中分别可用；
- 仓库不包含 Finance 原始资料或本地路径；
- Cloudflare 自动构建成功，Finance 首页和代表页面返回 HTTP 200；
- 重复同步无源变化时不产生无意义差异。

## 非目标

不发布原始 PDF/附件，不增加金融问答，不修改 Finance Wiki 源文件，不合并两个知识库的标签体系，也不建立后台文件监听。
