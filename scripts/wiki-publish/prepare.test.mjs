import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { prepareMirror } from './prepare.mjs'

const SOURCE = `---
title: 测试页
type: concept
tags: [strategy]
created: 2026-07-08
updated: 2026-07-08
sources: [raw/articles/source.md]
confidence: medium
contested: false
---

这是用于测试的中文正文，包含足够多的汉字来满足公开页面校验要求。正文参见 [[other|其他页面]]。^[raw/articles/source.md]
> ^[raw/papers/book.md]
`

async function fixture(t, { body = SOURCE, changed = ['concepts/test.md'] } = {}) {
  const site = await mkdtemp(path.join(tmpdir(), 'finance-prepare-'))
  t.after(() => rm(site, { recursive: true, force: true }))
  await mkdir(path.join(site, '.finance-work', 'source', 'concepts'), { recursive: true })
  await writeFile(path.join(site, '.finance-work', 'source', 'concepts', 'test.md'), body)
  await writeFile(path.join(site, '.finance-work', 'source', 'concepts', 'other.md'), `---\ntitle: 其他\n---\n${'中文内容'.repeat(10)}\n`)
  await writeFile(path.join(site, '.finance-work', 'report.json'), JSON.stringify({ added: [], changed, unchanged: ['concepts/other.md'], deleted: [], inventory: {} }))
  return site
}

test('prepares a deterministic sanitized Finance mirror from the complete inventory', async (t) => {
  const site = await fixture(t)
  await prepareMirror({ collectionName: 'finance', site })
  const output = await readFile(path.join(site, 'docs', 'finance', 'concepts', 'test.md'), 'utf8')
  assert.match(output, /\[其他页面\]\(\/finance\/concepts\/other\)/)
  assert.match(output, /中文正文/)
  for (const privateValue of ['sources:', 'raw/', '[[', '/Users/']) assert.ok(!output.includes(privateValue), privateValue)
  const first = output
  await prepareMirror({ collectionName: 'finance', site })
  assert.equal(await readFile(path.join(site, 'docs', 'finance', 'concepts', 'test.md'), 'utf8'), first)
})

test('rejects unresolved Finance wikilinks without writing the page', async (t) => {
  const site = await fixture(t, { body: SOURCE.replace('[[other|其他页面]]', '[[missing]]') })
  await assert.rejects(prepareMirror({ collectionName: 'finance', site }), /unresolved wikilink.*missing/i)
  await assert.rejects(readFile(path.join(site, 'docs', 'finance', 'concepts', 'test.md')), /ENOENT/)
})

test('refuses mirror preparation for curated Wiki translation mode', async (t) => {
  const site = await fixture(t)
  await assert.rejects(prepareMirror({ collectionName: 'wiki', site }), /mirror/i)
})
