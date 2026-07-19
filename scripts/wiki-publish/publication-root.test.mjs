import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { publicationRoot, requiredPublicationRoot } from './publication-root.mjs'

test('publicationRoot defaults to the current website checkout', () => {
  assert.equal(publicationRoot({}, '/workspace/site'), '/workspace/site')
})

test('publicationRoot resolves an independent content checkout', () => {
  assert.equal(
    publicationRoot({ PUBLICATION_ROOT: '../juzxailab-content' }, '/workspace/site'),
    path.resolve('/workspace/juzxailab-content'),
  )
})

test('publication commands require an explicit independent content checkout', () => {
  assert.throws(
    () => requiredPublicationRoot({}, '/workspace/site'),
    /PUBLICATION_ROOT is required/,
  )
  assert.equal(
    requiredPublicationRoot({ PUBLICATION_ROOT: '../juzxailab-content' }, '/workspace/site'),
    path.resolve('/workspace/juzxailab-content'),
  )
})
