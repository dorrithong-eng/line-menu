/* =========================================================
 * LINE 圖文選單 (Rich-Menu) management — interactive prototype
 * Zero dependencies. Open index.html directly in a browser.
 * ---------------------------------------------------------
 *  - "今天" is fixed to 2026-07-07 so seeded statuses match
 *    the reference mockups deterministically.
 *  - Menu images are simple colour blocks ("簡單示意即可").
 * ======================================================= */
(function () {
  "use strict";

  var TODAY = new Date("2026-07-07T00:00:00");
  var _id = 100;
  function uid() { return "id_" + _id++; }

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!props.hasOwnProperty(k)) continue;
        var v = props[k];
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, "");
        else if (v !== false && v != null) el.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }

  /* ---------- helpers ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function toDisplay(dt) {
    if (!dt) return "";
    var d = new Date(dt);
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function deriveStatus(s) {
    if (s.isResident) return "resident";
    if (!s.start || !s.end) return "scheduled";
    var st = new Date(s.start), en = new Date(s.end);
    if (TODAY < st) return "scheduled";
    if (TODAY > en) return "expired";
    return "active";
  }
  var STATUS_LABEL = { resident: "常駐", expired: "已下檔", active: "使用中", scheduled: "排程中" };
  var ACTIONS = [
    { key: "text", label: "傳送文字", icon: "T" },
    { key: "link", label: "開啟連結", icon: "🔗" },
    { key: "switch", label: "切換選單", icon: "🗂" },
    { key: "postback", label: "Postback", icon: "⧉" }
  ];

  /* ---------- seed data ---------- */
  function defaultCells() {
    return [
      { id: uid(), action: "text", value: "" },
      { id: uid(), action: "link", value: "" },
      { id: uid(), action: "switch", value: "" }
    ];
  }
  function sched(name, imgType, start, end, status) {
    return {
      id: uid(), name: name, isResident: false, start: start, end: end,
      chatBarText: "選單", defaultExpand: true,
      image: { type: imgType, label: name }, status: status, cells: defaultCells()
    };
  }
  function seedMenus() {
    return [
      {
        id: "default", type: "default", name: "預設圖文選單",
        schedules: [
          sched("品牌選單 - 寒假", "purple", "2026-01-01T12:00", "2026-01-31T12:00", "expired"),
          sched("bbb 選單 - 暑假", "purple", "2026-07-01T12:00", "2026-08-31T12:00", "active"),
          sched("bbb 選單 - 開學", "purple", "2026-09-01T12:00", "2026-09-30T12:00", "scheduled")
        ]
      },
      { id: uid(), type: "general", name: "A 選單", schedules: [] },
      {
        id: uid(), type: "general", name: "B 選單",
        schedules: [
          sched("bbb 選單 - 兒童節檔期", "green", "2026-04-01T12:00", "2026-04-30T12:00", "expired"),
          sched("bbb 選單 - 母親節檔期", "green", "2026-05-01T12:00", "2026-05-31T12:00", "active"),
          sched("bbb 選單 - 父親節檔期", "green", "2026-08-01T12:00", "2026-08-31T12:00", "scheduled"),
          sched("bbb 選單 - 教師節檔期", "green", "2026-09-01T12:00", "2026-09-30T12:00", "scheduled"),
          sched("bbb 選單 - 萬聖節檔期", "green", "2026-10-01T12:00", "2026-10-31T12:00", "scheduled")
        ]
      },
      { id: uid(), type: "general", name: "C 選單", schedules: [] }
    ];
  }

  /* ---------- global state ---------- */
  var state = {
    menus: seedMenus(),
    selectedId: "default",
    view: "list",        // "list" | "editor"
    editing: null        // { menuId, scheduleId | null }
  };
  var root = document.getElementById("root");

  function findMenu(id) { return state.menus.find(function (m) { return m.id === id; }); }

  /* ---------- reusable pieces ---------- */
  function menuImage(image, sizeClass) {
    var type = (image && image.type) || "blank";
    var wrap = h("div", { class: "menu-img " + type + " " + (sizeClass || "") });
    if (type !== "blank") wrap.appendChild(h("div", { class: "corner" }));
    wrap.appendChild(h("span", { class: "label", text: (image && image.label) || "" }));
    return wrap;
  }
  function badge(status) { return h("span", { class: "badge " + status, text: STATUS_LABEL[status] }); }
  function rail() {
    var icons = ["🏠", "🟢", "∞", "💬", "🗂", "🎧", "🧩"];
    var r = h("div", { class: "rail" }, h("div", { class: "logo", text: "🧊" }));
    icons.forEach(function (ic, i) { r.appendChild(h("div", { class: "rail-icon " + (i === 1 ? "active" : ""), text: ic })); });
    r.appendChild(h("div", { class: "rail-spacer" }));
    r.appendChild(h("div", { class: "rail-icon", text: "↩" }));
    r.appendChild(h("div", { class: "rail-icon", text: "⚙" }));
    return r;
  }
  function switchToggle(on, onChange) {
    var s = h("button", { type: "button", class: "switch " + (on ? "on" : ""), onClick: function () { on = !on; s.className = "switch " + (on ? "on" : ""); onChange(on); } }, h("span", { class: "knob" }));
    return s;
  }

  /* ---------- overlays: context menu + modal ---------- */
  function closeOverlays() {
    document.querySelectorAll(".overlay,.ctx-menu,.modal-overlay").forEach(function (n) { n.remove(); });
  }
  function openContextMenu(anchorRect, items) {
    closeOverlays();
    var overlay = h("div", { class: "overlay", onClick: closeOverlays });
    var menu = h("div", { class: "ctx-menu" });
    menu.style.top = anchorRect.bottom + 4 + "px";
    menu.style.left = Math.max(12, anchorRect.left - 150) + "px";
    items.forEach(function (it) {
      if (it.sep) { menu.appendChild(h("div", { class: "ctx-sep" })); return; }
      menu.appendChild(h("button", { class: it.danger ? "danger" : "", text: it.label, onClick: function () { closeOverlays(); it.onClick(); } }));
    });
    document.body.appendChild(overlay);
    document.body.appendChild(menu);
  }
  function openModal(build) {
    closeOverlays();
    var box = h("div", { class: "modal" });
    var overlay = h("div", { class: "modal-overlay" }, box);
    build(box, closeOverlays);
    document.body.appendChild(overlay);
  }
  function confirmModal(title, msg, danger, onConfirm) {
    openModal(function (box, close) {
      box.appendChild(h("h3", { text: title }));
      box.appendChild(h("p", { text: msg }));
      box.appendChild(h("div", { class: "modal-actions" },
        h("button", { class: "btn-ghost", text: "取消", onClick: close }),
        h("button", { class: "btn-primary", style: danger ? { background: "#e0503f" } : null, text: danger ? "刪除" : "確定", onClick: function () { close(); onConfirm(); } })
      ));
    });
  }
  function infoModal(text) {
    openModal(function (box, close) {
      box.appendChild(h("h3", { text: "提示" }));
      box.appendChild(h("p", { text: text }));
      box.appendChild(h("div", { class: "modal-actions" }, h("button", { class: "btn-primary", text: "知道了", onClick: close })));
    });
  }
  function renameModal(initial, onConfirm) {
    openModal(function (box, close) {
      box.appendChild(h("h3", { text: "重新命名" }));
      var input = h("input", { class: "text-input", maxlength: 50, value: initial });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { close(); onConfirm(input.value); } });
      box.appendChild(input);
      box.appendChild(h("div", { class: "modal-actions" },
        h("button", { class: "btn-ghost", text: "取消", onClick: close }),
        h("button", { class: "btn-primary", text: "確定", onClick: function () { close(); onConfirm(input.value); } })
      ));
      setTimeout(function () { input.focus(); }, 0);
    });
  }
  function newMenuModal(onConfirm) {
    openModal(function (box, close) {
      box.appendChild(h("h3", { text: "新增圖文選單" }));
      var input = h("input", { class: "text-input", maxlength: 50, placeholder: "請輸入選單名稱" });
      function submit() {
        var name = (input.value || "").trim();
        if (!name) { input.focus(); return; }
        close(); onConfirm(name);
      }
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
      box.appendChild(input);
      box.appendChild(h("div", { class: "modal-actions" },
        h("button", { class: "btn-ghost", text: "取消", onClick: close }),
        h("button", { class: "btn-primary", text: "新增", onClick: submit })
      ));
      setTimeout(function () { input.focus(); }, 0);
    });
  }
  function reassignApplyModal(menu) {
    openModal(function (box, close) {
      box.appendChild(h("h3", { text: "移除所有套用" }));
      box.appendChild(h("p", { text: "請選擇要將原本套用「" + menu.name + "」的會員改為套用哪個選單？" }));
      var others = state.menus.filter(function (m) { return m.id !== menu.id; });
      var sel = h("select", { class: "select-input" });
      sel.appendChild(h("option", { value: "", text: "請選擇選單" }));
      others.forEach(function (m) { sel.appendChild(h("option", { value: m.id, text: m.name })); });
      box.appendChild(sel);
      box.appendChild(h("div", { class: "modal-actions" },
        h("button", { class: "btn-ghost", text: "取消", onClick: close }),
        h("button", { class: "btn-primary", text: "確定", onClick: function () { close(); } })
      ));
    });
  }

  /* ---------- menu operations ---------- */
  function nextMenuName() {
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var used = {};
    state.menus.filter(function (m) { return m.type === "general"; }).forEach(function (m) { used[m.name] = 1; });
    for (var i = 0; i < letters.length; i++) { var n = letters[i] + " 選單"; if (!used[n]) return n; }
    return "選單 " + Date.now();
  }
  function addMenu() {
    newMenuModal(function (name) {
      var m = { id: uid(), type: "general", name: name, schedules: [] };
      state.menus.push(m); state.selectedId = m.id; render();
    });
  }
  function duplicateMenu(id) {
    var src = findMenu(id); if (!src) return;
    var copy = {
      id: uid(), type: "general", name: src.name + " (複製)",
      schedules: src.schedules.map(function (s) {
        return Object.assign({}, s, { id: uid(), cells: s.cells.map(function (c) { return Object.assign({}, c, { id: uid() }); }) });
      })
    };
    var idx = state.menus.findIndex(function (m) { return m.id === id; });
    state.menus.splice(idx + 1, 0, copy); state.selectedId = copy.id; render();
  }
  function deleteMenu(id) {
    state.menus = state.menus.filter(function (m) { return m.id !== id; });
    if (state.selectedId === id) state.selectedId = "default";
    render();
  }
  function renameMenu(id, name) {
    var m = findMenu(id); if (m) { m.name = name; render(); }
  }

  /* ---------- schedule operations ---------- */
  function saveSchedule(menuId, finalSched) {
    var m = findMenu(menuId); if (!m) return;
    var idx = m.schedules.findIndex(function (s) { return s.id === finalSched.id; });
    if (idx >= 0) m.schedules[idx] = finalSched; else m.schedules.push(finalSched);
    state.view = "list"; state.editing = null; render();
  }
  function deleteSchedule(menuId, scheduleId) {
    var m = findMenu(menuId); if (!m) return;
    m.schedules = m.schedules.filter(function (s) { return s.id !== scheduleId; });
    render();
  }

  /* =========================================================
   * LIST VIEW
   * ======================================================= */
  function renderList() {
    var selected = findMenu(state.selectedId) || state.menus[0];
    var defaultMenu = state.menus.find(function (m) { return m.type === "default"; });
    var generals = state.menus.filter(function (m) { return m.type === "general"; });

    /* top bar */
    var topbar = h("div", { class: "topbar" },
      h("span", { style: { color: "#c7c9d3", fontSize: "18px" }, text: "«" }),
      h("span", { class: "line-badge", text: "LINE" }),
      h("div", { class: "crumb" }, h("span", { text: "🗂 圖文選單" }))
    );

    /* left panel */
    var panel = h("div", { class: "panel" });
    panel.appendChild(h("div", {
      class: "menu-row " + (state.selectedId === "default" ? "active" : ""),
      style: { paddingTop: "20px" },
      onClick: function () { state.selectedId = "default"; render(); }
    }, h("span", { class: "menu-name", text: defaultMenu.name })));
    panel.appendChild(h("div", { class: "divider" }));
    panel.appendChild(h("div", { class: "panel-section-title" },
      h("span", { text: "一般圖文選單" }),
      h("button", { class: "add-btn", title: "新增圖文選單", text: "＋", onClick: addMenu })));

    generals.forEach(function (m) {
      var moreBtn = h("button", {
        class: "more", text: "⋯",
        onClick: function (e) {
          e.stopPropagation();
          var rect = e.currentTarget.getBoundingClientRect();
          openContextMenu(rect, [
            { label: "重新命名", onClick: function () { renameModal(m.name, function (v) { renameMenu(m.id, (v || "").trim() || m.name); }); } },
            { label: "複製", onClick: function () { duplicateMenu(m.id); } },
            { label: "移除所有套用", onClick: function () { reassignApplyModal(m); } },
            { label: "下載會員資料", onClick: function () { infoModal("（Prototype 示意）開始下載會員資料。"); } },
            { sep: true },
            { label: "刪除", danger: true, onClick: function () { confirmModal("刪除圖文選單", "確定要刪除「" + m.name + "」嗎？此動作無法復原。", true, function () { deleteMenu(m.id); }); } }
          ]);
        }
      });
      panel.appendChild(h("div", {
        class: "menu-row " + (state.selectedId === m.id ? "active" : ""),
        onClick: function () { state.selectedId = m.id; render(); }
      }, h("span", { class: "menu-name", text: m.name }), moreBtn));
    });

    /* content */
    var content = h("div", { class: "content" });
    content.appendChild(h("div", { class: "content-head" },
      h("h2", { text: selected.name }),
      h("button", { class: "btn-primary", text: "＋ 新增排程", onClick: function () { openEditor(selected.id, null); } })
    ));

    if (selected.schedules.length === 0) {
      content.appendChild(h("div", { class: "empty", text: "尚無排程內容，點擊右上角「新增排程」開始建立。" }));
    } else {
      var grid = h("div", { class: "cards-grid" });
      selected.schedules.forEach(function (s) {
        var head = h("div", { class: "card-head" },
          h("span", { class: "card-title", text: s.name }),
          badge(s.status),
          h("button", { class: "icon-btn", title: "編輯", text: "✎", onClick: function () { openEditor(selected.id, s.id); } })
        );
        if (!s.isResident) {
          head.appendChild(h("button", {
            class: "icon-btn", title: "更多", text: "⋯",
            onClick: function (e) {
              var rect = e.currentTarget.getBoundingClientRect();
              openContextMenu(rect, [
                { label: "編輯", onClick: function () { openEditor(selected.id, s.id); } },
                { sep: true },
                { label: "刪除排程", danger: true, onClick: function () { confirmModal("刪除排程", "確定要刪除排程「" + s.name + "」嗎？", true, function () { deleteSchedule(selected.id, s.id); }); } }
              ]);
            }
          }));
        }
        var imgArea = (s.image.type === "blank" && !s.image.label)
          ? h("div", { class: "menu-img blank card-size" })
          : menuImage({ type: s.image.type, label: s.isResident ? s.image.label : s.name }, "card-size");
        grid.appendChild(h("div", { class: "sched-card" },
          head,
          h("div", { class: "card-img-wrap" }, imgArea),
          h("div", { class: "card-foot", text: s.isResident ? "無排程內容時，將顯示常駐內容" : (toDisplay(s.start) + " - " + toDisplay(s.end)) })
        ));
      });
      content.appendChild(grid);
    }

    var body = h("div", { class: "body" }, panel, content);
    return h("div", { class: "main" }, topbar, body);
  }

  /* =========================================================
   * EDITOR VIEW
   * ======================================================= */
  function openEditor(menuId, scheduleId) {
    state.view = "editor";
    state.editing = { menuId: menuId, scheduleId: scheduleId };
    render();
  }

  function renderEditor() {
    var menu = findMenu(state.editing.menuId);
    var existing = state.editing.scheduleId ? menu.schedules.find(function (s) { return s.id === state.editing.scheduleId; }) : null;

    // build a mutable draft
    var draft = existing
      ? {
          id: existing.id, name: existing.name, isResident: existing.isResident,
          start: existing.start || "", end: existing.end || "",
          chatBarText: existing.chatBarText, defaultExpand: existing.defaultExpand,
          image: Object.assign({}, existing.image),
          cells: existing.cells.map(function (c) { return Object.assign({}, c); })
        }
      : {
          id: uid(), name: "", isResident: false, start: "", end: "",
          chatBarText: "", defaultExpand: true,
          image: { type: (menu.schedules[0] && menu.schedules[0].image.type) || "green", label: menu.name },
          cells: defaultCells()
        };

    /* ----- top bar ----- */
    var topbar = h("div", { class: "topbar" },
      h("span", { class: "line-badge", text: "LINE" }),
      h("div", { class: "crumb" },
        h("span", { text: "🗂 圖文選單" }), h("span", { class: "sep", text: "/" }),
        h("span", { class: "muted", text: menu.name }), h("span", { class: "sep", text: "/" }),
        h("span", { text: draft.name || (draft.isResident ? "常駐" : "新排程") })
      ),
      h("div", { style: { flex: "1" } }),
      h("button", { class: "btn-ghost", text: "取消", onClick: function () { state.view = "list"; state.editing = null; render(); } }),
      h("button", { class: "btn-primary", text: "儲存", onClick: handleSave })
    );

    var errorEl = h("div", { class: "error-text", style: { display: "none" } });
    function showError(msg) { errorEl.textContent = msg; errorEl.style.display = "block"; }

    function overlaps(aS, aE, bS, bE) { return aS < bE && bS < aE; }
    function handleSave() {
      if (!draft.isResident) {
        if (!draft.name.trim()) return showError("請輸入排程名稱");
        if (!draft.start || !draft.end) return showError("請選擇排程時間");
        var s = new Date(draft.start), e = new Date(draft.end);
        if (s >= e) return showError("結束時間必須晚於開始時間");
        var clash = menu.schedules.some(function (sc) {
          if (sc.id === draft.id || sc.isResident || !sc.start || !sc.end) return false;
          return overlaps(s, e, new Date(sc.start), new Date(sc.end));
        });
        if (clash) return showError("排程時間與其他排程重疊，請重新設定");
      }
      draft.status = deriveStatus(draft);
      saveSchedule(menu.id, draft);
    }

    /* ----- 基本設定 ----- */
    function countField(labelText, key, max, placeholder) {
      var input = h("input", { class: "text-input", maxlength: max, placeholder: placeholder, value: draft[key], disabled: (key === "name" && draft.isResident) });
      var count = h("span", { class: "count", text: (draft[key] || "").length + "/" + max });
      input.addEventListener("input", function () { draft[key] = input.value; count.textContent = input.value.length + "/" + max; });
      return h("div", { class: "field-row" },
        h("div", { class: "field-label", text: labelText }),
        h("div", {}, h("div", { class: "input-count" }, input, count)));
    }

    var timeField;
    if (draft.isResident) {
      timeField = h("div", { class: "field-row" },
        h("div", { class: "field-label", text: "排程時間" }),
        h("div", {}, h("div", { class: "disabled-note", text: "常駐內容不需設定時間，當排程無內容時將顯示常駐內容。" })));
    } else {
      var startI = h("input", { type: "datetime-local", class: "text-input", value: draft.start });
      var endI = h("input", { type: "datetime-local", class: "text-input", value: draft.end });
      startI.addEventListener("input", function () { draft.start = startI.value; });
      endI.addEventListener("input", function () { draft.end = endI.value; });
      timeField = h("div", { class: "field-row" },
        h("div", { class: "field-label", text: "排程時間" }),
        h("div", {}, h("div", { class: "datetime-row" }, startI, endI, h("div", { class: "field-hint", text: "排程時間不可與同一選單內其他排程重疊。" }))));
    }

    var expandRow = h("div", { class: "field-row no-border" },
      h("div", { class: "field-label", text: "預設展開" }),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        h("div", { class: "field-hint", style: { marginTop: "0" }, text: "好友進入時自動展開選單" }),
        switchToggle(draft.defaultExpand, function (v) { draft.defaultExpand = v; })
      ));

    /* ----- 選單設定 (image + cells) ----- */
    var previewImg = menuImage({ type: draft.image.type, label: draft.name || draft.image.label }, "");
    var previewWrap = h("div", { class: "editor-preview-img" }, previewImg);

    var cellsContainer = h("div");
    function rebuildCells() {
      cellsContainer.innerHTML = "";
      draft.cells.forEach(function (cell, i) { cellsContainer.appendChild(buildCell(cell, i)); });
    }
    function buildCell(cell, i) {
      var box = h("div", { class: "cell-box" });
      // header + tools
      var tools = h("div", { class: "cell-tools" },
        h("button", { title: "上移", text: "˄", disabled: i === 0, onClick: function () { move(i, -1); } }),
        h("button", { title: "下移", text: "˅", disabled: i === draft.cells.length - 1, onClick: function () { move(i, 1); } }),
        h("button", { title: "複製", text: "⧉", onClick: function () { draft.cells.splice(i + 1, 0, Object.assign({}, cell, { id: uid() })); rebuildCells(); } }),
        h("button", { title: "刪除", text: "✕", disabled: draft.cells.length === 1, onClick: function () { draft.cells.splice(i, 1); rebuildCells(); } })
      );
      box.appendChild(h("div", { class: "cell-head" }, h("span", { class: "cell-name", text: "格子 " + (i + 1) }), tools));

      var bodyEl = h("div", { class: "cell-body" });
      bodyEl.appendChild(h("div", { class: "sub-label", text: "點擊行為" }));
      var tabs = h("div", { class: "action-tabs" });
      ACTIONS.forEach(function (a) {
        tabs.appendChild(h("button", {
          class: "action-tab " + (cell.action === a.key ? "on" : ""),
          onClick: function () { cell.action = a.key; cell.value = ""; rebuildCells(); }
        }, h("span", { text: a.icon }), " " + a.label));
      });
      bodyEl.appendChild(tabs);
      bodyEl.appendChild(buildActionInput(cell));
      box.appendChild(bodyEl);
      return box;
    }
    function move(i, dir) {
      var j = i + dir; if (j < 0 || j >= draft.cells.length) return;
      var tmp = draft.cells[i]; draft.cells[i] = draft.cells[j]; draft.cells[j] = tmp; rebuildCells();
    }
    function buildActionInput(cell) {
      if (cell.action === "switch") {
        var sel = h("select", { class: "select-input" });
        sel.appendChild(h("option", { value: "", text: "請選擇選單" }));
        state.menus.filter(function (mm) { return mm.id !== menu.id; }).forEach(function (m) {
          var opt = h("option", { value: m.id, text: m.name });
          if (cell.value === m.id) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener("change", function () { cell.value = sel.value; });
        return h("div", {}, h("div", { class: "sub-label", text: "切換選單" }), sel);
      }
      var conf = { text: ["傳送文字", "請輸入文字", 20], link: ["開啟連結", "請輸入連結", null], postback: ["Postback", "請輸入 postback 資料", null] }[cell.action];
      var input = h("input", { class: "text-input", placeholder: conf[1], value: cell.value });
      if (conf[2]) input.setAttribute("maxlength", conf[2]);
      var wrapChildren = [h("div", { class: "sub-label", text: conf[0] })];
      if (conf[2]) {
        var count = h("span", { class: "count", text: (cell.value || "").length + "/" + conf[2] });
        input.addEventListener("input", function () { cell.value = input.value; count.textContent = input.value.length + "/" + conf[2]; });
        wrapChildren.push(h("div", { class: "input-count" }, input, count));
      } else {
        input.addEventListener("input", function () { cell.value = input.value; });
        wrapChildren.push(input);
      }
      return h("div", {}, wrapChildren);
    }
    rebuildCells();

    var editorCard = h("div", { class: "editor-card" },
      h("div", { class: "band", text: "選單設定" }),
      h("div", { class: "band-body" }, previewWrap, cellsContainer));

    var inner = h("div", { class: "editor-inner" },
      h("div", { class: "section-band", text: "基本設定" }),
      countField("排程名稱", "name", 100, "請輸入內容"),
      timeField,
      countField("選方下單文字", "chatBarText", 100, "請輸入內容"),
      expandRow,
      errorEl,
      h("div", { class: "section-band", text: "選單設定" }),
      editorCard,
      h("div", { style: { height: "40px" } })
    );

    return h("div", { class: "main" }, topbar, h("div", { class: "editor" }, inner));
  }

  /* ---------- top-level render ---------- */
  function render() {
    closeOverlays();
    root.innerHTML = "";
    var app = h("div", { class: "app" }, rail(), state.view === "editor" ? renderEditor() : renderList());
    root.appendChild(app);
  }

  render();
})();
