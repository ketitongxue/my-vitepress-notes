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

test('serializes only public fields in deterministic order with safe YAML quoting', () => {
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
title: "Context Engineering"
type: "concept"
tags: ["llm","prompting"]
created: "2026-07-01"
updated: "2026-07-03"
---
`)
})

test('quotes YAML-special scalar and array values and rejects control-character injection', () => {
  assert.equal(serializePublicFrontmatter({
    title: 'A: # [guide] "quoted"',
    tags: ['a,b', '#private', '[bracket]'],
  }), `---
title: "A: # [guide] \\"quoted\\""
tags: ["a,b","#private","[bracket]"]
---
`)

  assert.throws(
    () => serializePublicFrontmatter({ title: 'Public\nsources: [raw/private.md]' }),
    /control character/,
  )
  assert.throws(() => serializePublicFrontmatter({ tags: ['safe', 'bad\u0000tag'] }), /control character/)
})

test('parses BOM, CRLF, quoted commas, and escaped quotes', () => {
  const source = '\uFEFF---\r\ntitle: "A, B"\r\ntags: ["a,b", "say \\"hi\\"", \'single,comma\']\r\n---\r\nBody\r\n'
  assert.deepEqual(parseFrontmatter(source), {
    frontmatter: {
      title: 'A, B',
      tags: ['a,b', 'say "hi"', 'single,comma'],
    },
    body: 'Body\r\n',
  })
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
    'See sources/raw/articles/private.md',
    'See archive/raw/private.md',
    'See /Users/alice/wiki/private.md',
    'See /home/alice/wiki/private.md',
    'See /workspace/secret/file.md',
    'See /custom/path/file.md',
    '路径：/Users/alice/wiki/private.md',
    'path=/custom/path/file.md',
    String.raw`See C:\Users\alice\wiki\private.md`,
    String.raw`路径：C:\Users\alice\wiki\private.md`,
    String.raw`path=C:\Users\alice\wiki\private.md`,
    'See file:///Users/alice/wiki/private.md',
    'See [[private-note]]',
  ]) assert.equal(containsPrivateData(markdown), true, markdown)

  assert.equal(containsPrivateData('See [public note](/wiki/concepts/public-note).'), false)
  assert.equal(containsPrivateData('See /wiki/concepts/public-note.'), false)
  assert.equal(containsPrivateData('See https://example.com/custom/path.'), false)
  assert.equal(containsPrivateData('See http://example.com/Users/alice/wiki.'), false)
  assert.equal(containsPrivateData('See //example.com/Users/alice/wiki.'), false)
  assert.equal(containsPrivateData('See <https://example.com/Users/alice/wiki>. also.'), false)
})
