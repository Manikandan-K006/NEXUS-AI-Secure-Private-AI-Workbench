# NEXUS AI — Sovereign On-Premise Agentic AI Workbench

**SIH ID: SIH26117** · Smart India Hackathon 2026

A **highly polished, production-style, secure web application** for confidential
industrial work — a self-hosted agentic AI workbench where organizational data
never leaves the premises.

> **NEXUS AI: A Secure On-Premise Agentic AI Workbench with RAG and Zero Data Egress**

---

## What this is

An enterprise AI workstation designed for refineries, PSUs, defence-linked
manufacturing, engineering companies and government offices. It demonstrates:

- **Sovereignty** — everything runs on-premise, air-gapped
- **Security first** — provable zero data egress throughout
- **Multimodal AI** — OCR, vision, document & drawing analysis
- **Agentic automation** — task planning, tool use, deliverable generation
- **Model router** — automatic selection between open-weight local models
- **Provenance & audit** — every deliverable traceable to models, tools & sources

The UI is a **premium dark industrial command-center interface** (Palantir +
modern IDE + enterprise SOC aesthetic) — not a generic chatbot.

---

## Features & Modules

| Module | What it does |
|--------|--------------|
| **Command Center** | Dashboard KPIs + hero task composer + live network |
| **Agent Execution** | Animated timeline, activity log, live progress ring |
| **New Task** | Prompt composer with tools/model/mode selection |
| **Agent Runs** | Live + historical execution tracking |
| **Documents** | Multimodal analysis workspace (OCR, entities, findings) |
| **Knowledge Base** | Local semantic RAG with citations (SOP-ENG-042 etc.) |
| **Model Center** | Manage local open-weight models + gateway |
| **Model Router** | Visual routing decision + "why this model" |
| **Code Lab** | IDE with AI assistant, sandboxed Python execution |
| **Data Lab** | Spreadsheet analysis, charts, Excel generation |
| **Deliverables** | Generated files (DOCX/XLSX/PPTX/PDF/CODE) with provenance |
| **Security Center** | Air-gapped proof: internet/DNS/cloud AI all blocked |
| **Network Monitor** | SOC-style allow/block traffic table |
| **Audit Logs** | Enterprise audit trail |
| **Settings** | Full configuration (with security confirmations) |

### 3 One-Click SIH Demonstrations

1. **Analyze Inspection Report** — scanned PDF → OCR → RAG → DOCX approval note
2. **AI Coding Task** — plan → code → sandbox → tests → fix → final deliverable
3. **Engineering Drawing Analysis** — P&ID vision, component detection, region Q&A

---

## Tech stack

- **Frontend:** Vanilla HTML / CSS / JavaScript SPA (no build step required)
- **Backend:** Python **FastAPI** with an agent orchestrator, model gateway
  (Ollama), local OCR (PaddleOCR / Tesseract), RAG knowledge base (Chroma +
  in-memory fallback), document processing, offline sandbox, JWT auth/RBAC and
  full audit/network logging. ModelProvider abstraction so open-weight models
  are pluggable — nothing is hard-wired to a single model.
- **Storage:** SQLite (stdlib) for metadata + on-prem file store.

The frontend ships in **DEMO MODE** with realistic mock data so the SIH
journey works fully offline. When the FastAPI backend is running, the UI
auto-detects it and the topbar mode chip flips **DEMO ← → LIVE** showing the
true runtime state (gateway ready/degraded).

---

## Run it

No dependencies, no build step — just serve the folder.

```bash
# From the project root
python3 -m http.server 8080
```

Then open http://localhost:8080 in a browser (1920×1080 / 1440×900 recommended).

Or open `index.html` directly in a modern browser.

> Recommended: Google Chrome / Edge / Firefox (recent version) for the ES2020
> syntax used (optional chaining / nullish coalescing).

---

## Run the real backend (LIVE mode)

The FastAPI backend serves both the `/api` JSON endpoints and the static
frontend, so a single server gives you the full live workbench.

```bash
cd backend
python3 -m pip install -r requirements.txt
cp .env.example .env        # then edit NEXUS_SECRET_KEY etc.
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```

Open http://127.0.0.1:8080 — the topbar chip auto-detects the backend and
shows **LIVE**. Default admin login: `admin` / `admin` (change in `.env`).

The backend **degrades gracefully** when optional runtimes are absent:

| Runtime | Present → | Absent → |
|---------|-----------|----------|
| Ollama  | real local model inference & embeddings | reasoning placeholder + offline hash embeddings |
| Docker  | `--network=none` sandboxed code execution | restricted subprocess (no network, memory caps) |
| PaddleOCR / Tesseract | real OCR of scanned docs/photos | clear error (document text still indexed) |
| chromadb | persistent local vector store | in-memory cosine retrieval fallback |

Air-gap guard: every tool call to a non-local destination is refused and
logged. Data, uploads, deliverables, the knowledge base and audit logs all
live under `backend/data/`.

---

## Project structure

```
index.html                       # SPA entry
css/
  design-system.css              # tokens, palette, base
  app.css                        # layout + all components
js/
  data.js                        # mock data, icons, navigation
  ui.js                          # shell, modal, toast, dropdown
  api.js                         # DEMO/LIVE backend bridge + health detection
  simulator.js                   # agent execution engine + SIH scripts
  main.js                        # router + bootstrap + live ticker
  views/
    dashboard.js                 # command center + composer + execution
    documents.js                 # multimodal document analysis
    knowledge.js                 # KB + models + router
    security.js                  # security + network + audit
    workspaces.js                # runs, workspace, deliverables
    workshops.js                 # code lab + data lab
    tasks.js                     # new task + settings
backend/                         # FastAPI application
  app/
    main.py                      # app factory: CORS, /api mount, static, bootstrap
    core/
      config.py                  # pydantic-settings (NEXUS_* env vars)
      db.py                      # SQLite schema + audit/network/kv helpers
      security.py                # JWT, bcrypt hashing, RBAC deps
    services/
      model_gateway.py           # Ollama gateway + ModelProvider registry/router
      network_guard.py           # air-gap enforcement (blocks external egress)
      ocr_service.py             # PaddleOCR / Tesseract abstraction
      document_processor.py      # extract + chunk (PDF/CSV/XLSX/DOCX/images)
      knowledge.py               # RAG indexing + retrieval + citations
      agent.py                   # agent orchestrator + model router
      sandbox.py                 # Docker (--network=none) / restricted subprocess
      generators.py              # DOCX / XLSX / PPTX / PDF / code deliverables
    api/                         # REST routers (auth, models, documents, kb,
                                 #   tasks, deliverables, security, users, system)
  data/                          # runtime storage (uploads, deliverables, kb, db)
  .env.example                   # all NEXUS_* configuration template
  requirements.txt
```

---

## Security posture (shown throughout the UI)

```
BROWSER → REVERSE PROXY → BACKEND → AGENT ORCHESTRATOR → LOCAL MODEL GATEWAY
                                                            ↓
Agent → Local Tools · Local KB · Sandbox · Local File Storage
```

- Internet **BLOCKED**, external DNS **BLOCKED**, cloud AI **BLOCKED**
- Data egress **0 MB**, all inference **local**
- Never exposes API keys / credentials in frontend
- No external AI APIs (no OpenAI/Claude/Gemini)
- Deliverables carry full **provenance**; every action is **audited**

---

*Built for the Smart India Hackathon 2026 jury — demonstrating exactly how
confidential industrial data never leaves the premises.*
