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

function delayInMilliseconds(value) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(ms|s)$/)
  if (!match) return undefined
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1)
}

export function validateThemeCss(source) {
  const css = stripComments(source)
  const rules = parseRules(css)
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

  const placementSelectors = [
    '.profile-card', '.current-status-card', '.featured-project-card', '.project-folder',
    '.notes-launcher', '.lab-launcher', '.contact-terminal', '.canvas-controls'
  ]
  for (const selector of ['.desktop-canvas', '.system-topbar', ...placementSelectors, '.factory-boot']) {
    const rule = findRule(rules, selector)
    if (!rule || parseDeclarations(rule.body).size === 0) {
      throw new Error(`custom.css must contain an active ${selector} rule`)
    }
  }

  const topbarDeclarations = parseDeclarations(findRule(rules, '.system-topbar')?.body ?? '')
  if (topbarDeclarations.get('position') !== 'fixed') {
    throw new Error('Personal OS topbar must use fixed positioning')
  }

  const canvasDeclarations = parseDeclarations(findRule(rules, '.desktop-canvas')?.body ?? '')
  if (canvasDeclarations.get('display') !== 'grid'
    || canvasDeclarations.get('grid-template-columns') !== 'repeat(14, minmax(0, 1fr))') {
    throw new Error('Personal OS desktop canvas must use a 14-column grid')
  }

  const entranceDelays = []
  for (const selector of placementSelectors) {
    if (!parseDeclarations(findRule(rules, selector)?.body ?? '').get('grid-column')) {
      throw new Error(`Personal OS placement ${selector} must declare grid-column`)
    }
    const stagger = findRule(rules, `.factory-home.is-entering ${selector}`)
    const delay = parseDeclarations(stagger?.body ?? '').get('animation-delay')
    if (!delay) {
      throw new Error(`Personal OS entrance must stagger ${selector}`)
    }
    entranceDelays.push(delayInMilliseconds(delay))
  }
  if (entranceDelays.some((delay) => delay === undefined)
    || entranceDelays.some((delay, index) => index > 0 && delay <= entranceDelays[index - 1])) {
    throw new Error('Personal OS entrance delays must be distinct and strictly increasing')
  }

  const splash = findRule(rules, '.factory-boot')
  const splashDeclarations = parseDeclarations(splash?.body ?? '')
  if (splashDeclarations.get('position') !== 'fixed' || splashDeclarations.get('inset') !== '0') {
    throw new Error('factory splash must use fixed positioning and inset: 0')
  }
  if (splashDeclarations.get('background') !== '#F7F4EC' || splashDeclarations.get('color') !== '#1E2430') {
    throw new Error('factory splash must use the approved fixed palette')
  }
  if (splashDeclarations.get('transition') !== 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)') {
    throw new Error('factory splash must use the approved 400ms exit')
  }

  const accessButton = findRule(rules, '.factory-boot__access')
  const accessDeclarations = parseDeclarations(accessButton?.body ?? '')
  if (accessDeclarations.get('min-width') !== '44px' || accessDeclarations.get('min-height') !== '44px') {
    throw new Error('factory splash access button must keep a 44px hit area')
  }

  const mobileMedia = '@media (max-width: 767px)'
  const mobileCanvas = findRule(rules, '.desktop-canvas', mobileMedia)
  if (parseDeclarations(mobileCanvas?.body ?? '').get('grid-template-columns') !== '1fr') {
    throw new Error(`custom.css ${mobileMedia} must set .desktop-canvas to one column`)
  }

  const reducedMedia = '@media (prefers-reduced-motion: reduce)'
  for (const selector of [
    '.factory-home.is-entering .system-topbar',
    '.factory-home.is-entering .desktop-canvas > *'
  ]) {
    const reducedFactory = findRule(rules, selector, reducedMedia)
    const reducedDeclarations = parseDeclarations(reducedFactory?.body ?? '')
    if (reducedDeclarations.get('animation') !== 'none !important'
      || reducedDeclarations.get('transition') !== 'none !important'
      || reducedDeclarations.get('transform') !== 'none !important') {
      throw new Error(`custom.css reduced-motion media must reset animation, transition, and transform for ${selector}`)
    }
  }
  const reducedSplash = findRule(rules, '.factory-boot', reducedMedia)
  const reducedSplashDeclarations = parseDeclarations(reducedSplash?.body ?? '')
  if (reducedSplashDeclarations.get('animation') !== 'none !important'
    || reducedSplashDeclarations.get('transition') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress splash motion')
  }
  const reducedCursor = findRule(rules, '.factory-boot__cursor', reducedMedia)
  if (parseDeclarations(reducedCursor?.body ?? '').get('animation') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress cursor motion')
  }

  if (/cursor\s*:\s*(?:grab|grabbing)|touch-action\s*:\s*none|\b(?:pointerdown|pointermove|wheel)\b/i.test(css)) {
    throw new Error('custom.css must not enable drag or zoom behavior')
  }
}
