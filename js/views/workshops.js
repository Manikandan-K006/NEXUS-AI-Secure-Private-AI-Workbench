/* ============================================================
   SOVEREIGN AI — Views: Code Lab, Data Lab
   ============================================================ */

/* ---------- Code Lab ---------- */
function viewCodeLab(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Code Lab</span></div>
    <div class="page-header" style="margin-bottom:14px">
      <div><div class="page-title">Code Lab</div><div class="page-sub">IDE with an AI coding assistant. All execution happens in an isolated sandbox.</div></div>
      <span class="sandbox-badge"><span class="dot"></span>SANDBOXED EXECUTION</span>
    </div>

    <div class="panel" style="padding:12px 18px;margin-bottom:16px;display:flex;gap:24px;flex-wrap:wrap;align-items:center">
      <div><span class="font-10 uppercase text-3">Container</span><div class="mono font-12 text-0" style="margin-top:3px">isolated-runtime-01</div></div>
      <div><span class="font-10 uppercase text-3">Network</span><div class="mono font-12" style="color:var(--danger);font-weight:700">DISABLED</div></div>
      <div><span class="font-10 uppercase text-3">Filesystem</span><div class="mono font-12" style="color:var(--warn);font-weight:700">RESTRICTED</div></div>
      <div><span class="font-10 uppercase text-3">Runtime</span><div class="mono font-12 text-0">python:3.12-slim</div></div>
      <div style="margin-left:auto"><button class="btn btn-primary btn-sm" id="code-ask-agent">${Icons.bolt}<span>Ask Code Agent</span></button></div>
    </div>

    <div class="codelab">
      <div class="file-tree">
        <div class="filetree-head">EXPLORER</div>
        <div class="filetree-body" id="code-tree">
          ${fileTree()}
        </div>
      </div>
      <div class="code-pane">
        <div class="code-tabs">
          <div class="code-tab on" data-file="risk_calculator.py"><span class="ct-ico">${Icons.file}</span>risk_calculator.py</div>
          <div class="code-tab" data-file="test_risk.py"><span class="ct-ico">${Icons.file}</span>test_risk.py</div>
          <div class="code-tab" data-file="data.csv"><span class="ct-ico">${Icons.grid}</span>inspection_scores.csv</div>
        </div>
        <div class="ide-toolbar">
          <button class="btn btn-sm btn-primary" id="code-run">${Icons.play}<span>Run</span></button>
          <button class="btn btn-sm" id="code-test">${Icons.check}<span>Test</span></button>
          <button class="btn btn-sm btn-ghost" id="code-format">${Icons.refresh}<span>Format</span></button>
          <div class="ide-status-right">
            <span class="tag ok"><span class="dot"></span>PY 3.12</span>
            <span class="tag" id="code-lint">LINT OK</span>
          </div>
        </div>
        <div class="code-editor" id="code-editor"></div>
        <div class="ide-console" id="code-console">
          <div class="cl"><span class="ck">$</span><span class="cor">sandbox: ready · network disabled · filesystem restricted</span></div>
        </div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  renderCodeFile("risk_calculator.py");
  $("#code-run", view).addEventListener("click", runCode);
  $("#code-test", view).addEventListener("click", testCode);
  $("#code-ask-agent", view).addEventListener("click", codeAgentHelp);
  $$(".code-tab", view).forEach((t) =>
    t.addEventListener("click", () => {
      $$(".code-tab", view).forEach((x) => x.classList.toggle("on", x === t));
      renderCodeFile(t.dataset.file);
    })
  );
}

const CODE_FILES = {
  "risk_calculator.py": `import csv
from dataclasses import dataclass

@dataclass
class InspectionItem:
    equipment: str
    corrosion_mm: float
    wall_min_mm: float
    last_inspection: str
    risk_level: str = "LOW"

def load_scores(path: str) -> list[InspectionItem]:
    items = []
    with open(path, newline="") as f:          # <-- line 12
        for row in csv.DictReader(f):
            corr = float(row["corrosion_mm"])
            wall = float(row["wall_min_mm"])
            item = InspectionItem(
                equipment=row["equipment"],
                corrosion_mm=corr,
                wall_min_mm=wall,
                last_inspection=row["inspection_date"],
            )
            item.risk_level = classify(corr, wall)
            items.append(item)
    return items

def classify(corr: float, wall: float) -> str:
    ratio = corr / wall if wall > 0 else 0        # <-- line 42
    if ratio > 0.50:
        return "CRITICAL"
    if ratio > 0.30:
        return "HIGH"
    if ratio > 0.15:
        return "MODERATE"
    return "LOW"

def main(path: str) -> dict:
    items = load_scores(path)
    counts = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
    for it in items:
        counts[it["risk_level"]] = counts[it["risk_level"]] + 1
    return counts

if __name__ == "__main__":
    print(main("inspection_scores.csv"))`,
  "test_risk.py": `import pytest
from risk_calculator import classify, load_scores

def test_critical_boundary():
    assert classify(0.60, 1.0) == "CRITICAL"

def test_high_boundary():
    assert classify(0.40, 1.0) == "HIGH"

def test_moderate_boundary():
    assert classify(0.20, 1.0) == "MODERATE"

def test_low_boundary():
    assert classify(0.10, 1.0) == "LOW"

def test_zero_wall_no_crash():
    assert classify(0.5, 0) == "LOW"

def test_load_dataset():
    items = load_scores("inspection_scores.csv")
    assert len(items) == 142`,
  "inspection_scores.csv": `equipment,corrosion_mm,wall_min_mm,inspection_date
HE-204,3.20,14.60,2026-08-12
P-104,1.10,9.80,2026-07-30
V-01,4.40,8.20,2026-08-01
TANK-12,0.60,12.00,2026-07-15
PUMP-06,2.20,7.50,2026-06-22
... (142 rows)`,
};

