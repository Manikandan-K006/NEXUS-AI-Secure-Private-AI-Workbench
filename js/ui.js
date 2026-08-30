/* ============================================================
   SOVEREIGN AI — UI helpers: shell, modal, toast, misc
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function nowTs() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ---------- Toast ---------- */
function toast(msg, sub = "", type = "ok", ms = 3600) {
  let wrap = $(".toast-wrap");
  if (!wrap) {
    wrap = el(`<div class="toast-wrap"></div>`);
    document.body.appendChild(wrap);
  }
  const ico = type === "ok" ? Icons.check : type === "warn" ? Icons.alert : type === "err" ? Icons.x : Icons.info;
  const t = el(`<div class="toast ${type}">
    <span class="t-ico">${ico}</span>
    <div>
      <div class="t-msg"></div>
      ${sub ? `<div class="t-sub"></div>` : ""}
    </div>
  </div>`);
  $(".t-msg", t).textContent = msg;
  if (sub) $(".t-sub", t).textContent = sub;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateX(30px)";
    setTimeout(() => t.remove(), 300);
  }, ms);
}

/* ---------- Modal ---------- */
function openModal(title, bodyHTML, { wide = false, onClose } = {}) {
  closeModal();
  const ov = el(`<div class="modal-overlay open">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${wide ? "width:min(820px,94vw)" : ""}">
      <div class="modal-head">
        <div class="modal-title"></div>
        <button class="modal-close" aria-label="Close">${Icons.x}</button>
      </div>
      <div class="modal-body"></div>
    </div>
  </div>`);
  $(".modal-title", ov).textContent = title;
  ov._onClose = onClose;
  const body = $(".modal-body", ov);
  if (typeof bodyHTML === "string") body.innerHTML = bodyHTML;
  else body.appendChild(bodyHTML);
  document.body.appendChild(ov);
  ov.addEventListener("click", (e) => {
    if (e.target === ov) closeModal();
  });
  $(".modal-close", ov).addEventListener("click", closeModal);
  document.addEventListener("keydown", escKey);
  return ov;
}

function closeModal() {
  const ov = $(".modal-overlay");
  if (!ov) return;
  if (ov._onClose) ov._onClose();
  ov.remove();
  document.removeEventListener("keydown", escKey);
}
function escKey(e) {
  if (e.key === "Escape") closeModal();
}

/* ---------- Dropdown ---------- */
function openDropdown(anchor, html, onItemClick) {
  closeDropdown();
  const dd = el(`<div class="dropdown"></div>`);
  if (typeof html === "string") dd.innerHTML = html;
  else dd.appendChild(html);
  document.body.appendChild(dd);
  const r = anchor.getBoundingClientRect();
  dd.style.top = r.bottom + 6 + "px";
  dd.style.right = Math.max(8, window.innerWidth - r.right) + "px";
  requestAnimationFrame(() => dd.classList.add("open"));
  if (onItemClick) {
    dd.addEventListener("click", (e) => {
      const item = e.target.closest("[data-dd]");
      if (item) onItemClick(item.dataset.dd);
    });
  }
  document.addEventListener("click", function closeEv(e) {
    if (!dd.contains(e.target)) {
      closeDropdown();
      document.removeEventListener("click", closeEv);
    }
  });
}
function closeDropdown() {
  const dd = $(".dropdown");
  if (dd) dd.remove();
}

