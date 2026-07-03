import assert from 'node:assert/strict'

import { validateNoteSource } from './content-validator.mjs'

const validSource = `---
title: 示例标题
date: 2026-07-02
description: 示例描述
tags:
  - AI 与模型
---

# 示例标题

## 关联笔记
`

assert.doesNotThrow(() => validateNoteSource('valid.md', validSource, 'AI 与模型'))

assert.throws(
  () => validateNoteSource(
    'empty-title.md',
    validSource.replace('title: 示例标题', 'title:'),
    'AI 与模型'
  ),
  /title: 值为空/
)

assert.throws(
  () => validateNoteSource(
    'body-tag.md',
    validSource.replace('  - AI 与模型\n---', '  - 其他标签\n---') + '\n  - AI 与模型\n',
    'AI 与模型'
  ),
  /frontmatter 缺少主题标签 AI 与模型/
)

console.log('content validator tests passed')
