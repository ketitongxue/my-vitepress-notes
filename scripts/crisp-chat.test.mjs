import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCrispChatClient,
  installCrispRouteGuard,
  isAdminPath,
  isCrispConfigured,
} from '../docs/.vitepress/theme/components/crispChatClient.mjs'

const config = Object.freeze({ enabled: true, websiteId: '12345678-1234-1234-1234-123456789abc' })
const nextTurn = () => new Promise((resolve) => setImmediate(resolve))

function sdkMock() {
  const calls = []
  const callbacks = {}
  const record = (name) => (...args) => calls.push([name, ...args])
  const subscribe = (name) => (callback) => { callbacks[name] = callback }
  const unsubscribe = (name) => () => { delete callbacks[name] }
  const Crisp = {
    configure: record('configure'),
    setPosition: record('position'),
    setZIndex: record('zIndex'),
    setAvailabilityTooltip: record('tooltip'),
    load: record('load'),
    chat: {
      show: record('show'),
      hide: record('hide'),
      open: record('open'),
      onChatOpened: subscribe('opened'),
      onChatClosed: subscribe('closed'),
      offChatOpened: unsubscribe('opened'),
      offChatClosed: unsubscribe('closed'),
    },
    message: {
      onMessageReceived: subscribe('message'),
      offMessageReceived: unsubscribe('message'),
    },
    session: {
      onLoaded: subscribe('loaded'),
      offLoaded: unsubscribe('loaded'),
    },
  }
  return { Crisp, calls, callbacks, count: (name) => calls.filter(([method]) => method === name).length }
}

test('only an enabled public website identifier enables Crisp', () => {
  assert.equal(isCrispConfigured(config), true)
  for (const value of [
    { ...config, enabled: false },
    { ...config, enabled: 'true' },
    { ...config, websiteId: '' },
    { ...config, websiteId: 'not-a-website-id' },
  ]) assert.equal(isCrispConfigured(value), false)
})

test('admin recognition includes clean URLs, HTML URLs, encoded paths, and malformed paths', () => {
  for (const href of ['/admin', '/admin/', '/admin.html', '/admin/home', '/admin/private-notes.html?x=1#note', '/%61dmin/personal-os', 'https://example.com/admin/home', '/admin/%E0%A4%A']) {
    assert.equal(isAdminPath(href), true, href)
  }
  for (const href of ['/', '/index.html#system', '/projects/go-tiny-claw', '/administrator', '/projects/admin']) {
    assert.equal(isAdminPath(href), false, href)
  }
})

test('missing configuration, the disabled switch, and disallowed contexts never import the SDK', async () => {
  let imports = 0
  for (const options of [
    { config: { ...config, websiteId: '' }, isAllowed: () => true },
    { config: { ...config, enabled: false }, isAllowed: () => true },
    { config, isAllowed: () => false },
  ]) {
    const client = createCrispChatClient({ ...options, importSdk: async () => { imports++; throw new Error('must not import') } })
    assert.equal(await client.open(), false)
    client.dispose()
  }
  assert.equal(imports, 0)
})

test('concurrent opens initialize once and wait for the session-loaded callback', async () => {
  const mock = sdkMock()
  let imports = 0
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => { imports++; return mock } })
  try {
    const first = client.open()
    const second = client.open()
    await nextTurn()
    assert.equal(imports, 1)
    assert.equal(mock.count('configure'), 1)
    assert.deepEqual(mock.calls.find(([method]) => method === 'configure'), ['configure', config.websiteId, { autoload: false, locale: 'zh-cn' }])
    assert.equal(mock.count('load'), 1)
    assert.equal(mock.count('show'), 0)
    assert.equal(mock.count('open'), 0)
    mock.callbacks.loaded()
    assert.deepEqual(await Promise.all([first, second]), [true, true])
    assert.equal(await client.open(), true)
    assert.equal(imports, 1)
    assert.equal(mock.count('configure'), 1)
    assert.equal(mock.count('load'), 1)
  } finally {
    client.dispose()
  }
})

