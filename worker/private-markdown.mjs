import { authenticateAdmin } from './access-auth.mjs'
import { unzipSync } from 'fflate'

export const MAX_MARKDOWN_BYTES = 512 * 1024
export const MAX_PACKAGE_BYTES = 20 * 1024 * 1024
export const MAX_ASSET_BYTES = 8 * 1024 * 1024
export const MAX_ASSET_TOTAL_BYTES = 20 * 1024 * 1024
export const MAX_ASSET_COUNT = 100
const MAX_FILENAME_LENGTH = 200
const MAX_TITLE_LENGTH = 240
const MARKDOWN_NAME = /^(?:[^/\\\0]+)\.(?:md|markdown)$/i
const IMAGE_NAME = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i
const MIME_TYPES = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

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

function normalizeAssetPath(value) {
  if (typeof value !== 'string') return null
  const normalized = value.replaceAll('\\', '/').replace(/^\/+/, '')
  const parts = normalized.split('/')
  if (!normalized || parts.some((part) => !part || part === '.' || part === '..'
    || /[\0-\x1f\x7f]/.test(part))) return null
  const path = parts.join('/')
  return path.length <= 240 ? path : null
}

function pathBasename(path) {
  return path.split('/').at(-1) ?? path
}

function pathDirectory(path) {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function relativeToMarkdownDirectory(path, markdownPath) {
  const directory = pathDirectory(markdownPath)
  if (!directory) return path
  if (path === directory) return null
  const prefix = `${directory}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : null
}

function contentTypeForPath(path) {
  const match = path.toLowerCase().match(/\.[^.]+$/)
  return MIME_TYPES[match?.[0]] || 'application/octet-stream'
}

function requireAssetBucket(env) {
  const bucket = env?.PRIVATE_NOTES_ASSETS
  if (!bucket || typeof bucket.get !== 'function' || typeof bucket.put !== 'function') {
    throw new Error('PRIVATE_NOTES_ASSETS is unavailable')
  }
  return bucket
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

function assetRecord(row) {
  return {
    path: row.path,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
  }
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
      assets: [],
      replaceAssets: false,
    },
  }
}

async function readPackageFile(request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return { ok: false, response: error('UNSUPPORTED_MEDIA_TYPE', 415) }
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PACKAGE_BYTES + 128 * 1024) {
    return { ok: false, response: error('REQUEST_TOO_LARGE', 413) }
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return { ok: false, response: error('INVALID_MULTIPART', 400) }
  }
  const file = form.get('package')
  if (!(file instanceof File)) return { ok: false, response: error('PACKAGE_REQUIRED', 400) }
  if (!/\.zip$/i.test(file.name)) return { ok: false, response: error('INVALID_PACKAGE_FILENAME', 400) }
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength === 0) return { ok: false, response: error('EMPTY_PACKAGE', 400) }
  if (bytes.byteLength > MAX_PACKAGE_BYTES) return { ok: false, response: error('PACKAGE_TOO_LARGE', 413) }

  let entries
  try {
    entries = unzipSync(new Uint8Array(bytes))
  } catch {
    return { ok: false, response: error('INVALID_PACKAGE', 400) }
  }

  const files = Object.entries(entries)
    .filter(([path, content]) => !path.endsWith('/') && content instanceof Uint8Array && content.byteLength > 0)
    .map(([path, content]) => ({ path: normalizeAssetPath(path), content }))
  if (files.some(({ path }) => !path)) return { ok: false, response: error('INVALID_PACKAGE_PATH', 400) }
  const markdownFiles = files.filter(({ path }) => MARKDOWN_NAME.test(pathBasename(path)))
  if (markdownFiles.length !== 1) {
    return { ok: false, response: error('PACKAGE_REQUIRES_ONE_MARKDOWN', 400) }
  }

  const markdownFile = markdownFiles[0]
  const filename = normalizeFilename(pathBasename(markdownFile.path))
  if (!filename) return { ok: false, response: error('INVALID_MARKDOWN_FILENAME', 400) }
  if (markdownFile.content.byteLength > MAX_MARKDOWN_BYTES) {
    return { ok: false, response: error('MARKDOWN_TOO_LARGE', 413) }
  }
  let content
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(markdownFile.content)
  } catch {
    return { ok: false, response: error('INVALID_UTF8', 400) }
  }
  if (!content || content.includes('\0')) return { ok: false, response: error('INVALID_MARKDOWN_CONTENT', 400) }

  const assets = []
  let totalAssetBytes = 0
  for (const entry of files) {
    if (entry === markdownFile || !IMAGE_NAME.test(entry.path)) continue
    const path = relativeToMarkdownDirectory(entry.path, markdownFile.path)
    if (!path) continue
    if (entry.content.byteLength > MAX_ASSET_BYTES) return { ok: false, response: error('ASSET_TOO_LARGE', 413) }
    totalAssetBytes += entry.content.byteLength
    if (totalAssetBytes > MAX_ASSET_TOTAL_BYTES) return { ok: false, response: error('ASSETS_TOO_LARGE', 413) }
    assets.push({ path, content: entry.content, contentType: contentTypeForPath(path) })
    if (assets.length > MAX_ASSET_COUNT) return { ok: false, response: error('TOO_MANY_ASSETS', 413) }
  }

  return {
    ok: true,
    file: {
      filename,
      content,
      byteSize: markdownFile.content.byteLength,
      title: titleFromMarkdown(content, filename),
      assets,
      replaceAssets: true,
    },
  }
}

async function authorize(request, env, authenticate) {
  const result = await authenticate(request, env)
  return result.ok ? result : { ok: false, response: result.response }
}

async function listAssetRows(db, documentId) {
  const result = await db.prepare(`
    SELECT path, r2_key, content_type, byte_size
    FROM private_markdown_assets
    WHERE document_id = ?
    ORDER BY path
  `).bind(documentId).all()
  return result.results ?? []
}

async function runStatements(db, statements) {
  if (typeof db.batch === 'function') {
    await db.batch(statements)
    return
  }
  for (const statement of statements) await statement.run()
}

async function persistDocument({ db, bucket, auth, file }) {
  const id = await idForFilename(file.filename)
  const contentHash = await hashContent(file.content)
  const existing = await db.prepare(
    'SELECT version FROM private_markdown_documents WHERE filename = ?',
  ).bind(file.filename).first()
  const version = Number(existing?.version ?? 0) + 1
  const oldAssets = file.replaceAssets ? await listAssetRows(db, id) : []
  const uploaded = []

  try {
    if (file.assets.length) {
      if (!bucket) throw new Error('PRIVATE_NOTES_ASSETS is unavailable')
      for (const asset of file.assets) {
        const key = `private-markdown/${id}/v${version}/${asset.path}`
        await bucket.put(key, asset.content, {
          httpMetadata: { contentType: asset.contentType },
        })
        uploaded.push({ ...asset, key })
      }
    }

    const statements = [db.prepare(`
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
    `).bind(
      id, file.filename, file.title, file.content, contentHash, file.byteSize, version, auth.identity,
    )]

    if (file.replaceAssets) {
      statements.push(db.prepare(
        'DELETE FROM private_markdown_assets WHERE document_id = ?',
      ).bind(id))
      for (const asset of uploaded) {
        statements.push(db.prepare(`
          INSERT INTO private_markdown_assets
            (document_id, path, r2_key, content_type, byte_size)
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, asset.path, asset.key, asset.contentType, asset.content.byteLength))
      }
    }
    await runStatements(db, statements)

    if (file.replaceAssets && bucket) {
      const activeKeys = new Set(uploaded.map(({ key }) => key))
      await Promise.all(oldAssets
        .filter(({ r2_key: key }) => !activeKeys.has(key))
        .map(({ r2_key: key }) => bucket.delete(key)))
    }

    const row = await db.prepare(`
      SELECT id, filename, title, byte_size, version, created_by, created_at, updated_at
      FROM private_markdown_documents
      WHERE id = ?
    `).bind(id).first()
    return {
      document: documentRecord(row ?? {
        id, filename: file.filename, title: file.title, byte_size: file.byteSize,
        version, created_by: auth.identity, created_at: null, updated_at: null,
      }),
      replaced: Boolean(existing),
      assetCount: file.replaceAssets ? uploaded.length : oldAssets.length,
    }
  } catch (cause) {
    if (bucket && uploaded.length) {
      await Promise.all(uploaded.map(({ key }) => bucket.delete(key).catch(() => undefined)))
    }
    throw cause
  }
}

