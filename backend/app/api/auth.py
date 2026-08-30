"""Auth endpoints: login + token."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import db
from app.core.security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    full_name: str | None = None


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn):
    with db.db() as c:
        row = c.execute("SELECT * FROM users WHERE username=?", (body.username,)).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        db.audit(body.username, "Login", status="FAILED", source="auth/login", tools="—")
        raise HTTPException(401, "Invalid credentials")
    if not row["is_active"]:
        db.audit(body.username, "Login", status="BLOCKED(INACTIVE)", source="auth/login")
        raise HTTPException(403, "Account disabled")
    token = create_access_token(body.username, row["role"], row["id"])
    db.audit(body.username, "Login", status="SUCCESS", source="auth/login", tools="—")
    return LoginOut(access_token=token, username=body.username, role=row["role"], full_name=row["full_name"])


class MeOut(BaseModel):
    username: str
    role: str
    uid: int


@router.get("/me", response_model=MeOut)
def me(payload: dict = Depends(get_current_user)):
    return MeOut(username=payload["sub"], role=payload.get("role", "engineer"), uid=payload.get("uid", 0))
