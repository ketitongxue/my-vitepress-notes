import { readFileSync } from 'node:fs'
import { validateThemeCss } from './theme-validator.mjs'

const css = readFileSync('docs/.vitepress/theme/custom.css', 'utf8')
validateThemeCss(css)

console.log('theme checks passed')
