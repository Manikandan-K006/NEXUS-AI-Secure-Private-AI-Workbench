/* ============================================================
   SOVEREIGN AI — Views: Knowledge Base, Models, Model Router
   ============================================================ */

/* ---------- Knowledge Base ---------- */
function viewKnowledge(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Knowledge Base</span></div>
    <div class="page-header">
      <div><div class="page-title">Organizational Knowledge</div><div class="page-sub">Local semantic index of SOPs, manuals, standards and inspection records — served entirely on-premise.</div></div>
      <button class="btn btn-primary" id="kb-upload">${Icons.uploadCloud}<span>Upload document</span></button>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(4,1fr)">
      ${metric("Documents", "128", "indexed")}
      ${metric("Chunks", "18,204", "in vector store")}
      ${metric("Embedding model", "bge-m3", "on-premise")}
      ${metric("Last index", "12 Aug", "2026")}
    </div>
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-header">
        <div class="panel-title"><span class="ico">${Icons.search}</span>Semantic Search</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="tag accent" id="kb-search-mode"><span class="dot"></span>SEMANTIC</span>
        </div>
      </div>
      <div class="panel-body">
        <div style="display:flex;gap:10px">
          <input type="text" id="kb-search" placeholder='Search: "corrosion limits for heat exchangers"…' style="flex:1;height:40px;border-radius:8px;border:1px solid var(--border-1);background:var(--bg-2);color:var(--text-0);padding:0 14px"/>
          <button class="btn btn-primary" id="kb-search-btn">${Icons.search}<span>Search</span></button>
        </div>
        <div id="kb-results" style="margin-top:14px"></div>
      </div>
    </div>
    <div class="kb-grid">${AppState.knowledge.map(kbCard).join("")}</div>
  `;
  wireViewsDataNav(view);
  $("#kb-upload", view).addEventListener("click", uploadDocModal);
  $("#kb-search-btn", view).addEventListener("click", () => kbSearch($("#kb-search", view).value.trim(), view));
  $("#kb-search", view).addEventListener("keydown", (e) => {
    if (e.key === "Enter") kbSearch(e.target.value.trim(), view);
  });
}

function kbCard(k) {
  const typeTag = { SOP: "accent", Manual: "info", Standard: "accent", Correspondence: "warn", Register: "info", Policy: "ok" }[k.type] || "accent";
  return `<div class="kb-card" data-doc="${k.doc}">
    <div class="kb-top">
      <span class="kb-doc">${k.doc}</span>
      <span class="tag ${typeTag}">${k.type}</span>
    </div>
    <div class="kb-title">${esc(k.title)}</div>
    <div class="kb-desc">${esc(k.desc)}</div>
    <div class="kb-stats">
      <span><b>${k.chunks.toLocaleString()}</b> chunks</span>
      <span>Updated <b>${k.updated.replace("2026", "")}</b></span>
    </div>
    <div style="margin-top:12px"><span class="tag ok"><span class="dot"></span>INDEXED</span> <span style="float:right" class="tag">LOCAL</span></div>
  </div>`;
}

function kbSearch(query, view) {
  const res = $("#kb-results", view);
  if (!query) {
    res.innerHTML = `<div class="empty-state"><div class="es-ico">${Icons.search}</div><div class="es-title">Search the organizational knowledge base</div><div class="es-sub">Semantic retrieval across SOPs, manuals and standards — results show citations.</div></div>`;
    return;
  }
  toast("Searching organizational knowledge", "bge-m3 · on-premise vector search", "info", 2600);
  res.innerHTML = `
    <div style="font-size:11px;color:var(--text-3);margin-bottom:10px" class="mono">4 results · semantic match · bge-m3 · 12 ms</div>
    ${kbResults(query)}
  `;
}

function kbResults(q) {
  return `
    <div class="result-item"><span class="ri-bullet">•</span>
      <div>
        <div style="font-weight:600;color:var(--text-0)">Corrosion evaluation for shell-and-tube heat exchangers</div>
        <div class="font-11 text-2" style="margin-top:3px">"…when corrosion depth exceeds ${q.includes("3") ? "3" : "the"} mm limit, schedule repair within 30 days per section 4.2…"</div>
        <div class="cite" style="margin:8px 0 0"><span class="c-src">SOP-ENG-042</span><span class="c-detail">Section 4.2 · Page 17</span><span class="c-tag"><span class="tag accent">0.92</span></span></div>
      </div>
    </div>
    <div class="result-item"><span class="ri-bullet">•</span>
      <div>
        <div style="font-weight:600;color:var(--text-0)">Inspection acceptance criteria — Pressure vessels</div>
        <div class="font-11 text-2" style="margin-top:3px">"…wall thickness below minimum required requires integrity assessment and NDT re-test…"</div>
        <div class="cite" style="margin:8px 0 0"><span class="c-src">STD-PTRL-3</span><span class="c-detail">Section 6 · Page 3</span><span class="c-tag"><span class="tag accent">0.87</span></span></div>
      </div>
    </div>
    <div class="result-item"><span class="ri-bullet">•</span>
      <div>
        <div style="font-weight:600;color:var(--text-0)">Heat exchanger maintenance schedule</div>
        <div class="font-11 text-2" style="margin-top:3px">"…RE-204 maintenance window every 6 months with torque specifications…"</div>
        <div class="cite" style="margin:8px 0 0"><span class="c-src">MAN-HP-09</span><span class="c-detail">Section 3.1 · Page 22</span><span class="c-tag"><span class="tag accent">0.81</span></span></div>
      </div>
    </div>
    <div class="result-item"><span class="ri-bullet">•</span>
      <div>
        <div style="font-weight:600;color:var(--text-0)">Confidentiality & data handling</div>
        <div class="font-11 text-2" style="margin-top:3px">"…no organizational data shall be transmitted outside the air-gapped network…"</div>
        <div class="cite" style="margin:8px 0 0"><span class="c-src">POL-SAF-2</span><span class="c-detail">Section 2.1 · Page 1</span><span class="c-tag"><span class="tag accent">0.99</span></span></div>
      </div>
    </div>`;
}

/* ---------- Model Center ---------- */
function viewModels(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Models</span></div>
    <div class="page-header">
      <div><div class="page-title">Local Model Center</div><div class="page-sub">Open-weight models served on-premise through the local model gateway. Zero external inference.</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="tag ok"><span class="dot"></span>GATEWAY ONLINE</span>
        <button class="btn btn-ghost" id="models-reload">${Icons.refresh}<span>Refresh</span></button>
      </div>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(4,1fr)">
      ${metric("Loaded", "4", "of 6")}
      ${metric("VRAM", "18.9 / 24", "GB")}
      ${metric("Inference", "LOCAL", "on-premise")}
      ${metric("Egress", "0 MB", "blocked")}
    </div>
    <div class="model-grid">${AppState.models.map(modelCard).join("")}</div>
    <div class="panel" style="margin-top:20px">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.db}</span>Model Gateway</div><span class="tag accent">OLLAMA · localhost:11434</span></div>
      <div class="panel-body">
        <div class="stat-row"><span class="sr-label">Gateway status</span><div class="sr-bar"><i style="width:100%"></i></div><span class="sr-val" style="color:var(--ok)">ONLINE</span></div>
        <div class="stat-row"><span class="sr-label">Tokens/s (avg)</span><div class="sr-bar"><i style="width:70%"></i></div><span class="sr-val">42 t/s</span></div>
        <div class="stat-row"><span class="sr-label">Response latency</span><div class="sr-bar"><i style="width:23%"></i></div><span class="sr-val">210 ms</span></div>
        <div class="divider"></div>
        <div class="font-11 text-3">All models resolve to 127.0.0.1 — no external model API is reachable.</div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  $("#models-reload", view).addEventListener("click", () => {
    toast("Model gateway refreshed", "4 models loaded · 0 egress", "ok");
  });
  $$(".model-card", view).forEach((c) => {
    $("#m-action-" + c.dataset.id, c).addEventListener("click", () =>
      toggleModel(c.dataset.id, view)
    );
    $$("[data-modeldetail]", c).forEach((b) => b.addEventListener("click", () => modelDetail(c.dataset.id)));
  });
}

function modelCard(m) {
  const on = m.loaded;
  const vramPct = Math.round((m.vram / m.vramTotal) * 100);
  return `<div class="model-card ${on ? "" : "dim"}" data-id="${m.id}" style="${on ? "" : "opacity:.62"}">
    <div class="mc-head">
      <span class="mc-type">${m.type}</span>
      <span class="tag ${on ? "ok" : "warn"}">${on ? "<span class='dot'></span>LOCAL · READY" : "<span class='dot'></span>UNLOADED"}</span>
    </div>
    <div class="mc-name">${esc(m.name)}</div>
    <div class="mc-src">${esc(m.src)}</div>
    <div class="mc-stats">
      <div class="mc-stat"><span>VRAM</span><b>${m.vram} GB</b></div>
      <div class="mc-stat"><span>Context</span><b>${m.ctx.toLocaleString()} tokens</b></div>
      <div class="mc-stat"><span>Quantization</span><b>${m.quant}</b></div>
    </div>
    <div class="mc-caps">${m.caps.map((c) => `<span class="tag">${c}</span>`).join("")}</div>
    <div class="mc-actions">
      <button class="btn btn-sm ${on ? "" : "btn-primary"}" id="m-action-${m.id}" style="flex:1">${on ? "Unload" : "Load"}</button>
      <button class="btn btn-sm btn-ghost" data-modeldetail="${m.id}">${Icons.info}<span>Details</span></button>
    </div>
  </div>`;
}

function toggleModel(id, view) {
  const m = AppState.models.find((x) => x.id === id);
  m.loaded = !m.loaded;
  if (m.loaded) toast("Model loaded", m.name + " · " + m.vram + " GB VRAM · local", "ok");
  else toast("Model unloaded", m.name + " · VRAM released", "warn");
  viewModels(view);
}

function modelDetail(id) {
  const m = AppState.models.find((x) => x.id === id);
  openModal(m.name, `
    <div class="info-row"><span>Type</span><b class="text-accent">${m.type}</b></div>
    <div class="info-row"><span>Source</span><b>${esc(m.src)}</b></div>
    <div class="info-row"><span>Quantization</span><b class="mono">${m.quant}</b></div>
    <div class="info-row"><span>Context length</span><b class="mono">${m.ctx.toLocaleString()}</b></div>
    <div class="info-row"><span>VRAM footprint</span><b class="mono">${m.vram} GB</b></div>
    <div class="info-row"><span>Role in router</span><b>${esc(m.task)}</b></div>
    <div class="divider"></div>
    <div class="font-11 text-3">Endpoint: 127.0.0.1:11434 · Network: BLOCKED to external · Capabilities: ${m.caps.join(", ")}</div>
    <div style="display:flex;gap:9px;margin-top:18px;justify-content:flex-end">
      <button class="btn ${m.loaded ? "" : "btn-primary"}" id="md-toggle">${m.loaded ? "Unload" : "Load"}</button>
      <button class="btn btn-ghost" id="md-close">Close</button>
    </div>`);
  $("#md-toggle").addEventListener("click", () => {
    m.loaded = !m.loaded;
    closeModal();
    if (m.loaded) toast("Model loaded", m.name + " · local", "ok");
    else toast("Model unloaded", m.name + " · VRAM freed", "warn");
    navigate("models");
  });
  $("#md-close").addEventListener("click", closeModal);
}

/* ---------- Model Router ---------- */
function viewRouter(view) {
  const ins = SIH_SCRIPTS.inspection;
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Model Router</span></div>
    <div class="page-header">
      <div><div class="page-title">Intelligent Model Router</div><div class="page-sub">Automatic selection of local models based on task classification. No model is hard-coded.</div></div>
    </div>
    <div class="router-flow">
      <div class="rf-box">
        <div class="rf-label"><span class="rn">1</span>User Task</div>
        <div style="font-size:14px;color:var(--text-0);padding:6px 2px">"Analyze scanned inspection report and generate approval note."</div>
      </div>
      <div class="rf-connector">${Icons.down}</div>
      <div class="rf-box">
        <div class="rf-label"><span class="rn">2</span>Task Classification</div>
        <div class="class-pills">
          ${ins.classifier.map((c) => `<span class="class-pill"><span class="cp-ico">${Icons.check}</span>${c}</span>`).join("")}
        </div>
        <div class="font-11 text-3" style="margin-top:10px">Detected: multimodal document task · confidence 0.93</div>
      </div>
      <div class="rf-connector">${Icons.down}</div>
      <div class="rf-box">
        <div class="rf-label"><span class="rn">3</span>Model Routing</div>
        <div class="rf-models">
          ${ins.routing.map((r) => `<div class="rf-model ${r.role === "Reasoning Model" ? "primary" : ""}"><div class="rm-name">${r.model}</div><div class="rm-role">${r.role}</div></div>`).join("")}
        </div>
      </div>
      <div class="rf-connector">${Icons.down}</div>
      <div class="rf-box">
        <div class="rf-label"><span class="rn">4</span>Tools</div>
        <div class="class-pills">
          <span class="class-pill"><span class="cp-ico">${Icons.eye}</span>OCR</span>
          <span class="class-pill"><span class="cp-ico">${Icons.knowledge}</span>Knowledge Base</span>
          <span class="class-pill"><span class="cp-ico">${Icons.deliver}</span>Document Generator</span>
        </div>
      </div>
      <div class="rf-connector">${Icons.down}</div>
      <div class="rf-box" style="border-color:rgba(52,211,153,0.4)">
        <div class="rf-label" style="color:var(--ok)"><span class="rn" style="background:var(--ok-dim);color:var(--ok)">✓</span>Final Output</div>
        <div style="font-size:15px;color:var(--ok);font-weight:700">Approval Note</div>
        <div class="font-11 text-3" style="margin-top:6px">Deliverable: Approval_Note_042.docx · validated ✓</div>
      </div>
    </div>
    <div class="panel" style="margin-top:22px">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.info}</span>Why this model?</div></div>
      <div class="panel-body">
        <div style="font-size:13px;color:var(--text-1);line-height:1.7">
          The task was classified as a <b style="color:var(--text-0)">multimodal document task</b> because it references a scanned inspection report (image-heavy input) and a text deliverable (approval note).
          The router therefore selects the <b class="text-accent">Vision Model</b> for OCR and image understanding, then hands structured findings to the <b class="text-accent">Reasoning Model</b> for analysis, and routes output to the <b class="text-accent">Document Generator</b>.
        </div>
        <div class="divider"></div>
        <div class="info-row"><span>Router policy</span><b>capability-aware · lowest VRAM</b></div>
        <div class="info-row"><span>Fallback policy</span><b>unload unused · stream</b></div>
        <div class="info-row"><span>All inference</span><b style="color:var(--ok)">LOCAL · no external API</b></div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
}
