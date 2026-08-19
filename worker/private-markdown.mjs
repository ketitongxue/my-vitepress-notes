import { authenticateAdmin } from './access-auth.mjs'

export const MAX_MARKDOWN_BYTES = 512 * 1024
const MAX_FILENAME_LENGTH = 200
const MAX_TITLE_LENGTH = 240
const MARKDOWN_NAME = /^(?:[^/\\\0]+)\.(?:md|markdown)$/i

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

function verifyMutationOrigin(request, env) {
  const allowedOrigin = typeof env?.ALLOWED_ORIGIN === 'string' ? env.ALLOWED_ORIGIN.trim() : ''
  const origin = request.headers.get('origin')
  if (!allowedOrigin || !origin || origin !== allowedOrigin) return error('INVALID_ORIGIN', 403)
  return null
}

function normalizeFilename(value) {
  if (typeof value !== 'string') return null
  const filename = value.trim()
  if (!filename || filename.length > MAX_FILENAME_LENGTH || !MARKDOWN_NAME.test(filename)) return null
  return filename
}

function titleFromMarkdown(content, filename) {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)
  const frontmatterTitle = frontmatter?.[1]
    ?.match(/^title:\s*(?:["']([^"']+)["']|(.+))\s*$/m)
  const heading = content.match(/^#{1,2}\s+(.+?)\s*#*\s*$/m)
  const candidate = frontmatterTitle?.[1] || frontmatterTitle?.[2] || heading?.[1]
    || filename.replace(/\.(?:md|markdown)$/i, '')
  const title = candidate.trim().replace(/\s+/g, ' ')
  return title.slice(0, MAX_TITLE_LENGTH) || '未命名笔记'
}

function idForFilename(filename) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(filename)).then((digest) =>
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16))
}

function hashContent(content) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)).then((digest) =>
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''))
}

function documentRecord(row, { includeContent = false } = {}) {
  const record = {
    id: row.id,
    filename: row.filename,
    title: row.title,
    byteSize: Number(row.byte_size),
    version: Number(row.version),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (includeContent) record.content = row.content
  return record
}

async function readMarkdownFile(request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return { ok: false, response: error('UNSUPPORTED_MEDIA_TYPE', 415) }
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MARKDOWN_BYTES + 64 * 1024) {
    return { ok: false, response: error('REQUEST_TOO_LARGE', 413) }
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return { ok: false, response: error('INVALID_MULTIPART', 400) }
  }
  const file = form.get('file')
  if (!(file instanceof File)) return { ok: false, response: error('FILE_REQUIRED', 400) }

  const filename = normalizeFilename(file.name)
  if (!filename) return { ok: false, response: error('INVALID_MARKDOWN_FILENAME', 400) }
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength === 0) return { ok: false, response: error('EMPTY_MARKDOWN_FILE', 400) }
  if (bytes.byteLength > MAX_MARKDOWN_BYTES) return { ok: false, response: error('MARKDOWN_TOO_LARGE', 413) }

  let content
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, response: error('INVALID_UTF8', 400) }
  }
  if (content.includes('\0')) return { ok: false, response: error('INVALID_MARKDOWN_CONTENT', 400) }
  return {
    ok: true,
    file: {
      filename,
      content,
      byteSize: bytes.byteLength,
      title: titleFromMarkdown(content, filename),
    },
  }
}

async function authorize(request, env, authenticate) {
  const result = await authenticate(request, env)
  return result.ok ? result : { ok: false, response: result.response }
}

export function createPrivateMarkdownHandler({ authenticate = authenticateAdmin } = {}) {
  return async function handlePrivateMarkdown(request, env) {
    const auth = await authorize(request, env, authenticate)
    if (!auth.ok) return auth.response

    let db
    try {
      db = requireDatabase(env)
    } catch {
      return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
    }

    const { pathname } = new URL(request.url)
    if (request.method === 'GET' && pathname === '/api/admin/private-notes') {
      try {
        const result = await db.prepare(`
          SELECT id, filename, title, byte_size, version, created_by, created_at, updated_at
          FROM private_markdown_documents
          ORDER BY updated_at DESC, id
          LIMIT 100
        `).all()
        return json({ documents: (result.results ?? []).map((row) => documentRecord(row)) })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'GET' && /^\/api\/admin\/private-notes\/[a-f0-9]{16}$/.test(pathname)) {
      const id = pathname.split('/').at(-1)
      try {
        const row = await db.prepare(`
          SELECT id, filename, title, content, byte_size, version, created_by, created_at, updated_at
          FROM private_markdown_documents
          WHERE id = ?
        `).bind(id).first()
        return row ? json({ document: documentRecord(row, { includeContent: true }) })
          : error('PRIVATE_NOTE_NOT_FOUND', 404)
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/private-notes/upload') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const parsed = await readMarkdownFile(request)
      if (!parsed.ok) return parsed.response
      const { filename, content, byteSize, title } = parsed.file
      try {
        const id = await idForFilename(filename)
        const contentHash = await hashContent(content)
        const existing = await db.prepare(
          'SELECT version FROM private_markdown_documents WHERE filename = ?',
        ).bind(filename).first()
        const version = Number(existing?.version ?? 0) + 1
        await db.prepare(`
          INSERT INTO private_markdown_documents
            (id, filename, title, content, content_hash, byte_size, version, created_by, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          ON CONFLICT(filename) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            content_hash = excluded.content_hash,
            byte_size = excluded.byte_size,
            version = excluded.version,
            updated_at = excluded.updated_at
        `).bind(id, filename, title, content, contentHash, byteSize, version, auth.identity).run()
        const row = await db.prepare(`
          SELECT id, filename, title, byte_size, version, created_by, created_at, updated_at
          FROM private_markdown_documents
          WHERE id = ?
        `).bind(id).first()
        return json({ document: documentRecord(row ?? {
          id, filename, title, byte_size: byteSize, version, created_by: auth.identity,
          created_at: null, updated_at: null,
        }), replaced: Boolean(existing) }, { status: existing ? 200 : 201 })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'DELETE' && /^\/api\/admin\/private-notes\/[a-f0-9]{16}$/.test(pathname)) {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const id = pathname.split('/').at(-1)
      try {
        const result = await db.prepare(
          'DELETE FROM private_markdown_documents WHERE id = ?',
        ).bind(id).run()
        if (result.meta?.changes !== 1) return error('PRIVATE_NOTE_NOT_FOUND', 404)
        return json({ deleted: true, id })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    return error('NOT_FOUND', 404)
  }
}

export const handlePrivateMarkdown = createPrivateMarkdownHandler()
