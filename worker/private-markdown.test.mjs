import assert from 'node:assert/strict'
import test from 'node:test'
import { zipSync } from 'fflate'

import {
  createPrivateMarkdownHandler,
  MAX_ASSET_BYTES,
  MAX_MARKDOWN_BYTES,
} from './private-markdown.mjs'

const allowOwner = async () => ({ ok: true, identity: 'owner@example.com' })

function makeDb() {
  const rows = new Map()
  const assets = new Map()
  return {
    rows,
    assets,
    prepare(sql) {
      let values = []
      return {
        bind(...bound) { values = bound; return this },
        async first() {
          if (sql.includes('SELECT version FROM')) {
            return [...rows.values()].find((row) => row.filename === values[0]) ?? null
          }
          if (sql.includes('FROM private_markdown_assets')) {
            return [...assets.values()].find((row) => row.document_id === values[0] && row.path === values[1]) ?? null
          }
          if (sql.includes('WHERE id = ?')) return rows.get(values[0]) ?? null
          return null
        },
        async all() {
          if (sql.includes('SELECT path, r2_key, content_type, byte_size')) {
            return { results: [...assets.values()].filter((row) => row.document_id === values[0]) }
          }
          if (sql.includes('private_markdown_documents d')) {
            return { results: [...rows.values()].map((row) => ({
              ...row,
              asset_count: [...assets.values()].filter((asset) => asset.document_id === row.id).length,
            })).sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }
          }
          return { results: [...rows.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }
        },
        async run() {
          if (sql.trimStart().startsWith('INSERT INTO private_markdown_documents')) {
            const [id, filename, title, content, contentHash, byteSize, version, createdBy] = values
            const previous = [...rows.values()].find((row) => row.filename === filename)
            rows.set(id, {
              id, filename, title, content, content_hash: contentHash, byte_size: byteSize,
              version, created_by: previous?.created_by ?? createdBy,
              created_at: previous?.created_at ?? '2026-08-19T00:00:00.000Z',
              updated_at: '2026-08-19T00:00:00.000Z',
            })
            return { meta: { changes: 1 } }
          }
          if (sql.trimStart().startsWith('INSERT INTO private_markdown_assets')) {
            const [documentId, path, r2Key, contentType, byteSize] = values
            assets.set(`${documentId}:${path}`, {
              document_id: documentId, path, r2_key: r2Key,
              content_type: contentType, byte_size: byteSize,
            })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('DELETE FROM private_markdown_assets')) {
            let changes = 0
            for (const [key, asset] of assets) {
              if (asset.document_id === values[0]) { assets.delete(key); changes += 1 }
            }
            return { meta: { changes } }
          }
          if (sql.trimStart().startsWith('DELETE FROM')) {
            const existed = rows.delete(values[0])
            return { meta: { changes: existed ? 1 : 0 } }
          }
          return { meta: { changes: 0 } }
        },
      }
    },
    async batch(statements) {
      for (const statement of statements) await statement.run()
      return statements.map(() => ({ success: true }))
    },
  }
}

function makeBucket() {
  const objects = new Map()
  return {
    objects,
    async put(key, body, options) { objects.set(key, { body, options }) },
    async get(key) {
      const object = objects.get(key)
      return object ? { body: object.body } : null
    },
    async delete(key) { objects.delete(key) },
  }
}

function request(path, { method = 'GET', body, origin = true } = {}) {
  const headers = {}
  if (origin) headers.origin = 'https://juzxailab.com'
  if (body) headers['content-type'] = 'multipart/form-data; boundary=unused'
  return new Request(`https://juzxailab.com${path}`, { method, headers, body })
}

function uploadRequest(name = 'private-note.md', content = '# 私有笔记\n\n只有我能看到。') {
  const form = new FormData()
  form.append('file', new File([content], name, { type: 'text/markdown' }))
  return new Request('https://juzxailab.com/api/admin/private-notes/upload', {
    method: 'POST',
    headers: { origin: 'https://juzxailab.com' },
    body: form,
  })
}

function packageRequest(name = 'private-note.zip', files = {
  'private-note.md': '# 带图笔记\n\n![示例](images/example.png)',
  'images/example.png': new Uint8Array([137, 80, 78, 71]),
}) {
  const entries = Object.fromEntries(Object.entries(files).map(([path, content]) => [
    path, typeof content === 'string' ? new TextEncoder().encode(content) : content,
  ]))
  const form = new FormData()
  form.append('package', new File([zipSync(entries)], name, { type: 'application/zip' }))
  return new Request('https://juzxailab.com/api/admin/private-notes/upload-package', {
    method: 'POST',
    headers: { origin: 'https://juzxailab.com' },
    body: form,
  })
}

test('private markdown API rejects unauthenticated access', async () => {
  const handler = createPrivateMarkdownHandler({
    authenticate: async () => ({ ok: false, response: Response.json({ error: 'denied' }, { status: 403 }) }),
  })
  const response = await handler(request('/api/admin/private-notes'), { PERSONAL_OS_DB: makeDb() })
  assert.equal(response.status, 403)
})

test('private markdown API uploads, lists, reads, and replaces a note', async () => {
  const db = makeDb()
  const handler = createPrivateMarkdownHandler({ authenticate: allowOwner })
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: db, PRIVATE_NOTES_ASSETS: makeBucket() }

  const created = await handler(uploadRequest(), env)
  assert.equal(created.status, 201)
  const createdPayload = await created.json()
  assert.equal(createdPayload.document.title, '私有笔记')
  assert.equal(createdPayload.replaced, false)

  const listed = await handler(request('/api/admin/private-notes'), env)
  const listedPayload = await listed.json()
  assert.equal(listedPayload.documents.length, 1)
  assert.equal(listedPayload.documents[0].filename, 'private-note.md')
  assert.equal('content' in listedPayload.documents[0], false)

  const id = listedPayload.documents[0].id
  const detail = await handler(request(`/api/admin/private-notes/${id}`), env)
  assert.equal((await detail.json()).document.content, '# 私有笔记\n\n只有我能看到。')

  const replaced = await handler(uploadRequest('private-note.md', '# 更新后的私有笔记'), env)
  assert.equal(replaced.status, 200)
  assert.equal((await replaced.json()).document.version, 2)
})

