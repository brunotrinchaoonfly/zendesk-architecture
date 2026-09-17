/* ============================================================
   Archify Present — shell controller (vanilla JS)
   Página principal: seleção hierárquica (Grupo → Item → tipo),
   tema, apresentação, deep-link ?group=&item=&type=.
   Diagramas carregados em iframe com ?theme=…&shell=1.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- registry hierárquico (window.ARCHIFY_GROUPS, registry.js) ---------- */
  var groups = window.ARCHIFY_GROUPS || [];
  var TYPE_LABELS = { sequence: "Workflow", architecture: "Arquitetura" };

  function normalizeType(t) {
    if (!t) return null;
    var v = String(t).toLowerCase();
    if (v === "sequence" || v === "seq") return "sequence";
    if (v === "architecture" || v === "architeture" || v === "arch") return "architecture";
    return null;
  }

  function findGroup(gid) {
    for (var i = 0; i < groups.length; i++) if (groups[i].id === gid) return groups[i];
    return null;
  }

  function findItem(gid, iid) {
    var g = findGroup(gid);
    if (!g) return null;
    for (var i = 0; i < g.items.length; i++) if (g.items[i].id === iid) return g.items[i];
    return null;
  }

  function currentDiagram() {
    var item = findItem(state.group, state.item);
    if (!item) return null;
    var d = item[state.type];
    return d && d.file ? d : null;
  }

  /* ---------- estado ---------- */
  var state = {
    group: null,
    item: null,
    type: "sequence",
    theme: "light",
    present: false
  };

  try {
    var savedTheme = localStorage.getItem("archify-shell-theme");
    if (savedTheme === "light" || savedTheme === "dark") state.theme = savedTheme;
  } catch (_) {}

  /* ---------- deep-link (?group=&item=&type=) ---------- */
  (function parseDeepLink() {
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (_) { q = null; }
    function pick(name) { return q ? (q.get(name) || "").trim() : ""; }

    var g = pick("group"), i = pick("item"), t = normalizeType(pick("type"));

    var item = findItem(g, i);
    if (item) {
      state.group = g;
      state.item = i;
      // tipo: se pedido inválido/ausente, usa o primeiro disponível no item
      if (t && item[t] && item[t].file) state.type = t;
      else if (item.sequence && item.sequence.file) state.type = "sequence";
      else state.type = "architecture";
    }
  })();

  // fallback default: 1º grupo → 1º item → sequence (ou architecture)
  if (!state.item && groups.length && groups[0].items.length) {
    state.group = groups[0].id;
    state.item = groups[0].items[0].id;
    state.type = groups[0].items[0].sequence && groups[0].items[0].sequence.file
      ? "sequence" : "architecture";
  }

  try {
    var urlTheme = new URLSearchParams(window.location.search).get("theme");
    if (urlTheme === "light" || urlTheme === "dark") state.theme = urlTheme;
  } catch (_) {}

  /* ---------- refs ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var frame = $("frame");
  var listEl = $("diagram-list");
  var btnTheme = $("btn-theme");
  var btnPresent = $("btn-present");
  var presentExit = $("present-exit");
  var emptyState = $("empty-state");
  var btnEdge = $("sidebar-edge");
  var sidebarEl = document.querySelector(".sidebar");
  var frameWrap = $("frame-wrap");

  /* ---------- URL viva ---------- */
  function syncUrl() {
    try {
      var q = new URLSearchParams();
      q.set("group", state.group);
      q.set("item", state.item);
      q.set("type", state.type);
      history.replaceState(null, "", window.location.pathname + "?" + q.toString());
    } catch (_) {}
  }

  /* ---------- sidebar (Grupo → Item → tipo) ---------- */
  function renderList() {
    listEl.innerHTML = "";
    groups.forEach(function (g) {
      if (!g.items.length) return;
      var header = document.createElement("li");
      header.className = "diagram-group";
      header.textContent = g.label || g.id;
      header.setAttribute("role", "presentation");
      listEl.appendChild(header);

      g.items.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "diagram-item";
        li.dataset.group = g.id;
        li.dataset.item = item.id;

        // linha pai (item)
        var parent = document.createElement("button");
        parent.type = "button";
        parent.className = "diagram-item-btn diagram-item-parent";
        parent.dataset.group = g.id;
        parent.dataset.item = item.id;
        parent.innerHTML = '<span class="diagram-item-title"></span>';
        parent.querySelector(".diagram-item-title").textContent = item.short || item.title;
        li.appendChild(parent);

        // chips de tipo na mesma linha
        var row = document.createElement("div");
        row.className = "type-row";
        ["sequence", "architecture"].forEach(function (t) {
          var d = item[t];
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "type-chip";
          chip.dataset.group = g.id;
          chip.dataset.item = item.id;
          chip.dataset.type = t;
          chip.innerHTML =
            '<span class="diagram-item-dot dot-' + ((d && d.dot) || "slate") + '" aria-hidden="true"></span>' +
            '<span class="type-label"></span>';
          if (d && d.file) {
            chip.setAttribute("role", "option");
            chip.setAttribute("aria-selected", "false");
            chip.querySelector(".type-label").textContent = TYPE_LABELS[t];
            chip.addEventListener("click", function () { select(g.id, item.id, t); });
          } else {
            chip.classList.add("disabled");
            chip.disabled = true;
            chip.title = "em breve";
            chip.querySelector(".type-label").textContent = TYPE_LABELS[t] + " ·";
          }
          row.appendChild(chip);
        });
        li.appendChild(row);
        listEl.appendChild(li);
      });
    });
  }

  function markSelected() {
    var items = listEl.querySelectorAll(".type-chip");
    for (var i = 0; i < items.length; i++) {
      var b = items[i];
      var on = b.dataset.group === state.group && b.dataset.item === state.item && b.dataset.type === state.type;
      b.setAttribute("aria-selected", String(on));
      b.classList.toggle("selected", on);
    }
    var parents = listEl.querySelectorAll(".diagram-item-parent");
    for (var j = 0; j < parents.length; j++) {
      var p = parents[j];
      p.classList.toggle("selected-item", p.dataset.group === state.group && p.dataset.item === state.item);
    }
  }

  /* ---------- título topbar ---------- */
  function renderTitle() {
    var d = currentDiagram();
    var item = findItem(state.group, state.item);
    var dot = $("current-dot");
    var text = item ? (item.short || item.title) : "Selecione uma arquitetura";
    if (item && d) text += " · " + (TYPE_LABELS[state.type] || state.type);
    $("current-title-text").textContent = text;
    dot.className = "current-dot" + (d ? " dot-" + (d.dot || "slate") : "");
  }

  /* ---------- description strip ---------- */
  function renderArchDescription() {
    var strip = $("arch-description");
    if (!strip) return;
    var d = currentDiagram();
    if (d && d.description) {
      // \n real e a variante literal /n viram <br>
      strip.innerHTML = String(d.description)
        .replace(/\r?\n/g, "<br>")
        .replace(/(^|[^\\])\/n/g, "$1<br>");
      strip.hidden = false;
    } else {
      strip.innerHTML = "";
      strip.hidden = true;
    }
  }

  /* ---------- iframe src (com transição animada) ---------- */
  var swapTimer = null;
  function applySrc() {
    var d = currentDiagram();
    if (!d) return;
    var next = d.file + "?theme=" + state.theme + "&shell=1";
    if (frame.src === window.location.origin + window.location.pathname.replace(/[^/]*$/, "") + next.replace(/^\.\//, "")) return;
    // transição de troca: fade out → carrega → fade in (Animate.css, com fallback CSS)
    frameWrap.classList.add("swap-out");
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      // ?shell=1 (modo adicionado ao template do viewer archify): esconde o
      // chrome de página do viewer sem bloquear interações. Zoom, pan (drag),
      // PATH e LENS são nativos do dock do viewer dentro do container.
      frame.src = next;
      frame.onload = function () {
        frameWrap.classList.remove("swap-out");
        frameWrap.classList.add("swap-in");
        setTimeout(function () { frameWrap.classList.remove("swap-in"); }, 450);
      };
    }, 180);
  }

  /* ---------- seleção ---------- */
  function select(gid, iid, type) {
    state.group = gid;
    state.item = iid;
    state.type = type;
    emptyState.hidden = true;
    markSelected();
    renderTitle();
    renderArchDescription();
    applySrc();
    syncUrl();
  }

  /* ---------- tema ---------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var themeLabel = $("theme-label");
    if (themeLabel) themeLabel.textContent = state.theme === "dark" ? "Escuro" : "Claro";
    btnTheme.setAttribute("aria-pressed", String(state.theme === "dark"));
    try { localStorage.setItem("archify-shell-theme", state.theme); } catch (_) {}
    applySrc();
  }

  /* ---------- apresentação ---------- */
  function setPresent(on) {
    state.present = on;
    document.body.classList.toggle("presenting", on);
    btnPresent.setAttribute("aria-pressed", String(on));
    presentExit.hidden = !on;
    // fullscreen sincronizado com o modo apresentação
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    } catch (_) {}
    // no fullscreen, sidebar inicia recolhida (só o botão de borda à mostra)
    if (on) {
      sidebarEl.classList.add("collapsed");
      btnEdge.setAttribute("aria-expanded", "false");
    } else {
      sidebarEl.classList.remove("collapsed");
      btnEdge.setAttribute("aria-expanded", "true");
    }
  }

  /* ---------- menu (collapse por borda) ---------- */
  function toggleSidebar() {
    var collapsed = sidebarEl.classList.toggle("collapsed");
    btnEdge.setAttribute("aria-expanded", String(!collapsed));
    if (!collapsed) {
      sidebarEl.classList.add("animate__animated", "animate__slideInLeft", "animate__faster");
      setTimeout(function () { sidebarEl.classList.remove("animate__animated", "animate__slideInLeft", "animate__faster"); }, 400);
    }
  }

  /* ---------- eventos ---------- */
  btnTheme.addEventListener("click", function () {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  btnPresent.addEventListener("click", function () { setPresent(!state.present); });
  presentExit.addEventListener("click", function () { setPresent(false); });
  btnEdge.addEventListener("click", toggleSidebar);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.present) { setPresent(false); return; }
    // navegação por teclado entre itens (Workflow/Arquitetura corrente mantido)
    var tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "j" && e.key !== "k") return;
    e.preventDefault();
    var flat = [];
    groups.forEach(function (g) {
      g.items.forEach(function (it) {
        var d = it[state.type];
        if (d && d.file) flat.push({ group: g.id, item: it.id });
      });
    });
    if (!flat.length) return;
    var idx = flat.findIndex(function (f) { return f.group === state.group && f.item === state.item; });
    if (idx === -1) idx = 0;
    idx += (e.key === "ArrowDown" || e.key === "j") ? 1 : -1;
    if (idx < 0) idx = flat.length - 1;
    if (idx >= flat.length) idx = 0;
    var next = flat[idx];
    select(next.group, next.item, state.type);
    var chip = listEl.querySelector('.type-chip.selected');
    if (chip) chip.scrollIntoView({ block: "nearest" });
  });

  // fullscreen nativo encerrado (F11/Esc do browser) sai do modo apresentação
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && state.present) setPresent(false);
  });

  /* ---------- boot ---------- */
  renderList();
  applyTheme(); // tema do shell; primeiro applySrc acontece na seleção
  select(state.group, state.item, state.type);
})();
