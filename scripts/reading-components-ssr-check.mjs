import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../docs/.vitepress/dist/projects/go-tiny-claw.html', import.meta.url), 'utf8')

assert.match(html, /<link\b[^>]*href="\/assets\/reading-components\.css"/, 'the independent article loads the shared stylesheet')
assert.match(html, /<div\b[^>]*class="reading-content"/, 'the article provides the shared style scope')
assert.doesNotMatch(html, /<\/?Reading(?:Insight|Steps|Comparison|Code)\b/, 'all article components render on the server')

const insights = [...html.matchAll(/<aside\b[^>]*class="reading-insight"[^>]*>([\s\S]*?)<\/aside>/g)]
assert.equal(insights.length, 2, 'both key context and experimental boundaries are visible before hydration')
assert.ok(insights.some(([aside]) => aside.includes('data-tone="warning"') && aside.includes('并未作为默认启动路径')), 'the integration limitation remains inside the warning')
assert.match(html, /<mark\b[^>]*class="reading-mark">模型、工具、上下文和外部系统之间的边界<\/mark>/)

const steps = html.match(/<ol\b[^>]*class="reading-steps"[^>]*>([\s\S]*?)<\/ol>/)?.[1]
assert.ok(steps, 'the execution flow renders as an ordered list')
assert.equal([...steps.matchAll(/<li\b/g)].length, 4)
for (const step of ['组装上下文', '调用模型', '执行工具', '写回观察']) assert.ok(steps.includes(step), `flow is missing ${step}`)

const panels = [...html.matchAll(/<section\b[^>]*class="reading-comparison__panel[^\"]*"[^>]*>([\s\S]*?)<\/section>/g)]
assert.equal(panels.length, 2, 'both comparison slots render')
assert.match(panels[0][1], /<ul>.*工具执行缺少明确的范围/s)
assert.match(panels[1][1], /<ul>.*先定义工作区、超时/s)

const code = html.match(/<figure\b[^>]*class="reading-code"[^>]*>([\s\S]*?)<\/figure>/)?.[1]
assert.ok(code, 'the code sample renders as a figure')
assert.match(code, /<figcaption\b[^>]*>.*目录结构示意.*text.*<\/figcaption>/s)
assert.equal([...code.matchAll(/<button\b[^>]*class="copy"/g)].length, 1, 'VitePress supplies exactly one copy control')
assert.match(code, /<pre\b[^>]*>.*<code>.*cmd\/claw\/.*internal\/.*<\/code>.*<\/pre>/s)
assert.match(code, /class="reading-code__status"[^>]*role="status"[^>]*aria-live="polite"/, 'copy feedback has a visible, accessible announcement target')

for (const heading of ['我在这个项目里探索什么', '核心结构', '外部系统与实验边界', '我从中得到的几个结论', '下一步', '相关源码入口']) {
  assert.ok(html.includes(`id="${heading}"`) && html.includes(`href="#${heading}"`), `heading anchor is missing: ${heading}`)
}

console.log('Reading component SSR check passed: semantic content, slots, anchors and a single code copy control are present.')
