CREATE TABLE private_markdown_documents (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  filename TEXT NOT NULL UNIQUE CHECK (length(filename) BETWEEN 1 AND 200),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  content TEXT NOT NULL CHECK (length(content) <= 524288),
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 524288),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 3 AND 320),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_private_markdown_updated
ON private_markdown_documents(updated_at DESC, id);
