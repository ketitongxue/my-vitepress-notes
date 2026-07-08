const COLLECTIONS = Object.freeze({
  wiki: Object.freeze({
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
  }),
  finance: Object.freeze({
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
  }),
})

export function collectionConfig(name) {
  if (!Object.hasOwn(COLLECTIONS, name)) {
    throw new Error(`Unknown wiki collection: ${name}`)
  }
  return Object.freeze({ ...COLLECTIONS[name] })
}
