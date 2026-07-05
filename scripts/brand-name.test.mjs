import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const brandedFiles = [
  'README.md',
  'docs/index.md',
  'docs/about.md',
  'docs/.vitepress/config.mts',
  'worker/deepseek.mjs',
]

for (const file of brandedFiles) {
  test(`${file} uses the AI era brand name`, async () => {
    const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const oldBrand = content.match(/柯提的\s*AI 纪元/u)?.[0] ?? ''
    const currentBrand = content.match(/AI 纪元/u)?.[0] ?? ''

    assert.doesNotMatch(oldBrand, /柯提的\s*AI 纪元/u, `${file} still contains the old brand name`)
    assert.match(currentBrand, /AI 纪元/u, `${file} does not contain the AI era brand name`)
  })
}
