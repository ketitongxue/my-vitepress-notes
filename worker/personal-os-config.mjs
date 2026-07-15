import {
  PERSONAL_OS_SCHEMA_VERSION,
  PersonalOsConfigError,
  normalizePersonalOsConfig,
} from '../shared/personal-os-config.mjs'
import { authenticateAdmin } from './access-auth.mjs'

const MAX_REQUEST_BYTES = 128 * 1024
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'

function json(data, { status = 200, cache = 'no-store', headers = {} } = {}) {
  return Response.json(data, {
    status,
    headers: { 'cache-control': cache, ...headers },
  })
}

function error(code, status, details) {
  return json(details ? { error: code, details } : { error: code }, { status })
}

function requireDatabase(env) {
  const db = env?.PERSONAL_OS_DB
  if (!db || typeof db.prepare !== 'function') throw new Error('PERSONAL_OS_DB is unavailable')
  return db
}

function parseStoredConfig(value) {
  const parsed = JSON.parse(value)
  return normalizePersonalOsConfig(parsed)
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return { ok: false, response: error('UNSUPPORTED_MEDIA_TYPE', 415) }
  }
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false, response: error('REQUEST_TOO_LARGE', 413) }
  }
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > MAX_REQUEST_BYTES) {
    return { ok: false, response: error('REQUEST_TOO_LARGE', 413) }
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, response: error('INVALID_JSON', 400) }
  }
}

function verifyMutationOrigin(request, env) {
  const allowedOrigin = typeof env?.ALLOWED_ORIGIN === 'string' ? env.ALLOWED_ORIGIN.trim() : ''
  const origin = request.headers.get('origin')
  if (!allowedOrigin || !origin || origin !== allowedOrigin) return error('INVALID_ORIGIN', 403)
  return null
}

function versionRecord(row) {
  return {
    revision: Number(row.revision),
    schemaVersion: Number(row.schema_version),
    config: parseStoredConfig(row.config_json),
    note: row.note ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    publishedAt: row.published_at ?? null,
  }
}

export async function handlePublicPersonalOsConfig(request, env) {
  if (request.method !== 'GET') return error('METHOD_NOT_ALLOWED', 405)
  try {
    const row = await requireDatabase(env).prepare(`
      SELECT revision, schema_version, config_json, created_at, published_at
      FROM personal_os_config_versions
      WHERE published_at IS NOT NULL
      ORDER BY revision DESC
      LIMIT 1
    `).first()
    if (!row) return error('PERSONAL_OS_CONFIG_UNAVAILABLE', 503)
    const config = parseStoredConfig(row.config_json)
    const etag = `"personal-os-${row.revision}"`
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { 'cache-control': PUBLIC_CACHE, etag },
      })
    }
    return json({
      schemaVersion: Number(row.schema_version),
      revision: Number(row.revision),
      publishedAt: row.published_at,
      config,
    }, { cache: PUBLIC_CACHE, headers: { etag } })
  } catch {
    return error('PERSONAL_OS_CONFIG_UNAVAILABLE', 503)
  }
}

async function authorize(request, env, authenticate) {
  const result = await authenticate(request, env)
  return result.ok ? result : { ok: false, response: result.response }
}

export function createPersonalOsAdminHandler({ authenticate = authenticateAdmin } = {}) {
  return async function handlePersonalOsAdmin(request, env) {
    const auth = await authorize(request, env, authenticate)
    if (!auth.ok) return auth.response

    const { pathname } = new URL(request.url)
    let db
    try {
      db = requireDatabase(env)
    } catch {
      return error('PERSONAL_OS_DB_UNAVAILABLE', 503)
    }

    if (request.method === 'GET' && pathname === '/api/admin/personal-os/config') {
      try {
        const result = await db.prepare(`
          SELECT revision, schema_version, config_json, note, created_by, created_at, published_at
          FROM personal_os_config_versions
          ORDER BY revision DESC
          LIMIT 20
        `).all()
        return json({ versions: (result.results ?? []).map(versionRecord) })
      } catch {
        return error('PERSONAL_OS_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'PUT' && pathname === '/api/admin/personal-os/config') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const body = await readJson(request)
      if (!body.ok) return body.response
      try {
        const schemaVersion = Number(body.value?.schemaVersion)
        const baseRevision = Number(body.value?.baseRevision)
        const note = typeof body.value?.note === 'string' ? body.value.note.trim() : ''
        if (schemaVersion !== PERSONAL_OS_SCHEMA_VERSION) return error('UNSUPPORTED_SCHEMA_VERSION', 400)
        if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) return error('INVALID_BASE_REVISION', 400)
        if (note.length > 240) return error('INVALID_NOTE', 400)
        const config = normalizePersonalOsConfig(body.value?.config)
        const result = await db.prepare(`
          INSERT INTO personal_os_config_versions
            (schema_version, config_json, note, created_by)
          SELECT ?, ?, ?, ?
          WHERE ? = (SELECT COALESCE(MAX(revision), 0) FROM personal_os_config_versions)
        `).bind(
          schemaVersion,
          JSON.stringify(config),
          note,
          auth.identity,
          baseRevision,
        ).run()
        if (result.meta?.changes !== 1) return error('REVISION_CONFLICT', 409)
        return json({ revision: Number(result.meta.last_row_id) }, { status: 201 })
      } catch (caught) {
        if (caught instanceof PersonalOsConfigError) return error('INVALID_CONFIG', 400, caught.message)
        return error('PERSONAL_OS_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/personal-os/publish') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const body = await readJson(request)
      if (!body.ok) return body.response
      const revision = Number(body.value?.revision)
      if (!Number.isSafeInteger(revision) || revision < 1) return error('INVALID_REVISION', 400)
      try {
        const result = await db.prepare(`
          UPDATE personal_os_config_versions
          SET published_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE revision = ?
            AND revision = (SELECT MAX(revision) FROM personal_os_config_versions)
        `).bind(revision).run()
        if (result.meta?.changes !== 1) return error('REVISION_CONFLICT', 409)
        return json({ revision, published: true })
      } catch {
        return error('PERSONAL_OS_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/personal-os/rollback') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const body = await readJson(request)
      if (!body.ok) return body.response
      const revision = Number(body.value?.revision)
      if (!Number.isSafeInteger(revision) || revision < 1) return error('INVALID_REVISION', 400)
      try {
        const row = await db.prepare(`
          INSERT INTO personal_os_config_versions
            (schema_version, config_json, note, created_by, published_at)
          SELECT schema_version, config_json, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          FROM personal_os_config_versions
          WHERE revision = ?
          RETURNING revision
        `).bind(`Rollback to revision ${revision}`, auth.identity, revision).first()
        if (!row) return error('REVISION_NOT_FOUND', 404)
        return json({ revision: Number(row.revision), rolledBackFrom: revision, published: true }, { status: 201 })
      } catch {
        return error('PERSONAL_OS_DB_UNAVAILABLE', 503)
      }
    }

    return error('NOT_FOUND', 404)
  }
}

export const handlePersonalOsAdmin = createPersonalOsAdminHandler()
