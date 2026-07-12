# Public LLM Wiki Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 发布可审计、可复现安装的 `llm-wiki` Skill `v1.0.0`，并在个人 VitePress 网站提供原理、建库和安装文档。

**Architecture:** 分两个严格串行的阶段实施：先在独立公开仓库完成通用 Skill、stdlib 工具链、确定性 ZIP、SHA256 和 GitHub Release；只有固定版本 Release 的源码与附件都可公开访问后，网站仓库才新增四个文档路由和发现入口。公开仓库是唯一源码，网站只维护版本化说明和 GitHub 链接，不镜像 Skill 或 Release 附件。

**Tech Stack:** Markdown、Python 3 标准库、`unittest`、Git/GitHub CLI、GitHub Actions、Node.js 22、VitePress、Wrangler。

## Global Constraints

- 公开 Skill 仓库必须新建于运行时变量 `$SKILL_REPO` 指向的空目录，远端必须是公开仓库 `ketitongxue/llm-wiki-skill`，不得复制本机 Skill 或个人知识库的 Git 历史。
- 首个版本固定为 `v1.0.0`，许可证固定为 MIT；公开仓库必须包含 `SKILL.md`、`README.md`、`LICENSE`、`CHANGELOG.md`、`VERSION`、`templates/`、`references/`、`scripts/` 和 `tests/`。
- 公共版只覆盖初始化、采集、查询、检查和维护；VitePress 发布仅是通用参考，不得绑定用户主目录、私人绝对路径、个人知识库、站点仓库、个人域名、账号、Token、Secret、Hermes、Telegram 或 Cloudflare 配置。
- 公开仓库不得从私人目录直接复制文件；只能根据设计说明重新编写经过泛化的内容，并从空仓库开始提交历史。
- 只使用 Python 3 标准库实现初始化、校验、敏感信息扫描和确定性打包，不增加 PyPI 或 npm 运行依赖。
- Release 必须包含 `llm-wiki-skill-v1.0.0.zip` 和 `SHA256SUMS.txt`；ZIP 解压后只有单一顶层目录 `llm-wiki/`，且其顶层包含 `SKILL.md`。
- ZIP 必须由显式允许列表生成，使用 UTF-8/LF、固定排序、归一化权限与时间戳；禁止绝对路径、`..`、软链接、设备文件、隐藏缓存和 Git 元数据；连续打包两次的 SHA256 必须完全一致。
- 未知的敏感信息扫描命中必须使测试和 Release 失败，不得用宽泛 ignore 绕过。
- 网站只链接公开仓库、固定 `v1.0.0` Release、Latest Release、ZIP 和 SHA256；不得保存 `SKILL.md`、模板、脚本、ZIP 或 SHA256 副本。
- Phase 2 的硬门槛是 `v1.0.0` Release 及两个附件可匿名访问；门槛未满足时不得创建或合并网站内容。
- 网站固定新增 `/llm-wiki/`、`/llm-wiki/principles`、`/llm-wiki/build`、`/llm-wiki/install`，顶部“工具”和首页入口均先进入 `/llm-wiki/`。
- 不修改现有本机 `~/.codex/skills/llm-wiki`、个人知识库、问答检索、问答额度、Cloudflare Worker 或只由 `main` 触发部署的策略。
- 所有实现任务遵循 TDD；每个任务必须在自己的 RED/GREEN 周期后独立提交。

---

## Phase 1: Publish the public repository and `v1.0.0`

### Task 1: Create the clean public Skill source