function fileTree() {
  return `
    <div class="ft-item dir" data-dir="workspace">${Icons.folder} workspace</div>
    <div class="ft-item active" data-file="risk_calculator.py">${Icons.file} risk_calculator.py</div>
    <div class="ft-item" data-file="test_risk.py">${Icons.file} test_risk.py</div>
    <div class="ft-item" data-file="data.csv">${Icons.grid} inspection_scores.csv</div>
    <div style="margin:10px 0" class="ft-item dir" data-dir="sandbox">${Icons.terminal} isolated-runtime-01</div>
    <div class="ft-item" data-dir="out">${Icons.folder} output/</div>
    <div class="ft-item" data-dir="out">${Icons.file} risk_summary.json</div>
  `;
}

let codeLine = 0;
function renderCodeFile(name) {
  const src = CODE_FILES[name] || "";
  codeLine = 0;
  const editor = $("#code-editor");
  editor.innerHTML = src
    .split("\n")
    .map((line) => highlightLine(line))
    .join("");
}

function highlightLine(line) {
  codeLine++;
  const parts = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div class="code-line"><span class="ln">${codeLine}</span>${highlightCode(parts)}</div>`;
}
function highlightCode(line) {
  return line
    .replace(/(\/\/.*$)/, '<span class="code-tok-cmt">$1</span>')
    .replace(/^(\s*)(#[\s\S]*)$/, '$1<span class="code-tok-cmt">$2</span>')
    .replace(/\b(def|class|import|from|return|if|else|elif|for|in|with|as|pass|assert|lambda|not|and|or)\b/g, '<span class="code-tok-kw">$1</span>')
    .replace(/\b(float|str|int|list|dict|bool)\b/g, '<span class="code-tok-cls">$1</span>')
    .replace(/("[^"]*")|('[^']*')/g, '<span class="code-tok-str">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="code-tok-num">$1</span>')
    .replace(/\b[._a-zA-Z]+(?=\()/g, '<span class="code-tok-fn">$1</span>');
}

function codeLog(msg, cls = "") {
  const c = $("#code-console");
  c.appendChild(el(`<div class="cl ${cls}"><span class="ck">$</span><span class="cor">${esc(msg)}</span></div>`));
  c.scrollTop = c.scrollHeight;
}

function runCode() {
  codeLog("python risk_calculator.py");
  codeLog("> loading inspection_scores.csv (142 rows) …");
  setTimeout(() => codeLog("> {'LOW': 74, 'MODERATE': 41, 'HIGH': 22, 'CRITICAL': 5}", "ok"), 700);
  setTimeout(() => codeLog("Process exited with code 0 · 0.18s · sandbox", "ok"), 1000);
  toast("Executed in sandbox", "Network DISABLED · Filesystem RESTRICTED", "ok");
}

function testCode() {
  codeLog("pytest -q");
  codeLog("> collecting … 6 items");
  setTimeout(() => codeLog("> F. 1 failed · 5 passed", "err"), 700);
  setTimeout(() => {
    codeLog("FAILED test_risk.py::test_critical_boundary", "err");
    codeLog("TypeError: 'str' object is not subscriptable (line 42)", "err");
    codeEditFix();
  }, 1300);
}

function codeEditFix() {
  codeLog("Fix suggested by Code Agent → applying patch (line 42: classify signature)");
  // swap order of args to mimic fix: classify(0.60, 1.0) now interprets corr=0.60
  renderCodeFile("risk_calculator.py");
  setTimeout(() => {
    codeLog("> patch applied … re-running tests");
    testCodePass();
  }, 900);
}
let patched = false;
function testCodePass() {
  codeLog("pytest -q");
  setTimeout(() => codeLog("> 8 passed · 0 failed · 0.21s", "ok"), 700);
  setTimeout(() => codeLog("All tests green. Code ready. Final: Inspection_Risk_Scores.py", "ok"), 1100);
  toast("Tests passed", "8/8 green · sandbox verified", "ok");
  patched = true;
}

function codeAgentHelp() {
  openModal("Code Agent · DeepSeek-Coder-6.7B", `
    <div style="font-size:13px;color:var(--text-1);line-height:1.7">
      I analyzed <b class="mono text-0">risk_calculator.py</b>. The test failure is a <b class="text-danger">TypeError</b> at line 42:
      the <b class="mono">classify()</b> method compares <b class="mono">corr/wall</b> but receives string inputs from the CSV reader. Casting to <b class="mono">float</b> resolves it.
    </div>
    <div class="divider"></div>
    <div class="info-row"><span>Model</span><b class="mono">DeepSeek-Coder-6.7B</b></div>
    <div class="info-row"><span>Execution</span><b class="text-accent">isolated-runtime-01 · network DISABLED</b></div>
    <div class="info-row"><span>Fix status</span><b style="color:var(--ok)">Applied · tests passing</b></div>
    <div style="display:flex;justify-content:flex-end;margin-top:18px;gap:9px">
      <button class="btn" id="code-agent-run">Run tests</button>
      <button class="btn btn-primary" id="code-agent-done">Done</button>
    </div>`);
  $("#code-agent-run").addEventListener("click", () => { closeModal(); testCodePass(); });
  $("#code-agent-done").addEventListener("click", closeModal);
}

/* ---------- Data Lab ---------- */
function viewDataLab(view) {
  view.innerHTML = `
    <div class="breadcrumb"><a href="#" data-nav="dashboard">NEXUS-UNIT-03</a><span class="sep">/</span><span class="cur">Data Lab</span></div>
    <div class="page-header">
      <div><div class="page-title">Data Lab</div><div class="page-sub">AI-assisted spreadsheet analysis, cleaning and Excel generation — all local.</div></div>
      <div style="display:flex;gap:9px">
        <button class="btn" id="data-upload">${Icons.uploadCloud}<span>Upload CSV/XLSX</span></button>
        <button class="btn btn-primary" id="data-generate">${Icons.deliver}<span>Generate XLSX</span></button>
      </div>
    </div>
    <div class="metrics-row" style="grid-template-columns:repeat(5,1fr)">
      ${metric("Rows", "142", "records")}
      ${metric("Columns", "8", "fields")}
      ${metric("Critical", "5", "items")}
      ${metric("High", "22", "items")}
      ${metric("Cleanup", "12", "fixes")}
    </div>
    <div class="split-2">
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.grid}</span>Data Preview<span class="sub">inspection_scores.csv</span></div><span class="tag accent">ON-PREMISE</span></div>
        <div class="panel-body" style="padding:0;overflow-x:auto;">
          <table class="table" style="min-width:640px">
            <thead><tr><th>equipment</th><th>corrosion_mm</th><th>wall_min_mm</th><th>risk</th><th>insp_date</th></tr></thead>
            <tbody>
              ${dataRows()}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.activity}</span>Risk Distribution</div></div>
          <div class="panel-body">${riskChart()}</div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title"><span class="ico">${Icons.bolt}</span>AI Findings</div></div>
          <div class="panel-body">
            <div class="result-list">
              <div class="result-item danger"><span class="ri-bullet">!</span>5 items classified CRITICAL — immediate action</div>
              <div class="result-item warn"><span class="ri-bullet">!</span>22 HIGH — schedule within 30 days</div>
              <div class="result-item ok"><span class="ri-bullet">✓</span>12 malformed rows corrected</div>
              <div class="result-item"><span class="ri-bullet">•</span>Formula generated for risk auto-calculation</div>
            </div>
            <div class="cite"><span class="c-src">SOP-ENG-042</span><span class="c-detail">risk criteria · Section 4</span><span class="c-tag"><span class="tag accent">CITED</span></span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  wireViewsDataNav(view);
  $("#data-upload", view).addEventListener("click", () => toast("CSV loaded", "inspection_scores.csv · 142 rows (demo)", "ok"));
  $("#data-generate", view).addEventListener("click", () => {
    toast("Generating Excel deliverable", "risk_summary_report.xlsx · openpyxl (demo)", "ok");
  });
}

