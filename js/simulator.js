/* ============================================================
   NEXUS AI 2.0 — Live Agent Execution Bridge
   Replaces the old mock AgentSimulator.
   Sends tasks to the real backend and streams results.
   ============================================================ */

/**
 * LiveAgentBridge — sends a prompt to the backend and
 * calls back with real execution steps and LLM output.
 */
class AgentSimulator {
  constructor() {
    this.abortController = null;
    this.running = false;
  }

  /**
   * Start a live agent task.
   * @param {string} prompt — the user's task description
   * @param {object} callbacks — { stepCb, onLog, onComplete, onError }
   * @param {object} options — { files, tools, mode }
   */
  startLive(prompt, { stepCb, onLog, onComplete, onError }, options = {}) {
    this.stop();
    this.running = true;
    this.abortController = new AbortController();

    const body = {
      prompt: prompt,
      files: options.files || [],
      tools: Array.from(options.tools || []),
      mode: options.mode || "agentic",
    };

    // Try streaming endpoint first, fallback to regular
    this._streamTask(body, { stepCb, onLog, onComplete, onError });
  }

  async _streamTask(body, { stepCb, onLog, onComplete, onError }) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (NexusMode.token) headers.Authorization = "Bearer " + NexusMode.token;

      const res = await fetch("/api/tasks/stream", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        // Fallback to non-streaming endpoint
        return this._regularTask(body, { stepCb, onLog, onComplete, onError });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stepCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            this._handleStreamEvent(event, { stepCb, onLog, onComplete }, ++stepCount);
          } catch (e) {
            // not JSON, treat as raw log
            if (onLog) onLog(line);
          }
        }
      }

      this.running = false;
      if (onComplete) onComplete();
    } catch (e) {
      if (e.name === "AbortError") return;
      console.warn("[NEXUS] Stream failed, trying regular endpoint:", e);
      this._regularTask(body, { stepCb, onLog, onComplete, onError });
    }
  }

  async _regularTask(body, { stepCb, onLog, onComplete, onError }) {
    try {
      const result = await apiFetch("/tasks/run", { method: "POST", body });
      if (result && result.steps) {
        result.steps.forEach((step, i) => {
          if (stepCb) stepCb({ step, done: i + 1, total: result.steps.length });
        });
      }
      if (result && result.answer && onLog) {
        onLog(result.answer);
      }
      this.running = false;
      if (onComplete) onComplete(result);
    } catch (e) {
      this.running = false;
      if (onError) onError(e);
      else {
        console.error("[NEXUS] Task execution failed:", e);
        toast("Task failed", e.message || "Backend error", "err");
      }
    }
  }

  _handleStreamEvent(event, { stepCb, onLog, onComplete }, stepCount) {
    switch (event.type) {
      case "step":
        if (stepCb) {
          stepCb({
            step: {
              id: event.id || "step-" + stepCount,
              title: event.title || event.step || "Processing",
              tool: event.tool || "",
              model: event.model || "",
              det: event.detail || {},
              final: event.final || false,
            },
            done: stepCount,
            total: event.total || stepCount + 1,
          });
        }
        break;
      case "token":
        if (onLog) onLog(event.text || "");
        break;
      case "log":
        if (onLog) onLog(event.message || event.text || "");
        break;
      case "done":
        this.running = false;
        if (onComplete) onComplete(event);
        break;
      case "error":
        toast("Agent error", event.message || "Unknown error", "err");
        break;
    }
  }

  /* Legacy compatibility: start with a script key (for any remaining demo paths) */
  start(scriptKey, { stepCb, onLog, onComplete }) {
    // No more demo scripts — just show a message
    toast("Live mode active", "Type a prompt and press Run Agent", "info");
    if (onComplete) setTimeout(onComplete, 500);
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.running = false;
  }
}

/* Registry of finished task records (persisted in session) */
const TaskHistory = [];
function addCompletedTask(taskId, result) {
  TaskHistory.unshift({
    taskId,
    title: result.title || "Task",
    prompt: result.prompt || "",
    files: result.files || [],
    completedAt: nowTs(),
    result: result,
  });
}
