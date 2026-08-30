"""Model gateway + provider abstraction.

The agent talks to models ONLY through the ModelGateway. To add a model:
  1. register it (declared capabilities + endpoint)
  2. it becomes available to the router
No code is hard-wired to a single model.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from app.core.config import get_settings
from app.services.network_guard import guard_request, local_request

logger = logging.getLogger("nexus.models")


@dataclass
class ModelSpec:
    model_id: str
    name: str
    model_type: str  # reasoning | coding | vision | embed
    source: str = "open-weight"
    status: str = "registered"
    context_len: int = 8192
    quant: str = "Q4_K_M"
    vram_gb: float = 0.0
    capabilities: list = field(default_factory=list)
    task_hint: str = ""


# Registry of models the workbench knows about (registered, not hard-coded).
DEFAULT_MODEL_REGISTRY = [
    ModelSpec("qwen2.5-32b", "Qwen2.5-32B-Instruct", "reasoning", "Open-weight · Qwen",
              capabilities=["reasoning", "document analysis", "planning"], vram_gb=8.2),
    ModelSpec("deepseek-coder-6.7b", "DeepSeek-Coder-6.7B", "coding", "Open-weight · DeepSeek",
              capabilities=["code generation", "debugging", "testing"], vram_gb=4.1),
    ModelSpec("qwen2-vl-8b", "Qwen2-VL-8B", "vision", "Open-weight · Multimodal",
              capabilities=["ocr", "image understanding", "document vision"], vram_gb=5.4),
    ModelSpec("bge-m3", "bge-m3", "embed", "Open-weight · Embedding",
              capabilities=["semantic search", "rag indexing"], vram_gb=1.2, quant="FP16"),
]


class OllamaGateway:
    """Talks to a local Ollama instance. All traffic stays on loopback."""

    def __init__(self):
        self._client = None
        self._available = None

    @property
    def available(self) -> bool:
        if self._available is None:
            self._check()
        return self._available

    def _check(self) -> None:
        settings = get_settings()
        try:
            if not guard_request(settings.ollama_base, "HTTP", "Ollama gateway"):
                self._available = False
                return
            import ollama  # optional
            self._client = ollama.Client(host=settings.ollama_base, timeout=settings.ollama_timeout)
            self._client.list()
            self._available = True
            local_request()
        except Exception as e:  # noqa: BLE001
            logger.warning("Ollama unavailable: %s", e)
            self._available = False
            self._client = None

    def list_models(self) -> list[dict]:
        if not self.available or self._client is None:
            return []
        try:
            r = self._client.list()
            return [{"name": m.get("model", m.get("name", ""))} for m in (r.get("models", []) if isinstance(r, dict) else r)]
        except Exception as e:  # noqa
            logger.warning("list failed: %s", e)
            return []

    def chat(self, model: str, messages: list[dict], stream: bool = False,
             tools: Optional[list] = None):
        if not self.available or self._client is None:
            raise RuntimeError("Model gateway unavailable")
        kwargs = dict(model=model, messages=messages, stream=stream)
        if tools:
            kwargs["tools"] = tools
        return self._client.chat(**kwargs)

    def embed(self, model: str, text: str):
        if not self.available or self._client is None:
            raise RuntimeError("Model gateway unavailable")
        r = self._client.embed(model=model, input=text)
        # normalize across ollama API versions -> list of vectors
        if isinstance(r, dict):
            emb = r.get("embeddings", [])
        else:  # EmbedResponse object (newer ollama)
            emb = getattr(r, "embeddings", None) or []
        if emb and isinstance(emb[0], (int, float)):
            return [emb]
        return emb

    def generate(self, model: str, prompt: str, **kw):
        if not self.available or self._client is None:
            raise RuntimeError("Model gateway unavailable")
        return self._client.generate(model=model, prompt=prompt, **kw)


gateway = OllamaGateway()


def registered_models() -> list[dict]:
    """Registered model catalog (merged with availability)."""
    out = []
    for spec in DEFAULT_MODEL_REGISTRY:
        available = spec.model_type != "embed"  # embed is always local
        try:
            if gateway.available and spec.model_type != "embed":
                available = any(m["name"].startswith(spec.name.split("-")[0].lower())
                                or spec.model_id in m["name"] for m in gateway.list_models())
        except Exception:  # noqa
            pass
        out.append({
            "id": spec.model_id,
            "name": spec.name,
            "type": spec.model_type,
            "source": spec.source,
            "capabilities": spec.capabilities,
            "task": spec.task_hint,
            "status": "ready" if available else "unavailable",
            "vram": spec.vram_gb,
            "quant": spec.quant,
            "context": spec.context_len,
        })
    return out


def get_model(model_id: str) -> ModelSpec:
    for m in DEFAULT_MODEL_REGISTRY:
        if m.model_id == model_id:
            return m
    raise KeyError(model_id)


def pick_reasoning() -> ModelSpec:
    """Router: choose the reasoning model (lowest-VRAM available as fallback)."""
    for m in DEFAULT_MODEL_REGISTRY:
        if m.model_type == "reasoning":
            return m
    return DEFAULT_MODEL_REGISTRY[0]


def pick_vision() -> ModelSpec:
    for m in DEFAULT_MODEL_REGISTRY:
        if m.model_type == "vision":
            return m
    return DEFAULT_MODEL_REGISTRY[0]


def pick_coding() -> ModelSpec:
    for m in DEFAULT_MODEL_REGISTRY:
        if m.model_type == "coding":
            return m
    return DEFAULT_MODEL_REGISTRY[0]


def pick_embed() -> ModelSpec:
    for m in DEFAULT_MODEL_REGISTRY:
        if m.model_type == "embed":
            return m
    return DEFAULT_MODEL_REGISTRY[-1]
