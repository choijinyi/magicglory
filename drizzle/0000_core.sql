CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, password_hash TEXT, salt TEXT, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, board TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_board_date ON posts(board,created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, body TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_post_date ON comments(post_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending', reply TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL);
