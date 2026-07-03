export function validateNoteSource(file, source, expectedTag) {
  const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
  if (!frontmatterMatch) {
    throw new Error(`${file} 缺少有效的初始 frontmatter`)
  }

  const frontmatter = frontmatterMatch[1]
  for (const field of ['title', 'date', 'description']) {
    if (!new RegExp(`^${field}:[ \\t]*\\S.*$`, 'm').test(frontmatter)) {
      throw new Error(`${file} frontmatter 字段 ${field}: 值为空或缺失`)
    }
  }

  const lines = frontmatter.split('\n')
  const tagsStart = lines.findIndex((line) => /^tags:\s*$/.test(line))
  if (tagsStart === -1) {
    throw new Error(`${file} frontmatter 缺少 tags: 字段`)
  }

  const tagsEndOffset = lines.slice(tagsStart + 1).findIndex((line) => /^\S/.test(line))
  const tagsEnd = tagsEndOffset === -1 ? lines.length : tagsStart + 1 + tagsEndOffset
  const tagLines = lines.slice(tagsStart + 1, tagsEnd)
  if (!tagLines.includes(`  - ${expectedTag}`)) {
    throw new Error(`${file} frontmatter 缺少主题标签 ${expectedTag}`)
  }

  const body = source.slice(frontmatterMatch[0].length)
  if (!/^## 关联笔记\s*$/m.test(body)) {
    throw new Error(`${file} 正文缺少关联笔记章节`)
  }
}
