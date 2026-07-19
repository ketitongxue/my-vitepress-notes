import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { sidebarFor } from '../docs/.vitepress/knowledge-navigation.mjs'

async function fixture(t, indexLink = '/wiki/concepts/sample') {
  const root = await mkdtemp(path.join(tmpdir(), 'knowledge-navigation-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs', 'wiki'), { recursive: true })
  await writeFile(path.join(root, 'wiki-manifest.json'), JSON.stringify({
    version: 1,
    pages: [{ publicPath: 'docs/wiki/concepts/sample.md' }],
  }))
  await writeFile(path.join(root, 'docs', 'wiki', 'index.md'), [
    '# Wiki',
    '## 实体',
    '## 概念',
    `- [示例](${indexLink})`,
    '## 对比分析',
  ].join('\n'))
  return root
}

test('build navigation matches the manifest link set exactly', async (t) => {
  const root = await fixture(t)
  assert.equal(sidebarFor('wiki', root)[1].items[0].link, '/wiki/concepts/sample')
})

test('build navigation rejects a same-sized stale link set', async (t) => {
  const root = await fixture(t, '/wiki/concepts/stale')
  assert.throws(() => sidebarFor('wiki', root), /navigation and manifest are inconsistent/)
})
