export function isAdminPath(href) {
  try {
    const path = decodeURIComponent(new URL(href, 'https://site.invalid').pathname)
    return /^\/admin(?:\/|\.html\/?$|$)/i.test(path)
  } catch {
    return true
  }
}

export function isCrispConfigured(config) {
  return config.enabled === true
    && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(config.websiteId)
}

// A full document navigation discards the third-party runtime before any admin
// content is rendered. onBeforePageLoad also covers browser back/forward.
export function installCrispRouteGuard(router, targetWindow) {
  const documentIsAdmin = isAdminPath(targetWindow.location.href)
  for (const key of ['onBeforeRouteChange', 'onBeforePageLoad']) {
    const previous = router[key]
    router[key] = (href) => {
      if (isAdminPath(href) !== documentIsAdmin) {
        targetWindow.location.assign(href)
        return false
      }
      return previous?.(href)
    }
  }
}

export function createCrispChatClient({
  config,
  isAllowed,
  onChange = () => {},
  importSdk = () => import('crisp-sdk-web'),
  timeoutMs = 15000,
}) {
  let initialization
  let sdk
  let disposed = false
  let timer
  let finishLoading
  let unread = 0
  let opened = false
  const allowed = () => !disposed && isCrispConfigured(config) && isAllowed()

  async function initialize() {
    const { Crisp } = await importSdk()
    if (!allowed()) return null
    sdk = Crisp
    Crisp.configure(config.websiteId, { autoload: false, locale: 'zh-cn' })
    Crisp.setPosition('right')
    Crisp.setZIndex(900)
    Crisp.setAvailabilityTooltip(false)
    Crisp.chat.onChatOpened(() => {
      if (disposed) return
      opened = true
      unread = 0
      onChange({ opened, unread })
    })
    Crisp.chat.onChatClosed(() => {
      if (disposed) return
      opened = false
      Crisp.chat.hide()
      onChange({ opened })
    })
    Crisp.message.onMessageReceived(() => {
      if (!disposed && !opened) onChange({ unread: ++unread })
    })
    await new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer)
        finishLoading = null
        if (error) reject(error)
        else resolve()
      }
      finishLoading = () => finish()
      timer = setTimeout(() => finish(new Error('Crisp connection timed out')), timeoutMs)
      try {
        Crisp.session.onLoaded(() => finish())
        // hide() itself starts the SDK; only call it after an explicit user click.
        Crisp.load()
        Crisp.chat.hide()
      } catch (error) {
        finish(error)
      }
    })
    // Keep a loaded session even if the current page temporarily hides chat.
    // open() checks eligibility; session:loaded need not fire a second time.
    return Crisp
  }

  return {
    async open() {
      if (!allowed()) return false
      initialization ||= initialize()
      const Crisp = await initialization
      if (!Crisp) initialization = null
      if (!Crisp || !allowed()) return false
      Crisp.chat.show()
      Crisp.chat.open()
      return true
    },
    dispose() {
      disposed = true
      finishLoading?.()
      if (!sdk) return
      sdk.chat.offChatOpened()
      sdk.chat.offChatClosed()
      sdk.message.offMessageReceived()
      sdk.session.offLoaded()
      sdk.chat.hide()
    },
  }
}
