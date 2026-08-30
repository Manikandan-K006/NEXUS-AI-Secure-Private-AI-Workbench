/* ============================================================
   SOVEREIGN AI — Views: Runs, Workspace, Deliverables, Code Lab, Data Lab
   ============================================================ */

/* ---------- Agent Runs ---------- */
function viewRuns(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Agent Runs</span></div>
    <div class="page-header">
      <div><div class="page-title">Agent Runs</div><div class="page-sub">History and live status of sovereign agent executions.</div></div>
      <button class="btn btn-primary" data-nav="new-task">${Icons.task}<span>New Task</span></button>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(4,1fr)">
      ${metric("Running", "2", "agents")}
      ${metric("Queued", "1", "agent")}
      ${metric("Completed", TaskHistory.length, "sessions")}
      ${metric("Avg duration", "38", "seconds")}
    </div>
    <div class="panel">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.activity}</span>Live Executions</div><span class="tag ok"><span class="dot"></span>RUNNING</span></div>
      <div class="panel-body" style="padding:14px">
        ${liveRun("inspection", "Analyze Inspection Report", "OCR → RAG → DOCX", "68%", "Vision-8B")}
        ${liveRun("code", "AI Coding Task", "Plan → Code → Sandbox → Tests", "42%", "Code-6.7B")}
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.check}</span>Recent Completed Runs</div></div>
      <div class="panel-body" style="padding:14px">
        ${TaskHistory.length ? TaskHistory.map((t) => histRun(t)).join("") : emptyRuns()}
      </div>
    </div>
  `;
  wireViewsDataNav(view);
}

function liveRun(key, title, tools, pct, model) {
  return `<div class="doc-row" style="cursor:default">
    <div class="ring-wrap" style="width:44px;height:44px">${ringSvgMin(pct)}</div>
    <div class="doc-info">
      <div class="doc-name">${title}</div>
      <div class="doc-desc">${tools}</div>
    </div>
    <span class="tag accent" style="margin-left:auto">${model}</span>
    <button class="btn btn-sm btn-ghost" data-nav="new-task">${Icons.eye}<span>Watch</span></button>
  </div>`;
}

function ringSvgMin(pct) {
  const r = 18, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return `<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--border-1)" stroke-width="4"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 22 22)"/><text x="22" y="26" text-anchor="middle" font-size="10" fill="var(--text-0)" font-family="var(--font-mono)">${pct}</text></svg>`;
}

function histRun(t) {
  return `<div class="doc-row" style="cursor:default">
    <div class="doc-ico" style="background:#1e6f46">✓</div>
    <div class="doc-info">
      <div class="doc-name">${esc(t.title)}</div>
      <div class="doc-desc">${esc(t.files.join(", "))} · ${t.completedAt}</div>
    </div>
    <span class="tag ok" style="margin-left:auto">COMPLETED · VALIDATED</span>
  </div>`;
}
function emptyRuns() {
  return `<div class="empty-state"><div class="es-ico">${Icons.runs}</div><div class="es-title">No completed runs yet</div><div class="es-sub">Run a task from the Command Center to see history here.</div></div>`;
}

/* ---------- Workspace ---------- */
function viewWorkspace(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Workspace</span></div>
    <div class="page-header">
      <div><div class="page-title">Workspace & Projects</div><div class="page-sub">Organize confidential work into isolated on-premise projects.</div></div>
      <button class="btn btn-primary" id="ws-new-project">${Icons.workspace}<span>New project</span></button>
    </div>
    <div class="kb-grid" style="grid-template-columns:repeat(3,1fr)">
      ${workspaceCard("NEXUS-UNIT-03", "Refinery Operations · Heat Exchangers", "14 documents · 3 agents active", "accent", "12 Aug 2026")}
      ${workspaceCard("TURBINE-A", "Turbine Overhaul 2026", "22 documents · idle", "info", "02 Sep 2026")}
      ${workspaceCard("QA-COMPLIANCE", "Quality & Regulatory", "8 documents · 1 agent active", "ok", "27 Aug 2026")}
    </div>
  `;
  wireViewsDataNav(view);
  $("#ws-new-project", view).addEventListener("click", () => toast("New project", "Project workspace created (demo)", "ok"));
}
function workspaceCard(name, desc, meta, tone, date) {
  return `<div class="kb-card">
    <div class="kb-top"><span class="kb-doc">${esc(name)}</span><span class="tag ${tone}"><span class="dot"></span>LOCAL</span></div>
    <div class="kb-title">${esc(desc)}</div>
    <div class="kb-stats"><span><b>${meta.split("·")[0].trim()}</b></span><span>Updated <b>${date.replace("2026", "")}</b></span></div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-sm btn-ghost">${Icons.folder}<span>Open</span></button>
      <button class="btn btn-sm btn-ghost">${Icons.security}</button>
    </div>
  </div>`;
}

