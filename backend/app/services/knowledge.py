"""Knowledge base: chunk indexing + semantic retrieval + citations.

Uses Chroma (local) when available, otherwise falls back to an in-process
in-memory cosine search. Embeddings come from the local embed model.
"""
from __future__ import annotations

import json
import logging
import math
from pathlib import Path

from app.core import db
from app.core.config import get_settings
from app.services.model_gateway import registry, pick_embed

logger = logging.getLogger("nexus.kb")

_collection = None
_fallback_docs = []  # list of dicts: {id, text, meta, vec}


def _cosine(a: list, b: list) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1
    nb = math.sqrt(sum(x * x for x in b)) or 1
    return dot / (na * nb)


def _chunk_embed(text: str):
    model = pick_embed()
    try:
        emb = registry.embed(model.model_id, text)
        return emb[0] if isinstance(emb, list) and emb else emb
    except Exception as e:  # noqa
        logger.warning("embed failed (%s) — using fallback hash embedding", e)
        return _fallback_vec(text)


def _fallback_vec(text: str, dim: int = 256) -> list[float]:
    """Deterministic bag-of-words embedding usable offline (not semantic)."""
    import hashlib
    vec = [0.0] * dim
    for tok in text.lower().split():
        h = int(hashlib.md5(tok.encode()).hexdigest()[:8], 16)
        vec[h % dim] += 1.0
    n = math.sqrt(sum(v * v for v in vec)) or 1
    return [v / n for v in vec]


def _get_collection():
    global _collection
    if _collection is None:
        try:
            import chromadb
            settings = get_settings()
            client = chromadb.PersistentClient(path=str(settings.vector_dir))
            _collection = client.get_or_create_collection("nexus_kb")
        except Exception as e:  # noqa
            logger.info("Chroma unavailable (%s); using in-memory fallback", e)
            _collection = None
    return _collection


def index_document(source_doc: str, title: str, doc_type: str, body: str, section: str = "", page: int = 0) -> int:
    """Chunk + embed + store a document. Returns chunk count."""
    from app.services.document_processor import chunk_text
    chunks = chunk_text(body)
    coll = _get_collection()
    count = 0
    for i, chunk in enumerate(chunks):
        vec = _chunk_embed(chunk)
        meta = {
            "source": source_doc,
            "title": title,
            "type": doc_type,
            "section": section,
            "page": page,
            "chunk": i,
        }
        if coll is not None:
            coll.upsert(ids=[f"{source_doc}:{i}"], documents=[chunk], metadatas=[meta], embeddings=[vec])
        else:
            import uuid
            _fallback_docs.append({"id": str(uuid.uuid4()), "text": chunk, "vec": vec, "meta": meta})
            count += 1
        # persist chunk-level record (for audit/chunk viewer)
        with db.db() as c:
            c.execute(
                "INSERT INTO knowledge(source_doc,title,doc_type,chunk_index,chunk_text,section,page,embedding,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,?)",
                (source_doc, title, doc_type, i, chunk, section, page, json.dumps(vec[:8]),
                 db.now_iso()),
            )
    if coll is not None:
        count = len(chunks)
    return count


def search(query: str, top_k: int = 4, source_filter: str | None = None) -> list[dict]:
    """Return ranked chunks with citations. Never returns external data."""
    qvec = _chunk_embed(query)
    coll = _get_collection()
    if coll is not None:
        try:
            where = {"source": source_filter} if source_filter else None
            res = coll.query(query_embeddings=[qvec], n_results=top_k, where=where)
            out = []
            ids = res.get("ids", [[]])[0]
            docs = res.get("documents", [[]])[0]
            metas = res.get("metadatas", [[]])[0]
            dists = res.get("distances", [[]])[0]
            for i, doc in enumerate(docs):
                m = metas[i] or {}
                sim = 1 - (dists[i] if i < len(dists) else 0)
                out.append({
                    "text": doc,
                    "source": m.get("source", ""),
                    "title": m.get("title", ""),
                    "section": m.get("section", ""),
                    "page": m.get("page", 0),
                    "score": round(max(0.0, min(1.0, sim)), 3),
                })
            return out
        except Exception as e:  # noqa
            logger.warning("chroma query failed: %s", e)
    # fallback
    scored = [{"doc": d, "score": _cosine(qvec, d["vec"])} for d in _fallback_docs]
    scored.sort(key=lambda x: x["score"], reverse=True)
    out = []
    for item in scored[:top_k]:
        m = item["doc"]["meta"]
        out.append({
            "text": item["doc"]["text"],
            "source": m.get("source", ""),
            "title": m.get("title", ""),
            "section": m.get("section", ""),
            "page": m.get("page", 0),
            "score": round(item["score"], 3),
        })
    return out


def kb_stats() -> dict:
    coll = _get_collection()
    chunks = len(_fallback_docs) if coll is None else _collection_meta_count(coll)
    with db.db() as c:
        docs = c.execute(
            "SELECT COUNT(DISTINCT source_doc) AS n FROM knowledge WHERE chunk_index=0"
        ).fetchone()
        total = c.execute("SELECT COUNT(*) AS n FROM knowledge").fetchone()
    return {
        "documents": docs["n"] if docs else 0,
        "chunks": total["n"] if total else chunks,
        "engine": "chroma" if coll is not None else "in-memory",
    }


def _collection_meta_count(coll):
    try:
        coll.count()
        return coll.count()
    except Exception:  # noqa
        return 0
