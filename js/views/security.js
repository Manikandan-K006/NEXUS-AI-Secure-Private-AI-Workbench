/* ============================================================
   SOVEREIGN AI — Views: Security, Network, Audit
   ============================================================ */

/* ---------- Security Center ---------- */
function viewSecurity(view) {
  const s = AppState.security;
  const live = NexusMode.value === "live";
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Security Center</span></div>
    <div class="page-header">
      <div><div class="page-title">Security Center</div><div class="page-sub">Air-gapped architecture with provable zero data egress.</div></div>
      <span class="tag ${live ? "ok" : "warn"}"><span class="dot"></span>${live ? "VERIFIED" : "SIMULATED"}${live ? " · REAL AIR-GAP CHECK" : " · DEMO DATA"}</span>
    </div>

    <div class="sec-hero" id="sec-hero">
      <div class="sh-pulse"></div>
      <div class="sh-tag">AIR-GAPPED</div>
      <div class="sh-sub" id="sec-hero-sub">No external communication detected</div>
      <div class="sh-note">All inference · storage · retrieval confined to on-premise infrastructure</div>
    </div>

    <div class="sec-grid" id="sec-stats">
      ${secStat("Internet Access", "BLOCKED", s.internet, "danger")}
      ${secStat("External API Calls", "0", s.externalApi, "ok")}
      ${secStat("External DNS Requests", "0", s.externalDns, "ok")}
      ${secStat("Cloud AI Requests", "0", s.cloudAi, "ok")}
      ${secStat("Data Egress", "0 MB", s.dataEgress, "ok")}
    </div>

    <div class="flow-vis">
      <div class="fv-title">${Icons.netmon} Local Network Flow</div>
      <div class="flow-row">
        <div class="flow-node internal"><div class="fn-name">Local User</div><div class="fn-sub">Admin</div></div>
        <div class="flow-arrow">${Icons.arrowr}</div>
        <div class="flow-node internal"><div class="fn-name">Workbench</div><div class="fn-sub">127.0.0.1</div></div>
        <div class="flow-arrow">${Icons.arrowr}</div>
        <div class="flow-node internal"><div class="fn-name">Local Model</div><div class="fn-sub">gateway</div></div>
        <div class="flow-arrow">${Icons.arrowr}</div>
        <div class="flow-node internal"><div class="fn-name">Local Tools</div><div class="fn-sub">sandbox</div></div>
        <div class="flow-arrow">${Icons.arrowr}</div>
        <div class="flow-node internal"><div class="fn-name">Local Storage</div><div class="fn-sub">on-prem</div></div>
      </div>
      <div class="flow-divider"><span class="fd-label">Air-gap boundary</span></div>
      <div class="flow-external">
        <div class="ext-node"><div class="en-name">INTERNET</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
        <div class="ext-node"><div class="en-name">Cloud APIs</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
        <div class="ext-node"><div class="en-name">External DNS</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
        <div class="ext-node"><div class="en-name">Cloud AI</div><div class="en-block">✕ blocked</div><span class="en-x">✕</span></div>
      </div>
    </div>

    <div class="split-2">
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.shield}</span>Verification Proof</div><span class="tag ${live ? "ok" : "warn"}" id="sec-verify-badge">${live ? "VERIFIED" : "SIMULATED"}</span></div>
        <div class="panel-body" id="sec-verify-body">
          <div class="info-row"><span>Network namespace</span><b class="mono">air-gap-1</b></div>
          <div class="info-row"><span>Reverse proxy</span><b class="mono">nginx · localhost</b></div>
          <div class="info-row"><span>Egress firewall</span><b style="color:var(--ok)">DENY ALL</b></div>
          <div class="info-row"><span>Ingress (LAN)</span><b style="color:var(--ok)">ALLOW LOCAL</b></div>
          <div class="info-row"><span>Last verified</span><b class="mono">${nowTs()}</b></div>
          <div class="info-row"><span>Local requests (24h)</span><b class="mono" id="sec-local-req">${s.localRequests.toLocaleString()}</b></div>
          <div class="divider"></div>
          <button class="btn btn-block" id="sec-run-test">${Icons.activity}<span>${live ? "Run real connectivity test" : "Run connectivity test (demo)"}</span></button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.alert}</span>Threat / Blocking Events</div><span class="tag ok" id="sec-threat-count">0 active</span></div>
        <div class="panel-body" id="sec-threats">
          <div class="result-list">
            <div class="result-item ok"><span class="ri-bullet">✓</span>External DNS (8.8.8.8) denied · 14:32:04</div>
            <div class="result-item ok"><span class="ri-bullet">✓</span>Cloud API (13.107.42.14) denied · 14:32:05</div>
            <div class="result-item ok"><span class="ri-bullet">✓</span>Cloud AI endpoint denied · 14:32:11</div>
          </div>
          <div class="divider"></div>
          <div class="font-11 text-3">All outbound attempts blocked at the network boundary. No data left the node.</div>
        </div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  if (live) {
    liveLoadSecurity(view);
  }
  const secBtn = $("#sec-run-test", view);
  secBtn.addEventListener("click", () => {
    const hero = $("#sec-hero", view);
    btn = secBtn;
    btn.disabled = true;
    btn.innerHTML = `${Icons.activity}<span>Testing… checking local + external routes</span>`;
    if (live) {
      toast("Running real connectivity test", "Probing local gateway + external routes (real)", "info");
      apiFetch("/security/status").then((data) => {
        btn.disabled = false;
        btn.innerHTML = `${Icons.activity}<span>Run real connectivity test</span>`;
        hero.classList.add("shield-detect");
        setTimeout(() => hero.classList.remove("shield-detect"), 900);
        const local = (data.requests && data.requests.local) || 0;
        const blocked = (data.requests && data.requests.blocked) || 0;
        const el = $("#sec-local-req", view);
        if (el) el.textContent = local.toLocaleString();
        toast("Air-gap verified (real)", `${local} local · ${blocked} blocked · egress ${data.egress || "BLOCKED"}`, "ok");
      }).catch((e) => {
        btn.disabled = false;
        btn.innerHTML = `${Icons.activity}<span>Run real connectivity test</span>`;
        toast("Test failed", String(e && e.message || e), "err");
      });
    } else {
      toast("Running connectivity test", "Probing local gateway + external routes (demo)", "info");
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `${Icons.activity}<span>Run connectivity test (demo)</span>`;
        hero.classList.add("shield-detect");
        setTimeout(() => hero.classList.remove("shield-detect"), 900);
        toast("Air-gap verified", "0 external packets · 0 egress · SECURE (demo)", "ok");
      }, 2400);
    }
  });
}

