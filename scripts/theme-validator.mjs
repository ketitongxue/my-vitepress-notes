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

  for (const [property, value] of [
    ['--vp-c-bg', '#0b1020'],
    ['--vp-c-brand-1', '#8be9d3']
  ]) {
    if (rootDeclarations?.get(property) !== value) {
      throw new Error(`custom.css :root must declare ${property}: ${value}`)
    }
  }

  for (const selector of ['.garden-section', '.garden-list', '.garden-tags']) {
    const rule = findRule(rules, selector)
    if (!rule || parseDeclarations(rule.body).size === 0) {
      throw new Error(`custom.css must contain an active ${selector} rule`)
    }
  }

  const media = '@media (max-width: 720px)'
  const mobileGarden = findRule(rules, '.garden-section', media)
  if (parseDeclarations(mobileGarden?.body ?? '').get('grid-template-columns') !== '1fr') {
    throw new Error(`custom.css ${media} must set .garden-section to one column`)
  }
}
