/* ============================================================
   SOVEREIGN AI — Views: Dashboard, Composer, Execution, Demos
   ============================================================ */

let currentComposerOptions = {
  tools: new Set(["Document", "OCR", "Knowledge Base"]),
  model: "auto",
  mode: "agentic",
  files: [],
};

/* ---------- Command Center (Dashboard) ---------- */
function viewDashboard(view) {
  const tasks = AppState.tasks;
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Command Center</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">Sovereign AI Workbench</div>
        <div class="page-sub">Confidential AI execution entirely within your organization's infrastructure.</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="tag accent"><span class="dot"></span>${AppState.mode.toUpperCase()} MODE</span>
        <button class="btn btn-primary" data-nav="new-task"><span class="ico">${Icons.task}</span>New Task</button>
      </div>
    </div>

    <div class="kpi-grid" id="kpi-grid" aria-label="Key metrics">
      ${kpiCard("Active Agents", "2", "running now", "runs", "<span style='color:var(--accent)'>+1</span> vs hour")}
      ${kpiCard("Local Models", String(tasks.loadedModels), "loaded · on-prem", "models", `<span style="color:var(--ok)">${AppState.models.filter(m=>m.loaded).length} ready</span>`)}
      ${kpiCard("Knowledge Base", String(tasks.kbDocs), "indexed documents", "knowledge", "<span style='color:var(--cyan)'>2,431 chunks</span>")}
      ${kpiCard("GPU Utilization", `${AppState.gpu.load}%`, "of RTX / Local GPU", "gpu", `<div class="gpu-bars" style="width:70px" id="gpu-mini-bars"></div>`)}
      ${kpiCard("Security", "AIR-GAPPED", "no external comms", "security", "<span style='color:var(--ok)'>SECURE</span>", true)}
      ${kpiCard("Tasks Completed", String(tasks.todayCompleted), "today", "check", `<span style="color:var(--ok)">✓ validated</span>`)}
    </div>

    ${heroComposer()}

    <div class="grid g-2">
      <div>
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="ico">${Icons.activity}</span>Agent Activity</div>
            <button class="tag accent" data-nav="runs">View runs <span style="margin-left:4px">${Icons.arrowr}</span></button>
          </div>
          <div class="panel-body" style="padding:8px">
            <div class="terminal" id="dash-terminal" style="max-height:280px"></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title"><span class="ico">${Icons.netmon}</span>Live Network</div>
          <span class="tag ok"><span class="dot"></span>LOCAL ONLY</span>
        </div>
        <div class="panel-body">
          <div class="flow-vis" style="margin-bottom:0;padding:16px">
            <div class="flow-row">
              <div class="flow-node internal"><div class="fn-name">Workbench</div><div class="fn-sub">User</div></div>
              <div class="flow-arrow">${Icons.arrowr}</div>
              <div class="flow-node internal"><div class="fn-name">Local Models</div><div class="fn-sub">inference</div></div>
              <div class="flow-arrow">${Icons.arrowr}</div>
              <div class="flow-node internal"><div class="fn-name">Local Storage</div><div class="fn-sub">on-prem</div></div>
            </div>
            <div class="flow-divider"><span class="fd-label">Boundary</span></div>
            <div class="flow-external">
              <div class="ext-node"><div class="en-name">INTERNET</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
              <div class="ext-node"><div class="en-name">Cloud APIs</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
              <div class="ext-node"><div class="en-name">External DNS</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
            </div>
          </div>
          <div class="info-row"><span>External API calls</span><b style="color:var(--ok)">0</b></div>
          <div class="info-row"><span>Data egress</span><b style="color:var(--ok)">0 MB</b></div>
          <div class="info-row"><span>Local requests (24h)</span><b>2,481</b></div>
        </div>
      </div>
    </div>

    <div class="demo-strip" style="margin-top:24px">
      ${demoCard("01", "Analyze Inspection Report", "Upload a scanned inspection PDF → OCR → RAG → generate an approved DOCX deliverable.", "inspection")}
      ${demoCard("02", "AI Coding Task", "Generate, test, and fix a Python risk calculator inside an isolated sandbox.", "code")}
      ${demoCard("03", "Engineering Drawing Analysis", "Vision-analysis of a P&ID with component detection, OCR and region Q&A.", "drawing")}
    </div>
  `;

  // KPI animations
  animateKpis($("#kpi-grid"));
  renderMiniGpuBars();

  // Wire demo cards & composer
  wireComposer(view);
  $$(".demo-card").forEach((c) => {
    c.addEventListener("click", () => startScript(c.dataset.script, view));
  });
  $$("[data-nav]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(b.dataset.nav);
    })
  );

  // Terminal demo feed
  primeTerminal($("#dash-terminal"));
}

function kpiCard(label, value, foot, icon, extra, sec) {
  return `
    <div class="kpi-card ${sec ? "sec-g" : ""}" role="group">
      <div class="kpi-glow"></div>
      <div class="kpi-label"><span class="ico">${Icons[icon]}</span>${label}</div>
      <div style="position:relative">
        <div class="kpi-value">${value}</div>
        ${extra ? `<div class="kpi-foot" style="margin-top:6px;color:var(--text-1);font-size:12px">${extra}</div>` : ""}
      </div>
      ${icon === "runs" || icon === "check" ? `<div class="spark">${[5, 12, 8, 16, 10, 14].map((h) => `<i style="height:${h}px"></i>`).join("")}</div>` : ""}
    </div>`;
}

function animateKpis(container) {
  $$(".kpi-value", container).forEach((n, i) => {
    const target = n.textContent;
    if (/\d/.test(target)) {
      n.style.opacity = "0";
      n.style.transform = "translateY(6px)";
      n.style.transition = "opacity .5s, transform .5s";
      setTimeout(() => {
        n.style.opacity = "1";
        n.style.transform = "translateY(0)";
      }, 120 + i * 90);
    }
  });
}

function renderMiniGpuBars() {
  const bars = $("#gpu-mini-bars");
  if (!bars) return;
  bars.innerHTML = [40, 62, 55, 78, 70, 88, 65, 60].map((h) => `<i style="height:${h}%"></i>`).join("");
}

function demoCard(num, title, desc, script) {
  return `
    <div class="demo-card" data-script="${script}" role="button" tabindex="0" aria-label="${title}">
      <span class="tag accent dc-badge">SIH DEMO</span>
      <div class="dc-num">DEMO · ${num}</div>
      <div class="dc-title">${title}</div>
      <div class="dc-desc">${desc}</div>
      <div class="dc-cta">Run workflow ${Icons.arrowr}</div>
    </div>`;
}

function primeTerminal(term) {
  const lines = [
    ["14:28:12", "GW", "Local model gateway online"],
    ["14:28:12", "SEC", "Air-gap enforced · egress = 0 MB"],
    ["14:29:03", "RAG", "local_kb indexed · 2,431 chunks"],
    ["14:30:41", "GPU", "RTX VRAM 7.8 / 12 GB"],
  ];
  lines.forEach((l) => appendTerm(term, l[0], l[1], l[2]));
  const t2 = term;
  setTimeout(() => appendTerm(t2, nowTs(), "SEC", "Continuous verification active"), 400);
}

function appendTerm(term, ts, label, msg, cls) {
  const tr = el(`<div class="tr ${cls || ""}"><span class="ts">${ts}</span><span class="tl">${label}</span><span class="tm">${esc(msg)}</span></div>`);
  const cursor = term.querySelector(".cursor-line");
  if (cursor) term.insertBefore(tr, cursor);
  else term.appendChild(tr);
  term.scrollTop = term.scrollHeight;
}

/* ---------- Task Composer ---------- */
function heroComposer() {
  return `
    <div class="composer" id="composer">
      <div class="composer-head">
        <div class="composer-title">What do you want Sovereign AI to accomplish?</div>
        <div class="mode-tag"><span class="tag accent" id="mode-label"><span class="dot"></span>AGENTIC</span></div>
      </div>
      <div class="composer-body">
        <textarea id="composer-input" rows="3" placeholder='e.g. "Analyze this inspection report and prepare an approval note."' aria-label="Task prompt"></textarea>
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
          <button class="seg" id="composer-mode" aria-pressed="true" title="Execution mode"><span class="seg-ico">${Icons.bolt}</span>Agentic</button>
          <button class="seg voice" id="composer-voice" title="Voice input" aria-label="Voice input"><span class="seg-ico">${Icons.mic}</span></button>
          <button class="btn btn-primary" id="composer-run" style="min-width:170px"><span class="ico">${Icons.play}</span>Run Agent</button>
        </div>
      </div>
      <div id="classification"></div>
    </div>`;
}

function composerToolChips() {
  const tools = [
    ["rect", "OCR", "doc"],
    ["rect", "Vision", "eye"],
    ["tag", "Knowledge", "knowledge"],
    ["rect", "Sandbox", "terminal"],
    ["rect", "Code", "codelab"],
    ["rect", "Data", "datalab"],
    ["rect", "Calc", "grid"],
    ["rect", "Doc Gen", "deliver"],
  ];
  return tools
    .map((t) => {
      const on = currentComposerOptions.tools.has(t[1]);
      return `<button class="seg ${on ? "on" : ""}" data-tool="${t[1]}" aria-pressed="${on}"><span class="seg-ico">${Icons[t[2]]}</span>${t[1]}</button>`;
    })
    .join("");
}

function wireComposer(view) {
  const composer = $("#composer", view);
  if (!composer) return;
  const input = $("#composer-input", composer);
  const runBtn = $("#composer-run", composer);
  const filesEl = $("#composer-files", composer);

  // quick demo prompt if empty
  if (!input.value) {
    input.value = "Analyze this inspection report and prepare an approval note.";
  }

  $$(".seg[data-tool]", composer).forEach((chip) => {
    chip.addEventListener("click", () => {
      const t = chip.dataset.tool;
      if (currentComposerOptions.tools.has(t)) currentComposerOptions.tools.delete(t);
      else currentComposerOptions.tools.add(t);
      const on = currentComposerOptions.tools.has(t);
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", on);
    });
  });

  $("#composer-mode", composer).addEventListener("click", () => {
    currentComposerOptions.mode =
      currentComposerOptions.mode === "agentic" ? "manual" : "agentic";
    const btn = $("#composer-mode", composer);
    btn.textContent = currentComposerOptions.mode === "agentic" ? "Agentic" : "Manual";
    btn.setAttribute("aria-pressed", currentComposerOptions.mode === "agentic");
    $("#mode-label", composer).innerHTML = `<span class="dot"></span>${currentComposerOptions.mode.toUpperCase()}`;
  });

  $("#composer-voice", composer).addEventListener("click", () => {
    toast("Voice input", "Local speech model (demo) · ready", "info");
  });

  $$("[data-attach]", composer).forEach((b) => {
    b.addEventListener("click", () => addDemoFile(b.dataset.attach, composer));
  });

  // load files per attach type (demo)
  const standard = { file: ["QA_SOP_014_v2.pdf", "2.4 MB", "pdf"], image: ["Tank_12_photographic_record.jpg", "2.1 MB", "img"], pdf: ["inspection_report.pdf", "4.2 MB", "pdf"] };
  window._addDemoFileStandard = standard;

  // live classification on input
  input.addEventListener("input", () => {
    const val = input.value.trim();
    const cls = $("#classification", composer);
    if (val.length > 8) showClassification(cls, val);
    else cls.innerHTML = "";
  });

  runBtn.addEventListener("click", () => {
    const prompt = input.value.trim() || "Analyze inspection report";
    runScriptFromComposer(prompt, view, composer);
  });

  // Enter to run (shift+enter newline)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runBtn.click();
    }
  });

  const defFiles = ["inspection_report.pdf"];
  renderComposerFiles(defFiles, composer);
}

function addDemoFile(type, composer) {
  const s = window._addDemoFileStandard;
  const f = s[type];
  if (!f) return;
  if (!currentComposerOptions.files.includes(f[0])) {
    currentComposerOptions.files.push(f[0]);
    renderComposerFiles(currentComposerOptions.files, composer);
    toast("File attached", f[0] + " · " + f[1], "ok");
  }
}

function renderComposerFiles(files, composer) {
  const filesEl = $("#composer-files", composer);
  filesEl.innerHTML = files
    .map((f) => {
      const ext = f.split(".").pop().toLowerCase();
      const cls = ext === "pdf" ? "pdf" : ext === "jpg" || ext === "png" ? "img" : ext === "csv" ? "csv" : "docx";
      const size = window._addDemoFileStandard ? (window._addDemoFileStandard.pdf[0] === f ? "4.2 MB" : "2.1 MB") : "—";
      return `<div class="file-chip"><span class="f-icon ${cls}">${ext.toUpperCase()}</span><span class="f-name">${esc(f)}</span><span class="f-size">${size}</span><button class="f-x" data-remove="${esc(f)}" aria-label="Remove file">${Icons.x}</button></div>`;
    })
    .join("");
  $$(".f-x", filesEl).forEach((b) => {
    b.addEventListener("click", () => {
      currentComposerOptions.files = currentComposerOptions.files.filter((f) => f !== b.dataset.remove);
      renderComposerFiles(currentComposerOptions.files, composer);
    });
  });
}

function showClassification(cls, prompt) {
  const detected = detectTask(prompt);
  cls.classList.add("show");
  const ins = SIH_SCRIPTS.inspection;
  cls.innerHTML = `
    <div class="class-head"><span class="ico" style="display:grid;place-items:center;color:var(--accent)">${Icons.bolt}</span><span class="ttl">Task Detected</span><span style="margin-left:auto" class="tag accent">local routing</span></div>
    <div class="class-grid">
      <div class="class-group">
        <div class="cg-label">Classification</div>
        <div class="class-pills">
          ${detected.map((d) => `<span class="class-pill"><span class="cp-ico">${Icons.check}</span>${d}</span>`).join("")}
        </div>
      </div>
      <div class="class-group">
        <div class="cg-label">Model Routing</div>
        <div class="router-flow">
          ${ins.routing
            .map(
              (r) => `<div class="route-line"><span class="rl-role">${r.role}</span><span class="rl-model">${r.model}</span><span class="rl-task">${r.task}</span><span class="rl-chev">${Icons.chev}</span></div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

function detectTask(prompt) {
  const p = prompt.toLowerCase();
  const tags = [];
  if (/inspection|report|approval|note|scan|ocr|pdf|document/.test(p)) tags.push("Document Analysis");
  if (/image|photo|drawing|p&id|figure|visual/.test(p)) tags.push("Multimodal");
  if (/retrieve|sop|knowledge|standard|search/.test(p)) tags.push("Knowledge Retrieval");
  if (/generate|docx|note|report|deliverable|prepare/.test(p)) tags.push("Document Generation");
  if (/code|python|script|function|program/.test(p)) tags.push("Code Generation");
  if (/csv|spreadsheet|data|excel|sheet/.test(p)) tags.push("Data Analysis");
  if (tags.length === 0) tags.push("Reasoning", "Planning");
  return tags.slice(0, 4);
}

function runScriptFromComposer(prompt, view, composer) {
  const scriptKey = detectScriptKey(prompt, currentComposerOptions.files);
  const script = SIH_SCRIPTS[scriptKey];
  script.prompt = prompt;
  script.files = currentComposerOptions.files.length ? currentComposerOptions.files : script.files;
  loadExecution(script, view);
  currentComposerOptions.files = [];
  const filesEl = $("#composer-files", composer);
  if (filesEl) filesEl.innerHTML = "";
}

function detectScriptKey(prompt, files) {
  const p = prompt.toLowerCase();
  const joined = [...files, p].join(" ");
  if (/code|python|script|function|csv|risk|program|algorithm/.test(joined)) return "code";
  if (/drawing|p&id|image|diagram|picture|photo|figure|visual/.test(joined)) return "drawing";
  return "inspection";
}

function startScript(scriptKey, view) {
  const script = SIH_SCRIPTS[scriptKey];
  loadExecution(script, view);
}

/* ---------- Execution view ---------- */
function loadExecution(script, view) {
  AppState.currentTask = script;
  const sim = new AgentSimulator();
  const execId = "exec-view";

  const exec = el(`
    <div class="exec-view active" id="${execId}">
      <div class="breadcrumb"><span class="cur">Agent Execution</span><span class="sep">/</span><span class="cur" id="exec-title">${esc(script.title)}</span></div>
      <div class="exec-banner">
        <span class="ring-wrap" id="exec-ring">${ringSvg(0)}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:15px" id="exec-status">Running agent…</span>
            <span class="tag accent"><span class="dot"></span>${AppState.mode.toUpperCase()} MODE</span>
            <span class="tag ok" id="exec-net"><span class="dot"></span>LOCAL ONLY</span>
          </div>
          <div class="ex-label" style="margin-top:6px">Sovereign Agent · ${esc(script.tools.join(" → "))}</div>
        </div>
      </div>
      <div class="exec-progress"><i id="exec-bar" style="width:${100 / script.steps.length}%"></i></div>
      <div class="split-2" style="margin-top:22px">
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="ico">${Icons.runs}</span>Execution Timeline</div>
            <button class="tag accent" id="exec-abort" style="background:var(--danger-dim);color:var(--danger);border-color:rgba(248,113,113,0.3)">Abort</button>
          </div>
          <div class="panel-body" style="padding:16px 18px">
            <div class="timeline" id="timeline">${script.steps.map((s) => tlStep(s, "pending")).join("")}</div>
          </div>
        </div>
        <div>
          <div class="panel" style="margin-bottom:18px">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.terminal}</span>Agent Activity Log</div><span style="font-size:10px;color:var(--text-3)" class="mono">real-time</span></div>
            <div class="panel-body" style="padding:12px"><div class="terminal" id="exec-terminal" style="max-height:280px"></div></div>
          </div>
          <div class="panel">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.shield}</span>Air-gap verification</div></div>
            <div class="panel-body">
              <div class="info-row"><span>External API calls</span><b style="color:var(--ok)">0</b></div>
              <div class="info-row"><span>Data egress</span><b style="color:var(--ok)">0 MB</b></div>
              <div class="info-row"><span>EXECUTION</span><b class="text-accent">LOCAL</b></div>
              <div class="info-row"><span>DATA</span><b class="text-accent">ON-PREMISE</b></div>
              <div class="info-row"><span>TOOLS</span><b class="text-accent">LOCAL</b></div>
              <div class="info-row"><span>MODELS</span><b class="text-accent mono">${esc(script.routing[0].model)}</b></div>
              <div class="info-row"><span>AUDIT</span><b style="color:var(--ok)">RECORDED</b></div>
              <div class="info-row"><span>PROVENANCE</span><b style="color:var(--ok)">AVAILABLE</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  view.innerHTML = "";
  view.appendChild(exec);

  // Abort
  $("#exec-abort", view).addEventListener("click", () => {
    sim.stop();
    toast("Agent task aborted", "Local state cleared · audit recorded", "warn");
    navigate("dashboard");
  });

  // step details toggle
  $$(".tl-expand", view).forEach((b) => {
    b.addEventListener("click", () => b.closest(".tl-step").classList.toggle("open"));
  });

  const term = $("#exec-terminal", view);
  const timeline = $("#timeline", view);
  const bar = $("#exec-bar", view);
  const ring = $("#exec-ring", view);
  const statusEl = $("#exec-status", view);
  const steps = $$(".tl-step", view);

  let completed = 0;
  const logIdx = { n: 0 };
  const scriptLogs = script.logs;

  appendTerm(term, nowTs(), "CORE", "Agent session initialized", "ok");
  appendTerm(term, nowTs(), "SEC", "Air-gap verified · zero external", "ok");
  appendTerm(term, nowTs(), "TASK", script.title.toUpperCase());

  sim.start(scriptKeyOf(script), {
    stepCb: ({ step, done, total }) => {
      updateStep(steps, step, done, term, script, logIdx);
      const pct = Math.round((done / total) * 100);
      bar.style.width = pct + "%";
      ring.innerHTML = ringSvg(pct);
      completed = done;
      if (step.final) {
        statusEl.innerHTML = `<span style="color:var(--ok)">Task Completed ✓</span>`;
        ring.innerHTML = ringSvg(100);
      } else {
        statusEl.textContent = step.title;
      }
    },
    onLog: (t) => appendTerm(term, nowTs(), "AGENT", t),
    onComplete: () => {
      setTimeout(() => completionScreen(script, view), 900);
    },
  });
}

