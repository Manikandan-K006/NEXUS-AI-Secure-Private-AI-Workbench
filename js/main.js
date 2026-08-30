/* ============================================================
   SOVEREIGN AI — Router & bootstrap
   ============================================================ */

const ROUTES = {
  dashboard: viewDashboard,
  "new-task": viewNewTask,
  workspace: viewWorkspace,
  runs: viewRuns,
  documents: viewDocuments,
  knowledge: viewKnowledge,
  models: viewModels,
  router: viewRouter,
  codelab: viewCodeLab,
  datalab: viewDataLab,
  deliverables: viewDeliverables,
  security: viewSecurity,
  network: viewNetwork,
  audit: viewAudit,
  settings: viewSettings,
};

function navigate(id) {
  const view = $("#view");
  const handler = ROUTES[id] || viewDashboard;
  setActiveView(id);
  handler(view);
  if (id === "deliverables") wireDeliverableActions(view);
  view.scrollTop = 0;
  document.title = (() => {
    const labels = { dashboard: "Command Center", "new-task": "New Task", workspace: "Workspace", runs: "Agent Runs", documents: "Documents", knowledge: "Knowledge Base", models: "Models", router: "Model Router", codelab: "Code Lab", datalab: "Data Lab", deliverables: "Deliverables", security: "Security Center", network: "Network Monitor", audit: "Audit Logs", settings: "Settings" };
    return "Sovereign AI · " + (labels[id] || id);
  })();
  window._navId = id;
}

/* wire [data-nav] anchors inside any view, including freshly injected dom */
function wireViewsDataNav(view) {
  $$("[data-nav]", view).forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      if (b.id === "composer-run") return;
      navigate(b.getAttribute("data-nav"));
    })
  );
}

function wireDeliverableActions(view) {
  $$("[data-open]", view).forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.open, "open")));
  $$("[data-dl]", view).forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.dl, "dl")));
  $$("[data-prov]", view).forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.prov, "prov")));
}

/* Debounced live system stats in sidebar */
function startResourceTicker() {
  setInterval(() => {
    const g = AppState.gpu;
    g.load = Math.max(4, Math.min(12, g.load + (Math.random() * 8 - 4)));
    AppState.cpu = Math.max(10, Math.min(90, AppState.cpu + (Math.random() * 6 - 3)));
    AppState.ram = Math.max(40, Math.min(85, AppState.ram + (Math.random() * 4 - 2)));
    const vramPct = Math.round((g.vram / g.vramTotal) * 100);
    const a = (id, val) => { const n = $("#" + id); if (n) n.textContent = val; };
    a("side-vrambar", vramPct + "%");
    a("side-vrampct", vramPct + "%");
    a("side-cpubar", Math.round(AppState.cpu) + "%");
    a("side-cpupct", Math.round(AppState.cpu) + "%");
    a("side-rambar", Math.round(AppState.ram) + "%");
    a("side-rampct", Math.round(AppState.ram) + "%");
    a("tp-gpu", Math.round(g.load) + "%");
    if (window._navId === "dashboard") {
      const kpi = $("#kpi-grid");
      if (kpi) {
        const gpu = kpi.querySelector(".kpi-card:nth-child(4) .kpi-value");
        if (gpu) gpu.textContent = Math.round(g.load) + "%";
        const bars = $("#gpu-mini-bars");
        if (bars) bars.innerHTML = [30, 52, 45, 66, 58, 80, 62, 55].map((h) => `<i style="height:${Math.round(g.load * 0.8)}%"></i>`).join("");
      }
    }
  }, 2600);
}

/* CSRF token simulation for backend-readiness */
function setupSecurityHeader() {
  const meta = el(`<meta name="csrf-token" content="local-session-${Math.random().toString(36).slice(2, 10)}">`);
  document.head.appendChild(meta);
}

let booted = false;
function initApp() {
  if (booted) return;
  booted = true;
  renderSidebar();
  renderTopbar();
  setupSecurityHeader();
  startResourceTicker();
  detectBackend();

  // Global search
  $("#global-search").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (q.length > 2) {
      openDropdown(
        $("#global-search"),
        `<div class="dd-head">Quick search · local index</div>
         ${quickSearchResults(q)}`,
        () => {}
      );
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      $("#global-search").focus();
    }
  });

  // Initial route
  const hash = (location.hash || "#/dashboard").replace("#/", "");
  navigate(ROUTES[hash] ? hash : "dashboard");
}

function quickSearchResults(q) {
  const ql = q.toLowerCase();
  const docs = AppState.documents.filter((d) => d.name.toLowerCase().includes(ql) || d.id.toLowerCase().includes(ql)).slice(0, 3);
  const kb = AppState.knowledge.filter((k) => k.doc.toLowerCase().includes(ql) || k.title.toLowerCase().includes(ql)).slice(0, 3);
  let html = "";
  docs.forEach((d) => (html += `<div class="dd-item" data-nav="documents"><span class="d-ico">${Icons.doc}</span><div><div class="dd-t">${esc(d.name)}</div><div class="dd-s">${esc(d.id)} · ${d.cat}</div></div></div>`));
  kb.forEach((k) => (html += `<div class="dd-item" data-nav="knowledge"><span class="d-ico">${Icons.knowledge}</span><div><div class="dd-t">${esc(k.title)}</div><div class="dd-s">${k.doc} · ${k.chunks.toLocaleString()} chunks</div></div></div>`));
  if (!html) html = `<div style="padding:14px;font-size:12px;color:var(--text-3)">No local results for "${esc(q)}"</div>`;
  return html;
}

/* expose for viewDeliverables wiring */
document.addEventListener("DOMContentLoaded", initApp);
