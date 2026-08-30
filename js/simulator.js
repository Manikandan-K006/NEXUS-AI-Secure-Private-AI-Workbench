/* ============================================================
   SOVEREIGN AI — Agent execution simulator
   Drives the timeline, terminal log, KPIs and demo workflow.
   ============================================================ */

const SIH_SCRIPTS = {
  inspection: {
    title: "Analyze Inspection Report",
    prompt:
      "Analyze this inspection report and prepare an approval note.",
    files: ["inspection_report.pdf"],
    tools: ["Document", "OCR", "Knowledge Base", "Document Generator"],
    mode: "Agentic",
    classifier: ["Document Analysis", "Multimodal", "Knowledge Retrieval", "Document Generation"],
    routing: [
      { role: "Vision Model", model: "Qwen2-VL-8B", task: "OCR + image understanding" },
      { role: "Reasoning Model", model: "Qwen2.5-32B-Instruct", task: "Analysis of findings" },
      { role: "Document Model", model: "DOCX Generator", task: "Final deliverable" },
    ],
    steps: [
      { id: "start", title: "Task Started", tool: "Orchestrator", model: "Core" },
      { id: "detect", title: "Analyzing uploaded PDF", tool: "File Processor", model: "Core", det: { pages: 14, conf: "Scanned PDF detected", key: "PDF rasterized for OCR" } },
      { id: "ocr", title: "OCR processing", tool: "PaddleOCR", model: "Vision-8B", det: { pages: 12, conf: "98.2% OCR confidence", note: "Reading inspection findings" } },
      { id: "extract", title: "Extracting inspection findings", tool: "NER + Rules", model: "Vision-8B", det: { entities: 27, tables: 3 } },
      { id: "search", title: "Searching local knowledge base", tool: "RAG", model: "bge-m3", det: { index: "local_kb", chunks: 2431 } },
      { id: "retrieve", title: "Retrieving SOP-ENG-042", tool: "RAG", model: "bge-m3", det: { top: 4, score: "0.92", section: "Section 4.2 · Page 17" } },
      { id: "reason", title: "Reasoning", tool: "Reasoning Engine", model: "Reasoning-32B", det: { time: "9.2s", output: "Critical observation identified" } },
      { id: "draft", title: "Drafting approval note", tool: "DOCX Template", model: "Reasoning-32B", det: { paras: 6, cites: 3 } },
      { id: "generate", title: "Generating DOCX", tool: "python-docx", model: "Generator", det: { output: "Approval_Note_042.docx", size: "86 KB" } },
      { id: "validate", title: "Validation", tool: "DOCX Validator", model: "Validation", det: { checks: "Structure ✓ · Citations ✓ · Compliance ✓" } },
      { id: "done", title: "Task Completed", tool: "Orchestrator", model: "Core", final: true },
    ],
    result: {
      type: "Approval Note",
      heading: "APPROVAL NOTE GENERATED",
      docs: [
        { k: "Inspection date", v: "12 Aug 2026" },
        { k: "Equipment", v: "Heat Exchanger HE-204" },
        { k: "Findings", v: "3 critical · 5 moderate" },
        { k: "Recommended", v: "Shutdown for repair (30 days)" },
        { k: "SOP reference", v: "SOP-ENG-042 §4.2" },
      ],
    },
    logs: [
      "TASK RECEIVED",
      "FILE DETECTED: inspection_report.pdf",
      "ROUTER → vision-model",
      "OCR COMPLETE",
      "RAG SEARCH → local_kb",
      "4 DOCUMENTS RETRIEVED",
      "ROUTER → reasoning-model",
      "GENERATING APPROVAL NOTE",
      "DOCX GENERATED",
      "VALIDATION COMPLETE",
    ],
  },

  code: {
    title: "AI Coding Task",
    prompt:
      "Create a Python utility to calculate inspection risk scores from the provided CSV.",
    files: ["inspection_scores.csv"],
    tools: ["Code Generation", "Sandbox", "Python", "Test Runner"],
    mode: "Coding",
    classifier: ["Code Generation", "Data Analysis", "Sandbox Execution"],
    routing: [
      { role: "Coding Model", model: "DeepSeek-Coder-6.7B", task: "Plan + generate Python" },
      { role: "Sandbox", model: "isolated-runtime-01", task: "Execute + verify" },
      { role: "Test Runner", model: "pytest", task: "Validate correctness" },
    ],
    steps: [
      { id: "start", title: "Task Started", tool: "Orchestrator", model: "Core" },
      { id: "plan", title: "Planning", tool: "Planner", model: "Code-6.7B", det: { steps: "Parse CSV → compute risk → tests" } },
      { id: "gen", title: "Generate code", tool: "Generator", model: "Code-6.7B", det: { file: "risk_calculator.py", lines: 84 } },
      { id: "run", title: "Run in sandbox", tool: "Docker Sandbox", model: "isolated-runtime-01", det: { net: "DISABLED", fs: "RESTRICTED" } },
      { id: "test", title: "Run tests", tool: "pytest", model: "Test Runner", det: { passed: 6, failed: 1 } },
      { id: "detect", title: "Detect errors", tool: "Diagnostics", model: "Code-6.7B", det: { error: "TypeError in line 42", fix: "Cast score to float" } },
      { id: "fix", title: "Fix error", tool: "Fixer", model: "Code-6.7B", det: { patch: "+1 line, -1 line" } },
      { id: "retest", title: "Run tests again", tool: "pytest", model: "Test Runner", det: { passed: 8, failed: 0 } },
      { id: "final", title: "Generate final code", tool: "Generator", model: "Code-6.7B", det: { output: "Inspection_Risk_Scores.py", size: "4 KB" } },
      { id: "validate", title: "Validation", tool: "Validator", model: "Validation", det: { checks: "Lint ✓ · Tests ✓ · Sandbox ✓" } },
      { id: "done", title: "Task Completed", tool: "Orchestrator", model: "Core", final: true },
    ],
    result: {
      type: "Python Utility",
      heading: "RISK CALCULATOR GENERATED",
      docs: [
        { k: "Language", v: "Python 3.12" },
        { k: "Input", v: "inspection_scores.csv (142 rows)" },
        { k: "Tests", v: "8 passed · 0 failed" },
        { k: "Sandbox", v: "Network DISABLED · File system RESTRICTED" },
        { k: "Output", v: "Inspection_Risk_Scores.py" },
      ],
    },
    logs: [
      "TASK RECEIVED",
      "ROUTER → coding-model",
      "PLANNING COMPLETE",
      "CODE GENERATED: risk_calculator.py",
      "SANDBOX: network disabled",
      "SANDBOX: filesystem restricted",
      "TEST RUN 1 → 1 failure",
      "ERROR DETECTED: line 42",
      "PATCH APPLIED",
      "TEST RUN 2 → 8 passed",
      "FINAL CODE GENERATED",
    ],
  },

  drawing: {
    title: "Engineering Drawing Analysis",
    prompt:
      "Analyze this P&ID engineering drawing and explain the key components.",
    files: ["P&ID_Unit03_RevC.pdf"],
    tools: ["Vision", "OCR", "Component Detection", "Knowledge Base"],
    mode: "Multimodal",
    classifier: ["Image Understanding", "OCR", "Component Identification", "Question Answering"],
    routing: [
      { role: "Vision Model", model: "Qwen2-VL-8B", task: "Draw + component detection" },
      { role: "OCR", model: "PaddleOCR", task: "Labels + measurements" },
      { role: "Knowledge Base", model: "bge-m3", task: "Context for P&ID-UNIT-03" },
    ],
    steps: [
      { id: "start", title: "Task Started", tool: "Orchestrator", model: "Core" },
      { id: "detect", title: "Analyzing engineering drawing", tool: "Vision", model: "Vision-8B", det: { pages: 42, sheet: "Rev C" } },
      { id: "ocr", title: "OCR labels & tags", tool: "PaddleOCR", model: "Vision-8B", det: { labels: 63, conf: "96.4%" } },
      { id: "comp", title: "Component identification", tool: "Object Detection", model: "Vision-8B", det: { components: 41, valves: 18, instruments: 12 } },
      { id: "measure", title: "Extracting measurements", tool: "Dimension Extractor", model: "Vision-8B", det: { dims: 22, units: "mm / bar" } },
      { id: "search", title: "Searching local knowledge base", tool: "RAG", model: "bge-m3", det: { index: "local_kb", tags: "P&ID-UNIT-03" } },
      { id: "retrieve", title: "Retrieving P&ID standard", tool: "RAG", model: "bge-m3", det: { top: 3, score: "0.89" } },
      { id: "reason", title: "Region analysis", tool: "Vision Q&A", model: "Vision-8B", det: { regions: 4, note: "Region selectable in preview" } },
      { id: "gen", title: "Generating analysis", tool: "Generator", model: "Reasoning-32B", det: { output: "P&ID_Unit03_Analysis.pdf" } },
      { id: "validate", title: "Validation", tool: "Validator", model: "Validation", det: { checks: "Bounding boxes ✓ · Citations ✓" } },
      { id: "done", title: "Task Completed", tool: "Orchestrator", model: "Core", final: true },
    ],
    result: {
      type: "Drawing Analysis",
      heading: "DRAWING ANALYSIS COMPLETE",
      docs: [
        { k: "Sheet", v: "P&ID-UNIT-03 Rev C · 42 pages" },
        { k: "Components", v: "41 detected (18 valves · 12 instruments)" },
        { k: "Labels", v: "63 OCR · 96.4% confidence" },
        { k: "Measurements", v: "22 dimensions extracted" },
        { k: "Warnings", v: "2 pressure rating discrepancies" },
      ],
    },
    logs: [
      "TASK RECEIVED",
      "ROUTER → vision-model",
      "DRAWING DETECTED: P&ID-UNIT-03",
      "OCR 63 LABELS",
      "41 COMPONENTS IDENTIFIED",
      "22 MEASUREMENTS EXTRACTED",
      "RAG SEARCH → P&ID standard",
      "REGION ANALYSIS COMPLETE",
      "ANALYSIS GENERATED",
      "VALIDATION COMPLETE",
    ],
  },
};

