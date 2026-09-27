import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const output = new URL('../docs/.vitepress/dist/', import.meta.url)
const read = (path) => readFile(new URL(path, output), 'utf8')
const [home, article, notFound, sitemap, robots, cover] = await Promise.all([
  read('index.html'),
  read('projects/go-tiny-claw.html'),
  read('404.html'),
  read('sitemap.xml'),
  read('robots.txt'),
  readFile(new URL('og-cover.png', output)),
])

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]))
}

function assertPageMetadata(html, url, title, description) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert.ok(head, 'the page must have a server-rendered head')
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag]) => attributes(tag))
  const canonical = tags.filter((tag) => tag.rel === 'canonical')
  assert.equal(canonical.length, 1, 'each page must have exactly one canonical URL')
  assert.equal(canonical[0].href, url)
  for (const [key, expected] of Object.entries({
    'og:url': url,
    'og:title': title,
    'og:description': description,
    'og:image': 'https://juzxailab.com/og-cover.png',
    'og:image:width': '1200',
    'og:image:height': '630',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': 'https://juzxailab.com/og-cover.png',
  })) {
    const matches = tags.filter((tag) => (tag.property || tag.name) === key)
    assert.equal(matches.length, 1, `${key} must appear once in the server-rendered head`)
    assert.equal(matches[0].content, expected, `${key} must describe this page`)
  }
}

assertPageMetadata(home, 'https://juzxailab.com/', 'AI 纪元', '记录 AI、产品与工程实践。')
assertPageMetadata(article, 'https://juzxailab.com/projects/go-tiny-claw', 'go-tiny-claw | AI 纪元', '用 Go 探索 Agent 执行循环、工具调用与工程化边界的个人项目。')
assert.match(home, /<a\b[^>]*href="\/projects\/go-tiny-claw"[^>]*>/, 'the homepage must expose a crawlable article link before interaction')

const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url)
assert.ok(sitemapUrls.includes('https://juzxailab.com/'), 'the sitemap must include the homepage')
assert.ok(sitemapUrls.includes('https://juzxailab.com/projects/go-tiny-claw'), 'the sitemap must include the public article')
assert.ok(sitemapUrls.every((url) => !/^\/admin(?:\/|$)/.test(new URL(url).pathname)), 'admin pages must stay out of the sitemap')
assert.ok(sitemapUrls.every((url) => !/^\/404(?:\.html)?$/.test(new URL(url).pathname)), 'the 404 page must stay out of the sitemap')
// HTTP 404 handles indexing. SSR-only robots tags would outlive the error page
// because VitePress cannot manage them during client-side navigation home.
assert.doesNotMatch(notFound, /<meta\b[^>]*name="robots"/, 'the 404 page must not leak robots metadata into public pages after navigation')
const noScript404 = notFound.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1]
assert.ok(noScript404, 'the 404 page must remain usable without JavaScript')
assert.match(noScript404, /<h1\b[^>]*>页面未找到<\/h1>/, 'the no-JavaScript 404 must explain the missing page')
assert.match(noScript404, /<a\b[^>]*href="\/"[^>]*>返回首页<\/a>/, 'the no-JavaScript 404 must expose a real homepage link')
assert.match(robots, /^Sitemap: https:\/\/juzxailab\.com\/sitemap\.xml$/m)
assert.doesNotMatch(robots, /^Disallow:\s*\/admin/m, 'robots.txt must not prevent crawlers from observing admin noindex metadata')

for (const path of ['admin/home.html', 'admin/personal-os.html', 'admin/private-notes.html']) {
  const html = await read(path)
  assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="noindex,nofollow"/, `${path} must retain noindex`)
}

assert.equal(cover.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'the social cover must be a PNG')
assert.equal(cover.readUInt32BE(16), 1200, 'social cover width must match its metadata')
assert.equal(cover.readUInt32BE(20), 630, 'social cover height must match its metadata')

console.log('SEO SSR checks passed: page metadata, public sitemap, robots, no-JavaScript 404 recovery, crawlable article link and social cover.')
