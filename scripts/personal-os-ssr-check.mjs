import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../docs/.vitepress/dist/index.html', import.meta.url), 'utf8')

for (const view of ['home', 'knowledge', 'system']) {
  const landmark = new RegExp(`data-os-view="${view}" style=""`)
  if (!landmark.test(html)) throw new Error(`SSR ${view} landmark must remain visible before preflight selection`)
}

const navigation = html.match(/<nav class="bottom-os-navigation"[\s\S]*?<\/nav>/)?.[0]
if (!navigation) throw new Error('SSR Personal OS navigation is missing')
if (!/style=""/.test(navigation) || /display\s*:\s*none/i.test(navigation)) {
  throw new Error('SSR Personal OS navigation must not be hidden inline')
}

for (const view of ['home', 'knowledge', 'system']) {
  if (!new RegExp(`data-os-nav-target="${view}"`).test(navigation)) {
    throw new Error(`SSR Personal OS navigation is missing the ${view} target`)
  }
}

console.log('Personal OS SSR checks passed.')
