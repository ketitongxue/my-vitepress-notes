import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const oldBrandPattern = /柯提的\s*AI\s*纪元/u

test('old brand pattern catches the compact spelling', () => {
  assert.match('柯提的AI纪元', oldBrandPattern)
})

const brandedFiles = [
  'README.md',
  'docs/index.md',
  'docs/about.md',
  'docs/.vitepress/config.mts',
  'worker/deepseek.mjs',
]

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).split('\0').filter((file) => (
  file
  && file !== 'scripts/brand-name.test.mjs'
  && !file.startsWith('docs/superpowers/')
))

test('tracked source files do not contain the old brand name', async () => {
  for (const file of trackedFiles) {
    const content = await readFile(resolve(projectRoot, file))
    if (content.includes(0)) continue

    const oldBrand = content.toString('utf8').match(oldBrandPattern)?.[0] ?? ''
    assert.doesNotMatch(oldBrand, oldBrandPattern, `${file} still contains the old brand name`)
  }
})

for (const file of brandedFiles) {
  test(`${file} uses the AI era brand name`, async () => {
    const content = await readFile(resolve(projectRoot, file), 'utf8')
    const oldBrand = content.match(oldBrandPattern)?.[0] ?? ''
    const currentBrand = content.match(/AI 纪元/u)?.[0] ?? ''

    assert.doesNotMatch(oldBrand, oldBrandPattern, `${file} still contains the old brand name`)
    assert.match(currentBrand, /AI 纪元/u, `${file} does not contain the AI era brand name`)
  })
}