/* ---------- Deliverables ---------- */
function viewDeliverables(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Deliverables</span></div>
    <div class="page-header">
      <div><div class="page-title">Deliverables Center</div><div class="page-sub">Generated files with full provenance — every artifact traceable to models and tools.</div></div>
      <button class="btn btn-ghost" id="deliv-filter">${Icons.filter}<span>Filter</span></button>
    </div>
    <div class="db-tabs" style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      ${["ALL", "DOCX", "XLSX", "PPTX", "PDF", "CODE", "CALC"].map((c, i) => `<button class="seg ${i === 0 ? "on" : ""}" data-dtype="${c === "ALL" ? "" : c}">${c}</button>`).join("")}
    </div>
    <div class="deliv-grid" id="deliv-grid">${AppState.deliverables.map(delivCard).join("")}</div>
  `;
  wireViewsDataNav(view);
  $$(".seg[data-dtype]", view).forEach((b) => {
    b.addEventListener("click", () => {
      $$(".seg[data-dtype]", view).forEach((x) => x.classList.toggle("on", x === b));
      filterDeliv(b.dataset.dtype, view);
    });
  });
}

function delivCard(d) {
  return `<div class="deliv-card" data-dtype="${d.cat.toLowerCase()}" data-id="${d.id}">
    <div class="dc-top">
      <div class="dc-type" style="background:${dtypeColor(d.cat)}">${d.cat === "DOCX" ? "DOCX" : d.cat === "XLSX" ? "XLSX" : d.cat === "PPTX" ? "PPTX" : d.cat === "PDF" ? "PDF" : "PY"}</div>
      <div><div class="dc-name">${d.name}</div><div class="dc-meta">${d.size} · ${d.date}</div></div>
      <span class="tag ok" style="margin-left:auto"><span class="dot"></span>${d.validated ? "" : " "}VALIDATED</span>
    </div>
    <div class="dc-meta">${d.meta}</div>
    <div class="dc-actions">
      <button class="btn btn-sm" data-open="${d.id}">${Icons.eye}<span>Open</span></button>
      <button class="btn btn-sm" data-dl="${d.id}">${Icons.download}</button>
      <button class="btn btn-sm btn-ghost" data-prov="${d.id}">${Icons.shield}<span>Provenance</span></button>
    </div>
  </div>`;
}
function dtypeColor(cat) {
  const map = { docx: "#2563eb", xlsx: "#16a34a", pptx: "#ea580c", pdf: "#dc2626", code: "#475569", calc: "#7c3aed" };
  return map[cat.toLowerCase()] || "#475569";
}

function filterDeliv(type, view) {
  $$(".deliv-card", $("#deliv-grid", view)).forEach((c) => {
    c.style.display = !type || c.dataset.dtype === type.toLowerCase() ? "" : "none";
  });
}

window._delivAction = function (id, action) {
  const d = AppState.deliverables.find((x) => x.id === id);
  if (!d) return;
  if (action === "open" || action === "dl") toast(`${action === "open" ? "Opening" : "Downloading"} ${d.name}`, "Local storage · on-premise only", "ok");
  if (action === "prov") openProvenanceModal(d);
};

viewDeliverables.wire = () => {
  $$("[data-open]").forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.open, "open")));
  $$("[data-dl]").forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.dl, "dl")));
  $$("[data-prov]").forEach((b) => b.addEventListener("click", () => window._delivAction(b.dataset.prov, "prov")));
};

function openProvenanceModal(d) {
  openModal("Document Provenance · " + d.name, `
    <div class="prov-list">
      ${provItem("INPUT FILES", Icons.file, esc(d.source), "on-premise storage")}
      ${provItem("OCR / VISION", Icons.eye, "Qwen2-VL-8B", "local · 96.8% confidence")}
      ${provItem("KNOWLEDGE", Icons.knowledge, "SOP-ENG-042", "Section 4.2 · Page 17")}
      ${provItem("REASONING", Icons.gpu, "Qwen2.5-32B-Instruct", "local · 8.2 GB VRAM")}
      ${provItem("GENERATION", Icons.deliver, `${d.cat} Generator`, "python-docx / openpyxl")}
      ${provItem("VALIDATION", Icons.audit, "Passed", "structure · citations · compliance")}
    </div>
    <div class="divider"></div>
    <div class="info-row"><span>Generated</span><b>${d.date} · 14:31:35</b></div>
    <div class="info-row"><span>Executed</span><b class="text-accent">LOCAL NODE · air-gapped</b></div>
    <div class="info-row"><span>Network</span><b style="color:var(--ok)">No external communication</b></div>
    <div class="info-row"><span>Audit</span><b style="color:var(--ok)">Recorded</b></div>
    <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
      <button class="btn" id="prov-download2">${Icons.download}<span>Download</span></button>
      <button class="btn btn-primary" id="prov-close2">${Icons.check}<span>Done</span></button>
    </div>`);
  $("#prov-download2").addEventListener("click", () => toast("Download initiated", d.name, "ok"));
  $("#prov-close2").addEventListener("click", closeModal);
}
