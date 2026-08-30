"""Knowledge base endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core import db
from app.core.security import get_current_user
from app.services import knowledge

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class SearchReq(BaseModel):
    query: str
    top_k: int = 4


@router.post("/search")
def search_kb(body: SearchReq, _payload=Depends(get_current_user)):
    return {"results": knowledge.search(body.query, top_k=body.top_k)}


@router.get("/stats")
def kb_stats(_payload=Depends(get_current_user)):
    stats = knowledge.kb_stats()
    with db.db() as c:
        rows = c.execute(
            "SELECT source_doc, COUNT(*) AS chunks, MAX(section) AS section FROM knowledge GROUP BY source_doc"
        ).fetchall()
    stats["items"] = [dict(r) for r in rows]
    return stats


@router.get("/entries")
def kb_entries(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM knowledge ORDER BY updated_at DESC LIMIT 200").fetchall()
    return {"entries": [dict(r) for r in rows]}
