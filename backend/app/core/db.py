"""SQLite persistence layer.

Uses stdlib sqlite3 — zero extra ORM dependency for the prototype.
Tables: users, models, documents, deliverables, audit_logs, network_log,
        knowledge (indexed chunks + metadata), tasks, agent_steps.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings

_lock = threading.Lock()
_db_path: Path | None = None


def db_path() -> Path:
    global _db_path
    if _db_path is None:
        _db_path = Path(get_settings().kb_dir).parent / "nexus.db"
    return _db_path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def conn() -> sqlite3.Connection:
    con = sqlite3.connect(str(db_path()), timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    return con


@contextmanager
def db():
    con = conn()
    try:
        _lock.acquire()
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()
        _lock.release()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'engineer',
  full_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,          -- reasoning|coding|vision|embed
  source TEXT,
  status TEXT DEFAULT 'registered',   -- registered|loaded|unloaded
  context_len INTEGER,
  quant TEXT,
  vram_gb REAL,
  capabilities TEXT,           -- json list
  endpoint TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  ext TEXT,
  size_bytes INTEGER,
  pages INTEGER,
  status TEXT DEFAULT 'uploaded',       -- uploaded|processing|done|error
  processing_stage TEXT,                -- validating|extracting|ocr|analyzing|entities|completed
  progress INTEGER DEFAULT 0,
  workspace_id TEXT,
  created_by TEXT,
  ocr_confidence REAL,
  entities TEXT,                        -- json
  findings TEXT,                        -- json
  metadata_json TEXT,
  analysis_json TEXT,                   -- full structured analysis
  error TEXT,
  uploaded_at TEXT
);
CREATE TABLE IF NOT EXISTS knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_doc TEXT NOT NULL,
  title TEXT,
  doc_type TEXT,
  chunk_index INTEGER,
  chunk_text TEXT,
  section TEXT,
  page INTEGER,
  embedding TEXT,                       -- json list (or empty)
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  category TEXT,                        -- docx|xlsx|pptx|pdf|code|calc
  source_task TEXT,
  provenance TEXT,                      -- json
  validated INTEGER DEFAULT 1,
  size_bytes INTEGER,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT UNIQUE NOT NULL,
  title TEXT,
  prompt TEXT,
  status TEXT DEFAULT 'queued',         -- queued|running|completed|failed|aborted
  mode TEXT,
  files TEXT,                           -- json list
  result TEXT,                          -- json
  started_at TEXT,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS agent_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  step_order INTEGER,
  title TEXT,
  status TEXT,
  model TEXT,
  tool TEXT,
  duration_ms INTEGER,
  detail TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT,
  timestamp TEXT,
  action TEXT,
  model TEXT,
  source TEXT,
  tools TEXT,
  status TEXT,
  security_journal TEXT
);
CREATE TABLE IF NOT EXISTS network_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  source TEXT,
  destination TEXT,
  protocol TEXT,
  status TEXT,           -- ALLOWED|BLOCKED
  data TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS security_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT
);
"""


def init_db() -> None:
    with db() as c:
        c.executescript(SCHEMA)
        _migrate(c)


def _migrate(c) -> None:
    """Add columns introduced after a table already existed."""
    cols = [r["name"] for r in c.execute("PRAGMA table_info(documents)").fetchall()]
    doc_add = {
        "processing_stage": "TEXT",
        "progress": "INTEGER DEFAULT 0",
        "workspace_id": "TEXT",
        "created_by": "TEXT",
        "analysis_json": "TEXT",
        "error": "TEXT",
    }
    for name, decl in doc_add.items():
        if name not in cols:
            c.execute(f"ALTER TABLE documents ADD COLUMN {name} {decl}")
        c.commit()


def set_kv(key: str, value: str) -> None:
    with db() as c:
        c.execute(
            "INSERT INTO security_counts(key,value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )


def get_kv(key: str, default: str = "0") -> str:
    with db() as c:
        row = c.execute("SELECT value FROM security_counts WHERE key=?", (key,)).fetchone()
        return str(row["value"]) if row else default


def bump_counter(key: str) -> int:
    with db() as c:
        c.execute(
            "INSERT INTO security_counts(key,value) VALUES(?,1) "
            "ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1",
            (key,),
        )
        row = c.execute("SELECT value FROM security_counts WHERE key=?", (key,)).fetchone()
        return int(row["value"])


def log_network(timestamp, source, destination, protocol, status, data, note) -> None:
    with db() as c:
        c.execute(
            "INSERT INTO network_log(timestamp,source,destination,protocol,status,data,note) "
            "VALUES(?,?,?,?,?,?,?)",
            (timestamp, source, destination, protocol, status, data, note),
        )


def audit(user, action, model="—", source="", tools="", status="SUCCESS", security=""):
    with db() as c:
        c.execute(
            "INSERT INTO audit_logs(user,timestamp,action,model,source,tools,status,security_journal) "
            "VALUES(?,?,?,?,?,?,?,?)",
            (user, now_iso(), action, model, source, tools, status, security),
        )