function scriptKeyOf(script) {
  for (const k in SIH_SCRIPTS) {
    if (SIH_SCRIPTS[k].title === script.title) return k;
  }
  return "inspection";
}

function tlStep(step, state) {
  const nmStatus = {
    start: state, detect: state, ocr: state, extract: state, search: state,
    retrieve: state, reason: state, draft: state, generate: state,
    validate: state, done: state, plan: state, gen: state, run: state,
    test: state, detect2: state, fix: state, retest: state, final: state,
    comp: state, measure: state,
  };
  nmStatus[step.id] = state;
  const icon = step.id === "done" ? Icons.check : step.id === "start" ? Icons.bolt : iconForStep(step);
  return `
    <div class="tl-step ${state}" data-step="${step.id}">
      <div class="tl-node" aria-hidden="true">${state === "running" ? spinnerSvg() : icon}</div>
      <div class="tl-head">
        <span class="tl-title">${esc(step.title)}</span>
        <button class="tl-expand" aria-label="Expand ${esc(step.title)}">${Icons.down}</button>
      </div>
      <div class="tl-meta">
        <span style="display:flex;gap:5px;align-items:center"><span class="meta-ico">${Icons.gpu}</span><span id="m-model-${step.id}">${step.model}</span></span>
        <span id="m-tool-${step.id}">${Icons.bolt}</span>
        <span id="m-dur-${step.id}" class="text-3">—</span>
      </div>
      <div class="tl-detail"><div class="tl-detail-inner" id="d-${step.id}">${detailRows(step)}</div></div>
    </div>`;
}