**Files:**
- Create: `$SKILL_REPO/SKILL.md`
- Create: `$SKILL_REPO/README.md`
- Create: `$SKILL_REPO/LICENSE`
- Create: `$SKILL_REPO/CHANGELOG.md`
- Create: `$SKILL_REPO/VERSION`
- Create: `$SKILL_REPO/templates/SCHEMA.md`
- Create: `$SKILL_REPO/templates/purpose.md`
- Create: `$SKILL_REPO/templates/index.md`
- Create: `$SKILL_REPO/templates/log.md`
- Create: `$SKILL_REPO/references/agent-compatibility.md`
- Create: `$SKILL_REPO/references/ingest-workflow.md`
- Create: `$SKILL_REPO/references/lint-checklist.md`
- Create: `$SKILL_REPO/references/publishing-example.md`
- Create: `$SKILL_REPO/tests/test_repository.py`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-12-public-llm-wiki-skill-design.md` as the behavior and privacy contract; it does not consume private Skill files as source artifacts.
- Produces: a repository root whose `VERSION` is exactly `1.0.0`, and whose public runtime/documentation files can be passed to Tasks 2 and 3.

- [ ] **Step 1: Create an empty repository and write the failing structural test**

Run:

```bash
SKILL_REPO="${SKILL_REPO:-$(dirname "$PWD")/llm-wiki-skill}"
mkdir -p "$SKILL_REPO/tests"
cd "$SKILL_REPO"
git init -b main
```

Create `tests/test_repository.py` with a `unittest.TestCase` that asserts this exact required set exists:

```python
REQUIRED = {
    "SKILL.md", "README.md", "LICENSE", "CHANGELOG.md", "VERSION",
    "templates/SCHEMA.md", "templates/purpose.md", "templates/index.md", "templates/log.md",
    "references/agent-compatibility.md", "references/ingest-workflow.md",
    "references/lint-checklist.md", "references/publishing-example.md",
}
```

The same test must assert `VERSION == "1.0.0\n"`, `SKILL.md` starts with YAML frontmatter containing `name: llm-wiki`, `description:` and `license: MIT`, every relative Markdown link resolves inside the repository, all text decodes as UTF-8, and no tracked text contains CRLF.

- [ ] **Step 2: Run RED**

Run: `python3 -m unittest tests.test_repository -v`

Expected: FAIL listing missing `SKILL.md`, metadata, templates and references.

- [ ] **Step 3: Write the minimum complete public content**

Write `SKILL.md` around the five public operations `initialize`, `ingest`, `query`, `lint`, and `maintain`; require orientation through `purpose.md`, `SCHEMA.md`, `index.md`, and newest-first `log.md`; document Raw、Wiki、Schema, mechanism pages, hubs, bidirectional links, conflicts and explicit user-authorized filesystem scope. Do not include any private path or product-specific publishing command.

Write `README.md` with repository purpose, feature list, audited installation choices, security boundary, `python3 -m unittest discover -s tests -v`, license and attribution to Andrej Karpathy's LLM Wiki pattern. Write `CHANGELOG.md` with a `## [1.0.0] - 2026-07-12` entry and write the full MIT text to `LICENSE`.

Each template must be usable without editing structural syntax: `SCHEMA.md` defines domain/conventions/frontmatter/taxonomy/update policy; `purpose.md` defines goals/questions/scope exclusions; `index.md` defines Entities/Concepts/Comparisons/Queries; `log.md` defines newest-first entry format. References must cover agent compatibility, one source-to-hub ingest, lint severity/checklist, and a platform-neutral `<WIKI_PATH>` to `<SITE_PATH>` publishing example.

- [ ] **Step 4: Run GREEN, create the public GitHub repository, and commit**

Run:

```bash
python3 -m unittest tests.test_repository -v
git diff --check
git add SKILL.md README.md LICENSE CHANGELOG.md VERSION templates references tests/test_repository.py
git commit -m "feat: publish llm wiki skill source"
gh repo create ketitongxue/llm-wiki-skill --public --source=. --remote=origin --push
```

Expected: all tests PASS; `git diff --check` prints nothing; GitHub returns `https://github.com/ketitongxue/llm-wiki-skill`; `git remote get-url origin` is `https://github.com/ketitongxue/llm-wiki-skill.git` and the remote default branch is `main`.

### Task 2: Add stdlib initialization, linting and privacy validation

**Files:**
- Create: `$SKILL_REPO/scripts/init_wiki.py`
- Create: `$SKILL_REPO/scripts/validate.py`
- Create: `$SKILL_REPO/tests/test_init_wiki.py`
- Create: `$SKILL_REPO/tests/test_validate.py`
- Modify: `$SKILL_REPO/README.md`
- Modify: `$SKILL_REPO/references/lint-checklist.md`

