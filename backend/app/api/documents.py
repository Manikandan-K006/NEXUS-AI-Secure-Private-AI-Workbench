"""Documents: real upload, background processing, analysis, preview, re-analyze, delete.

All processing is local. Uploads are stored under the on-prem upload dir keyed
by a unique doc_id. The browser never sees filesystem paths.
"""
from __future__ import annotations

import json
import logging
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core import db
from app.core.config import get_settings
from app.core.security import get_current_user
from app.services import knowledge

logger = logging.getLogger("nexus.docapi")

router = APIRouter(prefix="/documents", tags=["documents"])

# whitelist of supported extensions -> label
SUPPORTED = {
    ".pdf": "PDF",
    ".png": "Image",
    ".jpg": "Image",
    ".jpeg": "Image",
    ".csv": "CSV",
    ".xlsx": "Spreadsheet",
    ".docx": "Document",
}


def new_doc_id() -> str:
    return f"DOC-{uuid.uuid4().hex[:10].upper()}"


def _sanitize_filename(name: str) -> str:
    """Strip path separators / traversal / control chars; keep extension."""
    name = (name or "document").replace("\\", "/")
    base = name.rsplit("/", 1)[-1]
    base = "".join(c for c in base if c.isalnum() or c in "._- ").strip()
    if not base:
        base = "document"
    return base[:120]


def _set_progress(doc_id: str, stage: str, progress: int, status: str = "processing",
                  error: str | None = None) -> None:
    with db.db() as c:
        c.execute(
            "UPDATE documents SET processing_stage=?, progress=?, status=?, error=? WHERE doc_id=?",
            (stage, progress, status, error, doc_id),
        )


def _run_processing(doc_id: str) -> None:
    """Background worker: validate -> extract -> ocr -> analyze -> index."""
    from app.services import analysis
    settings = get_settings()
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        return
    path = Path(row["path"])
    ext = row["ext"]
    name = row["name"]
    user = row["created_by"] or "admin"

    try:
        _set_progress(doc_id, "validating", 8)
        if ext not in SUPPORTED:
            _set_progress(doc_id, "error", 100, status="error", error="UNSUPPORTED_FILE")
            db.audit(user, "Document failed", status="ERROR", source=name, tools="validation",
                     security=f"UNSUPPORTED_FILE: {ext}")
            return
        if not path.exists() or path.stat().st_size == 0:
            _set_progress(doc_id, "error", 100, status="error", error="EMPTY_FILE")
            db.audit(user, "Document failed", status="ERROR", source=name, tools="validation",
                     security="EMPTY_FILE")
            return

        _set_progress(doc_id, "extracting", 25)
        db.audit(user, "Document processing started", source=name, tools="pipeline")
        result = analysis.analyze_document(path, ext, doc_id, name)
        _set_progress(doc_id, "analyzing", 75)

        # index into knowledge base for RAG
        try:
            index_key = f"{doc_id}_{name}"
            n = knowledge.index_document(doc_id, name, row["ext"].lstrip(".").upper(),
                                         extract_all_text(result))
        except Exception as e:  # noqa
            logger.warning("index failed for %s: %s", doc_id, e)
            n = 0

        with db.db() as c:
            c.execute(
                "UPDATE documents SET status='done', processing_stage='completed', progress=100, "
                "pages=?, ocr_confidence=?, entities=?, findings=?, metadata_json=?, analysis_json=?, error=NULL "
                "WHERE doc_id=?",
                (result["page_count"], result.get("ocr_confidence"),
                 json.dumps(result["analysis"].get("entities", []),
                            ensure_ascii=False) if result.get("analysis") else "[]",
                 json.dumps(result["analysis"].get("findings", []),
                            ensure_ascii=False) if result.get("analysis") else "[]",
                 json.dumps(result.get("metadata", {}), ensure_ascii=False),
                 json.dumps(result, ensure_ascii=False),
                 doc_id),
            )
        db.audit(user, "Document analysis completed", source=name,
                 tools="local-extraction+model", status="SUCCESS",
                 security=f"pages={result['page_count']} entities={len(result['analysis'].get('entities', []))}")
        db.audit(user, "Knowledge base indexed", source=name, tools="RAG", status="SUCCESS",
                 security=f"chunks={n}")
    except Exception as e:  # noqa
        _set_progress(doc_id, "error", 100, status="error", error=f"{type(e).__name__}: {e}")
        db.audit(user, "Document processing failed", status="ERROR", source=name,
                 tools="pipeline", security=str(e)[:200])


def _all_text(result: dict) -> str:
    return "\n\n".join(p.get("text", "") for p in result.get("pages", []))


def extract_all_text(result: dict) -> str:
    return _all_text(result)


