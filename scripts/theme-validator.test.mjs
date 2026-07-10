import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./check-theme.mjs', import.meta.url))

function runChecker(css) {
  const directory = mkdtempSync(join(tmpdir(), 'theme-validator-'))
  const themeDirectory = join(directory, 'docs/.vitepress/theme')
  mkdirSync(themeDirectory, { recursive: true })
  writeFileSync(join(themeDirectory, 'custom.css'), css)

  try {
    return spawnSync(process.execPath, [checker], {
      cwd: directory,
      encoding: 'utf8'
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const switchableTheme = `
:root {
  --vp-c-bg: #f7f9fc;
  --vp-c-brand-1: #137f6b;
}
.dark {
  --vp-c-bg: #0b1020;
  --vp-c-brand-1: #8be9d3;
}
.garden-section { display: grid; }
.garden-list { margin: 0; }
.garden-tags { color: teal; }
@media (max-width: 720px) {
  .garden-section { grid-template-columns: 1fr; }
}
`

assert.equal(
  runChecker(switchableTheme).status,
  0,
  'light root and dark override palettes must pass validation'
)

const commentedTheme = `
/*
:root {
  --vp-c-bg: #0b1020;
  --vp-c-brand-1: #8be9d3;
}
.garden-section {}
.garden-list {}
.garden-tags {}
@media (max-width: 720px) {}
*/
`

assert.notEqual(
  runChecker(commentedTheme).status,
  0,
  'commented-out declarations and selectors must fail validation'
)

const missingDarkTheme = `
:root {
  --vp-c-bg: #f7f9fc;
  --vp-c-brand-1: #137f6b;
}
.garden-section { display: grid; }
.garden-list { margin: 0; }
.garden-tags { color: teal; }
@media (max-width: 720px) {
  .garden-section { grid-template-columns: 1fr; }
}
`

const missingDarkResult = runChecker(missingDarkTheme)
assert.notEqual(missingDarkResult.status, 0, 'missing dark palette anchors must fail validation')
assert.match(missingDarkResult.stderr, /custom\.css \.dark must declare --vp-c-bg/)

const misplacedMobileRule = `
:root {
  --vp-c-bg: #f7f9fc;
  --vp-c-brand-1: #137f6b;
}
.dark {
  --vp-c-bg: #0b1020;
  --vp-c-brand-1: #8be9d3;
}
.garden-list { margin: 0; }
.garden-tags { color: teal; }
@media (max-width: 720px) {}
.garden-section {
  display: grid;
  grid-template-columns: 1fr;
}
`

const misplacedMobileResult = runChecker(misplacedMobileRule)
assert.notEqual(misplacedMobileResult.status, 0, 'the mobile garden-section declaration must be inside its media query')
assert.match(misplacedMobileResult.stderr, /must set \.garden-section to one column/)

console.log('theme validator tests passed')
