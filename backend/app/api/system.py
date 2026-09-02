"""System health + runtime status (LIVE vs DEMO detection)."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.services import model_gateway

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    settings = get_settings()
    mode = "LIVE"
    if not model_gateway.registry.available:
        mode = "DEGRADED"
    return {
        "status": "ok",
        "mode": mode,
        "frontend_mode": "LIVE",
        "gateway": "registry",
        "gateway_avail": model_gateway.registry.available,
        "air_gap": settings.air_gap,
        "version": "1.0.0",
        "name": "NEXUS AI Workbench",
    }