**Interfaces:**
- Consumes: Task 1 templates and repository root.
- Produces: `init_wiki.initialize(destination: pathlib.Path, domain: str) -> None`; `validate.validate_repository(root: pathlib.Path) -> list[str]`; both CLIs return exit code `0` on success and non-zero with one diagnostic per line on failure.

- [ ] **Step 1: Write failing behavioral and security tests**

In `tests/test_init_wiki.py`, use `tempfile.TemporaryDirectory()` and assert `initialize()` creates `SCHEMA.md`, `purpose.md`, `index.md`, `log.md`, the four Raw source subdirectories (`articles`, `papers`, `transcripts`, `assets`), and the `entities`, `concepts`, `comparisons`, and `queries` directories; assert the requested domain appears in both Purpose and Schema; assert a second call refuses to overwrite a non-empty directory.

In `tests/test_validate.py`, construct synthetic fixtures instead of embedding real private values. Use code equivalent to:

```python
posix_home = "/".join(["", "Users", "example", "private.md"])
windows_home = "\\\\".join(["C:", "Users", "example", "private.md"])
private_domain = "juzxai" + "lab.com"
private_repository = "my-vitepress" + "-notes"
provider_secret = "sk-" + "test-" + "x" * 24
github_token = "ghp_" + "0" * 36
api_assignment = f'api_key = "{provider_secret}"'
```

Assert rejection of both synthetic home paths, the private marker strings, the API assignment, GitHub token, RSA/EC/OPENSSH PEM headers, absolute Markdown links, unresolved relative links, CRLF and undeclared template placeholders. Add a clean fixture that must return `[]`, and assert diagnostics name only the category and file, never the generated secret value.

- [ ] **Step 2: Run RED**

Run: `python3 -m unittest tests.test_init_wiki tests.test_validate -v`

Expected: ERROR because `scripts.init_wiki` and `scripts.validate` do not exist.

- [ ] **Step 3: Implement the minimum stdlib CLIs**

Implement `scripts/init_wiki.py` with `argparse`, `pathlib`, `shutil.copyfile` and explicit directory creation. Require `--path` and `--domain`; reject an existing non-empty destination; substitute only the documented `{{DOMAIN}}` token and fail if any `{{...}}` token remains.