class AgentSimulator {
  constructor() {
    this.timer = null;
    this.cb = null; // step callback: {step, done, total}
    this.onLog = null;
    this.onComplete = null;
    this.running = false;
    this.interval = null;
  }

  start(scriptKey, { stepCb, onLog, onComplete }) {
    const script = SIH_SCRIPTS[scriptKey];
    if (!script) return;
    this.stop();
    this.cb = stepCb;
    this.onLog = onLog;
    this.onComplete = onComplete;
    this.running = true;

    let idx = 0;
    const total = script.steps.length;
    const emit = () => {
      if (idx >= total) {
        this.running = false;
        clearInterval(this.interval);
        if (this.onComplete) this.onComplete(script);
        return;
      }
      const step = script.steps[idx];
      this.cb && this.cb({ step, done: idx + 1, total });
      idx++;
    };
    emit();
    this.interval = setInterval(emit, scriptKey === "inspection" ? 900 : 820);
    return script;
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.running = false;
  }
}

/* Registry of finished task records */
const TaskHistory = [];
function addCompletedTask(scriptKey, script) {
  TaskHistory.unshift({
    scriptKey,
    title: script.title,
    prompt: script.prompt,
    files: script.files,
    completedAt: nowTs(),
    result: script.result,
    logs: script.logs,
    steps: script.steps,
  });
}