function iconForStep(step) {
  const map = {
    ocr: Icons.eye, extract: Icons.doc, search: Icons.search, retrieve: Icons.db,
    reason: Icons.cpu, draft: Icons.deliver, generate: Icons.file, validate: Icons.audit,
    plan: Icons.grid, gen: Icons.file, run: Icons.play, test: Icons.check,
    detect: Icons.eye, fix: Icons.refresh, retest: Icons.check, final: Icons.file,
    comp: Icons.eye, measure: Icons.bolt,
  };
  return map[step.id] || Icons.bolt;
}

function detailRows(step) {
  if (!step.det) return "";
  return Object.entries(step.det)
    .map(([k, v]) => `<div class="dl-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`)
    .join("");
}

function updateStep(steps, step, done, term, script, logIdx) {
  const cur = steps.find((s) => s.dataset.step === step.id);
  if (!cur) return;
  steps.forEach((s) => {
    if (s !== cur && s.classList.contains("running")) {
      s.classList.remove("running");
      s.classList.add("done");
      const n = $(".tl-node", s);
      if (n) n.innerHTML = Icons.check;
      durComplete(s);
    }
  });
  cur.classList.add("running");
  cur.classList.remove("pending");
  const node = $(".tl-node", cur);
  if (node) node.innerHTML = spinnerSvg();

  // terminal log
  if (logIdx.n < script.logs.length) {
    const line = script.logs[logIdx.n];
    appendTerm(term, nowTs(), "AGENT", line);
    logIdx.n++;
  }
}

