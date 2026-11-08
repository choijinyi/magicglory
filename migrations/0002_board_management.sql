CREATE TABLE IF NOT EXISTS deleted_original_posts (
  post_id TEXT PRIMARY KEY,
  deleted_by TEXT NOT NULL REFERENCES users(id),
  deleted_at TEXT NOT NULL
);
