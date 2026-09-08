import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('homepage keeps the AI-era home and Personal OS views', async () => {
  const [page, home, config] = await Promise.all([
    read('docs/index.md'),
    read('docs/.vitepress/theme/components/KnowledgeFactoryHome.vue'),
    read('docs/.vitepress/config.mts'),
  ])
  assert.match(page, /<KnowledgeFactoryHome\s*\/>/)
  assert.match(home, /data-os-view="home"/)
  assert.match(home, /data-os-view="system"/)
  assert.doesNotMatch(home, /KnowledgePortfolio|personal-os-knowledge/)
  assert.doesNotMatch(config, /\/wiki\/|\/ask\/|\/llm-wiki\//)
})

test('public knowledge routes and content artifacts are absent', async () => {
  for (const path of ['docs/ask/index.md', 'docs/llm-wiki/index.md', 'docs/wiki/index.md', 'docs/finance/index.md']) {
    await assert.rejects(access(new URL(path, root)), /ENOENT/)
  }
})

test('private notes and project pages remain available', async () => {
  await assert.doesNotReject(access(new URL('docs/admin/private-notes.md', root)))
  await assert.doesNotReject(access(new URL('docs/projects/go-tiny-claw.md', root)))
  const homeConfig = await read('shared/home-config.mjs')
  assert.match(homeConfig, /private-notes|AI 实验/)
  assert.match(homeConfig, /go-tiny-claw/)
})

console.log('site smoke tests passed')
