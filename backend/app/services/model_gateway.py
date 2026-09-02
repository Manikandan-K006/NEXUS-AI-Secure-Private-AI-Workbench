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
from abc import ABC, abstractmethod

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


class ModelProvider(ABC):
    """Abstract base class for all LLM providers."""

    @property
    @abstractmethod
    def available(self) -> bool:
        pass

    @abstractmethod
    def list_models(self) -> list[dict]:
        pass

    @abstractmethod
    def chat(self, model: str, messages: list[dict], stream: bool = False, tools: Optional[list] = None):
        pass

    @abstractmethod
    def embed(self, model: str, text: str):
        pass

    @abstractmethod
    def generate(self, model: str, prompt: str, **kw):
        pass


class OllamaProvider(ModelProvider):
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
            raise RuntimeError("Model provider unavailable (Ollama)")
        kwargs = dict(model=model, messages=messages, stream=stream)
        if tools:
            kwargs["tools"] = tools
        return self._client.chat(**kwargs)

    def embed(self, model: str, text: str):
        if not self.available or self._client is None:
            raise RuntimeError("Model provider unavailable (Ollama)")
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
            raise RuntimeError("Model provider unavailable (Ollama)")
        return self._client.generate(model=model, prompt=prompt, **kw)


class OpenAICompatibleProvider(ModelProvider):
    """Talks to any OpenAI-compatible API (e.g. vLLM, LMStudio, local Llama.cpp server)."""

    def __init__(self, base_url: str = "http://localhost:8000/v1", api_key: str = "dummy"):
        self.base_url = base_url
        self.api_key = api_key
        self._client = None
        self._available = None

    @property
    def available(self) -> bool:
        if self._available is None:
            self._check()
        return self._available

    def _check(self) -> None:
        try:
            import openai
            if not guard_request(self.base_url, "HTTP", "OpenAI Compat gateway"):
                self._available = False
                return
            self._client = openai.OpenAI(base_url=self.base_url, api_key=self.api_key, timeout=2.0)
            self._client.models.list()
            self._available = True
            local_request()
        except Exception as e:
            logger.warning("OpenAICompat unavailable: %s", e)
            self._available = False
            self._client = None

    def list_models(self) -> list[dict]:
        if not self.available or self._client is None:
            return []
        try:
            r = self._client.models.list()
            return [{"name": m.id} for m in r.data]
        except Exception as e:
            logger.warning("OpenAI list failed: %s", e)
            return []

    def chat(self, model: str, messages: list[dict], stream: bool = False, tools: Optional[list] = None):
        if not self.available or self._client is None:
            raise RuntimeError("Model provider unavailable (OpenAI)")
        
        # Translate Ollama format messages to standard OpenAI format if needed
        # (For now we assume they are generally compatible format-wise)
        kwargs = dict(model=model, messages=messages, stream=stream)
        if tools:
            # We assume tools are passed in a format that works, or we leave it for a future adapter
            kwargs["tools"] = tools
            
        resp = self._client.chat.completions.create(**kwargs)
        if stream:
            return resp
            
        # Return format expected by caller (Ollama format) to minimize changes in agent.py
        # Ollama returns: {'message': {'role': 'assistant', 'content': '...'}}
        choice = resp.choices[0]
        return {"message": {"role": choice.message.role, "content": choice.message.content}}

    def embed(self, model: str, text: str):
        if not self.available or self._client is None:
            raise RuntimeError("Model provider unavailable (OpenAI)")
        resp = self._client.embeddings.create(model=model, input=text)
        return [data.embedding for data in resp.data]

    def generate(self, model: str, prompt: str, **kw):
        return self.chat(model=model, messages=[{"role": "user", "content": prompt}], **kw)


class ModelRegistry:
    """Manages all configured model providers and routes requests."""
    
    def __init__(self):
        self.providers: list[ModelProvider] = [OllamaProvider(), OpenAICompatibleProvider()]
        
    @property
    def available(self) -> bool:
        return any(p.available for p in self.providers)

    def _get_provider_for(self, model_id: str) -> ModelProvider:
        # Simplistic routing logic: find the first available provider that lists this model
        for p in self.providers:
            if not p.available:
                continue
            for m in p.list_models():
                if model_id.lower() in m["name"].lower() or m["name"].lower() in model_id.lower():
                    return p
        
        # Fallback to the first available provider if exact match isn't found
        for p in self.providers:
            if p.available:
                return p
                
        raise RuntimeError(f"No providers available to handle {model_id}")

    def chat(self, model: str, messages: list[dict], stream: bool = False, tools: Optional[list] = None):
        p = self._get_provider_for(model)
        return p.chat(model, messages, stream, tools)

    def embed(self, model: str, text: str):
        p = self._get_provider_for(model)
        return p.embed(model, text)
        
    def generate(self, model: str, prompt: str, **kw):
        p = self._get_provider_for(model)
        return p.generate(model, prompt, **kw)
        
    def list_all_models(self) -> list[dict]:
        all_models = []
        for p in self.providers:
            if p.available:
                all_models.extend(p.list_models())
        return all_models


# Global registry replacing the single gateway instance
registry = ModelRegistry()


def registered_models() -> list[dict]:
    """Registered model catalog (merged with availability)."""
    out = []
    avail_models = registry.list_all_models()
    for spec in DEFAULT_MODEL_REGISTRY:
        available = spec.model_type != "embed"  # embed is always local
        try:
            if registry.available and spec.model_type != "embed":
                available = any(m["name"].startswith(spec.name.split("-")[0].lower())
                                or spec.model_id in m["name"] for m in avail_models)
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
