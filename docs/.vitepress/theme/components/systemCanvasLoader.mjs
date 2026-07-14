export function loadSystemCanvasModule(attempt, importers) {
  const key = Number(attempt) > 0 ? 'retry' : 'initial'
  const loader = importers?.[key]
  if (typeof loader !== 'function') throw new TypeError(`Missing ${key} system canvas importer`)
  return loader()
}
