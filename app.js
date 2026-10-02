/* Offscript — random topic picker with a hidden control panel.
   Hidden panel: double-click (or double-tap) "Begin research". */
(() => {
  "use strict";

  const KEY_TOPICS = "offscript:topics";
  const KEY_LOCKED = "offscript:locked";
  const $ = (id) => document.getElementById(id);

  // ---------- Storage (fails silently in private mode etc.) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  const clean = (list) => list.map((t) => String(t).trim()).filter(Boolean);
  const fileTopics = () => clean(Array.isArray(window.TOPICS) ? window.TOPICS : []);
  const fileLocked = () => (typeof window.LOCKED_TOPIC === "string" ? window.LOCKED_TOPIC.trim() : "");

  let topics = [];
  let locked = "";

  function load() {
    let saved = null;
    try { saved = JSON.parse(store.get(KEY_TOPICS)); } catch {}
    topics = Array.isArray(saved) ? clean(saved) : fileTopics();
    const l = store.get(KEY_LOCKED);
    locked = l !== null ? l : fileLocked();
    if (locked && !topics.includes(locked)) topics.unshift(locked);
  }
  function save() {
    store.set(KEY_TOPICS, JSON.stringify(topics));
    store.set(KEY_LOCKED, locked);
  }

  // ---------- Main screen ----------
  const topicEl = $("topic");
  const topicText = topicEl.querySelector("span");
  const statusEl = $("status");
  let current = "";
  let busy = false;

  function setTopic(text) {
    topicText.textContent = text;
    const n = text.length;
    topicEl.style.setProperty("--fit", n <= 30 ? 1 : n <= 48 ? 0.8 : n <= 70 ? 0.66 : 0.54);
  }

  function pick(exclude) {
    const pool = topics.filter((t) => t !== exclude);
    const from = pool.length ? pool : topics;
    return from[Math.floor(Math.random() * from.length)] || "";
  }

  function reveal(text) {
    setTopic(text);
    current = text;
    document.body.classList.remove("is-shuffling");
    topicEl.classList.remove("reveal");
    void topicEl.offsetWidth; // restart animation
    topicEl.classList.add("reveal");
    statusEl.textContent = "Topic ready";
    busy = false;
  }

  function shuffle() {
    if (busy) return;
    if (!topics.length) { setTopic("Add a topic"); return; }
    busy = true;

    // The lock decides the outcome; the animation looks the same either way.
    const final = locked || pick(current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || topics.length < 2) return reveal(final);

    statusEl.textContent = "Shuffling";
    document.body.classList.add("is-shuffling");
    let delay = 45;
    let shown = current;
    (function tick() {
      if (delay > 240) return reveal(final);
      let next = pick(shown);
      if (next === final && topics.length > 2) next = pick(final);
      setTopic(next);
      shown = next;
      delay *= 1.13;
      setTimeout(tick, delay);
    })();
  }

  $("newTopic").addEventListener("click", shuffle);

  // Mode toggle (visual only)
  const mode = document.querySelector(".mode");
  mode.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;
    mode.dataset.mode = btn.dataset.mode;
    mode.querySelectorAll(".mode-btn").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on);
    });
  });

  // Secret door: double-click / double-tap "Begin research"
  let lastTap = 0;
  $("beginResearch").addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 450) { lastTap = 0; openPanel(); }
    else lastTap = now;
  });

  // ---------- Hidden panel ----------
  const panel = $("panel");
  const list = $("list");
  const filter = $("filter");
  const addInput = $("addInput");

  function openPanel() {
    renderList();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-open"));
  }
  function closePanel() {
    panel.classList.remove("is-open");
    setTimeout(() => { if (!panel.classList.contains("is-open")) panel.hidden = true; }, 260);
  }

  function renderLock() {
    $("lockCard").classList.toggle("is-on", !!locked);
    $("lockText").textContent = locked || "None — picks are random";
    $("unlockBtn").hidden = !locked;
    $("count").textContent = `${topics.length} topic${topics.length === 1 ? "" : "s"}`;
    list.querySelectorAll(".row").forEach((li) => {
      const on = !!locked && topics[+li.dataset.i] === locked;
      li.classList.toggle("is-locked", on);
      const pickBtn = li.querySelector(".row-pick");
      if (pickBtn) pickBtn.setAttribute("aria-pressed", on);
    });
  }

  function renderList() {
    const q = filter.value.trim().toLowerCase();
    const frag = document.createDocumentFragment();
    topics.forEach((t, i) => {
      if (q && !t.toLowerCase().includes(q)) return;
      const li = document.createElement("li");
      li.className = "row";
      li.dataset.i = i;
      li.innerHTML =
        '<button type="button" class="row-pick" data-act="lock" title="Click to lock / unlock"><svg class="i"><use href="#i-lock"/></svg><span class="row-text"></span><span class="row-badge">Locked</span></button>' +
        '<button type="button" class="row-btn" data-act="edit" title="Edit" aria-label="Edit topic"><svg class="i"><use href="#i-pencil"/></svg></button>' +
        '<button type="button" class="row-btn row-del" data-act="del" title="Delete" aria-label="Delete topic"><svg class="i"><use href="#i-trash"/></svg></button>';
      li.querySelector(".row-text").textContent = t;
      frag.appendChild(li);
    });
    list.replaceChildren(frag);
    if (!list.children.length) {
      list.innerHTML = `<li class="empty">${topics.length ? "No matches" : "No topics yet — add one above"}</li>`;
    }
    renderLock();
  }

  // Click topic = lock / unlock · pencil = edit · trash = delete
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const li = btn.closest(".row");
    const i = +li.dataset.i;
    const t = topics[i];
    if (btn.dataset.act === "lock") {
      locked = locked === t ? "" : t;
      save(); renderLock();
    } else if (btn.dataset.act === "edit") {
      startEdit(li, i);
    } else {
      topics.splice(i, 1);
      if (locked === t && !topics.includes(t)) locked = "";
      save(); renderList();
    }
  });

  // Inline edit: Enter or click away saves, Esc cancels, empty deletes
  function startEdit(li, i) {
    const old = topics[i];
    const input = Object.assign(document.createElement("input"), { className: "row-input", value: old });
    input.setAttribute("aria-label", "Edit topic");
    li.querySelector(".row-pick").replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      const val = input.value.trim();
      if (commit && val !== old) {
        if (!val) {
          topics.splice(i, 1);
          if (locked === old && !topics.includes(old)) locked = "";
        } else {
          topics[i] = val;
          if (locked === old) locked = val;
          if (current === old) { current = val; setTopic(val); }
        }
        save();
      }
      renderList();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") { e.stopPropagation(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
  }

  // Add (one or many — one per line)
  function autosize() {
    addInput.style.height = "auto";
    addInput.style.height = Math.min(addInput.scrollHeight + 2, 140) + "px";
  }
  addInput.addEventListener("input", autosize);
  addInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("addForm").requestSubmit(); }
  });
  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const items = [...new Set(clean(addInput.value.split("\n")))].filter((t) => !topics.includes(t));
    addInput.value = "";
    autosize();
    if (!items.length) return;
    topics.unshift(...items);
    filter.value = "";
    save(); renderList();
    list.scrollTop = 0;
  });

  filter.addEventListener("input", renderList);

  $("unlockBtn").addEventListener("click", () => { locked = ""; save(); renderLock(); });

  // Export a fresh topics.js (topics + current lock)
  $("exportBtn").addEventListener("click", () => {
    const body =
`/* Offscript topics
   ----------------
   Edit freely: one topic per line, in quotes, followed by a comma.
   (Or use the hidden panel and click "Export topics.js" to regenerate this file.)

   LOCKED_TOPIC: exact topic text that every "New Topic" click should land on,
   or "" for normal random picks. */

window.TOPICS = [
${topics.map((t) => "  " + JSON.stringify(t) + ",").join("\n")}
];

window.LOCKED_TOPIC = ${JSON.stringify(locked)};
`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "topics.js" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  // Reset to topics.js (two clicks, no popup)
  let resetArmed = 0;
  $("resetBtn").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (Date.now() - resetArmed < 3000) {
      resetArmed = 0;
      store.del(KEY_TOPICS);
      store.del(KEY_LOCKED);
      load();
      filter.value = "";
      renderList();
      b.textContent = "Reset to file";
      return;
    }
    resetArmed = Date.now();
    b.textContent = "Click again to reset";
    setTimeout(() => { if (Date.now() - resetArmed >= 3000) b.textContent = "Reset to file"; }, 3050);
  });

  // Close
  $("panelClose").addEventListener("click", closePanel);
  panel.addEventListener("click", (e) => { if (e.target === panel) closePanel(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closePanel(); });

  // ---------- Start ----------
  load();
  current = pick(locked) || "Add a topic";
  setTopic(current);
})();
