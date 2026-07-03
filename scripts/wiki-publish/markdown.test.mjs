import assert from 'node:assert/strict'
import test from 'node:test'

import {
  containsPrivateData,
  convertWikilinks,
  parseFrontmatter,
  serializePublicFrontmatter,
} from './markdown.mjs'

test('parses scalar and inline-array frontmatter while preserving the body', () => {
  const source = `---
title: Context Engineering
type: concept
tags: [llm, "prompting"]
created: 2026-07-01
sources: [raw/article.md]
---
# Heading

Body unchanged.
`

  assert.deepEqual(parseFrontmatter(source), {
    frontmatter: {
      title: 'Context Engineering',
      type: 'concept',
      tags: ['llm', 'prompting'],
      created: '2026-07-01',
      sources: ['raw/article.md'],
    },
    body: '# Heading\n\nBody unchanged.\n',
  })
})

test('serializes only public fields in deterministic order', () => {
  const frontmatter = {
    updated: '2026-07-03',
    sources: ['raw/private.md'],
    title: 'Context Engineering',
    extra: 'secret',
    tags: ['llm', 'prompting'],
    created: '2026-07-01',
    type: 'concept',
  }

  assert.equal(serializePublicFrontmatter(frontmatter), `---
title: Context Engineering
type: concept
tags: [llm, prompting]
created: 2026-07-01
updated: 2026-07-03
---
`)
})

test('converts published and unpublished wikilinks', () => {
  const known = new Map([['context-engineering', '/wiki/concepts/context-engineering']])
  const result = convertWikilinks('见 [[context-engineering|上下文工程]] 和 [[private-note]]。', known)
  assert.equal(result.markdown, '见 [上下文工程](/wiki/concepts/context-engineering) 和 private-note。')
  assert.deepEqual(result.warnings, ['private-note'])
})

test('converts an unlabelled published wikilink', () => {
  const known = new Map([['context-engineering', '/wiki/concepts/context-engineering']])
  assert.deepEqual(convertWikilinks('[[context-engineering]]', known), {
    markdown: '[context-engineering](/wiki/concepts/context-engineering)',
    warnings: [],
  })
})

test('detects private metadata, raw references, absolute paths, and remaining wikilinks', () => {
  for (const markdown of [
    'sources: [article]',
    'See raw/articles/private.md',
    'See /Users/alice/wiki/private.md',
    'See /home/alice/wiki/private.md',
    String.raw`See C:\Users\alice\wiki\private.md`,
    'See [[private-note]]',
  ]) assert.equal(containsPrivateData(markdown), true, markdown)

  assert.equal(containsPrivateData('See [public note](/wiki/concepts/public-note).'), false)
})
