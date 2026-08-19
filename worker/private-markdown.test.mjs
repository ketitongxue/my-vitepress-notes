import assert from 'node:assert/strict'
import test from 'node:test'

import { createPrivateMarkdownHandler, MAX_MARKDOWN_BYTES } from './private-markdown.mjs'

const allowOwner = async () => ({ ok: true, identity: 'owner@example.com' })

function makeDb() {
  const rows = new Map()
  return {
    rows,
    prepare(sql) {
      let values = []
      return {
        bind(...bound) { values = bound; return this },
        async first() {
          if (sql.includes('SELECT version FROM')) {
            return [...rows.values()].find((row) => row.filename === values[0]) ?? null
          }
          if (sql.includes('WHERE id = ?')) return rows.get(values[0]) ?? null
          return null
        },
        async all() {
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
          if (sql.trimStart().startsWith('DELETE FROM')) {
            const existed = rows.delete(values[0])
            return { meta: { changes: existed ? 1 : 0 } }
          }
          return { meta: { changes: 0 } }
        },
      }
    },
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
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: db }

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
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: makeDb() }

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
  const env = { ALLOWED_ORIGIN: 'https://juzxailab.com', PERSONAL_OS_DB: db }
  const created = await handler(uploadRequest(), env)
  const id = (await created.json()).document.id

  const deleted = await handler(request(`/api/admin/private-notes/${id}`, { method: 'DELETE' }), env)
  assert.deepEqual(await deleted.json(), { deleted: true, id })
  const missing = await handler(request(`/api/admin/private-notes/${id}`, { method: 'DELETE' }), env)
  assert.equal(missing.status, 404)
})
