import assert from 'node:assert/strict'
import test from 'node:test'

import { collectionConfig } from './collections.mjs'

test('collectionConfig returns the existing wiki publication configuration', () => {
  assert.deepEqual(collectionConfig('wiki'), {
    name: 'wiki',
    envKey: 'LLM_WIKI_PATH',
    docsDirectory: 'wiki',
    manifestFile: 'wiki-manifest.json',
    workDirectory: '.wiki-work',
    lockName: '.wiki-sync.lock',
    publishPrefix: '.wiki-publish',
    urlPrefix: '/wiki',
    title: 'LLM Wiki 中文知识库',
    description: '面向 AI 编程、智能体工程与产品实践的中文知识库。',
    mode: 'curated',
  })
})

test('collectionConfig returns the finance publication configuration', () => {
  assert.deepEqual(collectionConfig('finance'), {
    name: 'finance',
    envKey: 'FINANCE_WIKI_PATH',
    docsDirectory: 'finance',
    manifestFile: 'finance-manifest.json',
    workDirectory: '.finance-work',
    lockName: '.finance-sync.lock',
    publishPrefix: '.finance-publish',
    urlPrefix: '/finance',
    title: '金融知识库',
    description: '量化交易、金融市场、投资与风险管理知识库。',
    mode: 'mirror',
  })
})

test('collectionConfig returns defensive frozen objects', () => {
  const first = collectionConfig('finance')
  const second = collectionConfig('finance')

  assert.equal(Object.isFrozen(first), true)
  assert.notEqual(first, second)
  assert.throws(() => {
    first.docsDirectory = 'wiki'
  }, TypeError)
  assert.equal(second.docsDirectory, 'finance')
})

test('collectionConfig rejects unknown collection names', () => {
  assert.throws(() => collectionConfig('unknown'), /Unknown wiki collection/)
})