test('entering an admin page during the dynamic import prevents SDK configuration', async () => {
  const mock = sdkMock()
  let path = '/'
  let finishImport
  const client = createCrispChatClient({
    config,
    isAllowed: () => !isAdminPath(path),
    importSdk: () => new Promise((resolve) => { finishImport = resolve }),
  })
  const opening = client.open()
  path = '/admin/private-notes'
  finishImport(mock)
  assert.equal(await opening, false)
  assert.equal(mock.count('configure'), 0)
  assert.equal(mock.count('load'), 0)
  client.dispose()
})

test('a permission change while loading delays opening but retains the ready session for retry', async () => {
  const mock = sdkMock()
  let permitted = true
  let loadedSubscriptions = 0
  const onLoaded = mock.Crisp.session.onLoaded
  mock.Crisp.session.onLoaded = (callback) => {
    loadedSubscriptions++
    onLoaded(callback)
  }
  const client = createCrispChatClient({ config, isAllowed: () => permitted, importSdk: async () => mock })
  try {
    const opening = client.open()
    await nextTurn()
    permitted = false
    mock.callbacks.loaded()
    assert.equal(await opening, false)
    assert.equal(mock.count('show'), 0)
    assert.equal(mock.count('open'), 0)
    permitted = true
    assert.equal(await client.open(), true)
    assert.equal(mock.count('configure'), 1)
    assert.equal(mock.count('load'), 1)
    assert.equal(loadedSubscriptions, 1)
    assert.equal(mock.count('show'), 1)
    assert.equal(mock.count('open'), 1)
  } finally {
    client.dispose()
  }
})

test('SDK import rejection is reported to the caller without repeated import attempts', async () => {
  let imports = 0
  const error = new Error('SDK unavailable')
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => { imports++; throw error } })
  await assert.rejects(client.open(), (value) => value === error)
  await assert.rejects(client.open(), (value) => value === error)
  assert.equal(imports, 1)
  client.dispose()
})

test('session timeout fails without opening the chat, even if its callback arrives late', async () => {
  const mock = sdkMock()
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => mock, timeoutMs: 10 })
  try {
    await assert.rejects(client.open(), /timed out/)
    mock.callbacks.loaded()
    await assert.rejects(client.open(), /timed out/)
    assert.equal(mock.count('open'), 0)
    assert.equal(mock.count('show'), 0)
    assert.equal(mock.count('load'), 1)
  } finally {
    client.dispose()
  }
})

test('chat events retain unread state and disposal removes all registered listeners', async () => {
  const mock = sdkMock()
  const changes = []
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => mock, onChange: (state) => changes.push(state) })
  const opening = client.open()
  await nextTurn()
  mock.callbacks.loaded()
  assert.equal(await opening, true)
  mock.callbacks.message()
  mock.callbacks.message()
  assert.deepEqual(changes.at(-1), { unread: 2 })
  mock.callbacks.opened()
  assert.deepEqual(changes.at(-1), { opened: true, unread: 0 })
  const count = changes.length
  mock.callbacks.message()
  assert.equal(changes.length, count)
  mock.callbacks.closed()
  assert.deepEqual(changes.at(-1), { opened: false })
  assert.equal(mock.count('hide'), 2)
  client.dispose()
  assert.deepEqual(Object.keys(mock.callbacks), [])
  assert.equal(await client.open(), false)
})

test('disposing during the dynamic import prevents third-party initialization', async () => {
  const mock = sdkMock()
  let finishImport
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: () => new Promise((resolve) => { finishImport = resolve }) })
  const opening = client.open()
  client.dispose()
  finishImport(mock)
  assert.equal(await opening, false)
  assert.equal(mock.count('configure'), 0)
})

