/* ============================================================
   SOVEREIGN AI — Views: New Task, Settings
   ============================================================ */

/* ---------- New Task ---------- */
function viewNewTask(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">New Task</span></div>
    <div class="page-header">
      <div><div class="page-title">Create a Task</div><div class="page-sub">Describe an objective — Sovereign AI classifies it, routes local models and executes tools.</div></div>
    </div>
    <div class="demo-strip" style="grid-template-columns:repeat(3,1fr)">
      ${demoCard("01", "Analyze Inspection Report", "Scanned PDF → OCR → RAG → DOCX", "inspection")}
      ${demoCard("02", "AI Coding Task", "Plan → code → sandbox → tests", "code")}
      ${demoCard("03", "Engineering Drawing Analysis", "Vision + component detection", "drawing")}
    </div>
    <div class="composer" id="composer">
      <div class="composer-head">
        <div class="composer-title">What do you want Sovereign AI to accomplish?</div>
        <div class="mode-tag"><span class="tag accent" id="mode-label"><span class="dot"></span>AGENTIC</span></div>
      </div>
      <div class="composer-body">
        <textarea id="composer-input" rows="3" placeholder='e.g. "Create a Python utility to calculate inspection risk scores from the provided CSV."'></textarea>
        <div class="attached-files" id="composer-files"></div>
        <div class="attach-row">
          <button class="attach-chip" data-attach="file"><span class="ico">${Icons.file}</span>Attach file</button>
          <button class="attach-chip" data-attach="image"><span class="ico">${Icons.pin}</span>Image / Photo</button>
          <button class="attach-chip" data-attach="pdf"><span class="ico">${Icons.doc}</span>PDF / Scan</button>
        </div>
        <div class="composer-tools">
          <span class="tag" style="background:transparent;border:none;color:var(--text-3);padding:0">Tools</span>
          ${composerToolChips()}
        </div>
      </div>
      <div style="padding:0 20px 18px">
        <div class="run-area" style="justify-content:flex-end">
          <button class="seg" id="composer-mode" aria-pressed="true">${Icons.bolt}Agentic</button>
          <button class="seg voice" id="composer-voice">${Icons.mic}</button>
          <button class="btn btn-primary" id="composer-run" style="min-width:170px">${Icons.play}<span>Run Agent</span></button>
        </div>
      </div>
      <div id="classification"></div>
    </div>
  `;
  wireComposer(view);
  $$(".demo-card").forEach((c) =>
    c.addEventListener("click", () => startScript(c.dataset.script, view))
  );
}

/* ---------- Settings ---------- */
function viewSettings(view) {
  const sections = [
    ["general", "General", Icons.settings],
    ["models", "Models", Icons.models],
    ["inference", "Inference", Icons.bolt],
    ["security", "Security", Icons.security],
    ["network", "Network", Icons.netmon],
    ["storage", "Storage", Icons.db],
    ["knowledge", "Knowledge Base", Icons.knowledge],
    ["sandbox", "Sandbox", Icons.terminal],
    ["users", "Users & Roles", Icons.workspace],
    ["audit", "Audit", Icons.audit],
    ["system", "System", Icons.cpu],
  ];
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Settings</span></div>
    <div class="page-header">
      <div><div class="page-title">Settings</div><div class="page-sub">Configuration for the on-premise workbench. Secrets are never displayed.</div></div>
      <span class="tag ok"><span class="dot"></span>SECURE CONFIG</span>
    </div>
    <div class="settings-layout">
      <div class="panel"><div class="panel-body" style="padding:10px"><div class="settings-nav">
        ${sections.map((s, i) => `<div class="st-item ${i === 0 ? "active" : ""}" data-sec="${s[0]}"><span class="st-ico">${s[2]}</span>${s[1]}</div>`).join("")}
      </div></div></div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title" id="settings-title">General</div></div>
        <div class="panel-body" id="settings-body">${settingsBody("general")}</div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  $$(".st-item", view).forEach((it) => {
    it.addEventListener("click", () => {
      $$(".st-item", view).forEach((x) => x.classList.toggle("active", x === it));
      const sec = it.dataset.sec;
      $("#settings-title", view).textContent = it.textContent.trim();
      $("#settings-body", view).innerHTML = settingsBody(sec);
      wireToggles(view);
    });
  });
  wireToggles(view);
}

function settingsBody(sec) {
  const key = (label, desc, on, tone) => `
    <div class="setting-row">
      <div class="sr-info"><div class="sr-t">${label}</div><div class="sr-d">${desc}</div></div>
      <div class="toggle ${on ? "on" : ""}" data-toggle="${tone || ""}"></div>
    </div>`;
  const B = {
    general: `
      <div class="info-row"><span>Workspace</span><b>NEXUS-UNIT-03</b></div>
      <div class="info-row"><span>Operator</span><b>${esc(AppState.user.name)} · ${esc(AppState.user.role)}</b></div>
      <div class="info-row"><span>Deployment</span><b class="text-accent">ON-PREMISE / AIR-GAPPED</b></div>
      <div class="divider"></div>
      ${key("Auto-start agents", "Restore running agents on workbench launch.", true)}
      ${key("Schema autosave", "Save workspace layout automatically.", true)}
      ${key("Welcome demo", "Show the guided SIH walkthrough on launch.", true)}`,
    models: `
      <div class="info-row"><span>Gateway</span><b class="mono">ollama · 127.0.0.1:11434</b></div>
      <div class="info-row"><span>Auto-load on boot</span><b class="mono">4 models</b></div>
      <div class="divider"></div>
      ${key("Reasoning model hot-load", "Pre-warm reasoning model in VRAM.", true)}
      ${key("Vision model hot-load", "Keep vision model resident for OCR.", true)}
      ${key("Embedding always-on", "Keep bge-m3 resident for RAG.", true)}`,
    inference: `
      <div class="info-row"><span>Backend</span><b>Ollama (local)</b></div>
      <div class="info-row"><span>Max tokens</span><b class="mono">8192</b></div>
      <div class="info-row"><span>Streaming</span><b>enabled</b></div>
      <div class="divider"></div>
      ${key("Stream tokens", "Stream model output token-by-token.", true)}
      ${key("VLLM backend", "Use vLLM for high-throughput serving (when available).", false)}`,
    security: `
      <div class="info-row"><span>Mode</span><b class="text-ok">AIR-GAPPED</b></div>
      <div class="info-row"><span>Egress firewall</span><b style="color:var(--danger)">DENY ALL</b></div>
      <div class="divider"></div>
      ${key("Block external DNS", "Deny all outbound DNS resolution.", true, "danger")}
      ${key("Block cloud APIs", "Deny reachable cloud AI endpoints.", true, "danger")}
      ${key("Require RBAC", "Enforce role-based access control.", true)}
      ${key("Session timeout", "Auto-lock idle sessions (10 min).", true)}`,
    network: `
      <div class="info-row"><span>Reverse proxy</span><b class="mono">nginx · localhost</b></div>
      <div class="info-row"><span>Bind</span><b class="mono">127.0.0.1:8080</b></div>
      <div class="divider"></div>
      ${key("LAN access", "Allow trusted LAN clients only.", true)}
      ${key("TLS termination", "Serve workbench over local TLS.", true)}
      ${key("Sandbox egress", "Permit sandbox local only.", false, "danger")}`,
    storage: `
      <div class="info-row"><span>Engine</span><b class="mono">postgres · SQLite fallback</b></div>
      <div class="info-row"><span>Encryption</span><b class="text-ok">AES-256 at rest</b></div>
      <div class="info-row"><span>Backup</span><b>local nightly (paused in demo)</b></div>
      <div class="divider"></div>
      ${key("Encrypt at rest", "Encrypt organizational data on disk.", true)}
      ${key("Auto-temp purge", "Delete temporary files after 24h.", true)}`,
    knowledge: `
      <div class="info-row"><span>Vector DB</span><b class="mono">Qdrant · local</b></div>
      <div class="info-row"><span>Indexed docs</span><b class="mono">128</b></div>
      <div class="info-row"><span>Chunks</span><b class="mono">18,204</b></div>
      <div class="divider"></div>
      ${key("Semantic search", "Enable vector retrieval.", true)}
      ${key("Auto-index on upload", "Index documents immediately.", true)}
      ${key("Chunk citations", "Always cite sources in answers.", true)}`,
    sandbox: `
      <div class="info-row"><span>Runtime</span><b class="mono">python:3.12-slim</b></div>
      <div class="info-row"><span>Container</span><b class="mono">isolated-runtime-01</b></div>
      <div class="info-row"><span>Network</span><b style="color:var(--danger)">DISABLED</b></div>
      <div class="info-row"><span>Filesystem</span><b class="text-warn">RESTRICTED</b></div>
      <div class="divider"></div>
      ${key("Network disabled", "No network in sandbox.", true, "danger")}
      ${key("Resource limits", "Cap CPU/RAM per execution.", true, "danger")}
      ${key("Timeout", "Kill executions over 60s.", true, "danger")}`,
    users: `
      <div class="info-row"><span>Active users</span><b class="mono">Admin · Ops · QA</b></div>
      <div class="info-row"><span>Roles</span><b>Admin / Engineer / Auditor</b></div>
      <div class="divider"></div>
      ${key("Admin RBAC", "Admin-only access to security settings.", true, "danger")}
      ${key("Auditor read-only", "Auditors can read logs, not execute.", true)}`,
    audit: `
      <div class="info-row"><span>Chain</span><b class="text-ok">Hash-chained, tamper-evident</b></div>
      <div class="info-row"><span>Events today</span><b class="mono">142</b></div>
      <div class="divider"></div>
      ${key("Hash chain", "Immutable chained audit ledger.", true, "danger")}
      ${key("Log model usage", "Record every model invocation.", true)}
      ${key("Log file access", "Record every file touch.", true)}`,
    system: `
      <div class="info-row"><span>Host</span><b class="mono">air-gap-node · Ubuntu 22.04</b></div>
      <div class="info-row"><span>CPU</span><b class="mono">${AppState.cpu}%</b></div>
      <div class="info-row"><span>RAM</span><b class="mono">${AppState.ram}%</b></div>
      <div class="info-row"><span>GPU VRAM</span><b class="mono">${AppState.gpu.vram} / ${AppState.gpu.vramTotal} GB</b></div>
      <div class="divider"></div>
      ${key("Auto-update", "Check local model registry (no internet).", true)}
      ${key("Telemetry", "Local diagnostics only — never external.", false, "danger")}`,
  };
  return B[sec] || "";
}

function wireToggles(view) {
  $$(".toggle", view).forEach((t) => {
    t.addEventListener("click", () => {
      t.classList.toggle("on");
      const tone = t.dataset.toggle;
      if (tone === "danger" && t.classList.contains("on")) {
        // confirm security-sensitive
        const label = t.closest(".setting-row").querySelector(".sr-t").textContent;
        confirmDanger(label, () => {
          toast("Setting enabled", label + " · security reinforced", "ok");
        });
      } else {
        toast("Setting updated", t.closest(".setting-row").querySelector(".sr-t").textContent, "ok");
      }
    });
  });
}

function confirmDanger(label, yes) {
  const ov = openModal("Security-sensitive setting", `
    <div class="info-row"><span>Setting</span><b class="text-warn">${esc(label)}</b></div>
    <div class="info-row"><span>Impact</span><b>Changes air-gap security posture</b></div>
    <div style="margin-top:16px;padding:12px;background:var(--warn-dim);border:1px solid rgba(251,191,36,0.3);border-radius:8px;font-size:12px;color:var(--warn)">
      This control is security-sensitive. Confirm you want to apply this change on the local node.
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button class="btn btn-ghost" id="cd-cancel">Cancel</button>
      <button class="btn" id="cd-ok" style="background:var(--danger-dim);color:var(--danger);border-color:rgba(248,113,113,0.3)">Confirm change</button>
    </div>`);
  $("#cd-cancel", ov).addEventListener("click", closeModal);
  $("#cd-ok", ov).addEventListener("click", () => {
    closeModal();
    yes();
  });
}
