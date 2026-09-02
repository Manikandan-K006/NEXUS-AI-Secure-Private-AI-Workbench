/* ============================================================
   NEXUS AI 2.0 — Backend bridge (LIVE ONLY)
   Always connects to the real FastAPI backend at /api.
   No demo/mock fallback — if backend is unreachable, show error.
   ============================================================ */

const NexusMode = {
  value: "live",
  detected: null,
  health: null,
  token: null,
};

/* thin JSON fetch wrapper for live endpoints */
async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (NexusMode.token) headers.Authorization = "Bearer " + NexusMode.token;
  const res = await fetch("/api" + path, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data && data.detail) || ("HTTP " + res.status));
  }
  return res.status === 204 ? null : res.json();
}

/* Contact the backend and authenticate */
async function detectBackend() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch("/api/health", { signal: ctl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) throw new Error("status " + res.status);
    const h = await res.json();
    NexusMode.health = h;
    NexusMode.detected = h.mode || "LIVE";
    NexusMode.value = "live";
    // auto-authenticate with the bootstrap default
    try {
      await nexusLogin("admin", "admin");
    } catch (e) {
      NexusMode.token = null;
    }
  } catch (e) {
    NexusMode.value = "live"; // still live mode, just offline
    NexusMode.detected = "offline";
    NexusMode.health = null;
  }
  updateModeUI();
  // After detecting backend, populate live data
  if (NexusMode.health) {
    loadLiveAppState();
  }
  return NexusMode;
}

async function nexusLogin(username, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d && d.detail) || "Login failed");
  }
  const j = await r.json();
  NexusMode.token = j.access_token;
  return j;
}

/* -------- Load real data from backend -------- */
async function loadLiveAppState() {
  try {
    // Load models
    const modelsRes = await apiFetch("/models").catch(() => null);
    if (modelsRes && modelsRes.models) {
      AppState.models = modelsRes.models;
      AppState.tasks.loadedModels = modelsRes.models.filter(m => m.loaded || m.status === "READY").length;
    }
    // Load documents
    const docsRes = await apiFetch("/documents").catch(() => null);
    if (docsRes && docsRes.documents) {
      AppState.documents = docsRes.documents;
    }
    // Load system info
    const sysRes = await apiFetch("/system/info").catch(() => null);
    if (sysRes) {
      AppState.cpu = sysRes.cpu_percent || 0;
      AppState.ram = sysRes.ram_percent || 0;
      if (sysRes.gpu) {
        AppState.gpu.load = sysRes.gpu.load || 0;
        AppState.gpu.vram = sysRes.gpu.vram || 0;
        AppState.gpu.vramTotal = sysRes.gpu.vram_total || 0;
      }
    }
    // Load knowledge base stats
    const kbRes = await apiFetch("/knowledge/stats").catch(() => null);
    if (kbRes) {
      AppState.tasks.kbDocs = kbRes.documents || kbRes.doc_count || 0;
    }
  } catch (e) {
    console.warn("[NEXUS] Could not load live app state:", e);
  }
}

/* -------- mode UI -------- */
function updateModeUI() {
  const sub = $("#side-mode");
  const connected = NexusMode.health != null;
  if (sub) {
    sub.textContent = connected
      ? (NexusMode.health && NexusMode.health.gateway_avail ? "BACKEND LIVE · FULL" : "BACKEND LIVE · DEGRADED")
      : "BACKEND OFFLINE";
    sub.classList.toggle("live", connected);
  }
  const toggle = $("#mode-toggle");
  if (toggle) {
    toggle.classList.toggle("live", connected);
    const lbl = $(".mode-lbl", toggle);
    if (lbl) lbl.textContent = connected ? "LIVE" : "OFFLINE";
  }
  const banner = $("#mode-banner");
  if (banner) {
    banner.classList.toggle("live", connected);
    const tag = $(".mb-tag", banner);
    if (tag) tag.textContent = connected ? "LIVE BACKEND CONNECTED" : "BACKEND OFFLINE";
    const subEl = $(".mb-sub", banner);
    if (subEl) {
      const h = NexusMode.health;
      subEl.textContent = connected
        ? `${h.name} · gateway ${h.gateway_avail ? "ready" : "offline"} · air-gap ${h.air_gap ? "on" : "off"}`
        : "Cannot reach FastAPI backend at /api. Start the backend server.";
    }
  }
}

/* Build the mode-status chip injected into the topbar */
function modeChipHTML() {
  return `
    <button class="topbar-chip mode" id="mode-toggle" title="Backend status">
      <span class="dot" aria-hidden="true"></span>
      <span class="chip-lbl">Status</span>
      <span class="val mode-lbl">LIVE</span>
    </button>`;
}

function wireModeToggle() {
  const toggle = $("#mode-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", async () => {
    toast("Checking backend...", "Contacting /api/health");
    await detectBackend();
    if (NexusMode.health) {
      toast("Backend connected", `Gateway ${NexusMode.health.gateway_avail ? "ready" : "degraded"}`, "ok");
    } else {
      toast("Backend offline", "Start the FastAPI server", "err");
    }
    updateModeUI();
  });
}
