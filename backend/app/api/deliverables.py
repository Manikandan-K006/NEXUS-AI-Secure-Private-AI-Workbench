"""Deliverables endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.core import db
from app.core.security import get_current_user

router = APIRouter(prefix="/deliverables", tags=["deliverables"])


@router.get("")
def list_deliverables(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM deliverables ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"deliverables": [dict(r) for r in rows]}


@router.get("/{name}/download")
def download(name: str, _payload=Depends(get_current_user)):
    from app.core.config import get_settings
    path = get_settings().deliverable_dir / name
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(404, "Deliverable not found")
    return FileResponse(str(path), filename=name)
