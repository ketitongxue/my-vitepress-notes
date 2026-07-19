import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { installFromDirectory } from './install.mjs'

const chinese = '这是公开知识库中的测试正文，用来验证内容仓库安装、校验和原子替换流程能够正常工作。'

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'content-repository-'))
  t.after(() => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true })))
  const source = path.join(root, 'source')
  const site = path.join(root, 'site')
  for (const name of ['wiki', 'finance']) {
    await mkdir(path.join(source, 'docs', name, 'concepts'), { recursive: true })
    await writeFile(path.join(source, 'docs', name, 'index.md'), `# ${name}\n`)
    await writeFile(path.join(source, 'docs', name, 'concepts', 'sample.md'), `---\ntitle: 示例\ntype: concept\ntags: [test]\n---\n\n# 示例\n\n${chinese}\n`)
    await writeFile(path.join(source, `${name}-manifest.json`), `${JSON.stringify({
      version: 1,
      pages: [{
        source: 'concepts/sample.md',
        hash: 'a'.repeat(64),
        publicPath: `docs/${name}/concepts/sample.md`,
        status: 'published',
        syncedAt: '2026-07-19T00:00:00.000Z',
      }],
    }, null, 2)}\n`)
  }
  return { root, site, source }
}

test('installs only the AI collection and removes stale Finance content', async (t) => {
  const { site, source } = await fixture(t)
  await mkdir(path.join(site, 'docs', 'wiki'), { recursive: true })
  await mkdir(path.join(site, 'docs', 'finance'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', 'stale.md'), 'stale')
  await writeFile(path.join(site, 'docs', 'finance', 'stale.md'), 'retired')
  await writeFile(path.join(site, 'finance-manifest.json'), '{}')
  await installFromDirectory({ site, source })
  assert.match(await readFile(path.join(site, 'docs', 'wiki', 'concepts', 'sample.md'), 'utf8'), /公开知识库/)
  await assert.rejects(readFile(path.join(site, 'docs', 'wiki', 'stale.md')), /ENOENT/)
  await assert.rejects(readFile(path.join(site, 'docs', 'finance', 'stale.md')), /ENOENT/)
  await assert.rejects(readFile(path.join(site, 'finance-manifest.json')), /ENOENT/)
})

test('rejects a missing manifest without replacing existing content', async (t) => {
  const { site, source } = await fixture(t)
  await mkdir(path.join(site, 'docs', 'wiki'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', 'sentinel.md'), 'keep me')
  await import('node:fs/promises').then(({ rm }) => rm(path.join(source, 'wiki-manifest.json')))
  await assert.rejects(installFromDirectory({ site, source }), /ENOENT|manifest/)
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'sentinel.md'), 'utf8'), 'keep me')
})

test('rejects symbolic links in public content', async (t) => {
  const { site, source } = await fixture(t)
  await symlink(path.join(source, 'docs', 'wiki', 'concepts', 'sample.md'), path.join(source, 'docs', 'wiki', 'concepts', 'linked.md'))
  await assert.rejects(installFromDirectory({ site, source }), /Symbolic links/)
})

test('rejects executable Markdown without replacing installed content', async (t) => {
  const { site, source } = await fixture(t)
  await mkdir(path.join(site, 'docs', 'wiki'), { recursive: true })
  await writeFile(path.join(site, 'docs', 'wiki', 'sentinel.md'), 'keep me')
  await writeFile(path.join(source, 'docs', 'wiki', 'index.md'), '<script setup>throw new Error()</script>\n')
  await assert.rejects(installFromDirectory({ site, source }), /active HTML element/)
  assert.equal(await readFile(path.join(site, 'docs', 'wiki', 'sentinel.md'), 'utf8'), 'keep me')
})

test('rejects unexpected files in public content', async (t) => {
  const { site, source } = await fixture(t)
  await writeFile(path.join(source, 'docs', 'wiki', 'payload.js'), 'throw new Error()')
  await assert.rejects(installFromDirectory({ site, source }), /Unexpected public-content (?:file|entry)/)
})

test('rejects Markdown outside the public collection sections', async (t) => {
  const { site, source } = await fixture(t)
  await mkdir(path.join(source, 'docs', 'wiki', 'private'), { recursive: true })
  await writeFile(path.join(source, 'docs', 'wiki', 'private', 'payload.md'), '# payload\n')
  await assert.rejects(installFromDirectory({ site, source }), /Unexpected public-content entry/)
})