test('disposing while waiting for the session settles open and ignores queued SDK events', async () => {
  const mock = sdkMock()
  const changes = []
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => mock, onChange: (state) => changes.push(state) })
  const opening = client.open()
  await nextTurn()
  const queuedEvents = [mock.callbacks.opened, mock.callbacks.closed, mock.callbacks.message]
  client.dispose()
  assert.equal(await opening, false)
  for (const callback of queuedEvents) callback()
  assert.deepEqual(changes, [])
  assert.deepEqual(Object.keys(mock.callbacks), [])
  assert.equal(mock.count('show'), 0)
  assert.equal(mock.count('open'), 0)
})

test('an import cancelled by eligibility may be retried when the context becomes eligible', async () => {
  const mock = sdkMock()
  let permitted = true
  let imports = 0
  let finishImport
  const client = createCrispChatClient({
    config,
    isAllowed: () => permitted,
    importSdk: () => { imports++; return new Promise((resolve) => { finishImport = resolve }) },
  })
  const cancelled = client.open()
  permitted = false
  finishImport(mock)
  assert.equal(await cancelled, false)
  assert.equal(mock.count('configure'), 0)
  permitted = true
  const retry = client.open()
  finishImport(mock)
  await nextTurn()
  mock.callbacks.loaded()
  assert.equal(await retry, true)
  assert.equal(imports, 2)
  assert.equal(mock.count('configure'), 1)
  client.dispose()
})

test('a synchronous SDK loading error settles as a failure without opening the chat', async () => {
  const mock = sdkMock()
  const error = new Error('loader rejected')
  mock.Crisp.load = () => { throw error }
  const client = createCrispChatClient({ config, isAllowed: () => true, importSdk: async () => mock })
  await assert.rejects(client.open(), (value) => value === error)
  assert.equal(mock.count('show'), 0)
  assert.equal(mock.count('open'), 0)
  client.dispose()
})

function guardedRouter(initialUrl) {
  const navigations = []
  const previousCalls = []
  const targetWindow = { location: { href: initialUrl, assign: (href) => navigations.push(href) } }
  const router = {
    onBeforeRouteChange: async (href) => { previousCalls.push(['route', href]); return 'route result' },
    onBeforePageLoad: async (href) => { previousCalls.push(['page', href]); return 'page result' },
  }
  installCrispRouteGuard(router, targetWindow)
  return { router, targetWindow, navigations, previousCalls }
}

test('both route hooks fully navigate across the public/admin boundary in either direction', async () => {
  for (const key of ['onBeforeRouteChange', 'onBeforePageLoad']) {
    for (const [initialUrl, destination] of [
      ['https://example.com/', '/admin/private-notes'],
      ['https://example.com/admin/home', '/projects/go-tiny-claw'],
    ]) {
      const { router, navigations, previousCalls } = guardedRouter(initialUrl)
      assert.equal(await router[key](destination), false)
      assert.deepEqual(navigations, [destination])
      assert.deepEqual(previousCalls, [])
    }
  }
})

test('popstate stays protected after the visible URL changes and bypasses the route hook', async () => {
  for (const [initialUrl, destination] of [
    ['https://example.com/', 'https://example.com/admin/private-notes'],
    ['https://example.com/admin/home', 'https://example.com/'],
  ]) {
    const { router, targetWindow, navigations, previousCalls } = guardedRouter(initialUrl)
    targetWindow.location.href = destination
    assert.equal(await router.onBeforePageLoad(destination), false)
    assert.deepEqual(navigations, [destination])
    assert.deepEqual(previousCalls, [])
  }
})

test('direct admin entry and same-context navigation preserve prior hooks without redirect loops', async () => {
  for (const [initialUrl, destinations] of [
    ['https://example.com/admin/private-notes', ['/admin/private-notes', '/admin/home', '/admin/personal-os.html']],
    ['https://example.com/', ['/', '/projects/go-tiny-claw', '/index.html#system']],
  ]) {
    const { router, navigations, previousCalls } = guardedRouter(initialUrl)
    for (const destination of destinations) {
      assert.equal(await router.onBeforeRouteChange(destination), 'route result')
      assert.equal(await router.onBeforePageLoad(destination), 'page result')
    }
    assert.deepEqual(navigations, [])
    assert.equal(previousCalls.length, destinations.length * 2)
  }
})
