function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseDeclarations(body) {
  return new Map(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const separator = declaration.indexOf(':')
        return [
          declaration.slice(0, separator).trim(),
          declaration.slice(separator + 1).trim()
        ]
      })
  )
}

function parseRules(css, ancestors = []) {
  const rules = []
  let cursor = 0

  while (cursor < css.length) {
    const open = css.indexOf('{', cursor)
    if (open === -1) break

    const prelude = css.slice(cursor, open).trim()
    let depth = 1
    let close = open + 1

    while (close < css.length && depth > 0) {
      if (css[close] === '{') depth += 1
      if (css[close] === '}') depth -= 1
      close += 1
    }

    if (depth !== 0) throw new Error('custom.css contains an unclosed rule block')

    const body = css.slice(open + 1, close - 1)
    if (prelude.startsWith('@')) {
      rules.push(...parseRules(body, [...ancestors, prelude]))
    } else if (prelude) {
      rules.push({ selectors: prelude.split(',').map((selector) => selector.trim()), body, ancestors })
    }

    cursor = close
  }

  return rules
}

function findRule(rules, selector, ancestor) {
  return rules.find((rule) =>
    rule.selectors.includes(selector) &&
    (ancestor === undefined || rule.ancestors.includes(ancestor))
  )
}

export function validateThemeCss(source) {
  const rules = parseRules(stripComments(source))
  const root = findRule(rules, ':root')
  const rootDeclarations = root && parseDeclarations(root.body)
  const dark = findRule(rules, '.dark')
  const darkDeclarations = dark && parseDeclarations(dark.body)

  for (const [property, value] of [
    ['--vp-c-bg', '#f6f3ea'],
    ['--vp-c-brand-1', '#275dad']
  ]) {
    if (rootDeclarations?.get(property) !== value) {
      throw new Error(`custom.css :root must declare ${property}: ${value}`)
    }
  }

  for (const [property, value] of [
    ['--vp-c-bg', '#0b1020'],
    ['--vp-c-brand-1', '#8aa8ff']
  ]) {
    if (darkDeclarations?.get(property) !== value) {
      throw new Error(`custom.css .dark must declare ${property}: ${value}`)
    }
  }

  const factoryTokens = [
    '--factory-bg', '--factory-surface', '--factory-surface-muted', '--factory-ink',
    '--factory-ink-muted', '--factory-border', '--factory-brand', '--factory-data',
    '--factory-signal', '--factory-terminal', '--factory-terminal-ink', '--factory-focus'
  ]
  for (const [palette, declarations] of [[':root', rootDeclarations], ['.dark', darkDeclarations]]) {
    for (const token of factoryTokens) {
      if (!declarations?.get(token)) {
        throw new Error(`custom.css ${palette} must declare ${token}`)
      }
    }
  }

  for (const selector of ['.factory-status', '.factory-hero', '.factory-modules__grid', '.factory-module', '.factory-boot']) {
    const rule = findRule(rules, selector)
    if (!rule || parseDeclarations(rule.body).size === 0) {
      throw new Error(`custom.css must contain an active ${selector} rule`)
    }
  }

  const mobileMedia = '@media (max-width: 639px)'
  const mobileModules = findRule(rules, '.factory-modules__grid', mobileMedia)
  if (parseDeclarations(mobileModules?.body ?? '').get('grid-template-columns') !== '1fr') {
    throw new Error(`custom.css ${mobileMedia} must set .factory-modules__grid to one column`)
  }

  const reducedMedia = '@media (prefers-reduced-motion: reduce)'
  const reducedFactory = findRule(rules, '.factory-home *', reducedMedia)
  const reducedDeclarations = parseDeclarations(reducedFactory?.body ?? '')
  if (reducedDeclarations.get('animation') !== 'none !important' || reducedDeclarations.get('transition') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress factory animation and transition')
  }
}
