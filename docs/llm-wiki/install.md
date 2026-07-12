---
title: 安装 LLM Wiki Skill
description: 下载、校验并安装公开版本 v1.0.0。
lastUpdated: false
---

# 安装 LLM Wiki Skill v1.0.0

[返回专题首页](/llm-wiki/)

公开仓库是唯一可信源码。下面固定安装 v1.0.0，便于复核文件和重复安装；发现新版可查看 [Latest Release](https://github.com/ketitongxue/llm-wiki-skill/releases/latest)。

## 1. 下载两个 Release 文件

- [llm-wiki-skill-v1.0.0.zip](https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip)
- [SHA256SUMS.txt](https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/SHA256SUMS.txt)

也可以在终端中下载：

```bash
curl -LO https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip
curl -LO https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/SHA256SUMS.txt
```

## 2. 验证 SHA256

把两个文件放在同一目录，先验证再解压：

```bash
shasum -a 256 -c SHA256SUMS.txt
```

只有看到 `llm-wiki-skill-v1.0.0.zip: OK` 才继续。校验失败时删除文件，并从 [固定版本页面](https://github.com/ketitongxue/llm-wiki-skill/releases/tag/v1.0.0) 重新下载。

## 3. 安装到 Codex

ZIP 内只有一个顶层目录 `llm-wiki/`：

```bash
mkdir -p ~/.codex/skills
unzip llm-wiki-skill-v1.0.0.zip -d ~/.codex/skills
test -f ~/.codex/skills/llm-wiki/SKILL.md
```

最终入口是 `~/.codex/skills/llm-wiki/SKILL.md`。如果目标位置已经存在，先人工比较版本；安装流程不会自动覆盖个人修改。

## 4. 初始化并试用

向 Codex 明确知识库目录和任务，例如：

> 在 `<WIKI_PATH>` 初始化一个关于“星港运维”的 LLM Wiki。先和我确认 Purpose 与 Schema，再创建骨架。

之后可以继续：

> 把这份虚构的《星港缓存策略》采集到 `<WIKI_PATH>`。优先增强已有机制页，更新 Hub、双向链接、索引和日志，最后执行 lint。

其他 Agent 的 Skill 目录、触发规则和工具权限可能不同。不能自动发现 `SKILL.md` 时，可以把它作为项目指令手动加载；没有文件写入权限的模型只能参考方法，不能声称完成落盘或检查。

[查看工作原理](/llm-wiki/principles)
