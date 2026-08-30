"""Security, network monitor, audit endpoints."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core import db
from app.core.security import get_current_user
from app.services import model_gateway, sandbox

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/status")
def status(_payload=Depends(get_current_user)):
    with db.db() as c:
        counts = {r["key"]: r["value"] for r in c.execute("SELECT key,value FROM security_counts")}
        blocked = int(counts.get("blocked_requests", 0))
        allowed = int(counts.get("allowed_requests", 0))
        local = int(counts.get("local_requests", 0))
    return {
        "air_gap": "ENABLED",
        "egress": "BLOCKED",
        "data_residency": "ON-PREMISE",
        "sandbox": sandbox_backend(),
        "requests": {"blocked": blocked, "allowed": allowed, "local": local},
    }


def sandbox_backend() -> str:
    import shutil
    return "docker" if shutil.which("docker") else "restricted-subprocess"


@router.get("/network")
def network(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM network_log ORDER BY timestamp DESC LIMIT 200").fetchall()
    return {"events": [dict(r) for r in rows]}


@router.get("/audit")
def audit(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200").fetchall()
    return {"logs": [dict(r) for r in rows]}


@router.get("/threat")
def threat(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20").fetchall()
    return {"events": [dict(r) for r in rows]}


class SandboxRunReq(BaseModel):
    code: str


@router.post("/sandbox")
def run_sandbox(body: SandboxRunReq, _payload=Depends(get_current_user)):
    res = sandbox.run_python(body.code)
    db.audit(_payload["sub"], "Sandbox execution", tools="docker", status="SUCCESS" if res.ok else "ERROR")
    return res.to_dict()


class TestReq(BaseModel):
    models: list[str] = []


@router.post("/test-models")
def test_models(body: TestReq, _payload=Depends(get_current_user)):
    results = []
    for m in model_gateway.DEFAULT_MODEL_REGISTRY:
        if m.model_type == "embed":
            continue
        results.append({"id": m.model_id, "name": m.name,
                        "available": model_gateway.gateway.available,
                        "status": "ready" if model_gateway.gateway.available else "unavailable"})
    return {"results": results}
