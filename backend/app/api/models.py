"""Model catalog + router endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services import model_gateway

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def list_models(_payload=Depends(get_current_user)):
    return {"models": model_gateway.registered_models()}


@router.get("/installed")
def installed_models(_payload=Depends(get_current_user)):
    return {
        "gateway": "registry",
        "available": model_gateway.registry.available,
        "installed": model_gateway.registry.list_all_models(),
    }


class RouteReq(BaseModel):
    task: str


@router.post("/route")
def route(body: RouteReq, _payload=Depends(get_current_user)):
    from app.services.agent import classify_task, router_for
    tags = classify_task(body.task, [])
    route = router_for(tags, body.task, [])
    return {"classification": tags, "route": [{"role": r["role"], "model": r["model"]} for r in route]}
