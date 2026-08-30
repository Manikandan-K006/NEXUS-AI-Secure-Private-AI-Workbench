"""Task / agent orchestration endpoints."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import db
from app.core.security import get_current_user
from app.services import agent

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskReq(BaseModel):
    prompt: str
    files: list[str] = []
    mode: str = "agentic"
    tools: list[str] = []


@router.post("")
def create_task(body: TaskReq, payload=Depends(get_current_user)):
    a = agent.Agent(body.prompt, body.files, body.mode, body.tools, user=payload["sub"])
    result = a.run()
    return {"task_id": result["task_id"], "status": result["status"],
            "route": result["route"], "steps": result["steps"]}


@router.get("")
def list_tasks(_payload=Depends(get_current_user)):
    with db.db() as c:
        rows = c.execute("SELECT * FROM tasks ORDER BY started_at DESC LIMIT 100").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["result"] = json.loads(d["result"]) if d["result"] else None
            d["files"] = json.loads(d["files"]) if d["files"] else []
        except Exception:  # noqa
            pass
        out.append(d)
    return {"tasks": out}


@router.get("/{task_id}")
def get_task(task_id: str, _payload=Depends(get_current_user)):
    with db.db() as c:
        row = c.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Task not found")
        task = dict(row)
        steps = c.execute("SELECT * FROM agent_steps WHERE task_id=? ORDER BY step_order", (task_id,)).fetchall()
    return {"task": task, "steps": [dict(s) for s in steps]}
