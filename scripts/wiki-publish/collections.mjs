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
    title: 'AI 知识库',
    description: '面向 AI 编程、智能体工程与产品实践的中文知识库。',
    mode: 'curated',
    featuredSources: Object.freeze([
      'concepts/context-engineering.md',
      'concepts/agent-harness-engineering.md',
      'concepts/rag-context-pruning.md',
    ]),
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
    featuredSources: Object.freeze([
      'concepts/quantitative-investing-knowledge-map.md',
      'concepts/backtesting-bias-and-frictions.md',
      'entities/edward-thorp.md',
    ]),
  }),
})

export function collectionConfig(name) {
  if (!Object.hasOwn(COLLECTIONS, name)) {
    throw new Error(`Unknown wiki collection: ${name}`)
  }
  return Object.freeze({
    ...COLLECTIONS[name],
    featuredSources: Object.freeze([...COLLECTIONS[name].featuredSources]),
  })
}