Implement `scripts/validate.py` with `pathlib`, `re`, `yaml`-frontmatter checks performed with line parsing rather than an external parser, Markdown relative-link resolution, UTF-8/LF enforcement, required file checks, and the exact sensitive categories covered by the tests. Walk only repository files and reject symlinks; exclude `.git/`, `dist/` and `__pycache__/` by exact directory name, not broad content ignores.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/validate.py .
git diff --check
git add scripts tests README.md references/lint-checklist.md
git commit -m "feat: add llm wiki validation tools"
git push origin main
```

Expected: all tests PASS; validator prints `validation passed`; `git diff --check` prints nothing; push updates public `main`.

### Task 3: Build deterministic artifacts and publish `v1.0.0`

**Files:**
- Create: `$SKILL_REPO/scripts/package_release.py`
- Create: `$SKILL_REPO/tests/test_package_release.py`
- Create: `$SKILL_REPO/.github/workflows/test.yml`
- Create: `$SKILL_REPO/.github/workflows/release.yml`
- Modify: `$SKILL_REPO/README.md`

**Interfaces:**
- Consumes: `VERSION`, a fixed `PACKAGE_FILES: tuple[str, ...]`, and Task 2 validation.
- Produces: `package_release.build(root: pathlib.Path, output_dir: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path]`, returning `dist/llm-wiki-skill-v1.0.0.zip` and `dist/SHA256SUMS.txt`.

- [ ] **Step 1: Write the failing deterministic archive tests**

Test that two builds into different temporary directories have byte-identical ZIP files and SHA256 files. Inspect with `zipfile.ZipFile` and assert: every entry begins `llm-wiki/`; `llm-wiki/SKILL.md` exists; names are sorted and unique; no name is absolute or contains `..`; every entry uses timestamp `(1980, 1, 1, 0, 0, 0)`; regular files use mode `0o644`; the exact allowlist contains public docs, templates, references, `scripts/init_wiki.py` and `scripts/validate.py`, but excludes tests, `.git`, `.github`, caches and `dist`.

Extract into a temporary HOME and assert `<HOME>/.codex/skills/llm-wiki/SKILL.md` exists after copying the single extracted `llm-wiki/` directory. Re-run `validate_repository()` against the extracted package.

- [ ] **Step 2: Run RED**

Run: `python3 -m unittest tests.test_package_release -v`

Expected: ERROR because `scripts.package_release` does not exist.

- [ ] **Step 3: Implement deterministic packaging and CI**

Implement `package_release.py` with `zipfile.ZipInfo`, explicit UTF-8 filenames, fixed timestamp, `create_system = 3`, `external_attr = 0o100644 << 16`, sorted allowlist and `hashlib.sha256`. Write exactly one checksum line:

```text
<64 lowercase hex characters>  llm-wiki-skill-v1.0.0.zip
```

`test.yml` must run on pull requests and pushes to `main` with Python 3.12 and execute `python3 -m unittest discover -s tests -v` plus `python3 scripts/validate.py .`.

`release.yml` must trigger only on `v*` tags, verify `VERSION` equals `${GITHUB_REF_NAME#v}`, run the entire test/validation suite, call the packager twice into separate directories, compare both ZIP SHA256 values, and create a GitHub Release containing only the final ZIP and `SHA256SUMS.txt`. Grant only `contents: write`; do not use third-party actions other than version-pinned `actions/checkout` and `actions/setup-python`.

- [ ] **Step 4: Run GREEN, tag, release and perform anonymous acceptance**

Run:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/validate.py .
python3 scripts/package_release.py --output dist
TEMP_DIR="$(mktemp -d)"
python3 scripts/package_release.py --output "$TEMP_DIR"
shasum -a 256 dist/llm-wiki-skill-v1.0.0.zip "$TEMP_DIR/llm-wiki-skill-v1.0.0.zip"
git diff --check
git add scripts tests .github README.md
git commit -m "build: add reproducible llm wiki release"
git push origin main
git tag -a v1.0.0 -m "LLM Wiki Skill v1.0.0"
git push origin v1.0.0
gh run watch --repo ketitongxue/llm-wiki-skill --exit-status
```

Expected: tests and validator PASS; both displayed ZIP hashes match; release workflow succeeds.

Verify the Phase 2 gate:

```bash
gh release view v1.0.0 --repo ketitongxue/llm-wiki-skill --json isDraft,isPrerelease,assets,url
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/SHA256SUMS.txt
```

Expected: `isDraft` and `isPrerelease` are `false`; JSON lists exactly both named assets; both anonymous requests return HTTP 200 or a GitHub redirect ending in HTTP 200. Stop here if any gate fails.

## Phase 2: Integrate the verified Release into the website

### Task 4: Add versioned website pages behind link contracts

**Files:**
- Create: `scripts/llm-wiki-skill-pages.test.mjs`
- Create: `docs/llm-wiki/index.md`
- Create: `docs/llm-wiki/principles.md`
- Create: `docs/llm-wiki/build.md`
- Create: `docs/llm-wiki/install.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: anonymous-access Phase 2 gate from Task 3 and these immutable URLs: repository `https://github.com/ketitongxue/llm-wiki-skill`, fixed release `https://github.com/ketitongxue/llm-wiki-skill/releases/tag/v1.0.0`, latest release `https://github.com/ketitongxue/llm-wiki-skill/releases/latest`, ZIP `https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip`, and checksum `https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/SHA256SUMS.txt`.
- Produces: four buildable VitePress routes and a test script included in `npm test`.

- [ ] **Step 1: Re-run the Release gate and write failing page contracts**

Before editing the website, run the three Task 3 gate commands again. Expected: public non-draft `v1.0.0`, both attachments reachable. Stop on failure.

Create `scripts/llm-wiki-skill-pages.test.mjs` with Node's test runner. Assert all four files exist and have unique H1 titles; every page links back to `/llm-wiki/`; the hub contains exact `v1.0.0` text and the repository/fixed/latest URLs; install contains exact ZIP and checksum URLs plus `shasum -a 256` and `~/.codex/skills/llm-wiki`; principles contains Raw、Wiki、Schema, Karpathy attribution, temporary search, long context and RAG boundaries; build contains Purpose/Schema/Index/Log, one-source ingest, mechanism page, Hub, bidirectional links, lint, conflicts, orphan pages and sensitive-data checks.

Assert `rg --files docs` has no `SKILL.md`, ZIP, `SHA256SUMS.txt`, `templates/` or `scripts/` below `docs/llm-wiki/`. Add `node --test scripts/llm-wiki-skill-pages.test.mjs` to the existing `npm test` chain.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/llm-wiki-skill-pages.test.mjs`

Expected: FAIL because the four Markdown pages do not exist.

- [ ] **Step 3: Write the four concise versioned documents**

Write the hub with problem, audience, five core operations, compact Raw、Wiki、Schema tree, public/private boundary, version and the three actions “查看 GitHub 源码”“查看最新 Release”“开始安装”. Write principles around compiled knowledge, mechanism pages/Hubs, human-Agent division and explicit comparison boundaries. Write build as a complete empty-directory-to-maintenance walkthrough using only `<WIKI_PATH>` and fictional examples. Write install with clone and fixed-Release ZIP flows, SHA256 verification before extraction, Codex verified directory, manual loading for other Agents, natural-language examples and permission limitations.

Do not reproduce full Skill instructions, templates or scripts. Every changing implementation detail must link to the public repository; every page must state that the public repository is the only source of truth where context requires it.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
node --test scripts/llm-wiki-skill-pages.test.mjs
npm run docs:build
git diff --check
git add docs/llm-wiki scripts/llm-wiki-skill-pages.test.mjs package.json
git commit -m "docs: add llm wiki skill guide"
```

Expected: page contracts PASS; VitePress builds all four routes; `git diff --check` prints nothing.

### Task 5: Add stable discovery and run the complete website suite

**Files:**
- Modify: `scripts/llm-wiki-skill-pages.test.mjs`
- Modify: `docs/.vitepress/config.mts`
- Modify: `docs/index.md`

**Interfaces:**
- Consumes: the four Task 4 routes.
- Produces: top navigation item `工具 -> LLM Wiki Skill`, a `/llm-wiki/` sidebar with four entries, and one homepage entry pointing to `/llm-wiki/`.

- [ ] **Step 1: Extend contracts for navigation, sidebar and homepage**

Assert `config.mts` contains a `工具` nav group with an item `{ text: 'LLM Wiki Skill', link: '/llm-wiki/' }`; assert `sidebar['/llm-wiki/']` links exactly the four routes in overview/principles/build/install order; assert `docs/index.md` has one visible `LLM Wiki Skill` anchor to `/llm-wiki/` and does not link directly to GitHub from the homepage.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/llm-wiki-skill-pages.test.mjs`

Expected: FAIL on missing tools navigation, sidebar and homepage entry.

- [ ] **Step 3: Implement the minimum discovery entries**

Add a `工具` nav dropdown without moving the existing knowledge-base dropdown. Add the dedicated four-item sidebar. Add one concise homepage product entry using existing home-page markup and CSS classes so it works in dark/light themes and remains keyboard-focusable; its only destination is `/llm-wiki/`.

- [ ] **Step 4: Run complete verification and commit**

Run:

```bash
node --test scripts/llm-wiki-skill-pages.test.mjs
npm test
npx wrangler deploy --dry-run
git diff --check
git add scripts/llm-wiki-skill-pages.test.mjs docs/.vitepress/config.mts docs/index.md
git commit -m "feat: surface llm wiki skill guide"
```

Expected: contract test and complete `npm test` PASS; VitePress build is included and succeeds; Wrangler prints a successful dry-run bundle without deploying; `git diff --check` prints nothing.

### Task 6: Open the website PR, merge `main`, and verify production

**Files:**
- Review only: all Phase 2 website files changed by Tasks 4 and 5.

**Interfaces:**
- Consumes: two Phase 2 commits, green local verification, existing GitHub and Cloudflare `main` deployment workflow.
- Produces: merged website PR and verified public pages; no direct Cloudflare deployment from the feature branch.

- [ ] **Step 1: Audit scope and repository separation**

Run:

```bash
git status --short
git diff --name-only origin/main...HEAD
git diff --check origin/main...HEAD
git log --oneline origin/main..HEAD
```

Expected: only the four pages, one contract test, `package.json`, VitePress config and homepage are changed; no Skill source, ZIP, SHA256, Worker or generated QA index is present; exactly the intended Phase 2 commits are listed.

- [ ] **Step 2: Push and create the website PR**

Run:

```bash
git push -u origin feature/public-llm-wiki-skill
gh pr create --base main --head feature/public-llm-wiki-skill --title "feat: publish llm wiki skill guide" --body "Adds the versioned LLM Wiki Skill guide after the public v1.0.0 Release became available. The site links GitHub as the sole source and does not mirror Skill artifacts."
gh pr checks --watch
```

Expected: GitHub returns an open PR URL and all configured checks finish successfully. If Cloudflare intentionally only builds `main`, absence of a feature-branch Cloudflare check is not a failure; local dry-run remains required evidence.

- [ ] **Step 3: Merge only after review, then wait for the `main` deployment**

Run:

```bash
gh pr view --json state,isDraft,mergeable,mergeStateStatus,statusCheckRollup,url
gh pr merge --merge --delete-branch
```

Expected before merge: `state` is `OPEN`, `isDraft` is `false`, `mergeable` is `MERGEABLE`, merge state is clean or checks-complete, and required checks are successful. Expected after merge: PR state becomes `MERGED`; Cloudflare receives only the resulting `main` commit.

- [ ] **Step 4: Verify live routes and all external artifacts**

Run:

```bash
SITE_URL="https://juzxailab.com"
curl -fsSI "$SITE_URL/llm-wiki/"
curl -fsSI "$SITE_URL/llm-wiki/principles"
curl -fsSI "$SITE_URL/llm-wiki/build"
curl -fsSI "$SITE_URL/llm-wiki/install"
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/tag/v1.0.0
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/latest
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/llm-wiki-skill-v1.0.0.zip
curl -fsSI https://github.com/ketitongxue/llm-wiki-skill/releases/download/v1.0.0/SHA256SUMS.txt
```

Expected: every request returns HTTP 200 or a documented GitHub redirect ending in HTTP 200. Download both assets to a temporary directory, run `shasum -a 256 -c SHA256SUMS.txt`, and expect `llm-wiki-skill-v1.0.0.zip: OK`; inspect the homepage and all four routes at desktop/mobile widths in both themes, confirming keyboard-visible navigation and no overflow before declaring completion.

## Final Review Checklist

- [ ] Phase 1 and Phase 2 were executed in order; Release availability evidence predates website page creation.
- [ ] Public repository history starts clean and contains no private Skill or knowledge-base history.
- [ ] `v1.0.0` has exactly the ZIP and matching SHA256 attachment, and a clean installation produces `llm-wiki/SKILL.md`.
- [ ] Public repository and extracted package pass structural, privacy, relative-link, UTF-8/LF, symlink and credential checks.
- [ ] Two clean builds of the Release ZIP have identical SHA256 values.
- [ ] Website has exactly four `/llm-wiki/` routes plus Tools/sidebar/home discovery, and no copied Skill artifact.
- [ ] `npm test`, VitePress build, security checks, Wrangler dry-run, Git diff checks, PR checks and production URL checks are green.
- [ ] Existing local Skill, personal wikis, Q&A Worker, quotas and Cloudflare deployment policy are unchanged.