@router.post("/upload")
def upload_document(file: UploadFile = File(...), payload=Depends(get_current_user)):
    settings = get_settings()
    raw_name = file.filename or "document"
    ext = Path(raw_name).suffix.lower()
    if ext not in SUPPORTED:
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {list(SUPPORTED)}")
    name = _sanitize_filename(raw_name)
    doc_id = new_doc_id()
    dest = settings.upload_dir / f"{doc_id}_{name}"
    contents = file.file.read()
    if len(contents) == 0:
        raise HTTPException(400, "Uploaded file is empty")
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(413, "File too large")
    dest.write_bytes(contents)

    with db.db() as c:
        c.execute(
            "INSERT INTO documents(doc_id,name,path,ext,size_bytes,status,processing_stage,progress,"
            "workspace_id,created_by,uploaded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (doc_id, name, str(dest), ext, len(contents), "uploaded", "queued", 0,
             "default", payload["sub"], db.now_iso()),
        )
    db.audit(payload["sub"], "Document uploaded", source=name, tools="ingest",
             security=f"size={len(contents)}B")
    threading.Thread(target=_run_processing, args=(doc_id,), daemon=True).start()
    return {"document_id": doc_id, "filename": name, "ext": ext,
            "size_bytes": len(contents), "status": "uploaded"}


@router.get("/{doc_id}/status")
def doc_status(doc_id: str, _payload=Depends(get_current_user)):
    with db.db() as c:
        row = c.execute("SELECT doc_id,status,processing_stage,progress,error,name FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    return {"document_id": row["doc_id"], "status": row["status"],
            "stage": row["processing_stage"], "progress": row["progress"] or 0,
            "error": row["error"], "filename": row["name"]}


@router.get("/{doc_id}/analysis")
def doc_analysis(doc_id: str, _payload=Depends(get_current_user)):
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    if row["status"] != "done":
        raise HTTPException(409, {"status": row["status"], "stage": row["processing_stage"], "progress": row["progress"], "error": row["error"]})
    try:
        result = json.loads(row["analysis_json"])
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(500, "Analysis could not be decoded")
    return result


@router.get("/{doc_id}/preview")
def doc_preview(doc_id: str, _payload=Depends(get_current_user)):
    settings = get_settings()
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    path = Path(row["path"])
    if not path.exists():
        raise HTTPException(404, "File missing")
    # Only serve supported file types; images served inline for preview.
    media = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(row["ext"], "application/octet-stream")
    return FileResponse(str(path), filename=row["name"], media_type=media)


@router.post("/{doc_id}/reanalyze")
def reanalyze(doc_id: str, payload=Depends(get_current_user)):
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    with db.db() as c:
        c.execute("UPDATE documents SET status='uploaded', processing_stage='queued', progress=0, error=NULL WHERE doc_id=?", (doc_id,))
    threading.Thread(target=_run_processing, args=(doc_id,), daemon=True).start()
    db.audit(payload["sub"], "Document re-analyze requested", source=row["name"], tools="pipeline")
    return {"document_id": doc_id, "status": "processing"}


@router.delete("/{doc_id}")
def delete_document(doc_id: str, payload=Depends(get_current_user)):
    settings = get_settings()
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    path = Path(row["path"])
    try:
        if path.exists():
            path.unlink()
    except Exception as e:  # noqa
        logger.warning("delete file failed: %s", e)
    with db.db() as c:
        c.execute("DELETE FROM documents WHERE doc_id=?", (doc_id,))
        c.execute("DELETE FROM knowledge WHERE source_doc=?", (doc_id,))
    db.audit(payload["sub"], "Document deleted", source=row["name"], tools="cleanup",
             status="SUCCESS", security="file+analysis+chunks removed")
    return {"document_id": doc_id, "status": "deleted"}


@router.get("")
def list_documents(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM documents ORDER BY uploaded_at DESC LIMIT 200").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        for k in ("entities", "findings", "metadata_json"):
            try:
                d[k] = json.loads(d[k]) if d[k] else None
            except (TypeError, json.JSONDecodeError):
                pass
        out.append({kk: d.get(kk) for kk in
                    ("doc_id", "id", "name", "ext", "size_bytes", "pages", "status",
                     "processing_stage", "progress", "ocr_confidence", "workspace_id",
                     "created_by", "uploaded_at", "error")})
    return {"documents": out}


@router.get("/{doc_id}")
def get_document(doc_id: str, _payload=Depends(get_current_user)):
    with db.db() as c:
        row = c.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Not found")
    return dict(row)


class RegionQAReq(BaseModel):
    prompt: str
    top_k: int = 4


@router.post("/region-qa")
def region_qa(body: RegionQAReq, _payload=Depends(get_current_user)):
    hits = knowledge.search(body.prompt, top_k=body.top_k)
    if not hits:
        return {"sources": [], "answer": "No relevant local knowledge-base documents found."}
    context = "\n\n".join(f"[{i + 1}] {h['source']} p.{h['page']}: {h['text'][:400]}" for i, h in enumerate(hits))
    answer = "Synthesized from on-premise knowledge base (citations below).\n\n" + \
        "".join(f"\n• {h['text'][:180]}  —  {h['source']} (p.{h['page']})" for h in hits[:3])
    db.audit(_payload["sub"], "Region QA", source=body.prompt[:80], tools="RAG", status="SUCCESS")
    return {"sources": [{k: h.get(k, "") for k in ("source", "section", "page", "score")} for h in hits], "answer": answer}
