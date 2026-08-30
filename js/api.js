/* ============================================================
   SOVEREIGN AI — Backend bridge (DEMO / LIVE)
   Detects the real FastAPI backend at /api and exposes a small
   fetch layer. Views keep using mock AppState data, but the UI
   reports the true runtime mode and can switch quickly.
   ============================================================ */

const NexusMode = {
  value: "demo", // "demo" | "live"
  detected: null, // what /api/health reported
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

/* Contact the backend once and decide LIVE vs DEMO */
async function detectBackend() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch("/api/health", { signal: ctl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) throw new Error("status");
    const h = await res.json();
    NexusMode.health = h;
    NexusMode.detected = h.mode || "LIVE";
    NexusMode.value = "live";
    // auto-authenticate with the bootstrap default so live endpoints work out of the box
    try {
      await nexusLogin("admin", "admin");
    } catch (e) {
      NexusMode.token = null;
    }
  } catch (e) {
    NexusMode.value = "demo";
    NexusMode.detected = "demo";
    NexusMode.health = null;
  }
  updateModeUI();
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

/* -------- mode UI -------- */
function updateModeUI() {
  // sidebar status sub
  const sub = $("#side-mode");
  const live = NexusMode.value === "live";
  if (sub) {
    sub.textContent = live
      ? (NexusMode.health && NexusMode.health.gateway_avail ? "BACKEND LIVE · FULL" : "BACKEND LIVE · DEGRADED")
      : "DEMO SIMULATION";
    sub.classList.toggle("live", live);
  }
  const toggle = $("#mode-toggle");
  if (toggle) {
    toggle.classList.toggle("live", live);
    const lbl = $(".mode-lbl", toggle);
    if (lbl) lbl.textContent = live ? "LIVE" : "DEMO";
  }
  const banner = $("#mode-banner");
  if (banner) {
    banner.classList.toggle("live", live);
    $(".mb-tag", banner).textContent = live ? "LIVE BACKEND CONNECTED" : "DEMO MODE · MOCK DATA";
    const subEl = $(".mb-sub", banner);
    if (subEl) {
      const h = NexusMode.health;
      subEl.textContent = live
        ? `${h.name} · gateway ${h.gateway_avail ? "ready" : "offline"} · air-gap ${h.air_gap ? "on" : "off"}`
        : "Static simulator — connect the FastAPI backend to switch to live orchestration.";
    }
  }
}

/* Build the mode-switch chip injected into the topbar */
function modeChipHTML() {
  return `
    <button class="topbar-chip mode" id="mode-toggle" title="Runtime mode: DEMO / LIVE">
      <span class="dot" aria-hidden="true"></span>
      <span class="chip-lbl">Mode</span>
      <span class="val mode-lbl">DEMO</span>
    </button>`;
}

function wireModeToggle() {
  const toggle = $("#mode-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", async () => {
    if (NexusMode.value === "live") {
      NexusMode.value = "demo";
      toast("Switched to DEMO mode", "Mock simulator active", "warn");
    } else {
      toast("Switching to LIVE...", "Contacting backend /api/health");
      await detectBackend();
      if (NexusMode.value === "live") {
        if (!NexusMode.token) {
          try {
            await nexusLogin("admin", "admin");
            toast("Connected to backend", `Gateway ${NexusMode.health.gateway_avail ? "ready" : "degraded"}`);
          } catch (e) {
            toast("Backend reachable", "Session not authenticated — session is read-only", "warn");
          }
        }
      } else {
        toast("Backend not reachable", "Staying in demo mode", "err");
      }
    }
    updateModeUI();
  });
}