function durComplete(stepEl) {
  const dur = $("#m-dur-" + stepEl.dataset.step, stepEl);
  if (dur) dur.textContent = (1.5 + Math.random() * 3).toFixed(1) + "s";
}

function spinnerSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9"/></svg>`;
}

function ringSvg(pct) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return `<svg width="64" height="64" role="img" aria-label="${pct}% complete"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--border-1)" stroke-width="5"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/><text x="32" y="36" text-anchor="middle" font-size="11" fill="var(--text-0)" font-family="var(--font-mono)">${pct}%</text></svg>`;
}

/* ---------- Completion screen ---------- */
function completionScreen(script, view) {
  addCompletedTask(scriptKeyOf(script), script);
  AppState.tasks.todayCompleted += 1;

  view.innerHTML = "";
  const sec = el(`
    <div style="max-width:900px;margin:0 auto" id="completion">
      <div class="sec-hero" style="border-color:rgba(52,211,153,0.3)">
        <div class="sh-pulse"></div>
        <div style="color:var(--ok);display:grid;place-items:center;margin-bottom:8px">${popCheck()}</div>
        <div class="sh-tag" style="font-size:30px;letter-spacing:0.06em">${script.result.heading}</div>
        <div class="sh-sub">Status: ✓ Validated · Security: ✓ No external communication</div>
      </div>

      <div class="split-2" style="margin-top:20px">
        <div>
          <div class="panel" style="margin-bottom:16px">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.shield}</span>Security Proof</div></div>
            <div class="panel-body">
              <div class="info-row"><span>MODEL</span><b class="mono text-accent">${esc(script.routing[0].model)}</b></div>
              <div class="info-row"><span>EXECUTION</span><b class="text-accent">Local</b></div>
              <div class="info-row"><span>TOOLS</span><b class="text-accent">Local</b></div>
              <div class="info-row"><span>DATA</span><b class="text-accent">On-premise</b></div>
              <div class="info-row"><span>NETWORK</span><b style="color:var(--ok)">No external communication</b></div>
              <div class="info-row"><span>PROVENANCE</span><b style="color:var(--ok)">Available</b></div>
              <div class="info-row"><span>AUDIT</span><b style="color:var(--ok)">Recorded</b></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.deliver}</span>Output</div></div>
            <div class="panel-body">
              ${script.result.docs.map((d) => `<div class="info-row"><span>${esc(d.k)}</span><b>${esc(d.v)}</b></div>`).join("")}
            </div>
          </div>
        </div>
        <div>
          <div class="panel" style="margin-bottom:16px">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.layers}</span>Document Provenance</div></div>
            <div class="panel-body">
              <div class="prov-list">
                ${provItem("INPUT", Icons.file, esc(script.files[0] || "document"), "")}
                ${script.routing.map((r) => provItem(r.role.toUpperCase(), Icons.gpu, r.model, r.task)).join("")}
                ${provItem("VALIDATION", Icons.audit, "Passed", "All checks green")}
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.terminal}</span>Session Log</div></div>
            <div class="panel-body" style="padding:12px">
              <div class="terminal" style="max-height:180px">${script.logs.map((l) => `<div class="tr"><span class="ts">${nowTs()}</span><span class="tl">AGENT</span><span class="tm">${esc(l)}</span></div>`).join("")}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:26px;flex-wrap:wrap">
        <button class="btn btn-primary" id="completion-doc">${Icons.deliver}<span>Open Deliverable</span></button>
        <button class="btn" id="completion-deliver">${Icons.deliver}<span>View Deliverables</span></button>
        <button class="btn" id="completion-security">${Icons.shield}<span>Security Proof</span></button>
        <button class="btn btn-ghost" id="completion-new">${Icons.task}<span>New Task</span></button>
      </div>
      <div style="text-align:center;margin-top:14px"><span class="tag ok"><span class="dot"></span>AUDIT TRAIL WRITTEN · SECURE</span></div>
    </div>
  `);
  view.appendChild(sec);

  toast(script.result.heading, "Validated ✓ · No external communication", "ok");

  $("#completion-doc", sec).addEventListener("click", () => openDeliverableModal(script));
  $("#completion-deliver", sec).addEventListener("click", () => navigate("deliverables"));
  $("#completion-security", sec).addEventListener("click", () => navigate("security"));
  $("#completion-new", sec).addEventListener("click", () => navigate("new-task"));
}