test('private markdown API validates file type, size, and mutation origin', async () => {
  const handler = createPrivateMarkdownHandler({ authenticate: allowOwner })
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: makeDb(), PRIVATE_NOTES_ASSETS: makeBucket() }

  const wrongName = await handler(uploadRequest('note.txt'), env)
  assert.equal(wrongName.status, 400)
  assert.deepEqual(await wrongName.json(), { error: 'INVALID_MARKDOWN_FILENAME' })

  const oversized = await handler(uploadRequest('large.md', 'x'.repeat(MAX_MARKDOWN_BYTES + 1)), env)
  assert.equal(oversized.status, 413)
  assert.deepEqual(await oversized.json(), { error: 'MARKDOWN_TOO_LARGE' })

  const wrongOrigin = await handler(uploadRequest('note.md'), {
    ...env,
    ALLOWED_ORIGIN: 'https://other.example',
  })
  assert.equal(wrongOrigin.status, 403)
  assert.deepEqual(await wrongOrigin.json(), { error: 'INVALID_ORIGIN' })
})

test('private markdown API deletes a note and reports missing ids', async () => {
  const db = makeDb()
  const handler = createPrivateMarkdownHandler({ authenticate: allowOwner })
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: db, PRIVATE_NOTES_ASSETS: makeBucket() }
  const created = await handler(uploadRequest(), env)
  const id = (await created.json()).document.id

  const deleted = await handler(request(`/api/admin/private-notes/${id}`, { method: 'DELETE' }), env)
  assert.deepEqual(await deleted.json(), { deleted: true, id })
  const missing = await handler(request(`/api/admin/private-notes/${id}`, { method: 'DELETE' }), env)
  assert.equal(missing.status, 404)
})

test('private markdown package stores assets, renders asset metadata, and serves assets', async () => {
  const db = makeDb()
  const bucket = makeBucket()
  const handler = createPrivateMarkdownHandler({ authenticate: allowOwner })
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: db, PRIVATE_NOTES_ASSETS: bucket }

  const created = await handler(packageRequest(), env)
  assert.equal(created.status, 201)
  const payload = await created.json()
  assert.equal(payload.assetCount, 1)
  const id = payload.document.id

  const detail = await handler(request(`/api/admin/private-notes/${id}`), env)
  const detailPayload = await detail.json()
  assert.deepEqual(detailPayload.document.assets, [{
    path: 'images/example.png', contentType: 'image/png', byteSize: 4,
  }])

  const asset = await handler(request(`/api/admin/private-notes/${id}/assets/images/example.png`), env)
  assert.equal(asset.status, 200)
  assert.equal(asset.headers.get('content-type'), 'image/png')
  assert.deepEqual(new Uint8Array(await asset.arrayBuffer()), new Uint8Array([137, 80, 78, 71]))
})

test('private markdown package validates the archive and asset limits', async () => {
  const handler = createPrivateMarkdownHandler({ authenticate: allowOwner })
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: makeDb(), PRIVATE_NOTES_ASSETS: makeBucket() }

  const missingMarkdown = await handler(packageRequest('missing.zip', { 'images/a.png': new Uint8Array([1]) }), env)
  assert.equal(missingMarkdown.status, 400)
  assert.deepEqual(await missingMarkdown.json(), { error: 'PACKAGE_REQUIRES_ONE_MARKDOWN' })

  const oversizedAsset = await handler(packageRequest('large.zip', {
    'note.md': '# note',
    'large.png': new Uint8Array(MAX_ASSET_BYTES + 1),
  }), env)
  assert.equal(oversizedAsset.status, 413)
  assert.deepEqual(await oversizedAsset.json(), { error: 'ASSET_TOO_LARGE' })
})
