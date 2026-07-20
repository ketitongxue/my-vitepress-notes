import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('knowledge maintenance tooling is an external pinned dependency', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const dependency = packageJson.devDependencies['@ketitongxue/llm-wiki-publisher']
  assert.equal(dependency, 'https://github.com/ketitongxue/llm-wiki-publisher/archive/refs/tags/v1.0.0.tar.gz')
  assert.equal(packageJson.scripts['wiki:sync'], 'llm-wiki-sync')
  assert.equal(packageJson.scripts['wiki:finalize'], 'llm-wiki-finalize')
  assert.equal(packageJson.scripts['wiki:validate'], 'llm-wiki-validate')
  await assert.rejects(access(path.join(root, 'scripts', 'wiki-publish')), /ENOENT/)
})

test('website runtime imports the publisher public API instead of private source paths', async () => {
  for (const relative of [
    'scripts/content-repository/install.mjs',
    'scripts/wiki-qa/indexer.mjs',
    'scripts/wiki-qa/security-scan.mjs',
  ]) {
    const source = await readFile(path.join(root, relative), 'utf8')
    assert.match(source, /@ketitongxue\/llm-wiki-publisher\//)
    assert.doesNotMatch(source, /(?:\.\.\/)+wiki-publish\//)
  }
})
