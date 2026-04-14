-- Lark Master D1 schema
-- Run locally: wrangler d1 migrations apply lark-master --local
-- Run remote:  wrangler d1 migrations apply lark-master --remote

CREATE TABLE IF NOT EXISTS users (
  open_id       TEXT PRIMARY KEY,
  union_id      TEXT,
  tenant_key    TEXT NOT NULL,
  display_name  TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  open_id              TEXT PRIMARY KEY,
  access_token_enc     BLOB NOT NULL,
  refresh_token_enc    BLOB NOT NULL,
  scopes               TEXT NOT NULL,
  expires_at           INTEGER NOT NULL,
  refresh_expires_at   INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL,
  FOREIGN KEY (open_id) REFERENCES users(open_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  thread_id        TEXT PRIMARY KEY,
  open_id          TEXT,
  chat_id          TEXT,
  session_id       TEXT,
  summary          TEXT,
  last_message_at  INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_open_id ON conversations(open_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id       TEXT NOT NULL,
  direction       TEXT CHECK(direction IN ('in','out')) NOT NULL,
  content         TEXT,
  tool_calls_json TEXT,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES conversations(thread_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE TABLE IF NOT EXISTS audit (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id      TEXT,
  lark_cli_cmd   TEXT,
  result_status  TEXT,
  cost_ms        INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_thread_id ON audit(thread_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit(created_at);
