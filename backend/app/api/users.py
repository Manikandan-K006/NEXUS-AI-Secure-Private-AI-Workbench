"""Users + RBAC management (admin only)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import db
from app.core.security import hash_password, require_roles

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    username: str
    password: str
    email: str = ""
    role: str = "engineer"
    full_name: str = ""


@router.post("")
def create_user(body: UserCreate, payload=Depends(require_roles("admin"))):
    if body.role not in {"admin", "engineer", "auditor"}:
        raise HTTPException(400, "Invalid role")
    with db.db() as c:
        exists = c.execute("SELECT id FROM users WHERE username=?", (body.username,)).fetchone()
    if exists:
        raise HTTPException(409, "User exists")
    with db.db() as c:
        c.execute(
            "INSERT INTO users(username,email,password_hash,role,full_name,is_active,created_at) "
            "VALUES(?,?,?,?,?,1,?)",
            (body.username, body.email, hash_password(body.password), body.role,
             body.full_name, db.now_iso()),
        )
    db.audit(payload["sub"], "User created", source=body.username, tools="RBAC")
    return {"username": body.username, "role": body.role}


@router.get("")
def list_users(payload=Depends(require_roles("admin"))):
    with db.db() as c:
        rows = c.execute(
            "SELECT id,username,email,role,full_name,is_active,created_at FROM users"
        ).fetchall()
    return {"users": [dict(r) for r in rows]}
