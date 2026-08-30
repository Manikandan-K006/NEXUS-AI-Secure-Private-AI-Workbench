/* ============================================================
   SOVEREIGN AI — Views: Documents, Knowledge Base, Models, Router
   ============================================================ */

/* ---------- Documents / Multimodal analysis workspace ---------- */
function viewDocuments(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Documents</span></div>
    <div class="page-header">
      <div><div class="page-title">Multimodal Document Analysis</div><div class="page-sub">OCR, vision and knowledge extraction for confidential engineering documents.</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="doc-upload">${Icons.uploadCloud}<span>Upload document</span></button>
        <button class="btn" id="doc-reanalyze" style="display:${NexusMode.value === "live" ? "" : "none"}">${Icons.refresh}<span>Re-analyze</span></button>
        <button class="btn btn-danger" id="doc-delete" style="display:${NexusMode.value === "live" ? "" : "none"}">${Icons.trash}<span>Delete</span></button>
        <button class="btn btn-ghost" id="doc-refresh">${Icons.refresh}<span>Refresh</span></button>
      </div>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(4,1fr)">
      ${metric("Documents", String(AppState.documents.length), "in workspace")}
      ${metric("OCR accuracy", "96.8%", "avg confidence")}
      ${metric("Tables detected", "18", "across docs")}
      ${metric("Entities extracted", "412", "names · dates · SCIs")}
    </div>
    <div class="split-3" style="grid-template-columns:1.4fr 1fr 1fr">
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.file}</span>Document Preview<span class="sub" id="doc-prev-name">—</span></div></div>
        <div class="panel-body">
          <div class="doc-preview-wrap" id="doc-preview"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
            <span class="tag accent" id="doc-prev-pages">—</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm" id="doc-zoom-in">+</button>
              <button class="btn btn-sm" id="doc-zoom-out">−</button>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.cpu}</span>AI Analysis</div></div>
        <div class="panel-body" id="doc-analysis">
          <div class="result-section">
            <div class="result-h"><span class="ico">${Icons.eye}</span>OCR Confidence</div>
            <div class="conf-row"><span class="font-11 text-2">Overall</span><div class="conf-bar"><i style="width:98%"></i></div><span class="mono font-11">98.2%</span></div>
            <div class="conf-row"><span class="font-11 text-2">Per-page</span><div class="conf-bar"><i style="width:94%"></i></div><span class="mono font-11">94.0%</span></div>
          </div>
          <div class="result-section">
            <div class="result-h"><span class="ico">${Icons.folder}</span>Detected Structure</div>
            <div class="result-list">
              <div class="result-item ok"><span class="ri-bullet">•</span>12 pages of scanned inspection report</div>
              <div class="result-item"><span class="ri-bullet">•</span>3 tables · 2 diagrams</div>
              <div class="result-item"><span class="ri-bullet">•</span>27 named entities extracted</div>
            </div>
          </div>
          <div class="result-section">
            <div class="result-h"><span class="ico">${Icons.shield}</span>Findings</div>
            <div class="result-list">
              <div class="result-item danger"><span class="ri-bullet">!</span>Corrosion depth exceeds limit (3.2 mm)</div>
              <div class="result-item warn"><span class="ri-bullet">!</span>Re-test due within 30 days</div>
              <div class="result-item ok"><span class="ri-bullet">✓</span>Certification documents valid</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.share}</span>Extracted Information</div></div>
        <div class="panel-body" id="doc-extract">
          <div class="result-section">
            <div class="result-h">Entities</div>
            <div class="info-row"><span>Equipment</span><b class="mono">HE-204 (Heat Exchanger)</b></div>
            <div class="info-row"><span>Inspection ref</span><b class="mono">INSPECTION-2026-081</b></div>
            <div class="info-row"><span>Date</span><b class="mono">12 Aug 2026</b></div>
            <div class="info-row"><span>Operator</span><b class="mono">Contractor · Apex Services</b></div>
          </div>
          <div class="divider"></div>
          <div class="result-section">
            <div class="result-h">Measurements</div>
            <div class="info-row"><span>Wall thickness</span><b class="mono">14.6 mm (min 11.4)</b></div>
            <div class="info-row"><span>Corrosion depth</span><b class="mono">3.2 mm</b></div>
            <div class="info-row"><span>P'\u00a0test pressure</span><b class="mono">6.2 bar</b></div>
          </div>
          <div class="divider"></div>
          <div class="result-section">
            <div class="result-h"><span class="ico">${Icons.lock}</span>Data handling</div>
            <span class="tag ok"><span class="dot"></span>ON-PREMISE ONLY</span>
            <div style="margin-top:8px" class="font-11 text-3">No data left the node during analysis.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.folder}</span>Documents in Workspace</div><input type="text" id="doc-search" placeholder="Filter documents…" style="height:32px;padding:0 11px;border-radius:6px;border:1px solid var(--border-1);background:var(--bg-2);color:var(--text-0)"/></div>
      <div class="panel-body" style="padding:14px"><div class="doc-list" id="doc-list">${AppState.documents.map(docRow).join("")}</div></div>
    </div>
  `;
  wireViewsDataNav(view);
  $("#doc-upload", view).addEventListener("click", () => uploadDocModal(view));
  $("#doc-refresh", view).addEventListener("click", () => {
    if (NexusMode.value === "live") liveRefreshDocuments(view);
    else toast("Workspace refreshed", "No change · all files on-premise (demo)", "ok");
  });
  // re-analyze button
  $("#doc-reanalyze", view).addEventListener("click", () => {
    const docs = window._liveDocuments || [];
    const sel = docs.find((d) => $("#doc-prev-name", view) && $("#doc-prev-name", view).textContent === d.name);
    if (!sel) { toast("No document selected", "Select a document first", "err"); return; }
    const docId = sel.document_id || sel.id;
    const ov = openModal("Re-analyze document", `
      <div class="result-section">
        <div class="result-h">Re-analyze ${esc(sel.name)}?</div>
        <div style="font-size:13px;color:var(--text-1);line-height:1.6">This will re-run OCR + entity extraction + structured analysis on-premise. The current analysis will be overwritten.</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" id="modal-reanalyze-confirm">Re-analyze</button>
        <button class="btn btn-ghost" id="modal-reanalyze-cancel">Cancel</button>
      </div>
    `);
    $("#modal-reanalyze-cancel", ov).addEventListener("click", () => closeModal());
    $("#modal-reanalyze-confirm", ov).addEventListener("click", () => {
      closeModal();
      apiFetch(`/documents/${docId}/reanalyze`, { method: "POST" }).then((res) => {
        toast("Re-analyze started", res.status || "processing", "ok");
        liveRefreshDocuments(view);
      }).catch((e) => toast("Re-analyze failed", String(e && e.message || e), "err"));
    });
  });
  // delete button
  $("#doc-delete", view).addEventListener("click", () => {
    const docs = window._liveDocuments || [];
    const sel = docs.find((d) => $("#doc-prev-name", view) && $("#doc-prev-name", view).textContent === d.name);
    if (!sel) { toast("No document selected", "Select a document first", "err"); return; }
    const docId = sel.document_id || sel.id;
    const ov = openModal("Delete document", `
      <div class="result-section">
        <div class="result-h">Delete ${esc(sel.name)}?</div>
        <div class="result-item danger"><span class="ri-bullet">!</span>This will permanently remove the file, analysis, vector embeddings and all associated data from on-premise storage.</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-danger" id="modal-delete-confirm">Delete permanently</button>
        <button class="btn btn-ghost" id="modal-delete-cancel">Cancel</button>
      </div>
    `);
    $("#modal-delete-cancel", ov).addEventListener("click", () => closeModal());
    $("#modal-delete-confirm", ov).addEventListener("click", () => {
      closeModal();
      apiFetch(`/documents/${docId}`, { method: "DELETE" }).then((res) => {
        toast("Document deleted", res.status || "removed from on-premise store", "ok");
        liveRefreshDocuments(view);
        const ana = $("#doc-analysis", view);
        if (ana) ana.innerHTML = `<div class="empty-state" style="padding:26px"><div class="es-title">Document deleted</div><div class="es-sub">All data removed from local storage.</div></div>`;
        const ex = $("#doc-extract", view);
        if (ex) ex.innerHTML = "";
      }).catch((e) => toast("Delete failed", String(e && e.message || e), "err"));
    });
  });
  if (NexusMode.value === "live") {
    liveLoadDocuments(view);
  } else {
    renderDocPreview($("#doc-preview", view), AppState.documents[0]);
    $("#doc-prev-name", view).textContent = AppState.documents[0].name;
  }

  let liveDocs = window._liveDocuments || [];
  // select doc in list
  $$(".doc-row", view).forEach((r) => {
    r.addEventListener("click", () => {
      const id = r.dataset.id;
      const pool = NexusMode.value === "live" && liveDocs.length ? liveDocs : AppState.documents;
      const doc = pool.find((d) => String(d.id) === String(id));
      if (!doc) return;
      selectDoc(doc, view);
    });
  });
  $("#doc-search", view).addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    $$(".doc-row", view).forEach((r) => {
      r.style.display = r.dataset.name.toLowerCase().includes(q) || r.dataset.id.toLowerCase().includes(q) ? "" : "none";
    });
  });
  $("#doc-zoom-in", view).addEventListener("click", () => zoomDoc(1.12));
  $("#doc-zoom-out", view).addEventListener("click", () => zoomDoc(1 / 1.12));
  window._docZoom = 1;
}

/* ---------- LIVE mode: real backend documents ---------- */
function liveLoadDocuments(view) {
  apiFetch("/documents").then((data) => {
    const docs = (data && data.documents) || [];
    window._liveDocuments = docs;
    const list = $("#doc-list", view);
    if (!list) return;
    list.innerHTML = docs.length ? docs.map(liveDocRow).join("") : `<div class="empty-state" style="padding:24px"><div class="es-title">No documents yet</div><div class="es-sub">Upload a file to start local processing.</div></div>`;
    // re-wire clicks
    $$(".doc-row", list).forEach((r) => {
      r.addEventListener("click", () => {
        const id = r.dataset.id;
        const doc = docs.find((d) => String(d.id) === String(id));
        if (doc) selectDoc(doc, view);
      });
    });
    const metric = $(".metrics-row .metric:first-child .m-value", view);
    if (metric && metric.firstChild) metric.firstChild.textContent = docs.length;
    if (docs.length) {
      selectDoc(docs[0], view);
    }
  }).catch(() => {
    toast("Could not load documents", "Backend not reachable", "err");
  });
}

function liveRefreshDocuments(view) {
  toast("Refreshing workspace", "Fetching status from on-premise store", "info");
  liveLoadDocuments(view);
}

function liveToPreview(d) {
  return {
    id: d.document_id || d.id,
    name: d.name,
    type: (d.ext || "pdf").replace(".", ""),
    pages: d.pages || 1,
    cat: (d.ext || "PDF").toUpperCase(),
    size: fmtSize(d.size_bytes || d.size_bytes || 0),
    date: "",
    status: d.status || "uploaded",
    analyzed: d.status === "done" || d.status === "indexed",
  };
}

function liveDocRow(d) {
  const ico = {
    pdf: ["PDF", "var(--danger)"],
    png: ["IMG", "var(--purple,#7c3aed)"],
    jpg: ["IMG", "var(--purple,#7c3aed)"],
    xlsx: ["XLS", "var(--green,#16a34a)"],
    csv: ["CSV", "var(--green,#16a34a)"],
    docx: ["DOC", "var(--blue,#2563eb)"],
  }[d.ext.replace(".", "")] || ["DOC", "var(--blue,#2563eb)"];
  return `<div class="doc-row" data-id="${d.id}" data-name="${esc(d.name)}" role="button">
    <div class="doc-ico" style="background:${ico[1]}">${ico[0]}</div>
    <div class="doc-info">
      <div class="doc-name">${esc(d.name)}</div>
      <div class="doc-desc">${esc((d.ext || "").toUpperCase())}</div>
      <div class="doc-meta"><span>${fmtSize(d.size_bytes || 0)}</span><span>${d.pages || "-"} pgs</span><span>${esc(d.status)}</span></div>
    </div>
    <span class="tag ${d.status === "indexed" ? "ok" : "info"}">${esc(d.status).toUpperCase()}</span>
  </div>`;
}

function metric(label, value, sub) {
  return `<div class="metric"><div class="m-label">${label}</div><div class="m-value">${value} <span class="unit">${sub}</span></div></div>`;
}

function docRow(d) {
  const ico = {
    pdf: ["PDF", "var(--danger)"],
    img: ["IMG", "var(--purple,#7c3aed)"],
    xlsx: ["XLS", "var(--green,#16a34a)"],
  }[d.type] || ["DOC", "var(--blue,#2563eb)"];
  return `<div class="doc-row" data-id="${d.id}" data-name="${esc(d.name)}" role="button">
    <div class="doc-ico" style="background:${ico[1]}">${ico[0]}</div>
    <div class="doc-info">
      <div class="doc-name">${esc(d.name)}</div>
      <div class="doc-desc">${esc(d.cat)}</div>
      <div class="doc-meta"><span>${d.size}</span><span>${d.pages} pgs</span><span>${d.date}</span></div>
    </div>
    <span class="tag ${d.analyzed ? "ok" : "info"}">${d.status.toUpperCase()}</span>
  </div>`;
}

function selectDoc(doc, view) {
  $("#doc-prev-name", view).textContent = doc.name;
  $("#doc-prev-pages", view).textContent = `${doc.name} · ${doc.pages || 1} pages`;
  window._docZoom = 1;
  if (NexusMode.value === "live" && (doc.id || doc.document_id) && !String(doc.id || "").startsWith("P&ID")) {
    liveSelectDoc(doc, view);
    return;
  }
  // ---- DEMO path ----
  renderDocPreview($("#doc-preview", view), doc);
  if (doc.id === "P&ID-UNIT-03") {
    $("#doc-analysis", view).querySelector(".result-h").textContent = "AI Analysis";
    $("#doc-analysis", view).innerHTML = pidAnalysisHTML();
    $("#doc-extract", view).innerHTML = pidExtractHTML();
  }
  toast("Analyzing " + doc.name, "Vision model · local inference", "info", 2400);
}

/* ---------- LIVE: render real analysis + preview for a document ---------- */
function liveSelectDoc(doc, view) {
  const docId = doc.id || doc.document_id;
  const zapi = "$('#doc-analysis') ? true : true";
  const status = doc.status || "";

  if (status === "done" || status === "indexed") {
    apiFetch(`/documents/${docId}/analysis`).then((res) => {
      if (res && res.error === undefined) {
        renderLiveAnalysis(view, res);
        loadLivePreview(docId, view);
      } else if (res && res.status) {
        renderLiveProcessing(view, docId, res.status, res.stage, res.progress, res.error);
      }
    }).catch((e) => {
      renderLiveError(view, "ANALYSIS FAILED", String(e && e.message || e));
    });
  } else if (status === "error") {
    renderLiveError(view, "PROCESSING FAILED", doc.error || "Unknown error");
  } else {
    pollLiveStatus(view, docId);
  }
}

function loadLivePreview(docId, view) {
  const wrap = $("#doc-preview", view);
  fetch(`/api/documents/${docId}/preview`, { headers: { Authorization: NexusMode.token ? "Bearer " + NexusMode.token : "" } })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/pdf")) {
        r.blob().then((blob) => {
          const url = URL.createObjectURL(blob);
          wrap.innerHTML = `<iframe src="${url}" style="width:100%;height:520px;border:none;border-radius:6px;background:#fff" title="Document preview"></iframe>`;
        });
      } else {
        r.blob().then((blob) => {
          const url = URL.createObjectURL(blob);
          wrap.innerHTML = `<img src="${url}" alt="document" style="max-width:100%;max-height:520px;display:block;border-radius:6px"/>`;
        });
      }
    })
    .catch((e) => {
      wrap.innerHTML = `<div class="empty-state" style="padding:30px"><div class="es-title">Preview unavailable</div><div class="es-sub">${esc(String(e.message))}</div></div>`;
    });
}

function pollLiveStatus(view, docId, tries) {
  const triesLeft = tries || 0;
  apiFetch(`/documents/${docId}/status`).then((st) => {
    if (st.status === "done" || st.status === "indexed") {
      apiFetch(`/documents/${docId}/analysis`).then((res) => {
        if (res && res.error === undefined) renderLiveAnalysis(view, res);
        else renderLiveProcessing(view, docId, st.status, st.stage, st.progress, st.error);
      });
    } else if (st.status === "error") {
      renderLiveError(view, "PROCESSING FAILED", st.error || "Unknown error");
    } else {
      renderLiveProcessing(view, docId, st.status, st.stage, st.progress, st.error);
      if (triesLeft < 20) setTimeout(() => pollLiveStatus(view, docId, triesLeft + 1), 1500);
    }
  }).catch(() => {
    renderLiveError(view, "STATUS FAILED", "Backend unreachable");
  });
}

function renderLiveProcessing(view, docId, status, stage, progress, error) {
  const ana = $("#doc-analysis", view);
  if (!ana) return;
  const pct = progress || 0;
  ana.innerHTML = `
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.cpu}</span>Processing</div>
      <div class="conf-row"><span class="font-11 text-2">${esc(stage || status)}</span>
        <div class="conf-bar"><i style="width:${pct}%"></i></div><span class="mono font-11">${pct}%</span></div>
      <div style="margin-top:6px" class="font-11 text-3">Extracting text · OCR · entities · findings on-premise.</div>
    </div>`;
  const ex = $("#doc-extract", view);
  if (ex) ex.innerHTML = `<div class="empty-state" style="padding:26px"><div class="es-title">Analyzing…</div><div class="es-sub">This can take a moment for large or scanned files.</div></div>`;
  const prev = $("#doc-preview", view);
  if (prev) prev.innerHTML = `<div class="empty-state" style="padding:40px"><div class="es-ico">${Icons.cpu}</div><div class="es-title">Processing document…</div><div class="es-sub">OCR + chunking + indexing (local)</div></div>`;
  $("#doc-prev-pages", view).textContent = `${$("#doc-prev-name", view).textContent} · processing`;
}

function renderLiveError(view, title, msg) {
  const ana = $("#doc-analysis", view);
  if (ana) ana.innerHTML = `<div class="result-section"><div class="result-h">${esc(title)}</div><div class="result-item danger"><span class="ri-bullet">!</span>${esc(msg)}</div></div>`;
  const ex = $("#doc-extract", view);
  if (ex) ex.innerHTML = `<div class="empty-state" style="padding:26px"><div class="es-title">${esc(title)}</div><div class="es-sub">${esc(msg)}</div></div>`;
  const prev = $("#doc-preview", view);
  if (prev) prev.innerHTML = `<div class="empty-state" style="padding:40px"><div class="es-title">${esc(title)}</div><div class="es-sub">${esc(msg)}</div></div>`;
}

/* ---------- LIVE: render real analysis JSON ---------- */
function renderLiveAnalysis(view, res) {
  const ana = $("#doc-analysis", view);
  if (!ana) return;
  const an = res.analysis || {};
  const meta = res.metadata || {};
  const entities = an.entities || [];
  const measurements = an.measurements || [];
  const findings = an.findings || [];
  const recommendations = an.recommendations || [];
  const sources = res.sources || [];
  const ocrIssues = res.ocr_issues || [];
  const conf = res.ocr_confidence != null ? (res.ocr_confidence * 100).toFixed(1) + "%" : "Unavailable";
  const modelBadge = res.model ? `<span class="tag accent">${esc(res.model)} · local</span>` : (res.local_model_unavailable ? `<span class="tag warn">model unavailable</span>` : `<span class="tag ok">on-premise rules</span>`);

  const findingsHTML = findings.length ? findings.map((f) => {
    const t = f.text || f || "";
    const cls = /exceed|fail|corros|leak|risk|severe|damage/i.test(t) ? "danger" : (/warn|due|review|schedule|repair/i.test(t) ? "warn" : "ok");
    const ic = cls === "ok" ? "✓" : "!";
    return `<div class="result-item ${cls}"><span class="ri-bullet">${ic}</span>${esc(t)}${f.page ? ` <span class="tag info">p${f.page}</span>` : ""}</div>`;
  }).join("") : `<div class="empty-state" style="padding:14px"><div class="es-sub">No findings extracted.</div></div>`;

  ana.innerHTML = `
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.eye}</span>OCR Confidence</div>
      <div class="conf-row"><span class="font-11 text-2">Overall</span><div class="conf-bar"><i style="width:${res.ocr_confidence != null ? Math.round(res.ocr_confidence * 100) : 0}%"></i></div><span class="mono font-11">${conf}</span></div>
      <div class="conf-row"><span class="font-11 text-2">Text pages</span><span class="mono font-11">${res.text_pages || 0}</span></div>
      ${ocrIssues.length ? `<div class="result-item danger" style="margin-top:4px"><span class="ri-bullet">!</span>OCR ${ocrIssues.map((i) => "p" + i.page).join(", ")}: ${esc(ocrIssues[0].error)}</div>` : ""}
    </div>
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.folder}</span>Detected Structure</div>
      <div class="result-list">
        <div class="result-item ok"><span class="ri-bullet">•</span>${res.document_type || "text"} document · ${res.page_count || 0} pages</div>
        <div class="result-item"><span class="ri-bullet">•</span>${res.tables || 0} tables · ${res.diagrams || 0} diagrams</div>
        <div class="result-item"><span class="ri-bullet">•</span>${entities.length} entities · ${measurements.length} measurements</div>
      </div>
    </div>
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.shield}</span>Findings (${findings.length})</div>
      <div class="result-list">${findingsHTML}</div>
    </div>
    ${recommendations.length ? `<div class="result-section"><div class="result-h">Recommendations</div><div class="result-list">${recommendations.map((r) => `<div class="result-item ok"><span class="ri-bullet">•</span>${esc(r)}</div>`).join("")}</div></div>` : ""}
    ${modelBadge ? `<div class="result-section"><div class="result-h"><span class="ico">${Icons.lock}</span>Inference</div>${modelBadge}<div style="margin-top:8px" class="font-11 text-3">Named-entity / measurement extraction ran ${res.model ? "via local model" : "on-premise (no data left the node)"}.</div></div>` : ""}
  `;

  renderLiveExtract(view, res, entities, measurements, meta, an);
}

function renderLiveExtract(view, res, entities, measurements, meta, an) {
  const ex = $("#doc-extract", view);
  if (!ex) return;
  const ent = entities.slice(0, 12).map((e) => {
    const txt = (e.text || e || "").trim();
    return `<div class="info-row"><span>${esc(e.type || "Entity")}</span><b class="mono">${esc(txt)}${e.page ? `<span class="tag info" style="margin-left:6px">p${e.page}</span>` : ""}</b></div>`;
  }).join("");
  const meas = measurements.slice(0, 12).map((m) => {
    const txt = (m.text || (m.value != null ? m.value + (m.unit ? " " + m.unit : "") : m) || "").trim();
    return `<div class="info-row"><span>${esc(m.metric || m.type || "Measurement")}</span><b class="mono">${esc(txt)}${m.page ? `<span class="tag info" style="margin-left:6px">p${m.page}</span>` : ""}</b></div>`;
  }).join("");
  const mKeys = Object.keys(meta || {});
  const metaHTML = mKeys.length ? mKeys.map((k) => `<div class="info-row"><span>${esc(k)}</span><b class="mono">${esc(String(meta[k]))}</b></div>`).join("") : "";
  ex.innerHTML = `
    <div class="result-section">
      <div class="result-h">Entities (${entities.length})</div>
      ${ent || `<div class="font-11 text-3">None extracted.</div>`}
    </div>
    <div class="divider"></div>
    <div class="result-section">
      <div class="result-h">Measurements (${measurements.length})</div>
      ${meas || `<div class="font-11 text-3">None extracted.</div>`}
    </div>
    <div class="divider"></div>
    ${metaHTML ? `<div class="result-section"><div class="result-h">Metadata</div>${metaHTML}</div><div class="divider"></div>` : ""}
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.lock}</span>Data handling</div>
      <span class="tag ok"><span class="dot"></span>ON-PREMISE ONLY</span>
      <div style="margin-top:8px" class="font-11 text-3">No data left the node during analysis.</div>
    </div>
  `;
}

function renderDocPreview(wrap, doc) {
  window._docZoom = window._docZoom || 1;
  wrap.innerHTML = `
    <div class="doc-page" style="transform:scale(${window._docZoom});transform-origin:top center">
      ${doc.id === "P&ID-UNIT-03" ? pidPage() : textPage(doc.id)}
    </div>
  `;
  if (doc.id === "P&ID-UNIT-03") {
    // region markers
    const page = wrap.querySelector(".doc-page");
    const regions = [
      { l: 12, t: 14, w: 34, h: 30, label: "V-01 Vessel" },
      { l: 52, t: 30, w: 30, h: 24, label: "P-104 Pump" },
      { l: 26, t: 62, w: 28, h: 20, label: "TIC-301" },
      { l: 60, t: 66, w: 30, h: 18, label: "PSV-7" },
    ];
    regions.forEach((rg) => {
      const m = el(`<div class="region-marker" style="left:${rg.l}%;top:${rg.t}%;width:${rg.w}%;height:${rg.h}%" data-region="${rg.label}" tabindex="0"><span class="rm-label">${rg.label}</span></div>`);
      page.appendChild(m);
      m.addEventListener("click", () => regionQA(rg.label));
      m.addEventListener("keydown", (e) => { if (e.key === "Enter") regionQA(rg.label); });
    });
  }
}

function zoomDoc(factor) {
  window._docZoom = Math.min(1.5, Math.max(0.7, (window._docZoom || 1) * factor));
  const page = $(".doc-page", $("#doc-preview"));
  if (page) page.style.transform = `scale(${window._docZoom})`;
}

function textPage(id) {
  return `
    <div style="padding:26px 30px;font-family:var(--font-mono);font-size:10px;color:#1a1a1a">
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid #aaa;padding-bottom:8px">
        <b>NEXUS PLANT OPERATIONS</b><span>INSPECTION REPORT</span>
      </div>
      <div style="margin-top:10px">
        <div style="font-weight:700;color:#0d47a1">INSPECTION-2026-081</div>
        <div style="margin-top:6px;font-size:9px">Equipment: Heat Exchanger HE-204</div>
        <div style="font-size:9px">Location: Unit 03 · Area 2B</div>
        <div style="font-size:9px">Inspection date: 12 August 2026</div>
      </div>
      <div style="border:1px solid #666;border-radius:4px;padding:8px;margin-top:14px;font-size:9px;line-height:1.7">
        <div>1. SERVICE: Cooling water / process oil</div>
        <div>2. DESIGN: 8.2 bar @ 150°C</div>
        <div>3. SHELL WALL: min 11.4 mm measured 14.6 mm</div>
        <div style="color:#b00020;font-weight:700">4. CORROSION: depth 3.2 mm EXCEEDS limit</div>
        <div>5. RECOMMENDATION: schedule repair within 30 days</div>
      </div>
      <div style="border:1px solid #999;margin-top:16px;border-radius:4px;font-size:9px;line-height:1.8;padding:10px">
        <div style="font-weight:700">12 Aug 2026 · ENGINEERING INSPECTION</div>
        <div>Inspector: J. Madaan (NDE Level II)</div>
        <div>Signature: <span style="font-style:italic;font-size:11px">J.Madaan</span></div>
        <div style="margin-top:6px">UT Thickness Report attached (Table B-1)</div>
      </div>
    </div>`;
}

function pidPage() {
  // schematic-like P&ID rendering
  return `
    <div style="padding:16px;font-family:var(--font-mono)">
      <div style="text-align:center;font-weight:700;color:#0d47a1;letter-spacing:0.08em;font-size:10px;border-bottom:1px solid #333;padding-bottom:4px">P&ID — UNIT 03 · REV C</div>
      <svg viewBox="0 0 340 420" width="100%" height="100%" style="display:block;background:#fdfdf8">
        <style>.pid-t{font-size:7px;fill:#222;font-family:var(--font-mono)} .pid-v{fill:none;stroke:#1a4f8b;stroke-width:1.6}</style>
        <line x1="20" y1="60" x2="160" y2="60" class="pid-v"/>
        <line x1="160" y1="60" x2="160" y2="140" class="pid-v"/>
        <line x1="160" y1="140" x2="300" y2="140" class="pid-v"/>
        <line x1="300" y1="140" x2="300" y2="60" class="pid-v"/>
        <rect x="120" y="45" width="80" height="30" fill="#e3edf7" stroke="#1a4f8b" stroke-width="1.5" rx="3"/>
        <text x="160" y="63" text-anchor="middle" class="pid-t" font-weight="700">V-01</text>
        <text x="160" y="72" text-anchor="middle" class="pid-t">PRESSURE VESSEL</text>
        <circle cx="300" cy="140" r="12" class="pid-v"/>
        <circle cx="300" cy="140" r="5" fill="#fff"/>
        <text x="300" y="168" text-anchor="middle" class="pid-t" font-weight="700">P-104</text>
        <circle cx="70" cy="60" r="9" class="pid-v"/>
        <circle cx="70" cy="60" r="3.5" fill="#c0392b"/>
        <text x="70" y="44" text-anchor="middle" class="pid-t" font-weight="700">HV-1</text>
        <rect x="90" y="200" width="90" height="34" fill="none" stroke="#1a4f8b" stroke-width="1.5"/>
        <text x="135" y="221" text-anchor="middle" class="pid-t" font-weight="700">E-204</text>
        <text x="135" y="228.5" text-anchor="middle" class="pid-t">SHELL&amp;TUBE HE</text>
        <line x1="20" y1="217" x2="90" y2="217" class="pid-v"/>
        <line x1="180" y1="217" x2="300" y2="217" class="pid-v"/>
        <path d="M300 217 q15 0 15 12 q0 12 -15 12" class="pid-v"/>
        <path d="M300 241 q15 0 15 -12" class="pid-v"/>
        <text x="316" y="230" text-anchor="middle" class="pid-t" font-weight="700" fill="#b00020">PSV-7</text>
        <rect x="40" y="300" width="70" height="28" class="pid-v"/>
        <text x="75" y="317" text-anchor="middle" class="pid-t" font-weight="700">TIC-301</text>
        <text x="75" y="324.5" text-anchor="middle" class="pid-t" fill="#0d47a1">121°C</text>
        <line x1="75" y1="234" x2="75" y2="240" class="pid-v"/>
        <line x1="75" y1="268" x2="75" y2="300" class="pid-v" stroke-dasharray="3,2"/>
        <line x1="75" y1="240" x2="75" y2="268" class="pid-v"/>
        <text x="160" y="380" text-anchor="middle" class="pid-t" fill="#666">REV C · 02 SEP 2026</text>
      </svg>
    </div>`;
}

function pidAnalysisHTML() {
  return `
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.eye}</span>Component Detection</div>
      <div class="result-list">
        <div class="result-item ok"><span class="ri-bullet">•</span>41 components identified</div>
        <div class="result-item ok"><span class="ri-bullet">•</span>18 valves · 12 instruments · 6 vessels</div>
        <div class="result-item warn"><span class="ri-bullet">!</span>2 pressure rating discrepancies found</div>
      </div>
    </div>
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.share}</span>Region Markers</div>
      <div class="result-list">
        <div class="result-item"><span class="ri-bullet">•</span>Click highlighted regions on the drawing</div>
        <div class="result-item"><span class="ri-bullet">•</span>Ask "Explain this section"</div>
      </div>
    </div>
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.lock}</span>Vision model</div>
      <span class="tag accent">Qwen2-VL-8B · local</span>
    </div>`;
}

function pidExtractHTML() {
  return `
    <div class="result-section">
      <div class="result-h">Components</div>
      <div class="info-row"><span>V-01</span><b class="mono">Pressure vessel</b></div>
      <div class="info-row"><span>P-104</span><b class="mono">Centrifugal pump</b></div>
      <div class="info-row"><span>E-204</span><b class="mono">Heat exchanger</b></div>
      <div class="info-row"><span>PSV-7</span><b class="mono">Relief valve</b></div>
    </div>
    <div class="divider"></div>
    <div class="result-section">
      <div class="result-h">Measurements</div>
      <div class="info-row"><span>Temp set point</span><b class="mono">121°C</b></div>
      <div class="info-row"><span>Nominal pipe</span><b class="mono">NPS 8</b></div>
      <div class="info-row"><span>Rev</span><b class="mono">C · 02 Sep 2026</b></div>
    </div>`;
}

function regionQA(label) {
  openModal("Explain this section", `
    <div class="result-section">
      <div class="result-h"><span class="ico">${Icons.eye}</span>Region: ${esc(label)}</div>
      <div class="conf-row"><span class="font-11 text-2">Vision confidence</span><div class="conf-bar"><i style="width:96%"></i></div><span class="mono font-11">96%</span></div>
    </div>
    <div class="panel" style="background:var(--bg-2);padding:14px;border-radius:8px;font-size:13px;color:var(--text-1);line-height:1.6">
      <b style="color:var(--text-0)">${esc(label)}</b> is a <b>pressure-relief-protected section</b> of Unit 03. The protection device (${esc(label.split(" ")[0])}) setting aligns with the design pressure specified in SOP-ENG-042 §4.2. Based on the local engineering standard RETRIEVED from the knowledge base, this configuration is compliant.
    </div>
    <div class="cite"><span class="c-src">SOP-ENG-042</span><span class="c-detail">Section 4.2 · Page 17</span><span class="c-tag"><span class="tag accent">CITATED</span></span></div>
  `, { wide: true });
  toast("Vision Q&A", "Local model · answer + citation", "info");
}

function uploadDocModal(view) {
  const live = NexusMode.value === "live";
  const ov = openModal("Upload confidential document", `
    <div class="empty-state" style="border:1px dashed var(--border-1);border-radius:10px;padding:34px">
      <div class="es-ico">${Icons.uploadCloud}</div>
      <div class="es-title">Drop files here or browse</div>
      <div class="es-sub">${live ? "PDF · Scanned PDF · PNG · JPG · CSV · XLSX · DOCX — stored on-premise only" : "PDF · Scanned PDF · PNG · JPG · CSV · XLSX — stored on-premise only"}</div>
      <input type="file" id="upload-file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx" multiple style="display:none"/>
      <button class="btn btn-primary" id="upload-browse" style="margin-top:16px">${Icons.upload}<span>Select files</span></button>
    </div>
    <div style="margin-top:16px">
      <div class="info-row"><span>Storage</span><b class="text-accent">LOCAL / on-premise</b></div>
      <div class="info-row"><span>Indexing model</span><b class="mono">bge-m3</b></div>
      <div class="info-row"><span>Max file size</span><b>200 MB</b></div>
      <div class="info-row"><span>Allowed types</span><b>pdf, png, jpg, csv, xlsx, docx</b></div>
    </div>
    <div id="upload-progress" style="margin-top:10px"></div>`);
  $("#upload-browse", ov).addEventListener("click", () => {
    const input = $("#upload-file", ov);
    input.click();
  });
  $("#upload-file", ov).addEventListener("change", () => {
    const input = $("#upload-file", ov);
    if (!input.files || !input.files.length) return;
    if (live) liveUpload(input.files, ov, view);
    else {
      closeModal();
      toast("Document queued", "Indexing started · OCR + embedding (demo)", "ok");
      simulateUpload();
    }
  });
}

function liveUpload(files, ov, view) {
  const prog = $("#upload-progress", ov);
  const setMsg = (t, s) => { if (prog) prog.innerHTML = `<div class="info-row"><span>${esc(t)}</span><b class="mono">${esc(s)}</b></div>`; };
  const results = [];
  Array.from(files).forEach((file) => {
    const fd = new FormData();
    fd.append("file", file);
    setMsg(`Uploading ${file.name}`, "to on-premise store");
    fetch("/api/documents/upload", { method: "POST", headers: { Authorization: NexusMode.token ? "Bearer " + NexusMode.token : "" }, body: fd })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        results.push(res.document_id || res.doc_id);
        setMsg(`Processing ${file.name}`, "auto-started · OCR + chunking + indexing (local)");
      })
      .catch((e) => { setMsg(file.name, "failed"); });
  });
  setTimeout(() => {
    closeModal();
    const n = results.length;
    toast("Upload accepted", `${n} file(s) processing locally`, "ok");
    if (view && $("#doc-list", view)) liveRefreshDocuments(view);
  }, 700 + files.length * 600);
}

function simulateUpload() {
  // show a fake progress in a follow-up toast
  const steps = [
    ["Analyzing file", "type validation ✓"],
    ["Running OCR", "PaddleOCR (local)"],
    ["Chunking", "text splitter"],
    ["Embedding", "bge-m3 · on-premise"],
  ];
  steps.forEach((s, i) => setTimeout(() => toast(s[0], s[1], "ok", 1300), i * 900));
}
