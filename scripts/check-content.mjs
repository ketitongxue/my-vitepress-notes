import { readFileSync } from 'node:fs'

import { validateNoteSource } from './content-validator.mjs'

const notes = [
  ['docs/notes/sustainable-ai-workflow.md', 'AI 与模型'],
  ['docs/notes/product-validation-loop.md', '产品与设计'],
  ['docs/notes/static-site-delivery.md', '工程实践']
]

for (const [file, tag] of notes) {
  const source = readFileSync(file, 'utf8')
  validateNoteSource(file, source, tag)
}

console.log('content checks passed')
