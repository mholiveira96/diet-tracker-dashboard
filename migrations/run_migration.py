#!/usr/bin/env python3
"""
Run a SQL migration against Turso using repo-local .env credentials.

Usage:
  python migrations/run_migration.py
  python migrations/run_migration.py migrations/002_add_chat_ingestion.sql
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILES = [REPO_ROOT / ".env", REPO_ROOT / ".env.prod", REPO_ROOT / ".env.turso"]
DEFAULT_MIGRATION = Path(__file__).with_name("002_add_chat_ingestion.sql")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').replace("\\n", ""))


for env_file in DEFAULT_ENV_FILES:
    load_env_file(env_file)

TURSO_URL = os.getenv("TURSO_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if not TURSO_URL or not TURSO_AUTH_TOKEN:
    print("❌ Missing TURSO_URL or TURSO_AUTH_TOKEN in repo env files")
    sys.exit(1)


def execute_sql(sql: str):
    assert TURSO_URL is not None
    assert TURSO_AUTH_TOKEN is not None
    url = TURSO_URL.replace("libsql://", "https://").rstrip("/") + "/v2/pipeline"
    payload = {
        "requests": [
            {
                "type": "execute",
                "stmt": {
                    "sql": sql,
                    "args": [],
                },
            }
        ]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TURSO_AUTH_TOKEN}",
        },
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())


def split_sql_statements(sql_text: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_single = False
    in_double = False

    for char in sql_text:
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double

        if char == ";" and not in_single and not in_double:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            continue

        current.append(char)

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def run_migration(migration_path: Path) -> bool:
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return False

    sql_text = migration_path.read_text()
    statements = [stmt for stmt in split_sql_statements(sql_text) if stmt and not stmt.lstrip().startswith("--")]

    print(f"🚀 Running migration: {migration_path.name}")
    print(f"   Found {len(statements)} SQL statements")

    success_count = 0
    error_count = 0

    for index, statement in enumerate(statements, start=1):
        try:
            execute_sql(statement)
            success_count += 1
            print(f"   [{index}/{len(statements)}] ✅ OK")
        except Exception as exc:
            error_message = str(exc)
            if "already exists" in error_message.lower() or "duplicate column name" in error_message.lower():
                success_count += 1
                print(f"   [{index}/{len(statements)}] ⚠️  Already applied")
            else:
                error_count += 1
                print(f"   [{index}/{len(statements)}] ❌ {error_message}")

    print(f"\n✅ Migration completed: {success_count} success, {error_count} errors")
    return error_count == 0


if __name__ == "__main__":
    migration_arg = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_MIGRATION
    success = run_migration(migration_arg)
    sys.exit(0 if success else 1)
