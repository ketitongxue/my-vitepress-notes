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

function assertAllowedAncestorContexts(rules, selector, allowedAncestors) {
  for (const rule of rules.filter((candidate) => candidate.selectors.includes(selector))) {
    const ancestor = rule.ancestors.length === 0 ? 'top level' : rule.ancestors.join(' > ')
    if (!allowedAncestors.includes(ancestor)) {
      throw new Error(`Personal OS contract selector ${selector} uses unexpected ancestor context ${ancestor}`)
    }
  }
}

function delayInMilliseconds(value) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(ms|s)$/)
  if (!match) return undefined
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1)
}

const revealAnimation = 'personal-os-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both'
const baseFontFamily = 'var(--vp-font-family-base)'
const monoFontFamily = '"JetBrains Mono", "Fira Code", Consolas, monospace'
const topLevel = 'top level'
const mobileMedia = '@media (max-width: 767px)'
const reducedMedia = '@media (prefers-reduced-motion: reduce)'
const splashWideMedia = '@media (min-width: 640px)'

function isHomepageScoped(selector) {
  return /^(?:\.factory-home|\.knowledge-factory-page)(?:$|[\s.:#\[])/.test(selector)
}

function hasExactDeclarations(rule, expected) {
  const declarations = parseDeclarations(rule?.body ?? '')
  return declarations.size === expected.length
    && expected.every(([property, value]) => declarations.get(property) === value)
}

function requireFontFamily(rules, selector, expected, message) {
  const declarations = rules
    .filter((rule) => rule.selectors.includes(selector))
    .map((rule) => parseDeclarations(rule.body).get('font-family'))
    .filter(Boolean)
  if (declarations.length !== 1 || declarations[0] !== expected) {
    throw new Error(message)
  }
}

function isStrongShadow(value) {
  if (!value || value === 'none') return false
  if (/(?:#315EFB|#F2C94C|#EF7B45|#3FAE78|var\(--os-(?:blue|yellow|orange|green)\))/i.test(value)) {
    return true
  }
  return [...value.matchAll(/-?\d+(?:\.\d+)?px/g)]
    .some((match) => Math.abs(Number.parseFloat(match[0])) > 3)
}

export function validateThemeCss(source) {
  const css = stripComments(source)
  const rules = parseRules(css)
  assertAllowedAncestorContexts(rules, ':root', [topLevel])
  assertAllowedAncestorContexts(rules, '.dark', [topLevel])
  const root = requireRule(rules, ':root')
  const rootDeclarations = parseDeclarations(root.body)
  const dark = requireRule(rules, '.dark')
  const darkDeclarations = parseDeclarations(dark.body)

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

  const osSource = source.match(/\/\* Personal OS start \*\/([\s\S]*?)\/\* Personal OS end \*\//)?.[1]
  if (!osSource) throw new Error('custom.css must contain the scoped Personal OS block')
  const osCss = stripComments(osSource)
  const osRules = parseRules(osCss)
  const homepageClassNames = [
    'system-topbar', 'desktop-canvas', 'profile-card', 'current-status-card',
    'featured-project-card', 'project-folder', 'notes-launcher', 'lab-launcher',
    'contact-terminal', 'canvas-controls'
  ]
  for (const rule of osRules) {
    for (const selector of rule.selectors) {
      if (homepageClassNames.some((name) => selector.includes(`.${name}`))
        && !isHomepageScoped(selector)) {
        throw new Error(`Personal OS selector ${selector} must be homepage scoped`)
      }
    }
    if (isStrongShadow(parseDeclarations(rule.body).get('box-shadow'))) {
      throw new Error('Personal OS must not use a strong or saturated box-shadow')
    }
  }
  for (const color of ['#F7F4EC', '#FFFDF7', '#1E2430', '#69707D', '#315EFB', '#F2C94C', '#EF7B45', '#3FAE78', '#192232']) {
    if (!new RegExp(color, 'i').test(osSource)) throw new Error(`Personal OS palette must include ${color}`)
  }
  if (/linear-gradient|backdrop-filter|cursor\s*:\s*(?:grab|grabbing|zoom-in|zoom-out)|touch-action\s*:\s*none|\b(?:pointerdown|pointermove|wheel)\b/i.test(osSource)) {
    throw new Error('custom.css must not enable drag or zoom behavior')
  }

  requireFontFamily(
    osRules,
    '.factory-home',
    baseFontFamily,
    'Personal OS root must use the VitePress base font',
  )
  const sansBodySelectors = [
    '.factory-home .profile-card__summary',
    '.factory-home .current-status-card dd',
    '.factory-home .featured-project-card h2',
    '.factory-home .featured-project-card h2 + p',
    '.factory-home .notes-launcher li',
    '.factory-home .lab-launcher li',
  ]
  for (const selector of sansBodySelectors) {
    requireFontFamily(
      osRules,
      selector,
      baseFontFamily,
      `Personal OS Chinese body text must use the VitePress base font: ${selector}`,
    )
  }
  const monoSystemSelectors = [
    '.factory-home .system-topbar',
    '.factory-home .profile-card__eyebrow',
    '.factory-home .profile-card h1',
    '.factory-home .profile-card__role',
    '.factory-home .profile-card__specialty',
    '.factory-home .profile-card__about',
    '.factory-home .profile-card__projects',
    '.factory-home .current-status-card h2',
    '.factory-home .project-folder h2',
    '.factory-home .notes-launcher h2',
    '.factory-home .lab-launcher h2',
    '.factory-home .current-status-card dt',
    '.factory-home .featured-project-card > p:first-child',
    '.factory-home .featured-project-card dl',
    '.factory-home .featured-project-card a',
    '.factory-home .project-folder',
    '.factory-home .project-folder li span',
    '.factory-home .notes-launcher li span',
    '.factory-home .lab-launcher li span',
    '.factory-home .contact-terminal',
    '.factory-home .canvas-controls',
  ]
  for (const selector of monoSystemSelectors) {
    requireFontFamily(
      osRules,
      selector,
      monoFontFamily,
      `Personal OS system text must use the exact monospace stack: ${selector}`,
    )
  }
  const allowedMonoSelectors = new Set(monoSystemSelectors)
  for (const rule of osRules) {
    if (parseDeclarations(rule.body).get('font-family') !== monoFontFamily) continue
    for (const selector of rule.selectors) {
      if (!allowedMonoSelectors.has(selector)) {
        throw new Error(`Personal OS monospace font is not allowed on ${selector}`)
      }
    }
  }

  const surfaceSelectors = [
    '.factory-home .profile-card', '.factory-home .current-status-card',
    '.factory-home .featured-project-card', '.factory-home .project-folder',
    '.factory-home .notes-launcher', '.factory-home .lab-launcher',
    '.factory-home .contact-terminal', '.factory-home .canvas-controls'
  ]
  const placements = [
    ['.desktop-canvas__profile', '1 / 8', '1 / 5', '50ms'],
    ['.desktop-canvas__status', '9 / 13', '1 / 4', '110ms'],
    ['.desktop-canvas__featured', '4 / 11', '5 / 10', '170ms'],
    ['.desktop-canvas__projects', '11 / 15', '4 / 8', '230ms'],
    ['.desktop-canvas__notes', '1 / 4', '6 / 10', '290ms'],
    ['.desktop-canvas__lab', '11 / 15', '9 / 13', '350ms'],
    ['.desktop-canvas__contact', '3 / 10', '11 / 15', '410ms'],
    ['.desktop-canvas__controls', '12 / 15', '14 / 15', '470ms']
  ]
  const scopedPlacements = placements.map(([selector]) => `.factory-home ${selector}`)
  for (const selector of [
    '.factory-home .desktop-canvas', '.factory-home .system-topbar',
    ...surfaceSelectors, ...scopedPlacements
  ]) {
    assertAllowedAncestorContexts(rules, selector, [topLevel, mobileMedia])
  }
  for (const selector of [
    '.factory-home.is-entering .system-topbar',
    '.factory-home.is-entering .desktop-canvas > *'
  ]) {
    assertAllowedAncestorContexts(rules, selector, [topLevel, reducedMedia])
  }
  for (const [selector] of placements) {
    assertAllowedAncestorContexts(rules, `.factory-home.is-entering ${selector}`, [topLevel])
  }
  assertAllowedAncestorContexts(rules, '.factory-boot', [topLevel, splashWideMedia, reducedMedia])
  assertAllowedAncestorContexts(rules, '.factory-boot__access', [topLevel, splashWideMedia])
  assertAllowedAncestorContexts(rules, '.factory-boot__cursor', [topLevel, reducedMedia])
  for (const selector of [
    '.factory-home .desktop-canvas', '.factory-home .system-topbar',
    ...surfaceSelectors, ...scopedPlacements, '.factory-boot'
  ]) {
    const rule = requireRule(rules, selector)
    if (!rule || parseDeclarations(rule.body).size === 0) {
      throw new Error(`custom.css must contain an active ${selector} rule`)
    }
  }

  const topbarDeclarations = parseDeclarations(requireRule(rules, '.factory-home .system-topbar').body)
  if (topbarDeclarations.get('position') !== 'fixed' || topbarDeclarations.get('height') !== '56px') {
    throw new Error('Personal OS topbar must use fixed positioning and a 56px height')
  }

  const canvasDeclarations = parseDeclarations(requireRule(rules, '.factory-home .desktop-canvas').body)
  if (canvasDeclarations.get('display') !== 'grid'
    || canvasDeclarations.get('width') !== 'min(1360px, calc(100vw - 48px))'
    || canvasDeclarations.get('min-height') !== '1040px'
    || canvasDeclarations.get('grid-template-columns') !== 'repeat(14, minmax(0, 1fr))'
    || canvasDeclarations.get('grid-template-rows') !== 'repeat(14, minmax(0, 1fr))'
    || canvasDeclarations.get('gap') !== '16px') {
    throw new Error('Personal OS desktop canvas must use the exact 14-column grid')
  }

  const entranceDelays = []
  for (const [selector, column, row, delay] of placements) {
    const scopedSelector = `.factory-home ${selector}`
    const placement = parseDeclarations(requireRule(rules, scopedSelector).body)
    if (placement.get('grid-column') !== column || placement.get('grid-row') !== row) {
      throw new Error(`Personal OS placement ${scopedSelector} must use grid-column ${column} and grid-row ${row}`)
    }
    const stagger = requireRule(rules, `.factory-home.is-entering ${selector}`)
    const staggerDeclarations = parseDeclarations(stagger?.body ?? '')
    if (staggerDeclarations.get('animation-delay') !== delay) {
      throw new Error(`Personal OS entrance must stagger ${selector} at ${delay}`)
    }
    entranceDelays.push(delayInMilliseconds(delay))
  }
  if (entranceDelays.some((delay) => delay === undefined)
    || entranceDelays.some((delay, index) => index > 0 && delay <= entranceDelays[index - 1])) {
    throw new Error('Personal OS reveal delays must be distinct and strictly increasing')
  }
  const topbarEntrance = parseDeclarations(requireRule(rules, '.factory-home.is-entering .system-topbar').body)
  const childrenEntrance = parseDeclarations(requireRule(rules, '.factory-home.is-entering .desktop-canvas > *').body)
  if (topbarEntrance.get('animation') !== revealAnimation
    || childrenEntrance.get('animation') !== revealAnimation) {
    throw new Error('Personal OS reveal animation must use the exact name, duration, easing, and fill mode')
  }
  if (topbarEntrance.get('animation-delay') !== '0ms') {
    throw new Error('Personal OS reveal must stagger .system-topbar at 0ms')
  }

  const revealAncestor = '@keyframes personal-os-reveal'
  const revealFrames = osRules.filter((rule) => rule.ancestors.includes(revealAncestor))
  const fromFrame = revealFrames.find((rule) => rule.selectors.includes('from'))
  const toFrame = revealFrames.find((rule) => rule.selectors.includes('to'))
  if ((osSource.match(/@keyframes\s+personal-os-reveal\b/g) ?? []).length !== 1
    || revealFrames.length !== 2
    || !hasExactDeclarations(fromFrame, [
      ['opacity', '0'], ['transform', 'translateY(8px) scale(.995)']
    ])
    || !hasExactDeclarations(toFrame, [
      ['opacity', '1'], ['transform', 'none']
    ])) {
    throw new Error('Personal OS reveal keyframes must use only the approved opacity and transform states')
  }

  const splash = requireRule(rules, '.factory-boot')
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

  const accessButton = requireRule(rules, '.factory-boot__access')
  const accessDeclarations = parseDeclarations(accessButton?.body ?? '')
  if (accessDeclarations.get('min-width') !== '44px' || accessDeclarations.get('min-height') !== '44px') {
    throw new Error('factory splash access button must keep a 44px hit area')
  }

  const mobileCanvas = requireRule(rules, '.factory-home .desktop-canvas', mobileMedia)
  const mobileCanvasDeclarations = parseDeclarations(mobileCanvas?.body ?? '')
  if (mobileCanvasDeclarations.get('grid-template-columns') !== '1fr'
    || mobileCanvasDeclarations.get('width') !== 'calc(100vw - 32px)') {
    throw new Error(`custom.css ${mobileMedia} must set .desktop-canvas to one column`)
  }

  for (const selector of [
    '.factory-home.is-entering .system-topbar',
    '.factory-home.is-entering .desktop-canvas > *'
  ]) {
    const reducedFactory = requireRule(rules, selector, reducedMedia)
    const reducedDeclarations = parseDeclarations(reducedFactory?.body ?? '')
    if (reducedDeclarations.get('animation') !== 'none !important'
      || reducedDeclarations.get('transition') !== 'none !important'
      || reducedDeclarations.get('transform') !== 'none !important') {
      throw new Error(`custom.css reduced-motion media must reset animation, transition, and transform for ${selector}`)
    }
  }
  const reducedSplash = requireRule(rules, '.factory-boot', reducedMedia)
  const reducedSplashDeclarations = parseDeclarations(reducedSplash?.body ?? '')
  if (reducedSplashDeclarations.get('animation') !== 'none !important'
    || reducedSplashDeclarations.get('transition') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress splash motion')
  }
  const reducedCursor = requireRule(rules, '.factory-boot__cursor', reducedMedia)
  if (parseDeclarations(reducedCursor?.body ?? '').get('animation') !== 'none !important') {
    throw new Error('custom.css reduced-motion media must suppress cursor motion')
  }

}
