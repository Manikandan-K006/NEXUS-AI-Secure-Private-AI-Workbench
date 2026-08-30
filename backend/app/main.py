"""NEXUS AI Workbench — FastAPI application entrypoint.

Runs the real backend: auth/RBAC, model gateway, OCR, RAG knowledge base,
document processing, agent orchestration, offline sandbox, and audit/security.
Serves the static SPA from / and exposes a JSON API under /api.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (auth, deliverables, documents, knowledge, models,
                     security, system, tasks, users)
from app.core import db
from app.core.config import get_settings
from app.core.security import hash_password

ROOT = Path(__file__).resolve().parent.parent.parent  # repo root


def bootstrap() -> None:
    get_settings().ensure_dirs()
    db.init_db()
    with db.db() as c:
        existing = c.execute(
            "SELECT id FROM users WHERE username=?", (get_settings().admin_user,)
        ).fetchone()
        if existing is None:
            c.execute(
                "INSERT INTO users(username,email,password_hash,role,full_name,is_active,created_at) "
                "VALUES(?,?,?,?,?,1,?)",
                (get_settings().admin_user, get_settings().admin_email,
                 hash_password(get_settings().admin_password), "admin",
                 "NEXUS Administrator", db.now_iso()),
            )


def create_app() -> FastAPI:
    bootstrap()
    app = FastAPI(title="NEXUS AI Workbench", version="1.0.0",
                  description="Sovereign on-premise agentic AI workbench")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = FastAPI(title="NEXUS API", version="1.0.0")
    for sub in (auth, models, documents, knowledge, tasks, deliverables, security, system, users):
        api.include_router(sub.router)
    app.mount("/api", api)
    app.include_router(system.router)

    if (ROOT / "index.html").exists():
        try:
            app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="web")
        except Exception:  # noqa
            pass
    else:
        @app.get("/")
        def root():
            return {"name": "NEXUS AI Workbench", "api": "/api/health"}

    return app


app = create_app()
