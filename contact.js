/* ==========================================================
   ZERO-DAY - contact.js (Incident Desk)
   Two modes: report an incident (live case summary) or send a
   message. Nothing is sent or stored anywhere.
   ========================================================== */
(() => {
  "use strict";
  const { $, $$, toast, copy } = window.ZD;
  const form = $("#incidentForm");
  if (!form) return;

  const pad = (n) => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  /* ---------- incident types and the steps we suggest ---------- */
  const TYPES = {
    upi: { label: "UPI, card or bank fraud", steps: ["Call 1930 right away. Speed helps freeze the money.", "Tell your bank to block the card, UPI ID or account.", "Keep the transaction ID, date and receiver details.", "Report at cybercrime.gov.in and note the acknowledgement number."] },
    phishing: { label: "Phishing link or fake website", steps: ["Do not click or enter anything on it again.", "If you typed a password, change it and turn on two-step login.", "Screenshot the link and page before you close it.", "Report the link to the platform where you received it."] },
    job: { label: "Fake job or loan offer", steps: ["Stop paying any more fees or deposits.", "Save the offer letter, chats and payment receipts.", "Block the sender after you have saved the evidence.", "Report at cybercrime.gov.in and tell your bank about payments made."] },
    shop: { label: "Fake online shop", steps: ["Contact your bank or card provider about the payment.", "Save the product page, order message and receipt.", "Do not click links in follow-up messages from the shop.", "Report the shop link to the platform and to cybercrime.gov.in."] },
    account: { label: "Hacked account", steps: ["Change the password from a device you trust.", "Turn on two-step login and log out of other devices.", "Check the account for changes, messages and linked apps.", "Warn your contacts that messages from you may be fake."] },
    impersonation: { label: "Someone pretending to be me or an official", steps: ["Do not send money, OTPs or documents.", "Screenshot the profile, number and messages.", "Report the profile to the platform and block it.", "Report at cybercrime.gov.in, especially if documents were shared."] },
    other: { label: "Something else", steps: ["Write down the timeline while you still remember it.", "Save all messages, links and receipts.", "Do not delete anything from your phone.", "If money or documents were involved, call 1930."] },
  };

  /* ---------- validation ---------- */
  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Enter at least 2 characters."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email, like name@example.com."),
    phoneOpt: (v) => (!v.trim() || /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, "")) ? "" : "Enter a 10-digit mobile number starting with 6, 7, 8 or 9, or leave it empty."),
    type: (v) => (v ? "" : "Choose what kind of incident this was."),
    date: (v) => (!v ? "Pick the date it happened." : v > today() ? "The date cannot be in the future." : ""),
    amount: (v) => { if (!v.trim()) return ""; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e9 ? "" : "Enter an amount in rupees, or leave it empty."; },
    desc: (v) => (v.trim().length >= 20 ? "" : "Write at least 20 characters so the summary is useful."),
    message: (v) => (v.trim().length >= 15 ? "" : "Write at least 15 characters."),
  };
  function validateField(input, show = true) {
    const rule = rules[input.dataset.rule];
    const err = rule ? rule(input.value) : "";
    if (show) {
      const field = input.closest(".field");
      field.classList.toggle("invalid", Boolean(err));
      $(".error-msg", field).textContent = err;
      input.setAttribute("aria-invalid", String(Boolean(err)));
    }
    return !err;
  }
  function validateForm(f, show = true) {
    let first = null;
    $$("[data-rule]", f).forEach((i) => { if (!validateField(i, show) && !first) first = i; });
    if (show && first) first.focus();
    return !first;
  }
  function liveValidation(f, onChange) {
    $$("[data-rule]", f).forEach((i) => {
      i.addEventListener("blur", () => validateField(i));
      i.addEventListener("input", () => { if (i.closest(".field").classList.contains("invalid")) validateField(i); });
    });
    f.addEventListener("input", onChange);
    f.addEventListener("change", onChange);
  }

  $("#iDate").max = today();

  /* ---------- the live case summary ---------- */
  const rand = () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("").sort(() => Math.random() - 0.5).slice(0, 4).join("");
  const caseId = `ZD-${today().replace(/-/g, "")}-${rand()}`;
  $("#dCase").textContent = caseId;
  const filed = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  $("#dFiled").textContent = filed;

  function setDd(id, text) {
    const el = $(id);
    el.textContent = text || "Not given yet";
    el.classList.toggle("empty", !text);
  }

  function severity(type, amount) {
    const amt = Number(amount) || 0;
    let s = 0;
    if (amt > 0) s = amt < 5000 ? 1 : amt < 50000 ? 2 : 3;
    if ((type === "account" || type === "impersonation") && s < 1) s = 1;
    return ["Low", "Moderate", "High", "Critical"][s];
  }

  function state() {
    const phone = $("#iPhone").value.replace(/[\s-]/g, "");
    const email = $("#iEmail").value.trim();
    const amount = $("#iAmount").value.trim();
    const type = $("#iType").value;
    const date = $("#iDate").value;
    return {
      name: $("#iName").value.trim(),
      contact: [email, phone].filter(Boolean).join(" / "),
      type, typeLabel: type ? TYPES[type].label : "",
      date: date ? fmtDate(date) : "",
      amount: amount && Number(amount) >= 0 ? "₹" + Number(amount).toLocaleString("en-IN") : "",
      amountRaw: amount,
      desc: $("#iDesc").value.trim(),
      evidence: $$('input[name="evidence"]', form).map((c) => ({ text: c.value, on: c.checked })),
    };
  }

  function renderDossier() {
    const s = state();
    setDd("#dName", s.name);
    setDd("#dContact", s.contact);
    setDd("#dType", s.typeLabel);
    setDd("#dDate", s.date);
    setDd("#dAmount", s.amount || (s.type ? "None reported" : ""));
    const sev = severity(s.type, s.amountRaw);
    const chip = $("#dSeverity");
    chip.textContent = sev;
    chip.className = "sev-chip " + sev.toLowerCase();
    const desc = $("#dDesc");
    desc.textContent = s.desc || "Your description will appear here as you type.";
    desc.style.opacity = s.desc ? "1" : "0.55";
    $("#dEvidence").innerHTML = s.evidence.map((e) => `<li class="${e.on ? "done" : ""}">${e.text.replace(/</g, "&lt;")}${e.on ? "" : " (not available)"}</li>`).join("");
    const steps = s.type ? TYPES[s.type].steps : ["Choose the incident type to see suggested next steps."];
    $("#dSteps").innerHTML = steps.map((t) => `<li>${t}</li>`).join("");
    const ready = validateForm(form, false);
    const stamp = $("#dStamp");
    stamp.textContent = ready ? "Ready" : "Draft";
    stamp.classList.toggle("ready", ready);
    $("#descCount").textContent = `${$("#iDesc").value.length} / 800`;
  }
  liveValidation(form, renderDossier);
  renderDossier();

  /* ---------- export ---------- */
  function plainText() {
    const s = state();
    const sev = severity(s.type, s.amountRaw);
    return [
      "INCIDENT REPORT SUMMARY",
      `Case: ${caseId}`,
      `Filed: ${filed}`,
      "",
      `Reporter: ${s.name}`,
      `Contact: ${s.contact || "Not given"}`,
      `Type: ${s.typeLabel}`,
      `Date it happened: ${s.date}`,
      `Money lost: ${s.amount || "None reported"}`,
      `Severity: ${sev}`,
      "",
      "WHAT HAPPENED",
      s.desc,
      "",
      "EVIDENCE",
      ...s.evidence.map((e) => `[${e.on ? "x" : " "}] ${e.text}`),
      "",
      "NEXT STEPS",
      ...TYPES[s.type].steps.map((t) => `- ${t}`),
      "",
      "Note: this is a self-made summary, not an FIR or official complaint.",
      "To report cyber fraud call 1930 or visit cybercrime.gov.in.",
    ].join("\n");
  }
  function needValid() {
    if (validateForm(form, true)) return true;
    toast("Complete the highlighted fields first so the summary is useful.", "error");
    return false;
  }
  $("#dPrint").addEventListener("click", () => { if (needValid()) window.print(); });
  $("#dCopy").addEventListener("click", async () => {
    if (!needValid()) return;
    toast((await copy(plainText())) ? "Summary copied." : "Copy failed. Use Download instead.", "success");
  });
  $("#dDownload").addEventListener("click", () => {
    if (!needValid()) return;
    try {
      const url = URL.createObjectURL(new Blob([plainText()], { type: "text/plain;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `${caseId}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Summary downloaded.");
    } catch (e) { toast("Download is not supported here. Use Copy text.", "error"); }
  });

  /* ---------- tabs: incident <-> message ---------- */
  const tabI = $("#tabIncident"), tabM = $("#tabMessage");
  function setMode(mode) {
    const inc = mode === "incident";
    form.hidden = !inc;
    $("#messageWrap").hidden = inc;
    $("#dossierWrap").hidden = !inc;
    $("#messageSide").hidden = inc;
    tabI.setAttribute("aria-selected", String(inc));
    tabM.setAttribute("aria-selected", String(!inc));
    tabI.tabIndex = inc ? 0 : -1;
    tabM.tabIndex = inc ? -1 : 0;
  }
  tabI.addEventListener("click", () => setMode("incident"));
  tabM.addEventListener("click", () => setMode("message"));
  [tabI, tabM].forEach((t) => t.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = t === tabI ? tabM : tabI;
      setMode(next === tabI ? "incident" : "message");
      next.focus();
    }
  }));

  const msg = $("#messageForm");
  liveValidation(msg, () => {});
  msg.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm(msg, true)) { toast("Fix the highlighted fields and send again.", "error"); return; }
    $("#msgName").textContent = $("#mName").value.trim().split(" ")[0];
    msg.hidden = true;
    $("#msgSuccess").hidden = false;
    $("#msgSuccess").focus();
  });
  $("#msgAgain").addEventListener("click", () => {
    msg.reset();
    $$(".field", msg).forEach((f) => f.classList.remove("invalid"));
    msg.hidden = false;
    $("#msgSuccess").hidden = true;
    $("#mName").focus();
  });

  setMode("incident");
})();
