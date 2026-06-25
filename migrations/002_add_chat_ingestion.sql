CREATE TABLE IF NOT EXISTS chat_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  text TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  confidence REAL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id)
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  message_id INTEGER,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  original_name TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  expires_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id),
  FOREIGN KEY (message_id) REFERENCES chat_messages(id)
);

CREATE TABLE IF NOT EXISTS parse_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  provider TEXT,
  model TEXT,
  normalized_action TEXT,
  raw_response_json TEXT,
  confidence REAL,
  ambiguities_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY (message_id) REFERENCES chat_messages(id)
);

CREATE TABLE IF NOT EXISTS message_record_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY (message_id) REFERENCES chat_messages(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('parser_mode', 'balanced');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('image_retention_days', '180');
