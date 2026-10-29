/* ==========================================================
   ZERO-DAY - xray.js (UV Lab page)
   Idea: the fake shop is copied once. The copy is painted in
   "UV colours" and sits on top, but a CSS mask only shows the
   part under the torch. Moving the mouse moves the mask.
   ========================================================== */
(() => {
  "use strict";
  const { $, $$, toast } = window.ZD;
  const stage = $("#stage");
  if (!stage) return;

  const wrap = $("#shopWrap");
  const shop = $("#shop");
  const list = $("#clues");

  /* the 8 hidden tricks. "id" matches data-trap in the HTML */
  const CLUES = [
    { id: "social", title: "Fake crowd", what: "\"47 people are viewing this\" is often just a random number. It makes you feel you must hurry.", tip: "Ignore it. Trust reviews from verified buyers, not counters." },
    { id: "mrp", title: "Invented original price", what: "The ₹4,999 price was never charged. A huge discount is made up by crossing out a fake price.", tip: "Search the same product in two trusted shops and compare." },
    { id: "stock", title: "Fake scarcity", what: "\"Only 2 left\" stays at 2 for every visitor. It pushes you to buy before you think.", tip: "Come back in ten minutes. A real stock count changes." },
    { id: "timer", title: "Clock that resets", what: "Reload the page and the timer starts again. The offer never actually ends.", tip: "Real sales have an end date, not a ticking clock." },
    { id: "addon", title: "Pre-ticked extra", what: "The ₹99 protection plan was added for you. Many people never notice it.", tip: "Read every ticked box before you pay." },
    { id: "fee", title: "Hidden fees", what: "Delivery says FREE, but ₹78 of charges sit in tiny grey text.", tip: "Always compare the first price with the final screen." },
    { id: "total", title: "Price that jumps", what: "The total says ₹499 but the button says ₹676: 499 + 99 + 49 + 29.", tip: "Screenshot the price before paying so you can prove the difference." },
    { id: "cancel", title: "Guilt-trip exit", what: "The only way out is tiny text that shames you. This is called confirmshaming.", tip: "Close the tab. You do not owe a shop an explanation." },
  ];

  /* ---------- build the UV copy of the shop ---------- */
  const uv = document.createElement("div");
  uv.className = "uv-layer";
  uv.setAttribute("aria-hidden", "true");
  uv.setAttribute("inert", "");
  const clone = shop.cloneNode(true);
  clone.removeAttribute("id");
  $$("[id]", clone).forEach((el) => el.removeAttribute("id"));
  uv.appendChild(clone);
  const glow = document.createElement("div");
  glow.className = "torch-glow";
  glow.setAttribute("aria-hidden", "true");
  wrap.append(uv, glow);

  /* ---------- torch ---------- */
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const radius = coarse ? 92 : 120;
  const found = new Set();
  let touchTimer = 0;

  function setTorch(x, y, on) {
    [uv, glow].forEach((el) => {
      el.style.setProperty("--tx", x + "px");
      el.style.setProperty("--ty", y + "px");
      el.style.setProperty("--r", on ? radius + "px" : "1px");
    });
    glow.classList.toggle("on", on);
  }
  setTorch(0, 0, false);

  function trapsTouchedBy(x, y) {
    const wr = wrap.getBoundingClientRect();
    return $$("[data-trap]", shop).filter((el) => {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - wr.left - x, 0, x - (r.right - wr.left));
      const dy = Math.max(r.top - wr.top - y, 0, y - (r.bottom - wr.top));
      return Math.hypot(dx, dy) < radius * 0.55;
    }).map((el) => el.dataset.trap);
  }

  function move(e) {
    const wr = wrap.getBoundingClientRect();
    const x = e.clientX - wr.left;
    const y = e.clientY - wr.top;
    setTorch(x, y, true);
    trapsTouchedBy(x, y).forEach((id) => discover(id, false));
  }
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", move);
  stage.addEventListener("pointerleave", () => setTorch(0, 0, false));
  stage.addEventListener("pointercancel", () => setTorch(0, 0, false));
  stage.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch") {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => setTorch(0, 0, false), 700);
    }
  });

  /* ---------- case file ---------- */
  list.innerHTML = CLUES.map((c, i) => `<li class="clue" data-id="${c.id}" tabindex="-1"></li>`).join("");
  const items = Object.fromEntries($$(".clue", list).map((li) => [li.dataset.id, li]));

  function paint(id, focus) {
    const idx = CLUES.findIndex((c) => c.id === id);
    const c = CLUES[idx];
    const li = items[id];
    if (found.has(id)) {
      li.className = "clue found";
      li.innerHTML = `<h3>${c.title}</h3><p>${c.what}</p><p class="tip">What to do: ${c.tip}</p>`;
      if (focus) li.focus();
    } else {
      li.className = "clue";
      li.innerHTML = `<div class="locked-label"><span>Evidence slot ${idx + 1}: not found yet</span><button type="button" class="reveal-btn" data-reveal="${id}" aria-label="Reveal evidence slot ${idx + 1}">Reveal</button></div>`;
    }
  }
  CLUES.forEach((c) => paint(c.id));

  function updateProgress() {
    const n = found.size, total = CLUES.length;
    $("#progressFill").style.width = (n / total) * 100 + "%";
    $("#progress").setAttribute("aria-valuenow", String(n));
    $("#progressText").textContent = `${n} of ${total} pieces of evidence found`;
    $("#closed").hidden = n < total;
  }

  function discover(id, focus) {
    if (found.has(id)) return;
    found.add(id);
    paint(id, focus);
    updateProgress();
    if (found.size === CLUES.length) toast("Case closed. All eight tricks exposed.");
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-reveal]");
    if (b) discover(b.dataset.reveal, true);
  });

  /* ---------- tools under the stage ---------- */
  const allBtn = $("#uvAll");
  allBtn.addEventListener("click", () => {
    const on = !uv.classList.contains("all");
    uv.classList.toggle("all", on);
    glow.style.display = on ? "none" : "";
    allBtn.setAttribute("aria-pressed", String(on));
    allBtn.textContent = on ? "Hide the UV view" : "Show everything under UV";
  });
  $("#caseReset").addEventListener("click", () => {
    found.clear();
    CLUES.forEach((c) => paint(c.id));
    updateProgress();
    uv.classList.remove("all");
    glow.style.display = "";
    allBtn.setAttribute("aria-pressed", "false");
    allBtn.textContent = "Show everything under UV";
  });

  /* ---------- the shop itself ---------- */
  $("#payBtn").addEventListener("click", () => toast("Practice page: nothing is charged and there is no card form.", "error"));
  $("#cancelLink").addEventListener("click", (e) => { e.preventDefault(); toast("Smart move. Closing the tab is always free."); });

  /* the countdown deliberately resets, just like a fake one would */
  let left = 599;
  const vals = [...$$(".t-val", shop), ...$$(".t-val", clone)];
  const tick = () => {
    const m = String(Math.floor(left / 60)).padStart(2, "0");
    const s = String(left % 60).padStart(2, "0");
    vals.forEach((v) => { v.textContent = `${m}:${s}`; });
    left = left <= 0 ? 600 : left - 1;
  };
  tick();
  setInterval(tick, 1000);
})();