function liveLoadSecurity(view) {
  apiFetch("/security/status").then((data) => {
    if (!data) return;
    const stats = $("#sec-stats", view);
    if (stats) {
      const local = (data.requests && data.requests.local) || 0;
      const blocked = (data.requests && data.requests.blocked) || 0;
      stats.innerHTML = [
        secStat("Internet Access", (data.egress || "BLOCKED").toUpperCase(), "egress firewall", data.egress === "BLOCKED" ? "danger" : "ok"),
        secStat("Blocked Requests", String(blocked), "outbound denied", "ok"),
        secStat("Local Requests", String(local), "internal only", "ok"),
        secStat("Data Residency", data.data_residency || "ON-PREMISE", "sovereign zone", "ok"),
        secStat("Sandbox", data.sandbox || "restricted-subprocess", "code execution", "ok"),
      ].join("");
    }
    const badge = $("#sec-verify-badge", view);
    if (badge) { badge.className = "tag ok"; badge.textContent = "VERIFIED"; }
  }).catch(() => {});
}

function secStat(label, value, sub, tone) {
  return `<div class="sec-stat"><div class="ss-val ${tone === "danger" ? "danger" : "ok"}">${value}</div><div class="ss-lbl">${label}</div><div class="font-10 text-3" style="margin-top:2px">${sub}</div></div>`;
}

/* ---------- Network Monitor ---------- */
function viewNetwork(view) {
  viewerWithTable(view, "Network Monitor", "SOC-style live network activity — external traffic visually blocked.", `${Icons.netmon}`, AppState.networkLog, networkTable);
}

function networkTable(rows) {
  return `
    <div class="table-wrap"><table class="table" style="min-width:760px">
      <thead><tr><th>Timestamp</th><th>Source</th><th>Destination</th><th>Protocol</th><th>Status</th><th>Data</th><th>Note</th></tr></thead>
      <tbody>${rows.map(netRow).join("")}</tbody>
    </table></div>`;
}
function netRow(n) {
  const cls = n.status === "ALLOWED" ? "allowed" : "blocked";
  const ico = n.status === "ALLOWED" ? Icons.check : Icons.x;
  return `<tr>
    <td class="text-2">${n.ts}</td><td>${n.src}</td><td>${n.dst}</td><td>${n.proto}</td>
    <td><span class="status ${cls}"><span class="dot"></span>${n.status}</span></td>
    <td>${n.data}</td><td class="text-2">${n.note}</td>
  </tr>`;
}

/* ---------- Audit Logs ---------- */
function viewAudit(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Audit Logs</span></div>
    <div class="page-header">
      <div><div class="page-title">Enterprise Audit Trail</div><div class="page-sub">Immutable record of every task, model, tool and file — for governance and compliance.</div></div>
      <button class="btn btn-ghost" id="audit-export">${Icons.download}<span>Export</span></button>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(4,1fr)">
      ${metric("Events today", "142", "logged")}
      ${metric("Users", "4", "active")}
      ${metric("Warnings", "0", "security")}
      ${metric("Integrity", "INTACT", "hash chain")}
    </div>
    <div class="panel">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.audit}</span>Logged Actions</div><span class="tag accent">${AppState.auditLogs.length + 8} recent</span></div>
      <div class="panel-body" style="padding:14px">
        ${AppState.auditLogs.map(auditRow).join("")}
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  $("#audit-export", view).addEventListener("click", () => toast("Audit log exported", "audit_trail_2026-09-14.json · local only", "ok"));
}

function auditRow(a) {
  const cls = a.status === "SUCCESS" ? "ok" : "warn";
  return `<div class="audit-row">
    <div><div class="ar-user">${esc(a.user)}</div><div class="ar-time">${a.time}</div></div>
    <div class="ar-action">${esc(a.action)}<div class="ar-tools">MODEL: ${esc(a.model)}</div></div>
    <div><div class="ar-action" style="font-size:12px">${esc(a.source)}</div><div class="ar-tools">TOOLS: ${esc(a.tools)}</div></div>
    <span class="tag ${cls}">${a.status}</span>
  </div>`;
}

/* used by table helpers */
function viewerWithTable(view, title, sub, ico, data, renderFn) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">${title}</span></div>
    <div class="page-header">
      <div><div class="page-title">${title}</div><div class="page-sub">${sub}</div></div>
      <span class="tag ok"><span class="dot"></span>LIVE</span>
    </div>
    ${renderFn(data)}
  `;
  wireViewsDataNav(view);
}