/* ---------- Sidebar ---------- */
function renderSidebar() {
  const sb = $("#sidebar");
  sb.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-mark" aria-hidden="true">${Icons.logo}</div>
      <div class="brand-text">
        <div class="brand-name">SOVEREIGN AI</div>
        <div class="brand-sub">On-Prem · Secure</div>
      </div>
    </div>
    <div class="sidebar-status" title="Air-gapped local node">
      <span class="dot" aria-hidden="true"></span>
      <div style="min-width:0">
        <div class="st-label">LOCAL NODE</div>
        <div class="st-sub" id="side-mode">● AIR-GAPPED</div>
      </div>
    </div>
    <nav class="nav" aria-label="Primary">
      ${NAV_GROUPS.map(
        (g) => `
        <div class="nav-section-label">${g.label}</div>
        ${g.items
          .map(
            (it) => `
          <div class="nav-item ${it.primary ? "primary" : ""}" data-nav="${it.id}" role="button" tabindex="0" aria-label="${it.label}">
            <span class="nav-ico">${Icons[it.icon]}</span>
            <span class="nav-label">${it.label}</span>
            ${it.badge ? `<span class="nav-badge">${it.badge}</span>` : ""}
          </div>`
          )
          .join("")}`
      ).join("")}
    </nav>
    <div class="sidebar-footer">
      <div class="resource-block">
        <div class="res-row">
          <span class="lbl">GPU</span>
          <span class="val" id="side-gpu">RTX / Local GPU</span>
        </div>
        <div class="res-row" style="padding-left:51px;margin-top:-4px">
          <span class="val" id="side-vram">VRAM 7.8 / 12 GB</span>
        </div>
        <div class="res-row">
          <span class="lbl">VRAM</span>
          <div class="bar gpu"><i id="side-vrambar" style="width:65%"></i></div>
          <span class="val" id="side-vrampct">65%</span>
        </div>
        <div class="res-row">
          <span class="lbl">CPU</span>
          <div class="bar cpu"><i id="side-cpubar" style="width:32%"></i></div>
          <span class="val" id="side-cpupct">32%</span>
        </div>
        <div class="res-row">
          <span class="lbl">RAM</span>
          <div class="bar ram"><i id="side-rambar" style="width:61%"></i></div>
          <span class="val" id="side-rampct">61%</span>
        </div>
      </div>
      <div class="infer-tag">
        <span class="dot" aria-hidden="true"></span>
        Local inference · NO EXTERNAL
      </div>
    </div>
  `;
  $$(".nav-item", sb).forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.nav));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(item.dataset.nav);
      }
    });
  });
}

/* ---------- Topbar ---------- */
function renderTopbar() {
  const top = $("#topbar");
  top.innerHTML = `
    <div class="topbar-left">
      <button class="collapse-btn" id="collapse-btn" aria-label="Toggle sidebar">${Icons.menu}</button>
      <div class="workspace-name">NEXUS-UNIT-03<span class="workspace-badge">Refinery Operations</span></div>
    </div>
    <div class="topbar-search">
      <span class="search-ico">${Icons.search}</span>
      <input id="global-search" type="text" placeholder="Search documents, tasks, SOPs..." aria-label="Global search"/>
      <span class="search-hint">/</span>
    </div>
    <div class="topbar-right">
      ${typeof modeChipHTML === "function" ? modeChipHTML() : ""}
      <button class="topbar-chip sec" id="tp-security" title="Open Security Center">
        <span class="dot" aria-hidden="true"></span><span class="chip-lbl">Security</span><span class="val">AIR-GAPPED · SECURE</span>
      </button>
      <button class="topbar-chip net" title="Network status">
        <span class="dot" aria-hidden="true"></span><span class="chip-lbl">Net</span><span class="val">LOCAL ONLY</span>
      </button>
      <button class="topbar-chip gpu" title="GPU status">
        <span class="dot" aria-hidden="true"></span><span class="chip-lbl">GPU</span><span class="val" id="tp-gpu">61%</span>
      </button>
      <button class="icon-btn" id="tp-notif" aria-label="Notifications">${Icons.bell}<span class="notif-dot"></span></button>
      <button class="profile-btn" id="tp-profile" aria-label="User profile">
        <span class="avatar">${AppState.user.initials}</span>
        <span class="profile-name">${AppState.user.name}</span>
      </button>
    </div>
  `;
  $("#collapse-btn").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
  $("#tp-security").addEventListener("click", () => navigate("security"));
  $("#tp-notif").addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown(e.currentTarget, notifDropdown(), () => closeDropdown());
  });
  $("#tp-profile").addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown(
      e.currentTarget,
      `<div class="dd-head">${esc(AppState.user.name)} · ${esc(AppState.user.role)}</div>
       <div class="dd-item" data-dd="settings"><span class="d-ico">${Icons.settings}</span><div><div class="dd-t">Settings</div><div class="dd-s">Preferences & security</div></div></div>
       <div class="dd-item" data-dd="audit"><span class="d-ico">${Icons.audit}</span><div><div class="dd-t">My audit trail</div><div class="dd-s">View activity</div></div></div>
       <div class="dd-item" data-dd="logout"><span class="d-ico">${Icons.lock}</span><div><div class="dd-t">Lock workbench</div><div class="dd-s">Require authentication</div></div></div>`,
      (id) => {
        if (id === "settings") navigate("settings");
        if (id === "audit") navigate("audit");
        if (id === "logout") {
          toast("Workbench locked", "Session secured · re-authentication required");
        }
      }
    );
  });
  if (typeof wireModeToggle === "function") wireModeToggle();
}

function notifDropdown() {
  return `
    <div class="dd-head">Notifications</div>
    ${AppState.notifications
      .map(
        (n) => `
      <div class="dd-item">
        <span class="d-ico" style="color:${n.ok ? "var(--ok)" : "var(--warn)"}">${n.ok ? Icons.check : Icons.info}</span>
        <div><div class="dd-t">${esc(n.t)}</div><div class="dd-s">${esc(n.s)}</div></div>
      </div>`
      )
      .join("")}
  `;
}

/* ---------- start view ---------- */
function setActiveView(id) {
  AppState.activeView = id;
  $$(".nav-item").forEach((it) => it.classList.toggle("active", it.dataset.nav === id));
  closeDropdown();
  const view = $("#view");
  view.classList.remove("view-enter");
  void view.offsetWidth;
  view.classList.add("view-enter");
}