function dataRows() {
  const R = [
    ["HE-204", "3.20", "14.60", "MODERATE", "ok"],
    ["V-01", "4.40", "8.20", "CRITICAL", "danger"],
    ["P-104", "1.10", "9.80", "LOW", ""],
    ["TANK-12", "0.60", "12.00", "LOW", ""],
    ["PUMP-06", "2.20", "7.50", "HIGH", "warn"],
    ["…", "…", "…", "…", ""],
  ];
  return R.map((r) => `<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="tag ${r[4]}">${r[3]}</span></td><td class="text-2 mono">2026-08</td></tr>`).join("");
}

function riskChart() {
  const data = [
    ["LOW", 74, "#34d399"],
    ["MODERATE", 41, "#fbbf24"],
    ["HIGH", 22, "#fb923c"],
    ["CRITICAL", 5, "#f87171"],
  ];
  const max = 74;
  return `
    <div style="display:flex;align-items:flex-end;gap:22px;height:120px;padding:0 4px">
      ${data.map((d) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:100%;height:${(d[1] / max) * 100}px;background:${d[2]};border-radius:4px 4px 0 0;box-shadow:0 0 10px ${d[2]}55;transition:height .6s"></div><div class="mono font-11 text-0">${d[1]}</div><div class="font-10 text-3 uppercase">${d[0]}</div></div>`).join("")}
    </div>`;
}
