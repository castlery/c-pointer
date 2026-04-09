import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config.js";

const databaseFile = path.resolve(process.cwd(), config.databasePath);
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

export const database = new Database(databaseFile);

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS device_users (
    device_user_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analysis_sessions (
    session_id TEXT PRIMARY KEY,
    device_user_id TEXT NOT NULL,
    component_name TEXT NOT NULL,
    workspace TEXT NOT NULL,
    environment TEXT NOT NULL,
    page_url TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(device_user_id) REFERENCES device_users(device_user_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_messages (
    message_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_summaries (
    session_id TEXT PRIMARY KEY,
    summary_text TEXT NOT NULL,
    confirmed_facts_json TEXT NOT NULL,
    open_questions_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS component_context_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    data_insp_path TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line INTEGER NOT NULL,
    column INTEGER NOT NULL,
    component_name TEXT NOT NULL,
    github_url TEXT NOT NULL,
    selected_text TEXT,
    dom_tag TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS context_files (
    context_file_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    role TEXT NOT NULL,
    sha TEXT NOT NULL,
    github_url TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY(snapshot_id) REFERENCES component_context_snapshots(snapshot_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_analysis_sessions_device_updated
    ON analysis_sessions(device_user_id, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_analysis_sessions_expires
    ON analysis_sessions(expires_at);

  CREATE INDEX IF NOT EXISTS idx_session_messages_session_created
    ON session_messages(session_id, created_at ASC);

  CREATE INDEX IF NOT EXISTS idx_context_files_session
    ON context_files(session_id, created_at ASC);
`);
