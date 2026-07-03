import assert from 'node:assert/strict'
import { resolveConfig } from 'vitepress'

const config = await resolveConfig('docs', 'build')

assert.equal(
  config.site.appearance,
  'force-dark',
  'the site must force its dark appearance to match the custom palette'
)

assert.deepEqual(
  config.site.themeConfig.footer,
  {
    message: '持续记录 AI、产品、工程与个人实践之间的连接。',
    copyright: 'Copyright © 2026 柯提'
  },
  'the site must render the configured garden footer'
)

console.log('theme config tests passed')
