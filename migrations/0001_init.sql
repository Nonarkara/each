-- Initial schema for AXIOM workspace state.
-- Mirrors the current JSON state shape in a single row for simplicity.
CREATE TABLE IF NOT EXISTS workspace_state (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed the default row. The frontend will create this if missing on first save.
INSERT OR IGNORE INTO workspace_state (id, data) VALUES ('default', '{}');
