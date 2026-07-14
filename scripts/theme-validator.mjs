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
          declaration.slice(separator + 1).trim(),
        ]
      }),
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

function matchingRules(rules, selector, ancestor) {
  return rules.filter((rule) => {
    if (!rule.selectors.includes(selector)) return false
    if (ancestor === undefined) return rule.ancestors.length === 0
    return rule.ancestors.length === 1 && rule.ancestors[0] === ancestor
  })
}

function requireRule(rules, selector, ancestor) {
  const matches = matchingRules(rules, selector, ancestor)
  if (matches.length !== 1) {
    const context = ancestor ?? 'top level'
    throw new Error(`custom.css must contain exactly one ${selector} rule in ${context}`)
  }
  return matches[0]
}

function includesDeclaration(rules, selector, property, value, ancestor) {
  return matchingRules(rules, selector, ancestor)
    .some((rule) => parseDeclarations(rule.body).get(property) === value)
}

function isPersonalOsSelector(selector) {
  return /\.(?:macbook-boot|desktop-surface|desktop-icon|window-manager|bottom-os-navigation|knowledge-portfolio|infinite-canvas|canvas-card|canvas-connections|canvas-layers|canvas-minimap|canvas-controls)(?:$|[_-]|[\s.:#\[])/.test(selector)
}

function isPersonalOsScoped(selector) {
  return /^(?:\.factory-home|\.knowledge-factory-page|\.personal-system-view)(?:$|[\s.:#\[])/.test(selector)
}

function isStrongShadow(value) {
  if (!value || value === 'none') return false
  if (/(?:#315EFB|#F2C94C|#EF7B45|#3FAE78|#2B7FD8)/i.test(value)) return true
  return [...value.matchAll(/-?\d+(?:\.\d+)?px/g)]
    .some((match) => Math.abs(Number.parseFloat(match[0])) > 12)
}

const mobileMedia = '@media (max-width: 767px)'
const reducedMedia = '@media (prefers-reduced-motion: reduce)'

export function validateThemeCss(source) {
  const css = stripComments(source)
  const rules = parseRules(css)
  const rootDeclarations = parseDeclarations(requireRule(rules, ':root').body)
  const darkDeclarations = parseDeclarations(requireRule(rules, '.dark').body)

  for (const [property, value] of [
    ['--vp-c-bg', '#f6f3ea'],
    ['--vp-c-brand-1', '#275dad'],
  ]) {
    if (rootDeclarations.get(property) !== value) {
      throw new Error(`custom.css :root must declare ${property}: ${value}`)
    }
  }

  for (const [property, value] of [
    ['--vp-c-bg', '#0b1020'],
    ['--vp-c-brand-1', '#8aa8ff'],
  ]) {
    if (darkDeclarations.get(property) !== value) {
      throw new Error(`custom.css .dark must declare ${property}: ${value}`)
    }
  }

  const factoryTokens = [
    '--factory-bg', '--factory-surface', '--factory-surface-muted', '--factory-ink',
    '--factory-ink-muted', '--factory-border', '--factory-brand', '--factory-data',
    '--factory-signal', '--factory-terminal', '--factory-terminal-ink', '--factory-focus',
  ]
  for (const [palette, declarations] of [[':root', rootDeclarations], ['.dark', darkDeclarations]]) {
    for (const token of factoryTokens) {
      if (!declarations.get(token)) throw new Error(`custom.css ${palette} must declare ${token}`)
    }
  }

  const osSource = source.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1]
  if (!osSource) throw new Error('custom.css must contain the scoped Personal OS block')
  const osCss = stripComments(osSource)
  const osRules = parseRules(osCss)

  for (const rule of osRules) {
    for (const selector of rule.selectors) {
      if (isPersonalOsSelector(selector) && !isPersonalOsScoped(selector)) {
        throw new Error(`Personal OS selector ${selector} must be homepage scoped`)
      }
    }
    if (isStrongShadow(parseDeclarations(rule.body).get('box-shadow'))) {
      throw new Error('Personal OS must not use a strong or saturated box-shadow')
    }
  }

  for (const selector of [
    '.factory-home .macbook-boot',
    '.factory-home .desktop-surface',
    '.factory-home .desktop-surface__menu',
    '.factory-home .desktop-icon',
    '.factory-home .window-manager__window',
    '.factory-home .bottom-os-navigation',
    '.factory-home .knowledge-portfolio',
    '.factory-home .infinite-canvas',
    '.factory-home .canvas-card',
    '.factory-home .canvas-layers',
    '.factory-home .canvas-minimap',
    '.factory-home .canvas-controls',
  ]) requireRule(osRules, selector)

  for (const color of ['#F7F4EC', '#FFFDF7', '#1E2430', '#69707D', '#315EFB', '#F4D758', '#EF7B45', '#3FAE78', '#192232', '#2B7FD8']) {
    if (!new RegExp(color, 'i').test(osSource)) throw new Error(`Personal OS palette must include ${color}`)
  }

  if (/linear-gradient|radial-gradient|backdrop-filter|\bstars?\b|sparkle|particle|illustration|character-art/i.test(osCss)) {
    throw new Error('Personal OS must not use gradients, stars, particles, or illustrations')
  }

  const menu = parseDeclarations(requireRule(osRules, '.factory-home .desktop-surface__menu').body)
  if (menu.get('height') !== '30px') throw new Error('Personal OS menu must be exactly 30px high')

  if (!includesDeclaration(osRules, '.factory-home .desktop-surface__workspace', 'height', 'calc(100vh - 30px)')
    || !includesDeclaration(osRules, '.factory-home .desktop-surface__workspace', 'height', 'calc(100dvh - 30px)')) {
    throw new Error('Personal OS workspace must include 100vh and 100dvh geometry')
  }

  const window = parseDeclarations(requireRule(osRules, '.factory-home .window-manager__window').body)
  if (window.get('min-width') !== '280px' || window.get('min-height') !== '200px') {
    throw new Error('Personal OS windows must keep the 280 x 200 minimum')
  }

  const mobileRoot = parseDeclarations(requireRule(osRules, '.factory-home', mobileMedia).body)
  if (mobileRoot.get('overflow-x') !== 'clip') {
    throw new Error('Personal OS mobile root must prevent horizontal overflow')
  }
  const mobileControl = parseDeclarations(requireRule(osRules, '.factory-home .canvas-controls button', mobileMedia).body)
  if (mobileControl.get('min-width') !== '44px' || mobileControl.get('min-height') !== '44px') {
    throw new Error('Personal OS mobile controls must keep a 44px hit area')
  }

  const focusRules = osRules.filter((rule) => rule.selectors.some((selector) => selector.includes(':focus-visible')))
  if (!focusRules.some((rule) => parseDeclarations(rule.body).has('outline'))) {
    throw new Error('Personal OS must provide visible focus rules')
  }

  const reducedRules = osRules.filter((rule) => rule.ancestors.includes(reducedMedia))
  if (!reducedRules.some((rule) => {
    const declarations = parseDeclarations(rule.body)
    return declarations.get('animation') === 'none !important'
      && declarations.get('transition') === 'none !important'
  })) throw new Error('Personal OS must include reduced-motion coverage')

  const pageWideTouchAction = osRules.some((rule) => {
    if (parseDeclarations(rule.body).get('touch-action') !== 'none') return false
    return rule.selectors.some((selector) => /^(?:html|body|\.factory-home|\.knowledge-factory-page|\.personal-system-view)(?:$|[\s.:#\[])/.test(selector))
  })
  if (pageWideTouchAction) throw new Error('Personal OS must not disable touch action page-wide')
}
