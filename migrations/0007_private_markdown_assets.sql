CREATE TABLE IF NOT EXISTS private_markdown_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL,
  path TEXT NOT NULL CHECK(length(path) BETWEEN 1 AND 240),
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK(length(content_type) BETWEEN 1 AND 120),
  byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 1 AND 8388608),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (document_id) REFERENCES private_markdown_documents(id) ON DELETE CASCADE,
  UNIQUE (document_id, path)
);

CREATE INDEX IF NOT EXISTS idx_private_markdown_assets_document
  ON private_markdown_assets(document_id, path);