function provItem(label, icon, name, detail) {
  return `<div class="prov-item"><span class="pv-ico">${icon}</span><div><div class="pv-step">${label}</div><div class="pv-name">${name}</div>${detail ? `<div class="pv-detail">${detail}</div>` : ""}</div><span class="pv-status"><span class="tag ok"><span class="dot"></span></span></span></div>`;
}

function popCheck() {
  return `<svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="var(--ok-dim)" stroke="var(--ok)" stroke-width="2"/><path d="M15 27l8 8 14-16" fill="none" stroke="var(--ok)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function openDeliverableModal(script) {
  const name = script.result.type === "Python Utility" ? "Inspection_Risk_Scores.py" : script.files[0].replace(/\.pdf$/, "") + "_Approval_Note.docx";
  openModal(script.result.type + " · Provenance", `
    <div class="prov-list">
      ${provItem("INPUT", Icons.file, esc(script.files[0] || "document"), "")}
      ${script.routing.map((r) => provItem(r.role.toUpperCase(), Icons.gpu, r.model, r.task)).join("")}
      ${provItem("GENERATION", Icons.deliver, script.result.type, name)}
      ${provItem("VALIDATION", Icons.audit, "Passed", "Structure · citations · compliance ✓")}
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
      <button class="btn" id="prov-download">${Icons.download}<span>Download</span></button>
      <button class="btn btn-primary" id="prov-close">${Icons.check}<span>Done</span></button>
    </div>
  `);
  $("#prov-download").addEventListener("click", () => toast("Download initiated", name + " · local only", "ok"));
  $("#prov-close").addEventListener("click", closeModal);
}