function assetPathFromRequest(pathname) {
  const match = pathname.match(/^\/api\/admin\/private-notes\/([a-f0-9]{16})\/assets\/(.+)$/)
  if (!match) return null
  let path
  try {
    path = decodeURIComponent(match[2])
  } catch {
    return null
  }
  return { id: match[1], path: normalizeAssetPath(path) }
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
          SELECT d.id, d.filename, d.title, d.byte_size, d.version, d.created_by, d.created_at, d.updated_at,
            (SELECT COUNT(*) FROM private_markdown_assets a WHERE a.document_id = d.id) AS asset_count
          FROM private_markdown_documents d
          ORDER BY d.updated_at DESC, d.id
          LIMIT 100
        `).all()
        return json({ documents: (result.results ?? []).map((row) => ({
          ...documentRecord(row), assetCount: Number(row.asset_count ?? 0),
        })) })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    const assetRequest = assetPathFromRequest(pathname)
    if (request.method === 'GET' && assetRequest?.path) {
      try {
        const asset = await db.prepare(`
          SELECT path, r2_key, content_type, byte_size
          FROM private_markdown_assets
          WHERE document_id = ? AND path = ?
        `).bind(assetRequest.id, assetRequest.path).first()
        if (!asset) return error('PRIVATE_ASSET_NOT_FOUND', 404)
        const bucket = requireAssetBucket(env)
        const object = await bucket.get(asset.r2_key)
        if (!object) return error('PRIVATE_ASSET_NOT_FOUND', 404)
        return new Response(object.body, {
          headers: {
            'cache-control': 'private, no-store',
            'content-type': asset.content_type,
            'content-length': String(asset.byte_size),
            'x-content-type-options': 'nosniff',
          },
        })
      } catch {
        return error('PRIVATE_ASSETS_UNAVAILABLE', 503)
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
        if (!row) return error('PRIVATE_NOTE_NOT_FOUND', 404)
        const assets = await listAssetRows(db, id)
        return json({
          document: {
            ...documentRecord(row, { includeContent: true }),
            assets: assets.map(assetRecord),
          },
        })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/private-notes/upload') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const parsed = await readMarkdownFile(request)
      if (!parsed.ok) return parsed.response
      try {
        const result = await persistDocument({ db, auth, file: parsed.file })
        return json(result, { status: result.replaced ? 200 : 201 })
      } catch {
        return error('PRIVATE_NOTES_DB_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/private-notes/upload-package') {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const parsed = await readPackageFile(request)
      if (!parsed.ok) return parsed.response
      try {
        const bucket = requireAssetBucket(env)
        const result = await persistDocument({ db, bucket, auth, file: parsed.file })
        return json(result, { status: result.replaced ? 200 : 201 })
      } catch {
        return error('PRIVATE_NOTES_ASSETS_UNAVAILABLE', 503)
      }
    }

    if (request.method === 'DELETE' && /^\/api\/admin\/private-notes\/[a-f0-9]{16}$/.test(pathname)) {
      const originError = verifyMutationOrigin(request, env)
      if (originError) return originError
      const id = pathname.split('/').at(-1)
      try {
        const bucket = requireAssetBucket(env)
        const assets = await listAssetRows(db, id)
        const result = await db.prepare(
          'DELETE FROM private_markdown_documents WHERE id = ?',
        ).bind(id).run()
        if (result.meta?.changes !== 1) return error('PRIVATE_NOTE_NOT_FOUND', 404)
        await Promise.all(assets.map(({ r2_key: key }) => bucket.delete(key)))
        return json({ deleted: true, id })
      } catch {
        return error('PRIVATE_NOTES_ASSETS_UNAVAILABLE', 503)
      }
    }

    return error('NOT_FOUND', 404)
  }
}

export const handlePrivateMarkdown = createPrivateMarkdownHandler()
