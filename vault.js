/* ==========================================================
   ZERO-DAY - vault.js (Crypt Vault page)
   Three tools: password tester, link detoxifier, audio tap.
   Everything runs in the browser. Nothing is sent or saved.
   ========================================================== */
(() => {
  "use strict";
  const { $, $$, toast, copy } = window.ZD;
  const scene = $("#vaultScene");
  if (!scene) return;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ======================================================
     1. PASSWORD VAULT
     ====================================================== */
  const COMMON = new Set(["password", "123456", "12345678", "123456789", "qwerty", "abc123", "111111", "iloveyou", "admin", "welcome", "monkey", "dragon", "letmein", "login", "india", "india123", "password1", "qwerty123", "1q2w3e4r", "sunshine", "princess", "football", "cricket", "krishna", "shiva", "sachin", "virat", "mumbai", "delhi", "12345", "1234567", "1234567890", "000000", "123123", "654321", "passw0rd", "admin123", "test123", "hello123", "abcd1234", "pass1234", "root", "guest", "user", "changeme", "secret", "master", "freedom", "whatever", "trustno1", "baseball", "superman", "batman", "naruto", "pokemon", "bhagwan", "jaishreeram", "ramram", "qazwsx", "iloveu", "lovely", "ashley", "shadow", "michael", "jordan"]);
  const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
  const LEET = { 0: "o", 1: "l", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };
  const GPU_RATE = 1e11;
  const ONLINE_RATE = 100;

  function isCommon(pw) {
    const lower = pw.toLowerCase();
    const unleet = lower.replace(/[013457@$!]/g, (c) => LEET[c] || c);
    const trim = (s) => s.replace(/[^a-z]+$/, "");
    return [lower, unleet, trim(lower), trim(unleet)].some((v) => v.length >= 3 && COMMON.has(v));
  }

  /* how many characters actually add strength? repeats, runs and keyboard rows add almost nothing */
  function effectiveLength(pw) {
    const s = pw.toLowerCase();
    let eff = 0, i = 0;
    while (i < s.length) {
      let j = i;
      while (j + 1 < s.length && s[j + 1] === s[i]) j++;
      if (j - i >= 2) { eff += 1; i = j + 1; continue; }
      if (i + 2 < s.length) {
        const d = s.charCodeAt(i + 1) - s.charCodeAt(i);
        if ((d === 1 || d === -1) && s.charCodeAt(i + 2) - s.charCodeAt(i + 1) === d) {
          let k = i + 2;
          while (k + 1 < s.length && s.charCodeAt(k + 1) - s.charCodeAt(k) === d) k++;
          eff += 2; i = k + 1; continue;
        }
      }
      const chunk = s.slice(i, i + 4);
      const walk = chunk.length === 4 && ROWS.some((r) => r.includes(chunk) || r.split("").reverse().join("").includes(chunk));
      if (walk) {
        let k = i + 3;
        while (k + 1 < s.length && ROWS.some((r) => r.includes(s.slice(k - 2, k + 2)) || r.split("").reverse().join("").includes(s.slice(k - 2, k + 2)))) k++;
        eff += 2; i = k + 1; continue;
      }
      eff += 1; i++;
    }
    return eff;
  }

  function analyse(pw) {
    if (!pw) return null;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^\w\s]|_/.test(pw)) pool += 33;
    if (/\s/.test(pw)) pool += 1;
    if (/[^\x00-\x7f]/.test(pw)) pool += 100;
    const common = isCommon(pw);
    const eff = effectiveLength(pw);
    let bits = Math.min(eff * Math.log2(Math.max(pool, 2)), 400);
    if (common) bits = Math.min(bits, 10);
    const guesses = Math.pow(2, bits) / 2;
    return { pool, common, eff, bits, guesses, len: [...pw].length };
  }

  function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }
  function formatTime(sec) {
    if (sec < 1) return "Instantly";
    if (sec < 60) return plural(Math.round(sec), "second");
    if (sec < 3600) return plural(Math.round(sec / 60), "minute");
    if (sec < 86400) return plural(Math.round(sec / 3600), "hour");
    const days = sec / 86400;
    if (days < 365) return plural(Math.round(days), "day");
    const years = days / 365.25;
    if (years < 1000) return plural(Math.round(years), "year");
    if (years < 1e6) return `${Math.round(years / 1e3).toLocaleString("en-IN")} thousand years`;
    if (years < 1e9) return `${Math.round(years / 1e6).toLocaleString("en-IN")} million years`;
    if (years < 1.38e10) return `${Math.round(years / 1e9).toLocaleString("en-IN")} billion years`;
    return "Longer than the universe has existed";
  }

  const LEVELS = [
    { max: 1, bars: 1, state: "weak", open: "50deg", color: "var(--alert)", head: "Weak", note: "A GPU cluster opens this almost at once.", room: "Breached: easy to guess" },
    { max: 3600, bars: 2, state: "weak", open: "38deg", color: "var(--alert)", head: "Weak", note: "Falls in under an hour on a stolen database.", room: "Breached: easy to guess" },
    { max: 3.156e7, bars: 3, state: "fair", open: "20deg", color: "var(--evidence)", head: "Fair", note: "Holds for now, but a determined attacker could win.", room: "Door giving way" },
    { max: 3.156e10, bars: 4, state: "strong", open: "6deg", color: "var(--safe)", head: "Strong", note: "Out of reach for a normal attacker.", room: "Holding" },
    { max: Infinity, bars: 5, state: "vault", open: "0deg", color: "var(--safe)", head: "Vault grade", note: "Sealed. Use a different one on every site.", room: "Vault sealed" },
  ];

  const pwInput = $("#pwInput");
  const meterBars = $$("#meter i");
  function renderPassword() {
    const pw = pwInput.value;
    const a = analyse(pw);
    const room = $("#vaultRoom");
    $("#copyBtn").disabled = !pw;
    if (!a) {
      scene.dataset.state = "";
      scene.style.setProperty("--open", "70deg");
      scene.style.setProperty("--spin", "0deg");
      room.textContent = "Type a password to test it";
      $("#vaultState").textContent = "Waiting for a password";
      $("#vaultNote").textContent = "The door opens wider the weaker your password is.";
      $("#tOnline").textContent = "-";
      $("#tGpu").textContent = "-";
      $("#pwLen").textContent = "0 characters";
      $("#pwBits").textContent = "-";
      meterBars.forEach((b) => b.classList.remove("on"));
      $("#pwTips").innerHTML = "";
      return;
    }
    const gpuSec = a.guesses / GPU_RATE;
    const onlineSec = a.guesses / ONLINE_RATE;
    const lvl = LEVELS.find((l) => gpuSec < l.max);
    scene.dataset.state = lvl.state;
    scene.style.setProperty("--open", lvl.open);
    scene.style.setProperty("--spin", lvl.bars * 72 + "deg");
    room.textContent = lvl.room;
    $("#vaultState").textContent = lvl.head;
    $("#vaultNote").textContent = lvl.note;
    $("#tOnline").textContent = formatTime(onlineSec);
    $("#tGpu").textContent = formatTime(gpuSec);
    $("#pwLen").textContent = plural(a.len, "character");
    $("#pwBits").textContent = `about ${Math.round(a.bits)} bits`;
    $("#meter").style.setProperty("--glow-c", lvl.color);
    meterBars.forEach((b, i) => b.classList.toggle("on", i < lvl.bars));

    const tips = [];
    if (a.common) tips.push("This is one of the first passwords attackers try, even with small changes.");
    if (a.len < 12) tips.push("Use at least 12 characters. Length matters more than tricks.");
    if (a.eff < a.len - 1 && !a.common) tips.push("Repeats and runs like 1234 or qwerty add almost nothing.");
    if (/^\d+$/.test(pw)) tips.push("Digits only is the easiest kind to guess.");
    else if (a.pool < 60 && a.len >= 8 && !a.common) tips.push("Mix upper and lower case, numbers and symbols, or use a long random phrase.");
    tips.push("Never reuse one password on two sites.");
    $("#pwTips").innerHTML = tips.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join("");
  }
  pwInput.addEventListener("input", renderPassword);
  renderPassword();

  $("#pwShow").addEventListener("click", (e) => {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    e.currentTarget.setAttribute("aria-pressed", String(show));
    e.currentTarget.textContent = show ? "Hide" : "Show";
  });

  const CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?";
  function generate(len = 16) {
    if (!window.crypto || !window.crypto.getRandomValues) return "";
    const limit = Math.floor(256 / CHARS.length) * CHARS.length;
    for (let attempt = 0; attempt < 50; attempt++) {
      const out = [];
      const buf = new Uint8Array(len * 2);
      while (out.length < len) {
        window.crypto.getRandomValues(buf);
        for (const b of buf) if (b < limit && out.length < len) out.push(CHARS[b % CHARS.length]);
      }
      const s = out.join("");
      if (/[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s)) return s;
    }
    return "";
  }
  $("#genBtn").addEventListener("click", () => {
    const pw = generate(16);
    if (!pw) { toast("This browser cannot make secure random numbers.", "error"); return; }
    pwInput.type = "text";
    $("#pwShow").setAttribute("aria-pressed", "true");
    $("#pwShow").textContent = "Hide";
    pwInput.value = pw;
    renderPassword();
    toast("Made here with your browser's secure random generator. Copy it into a password manager.");
  });
  $("#copyBtn").addEventListener("click", async () => {
    if (!pwInput.value) return;
    toast((await copy(pwInput.value)) ? "Copied." : "Copy failed. Select the text and copy it yourself.", "success");
  });

  /* ======================================================
     2. LINK DETOXIFIER
     ====================================================== */
  const TRACKERS = ["fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "igshid", "igsh", "mc_eid", "mc_cid", "_ga", "_gl", "mkt_tok", "ref_src", "ref_url", "spm", "scid", "vero_id", "oly_enc_id", "s_cid", "cmpid", "trk", "trkid"];
  const isTracker = (k) => /^utm_/i.test(k) || TRACKERS.includes(k.toLowerCase());
  const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "rb.gy", "cutt.ly", "is.gd", "ow.ly", "shorturl.at", "tiny.cc", "rebrand.ly", "t.ly"]);
  const BAD_TLDS = new Set(["zip", "mov", "xyz", "top", "click", "tk", "gq", "ml", "cf", "ga", "work", "loan", "country", "kim", "men", "buzz", "rest", "fit", "monster"]);
  const BRANDS = ["paytm", "phonepe", "gpay", "googlepay", "sbi", "hdfc", "icici", "axis", "kotak", "upi", "npci", "irctc", "amazon", "flipkart", "google", "microsoft", "apple", "paypal", "whatsapp", "facebook", "instagram", "netflix", "jio", "airtel", "aadhaar", "uidai", "incometax", "epfo", "fedex", "dtdc"];
  const WORDS = ["login", "verify", "kyc", "otp", "update", "secure", "reward", "claim", "refund", "prize", "gift", "bonus", "suspend", "blocked", "pan", "aadhaar", "free", "urgent"];
  const SECOND = new Set(["co", "com", "org", "net", "gov", "edu", "ac", "nic", "res"]);

  function checkLink(raw) {
    const s = raw.trim();
    if (!s) return { error: "Paste a link first." };
    if (/^(javascript|data|vbscript|file|blob):/i.test(s)) {
      return { findings: [{ sev: "high", text: "This is not a normal web link. It can run code or open local data. Do not use it." }], bad: true, cleaned: "", removed: [], host: "" };
    }
    if (/\s/.test(s)) return { error: "That does not look like a web address. Links have no spaces." };
    const hadScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s);
    let u;
    try { u = new URL(hadScheme ? s : "https://" + s); } catch (e) { return { error: "That does not look like a web address. Check it and try again." }; }
    if (!/^https?:$/.test(u.protocol)) return { error: "Only web links (http or https) can be checked." };
    if (!(/^[a-z0-9.-]+$/i.test(u.hostname) && u.hostname.includes(".")) && !u.hostname.startsWith("[")) return { error: "That does not look like a web address. Check it and try again." };

    const findings = [];
    const add = (sev, text) => findings.push({ sev, text });
    const host = u.hostname.toLowerCase();
    const labels = host.split(".");
    const tld = labels[labels.length - 1];
    const threePart = labels.length >= 3 && SECOND.has(labels[labels.length - 2]) && tld.length === 2;
    const registrable = labels.slice(threePart ? -3 : -2).join(".");
    const core = labels[labels.length - (threePart ? 3 : 2)] || host;

    if (u.username || u.password) add("high", `Text before an "@" is a classic disguise. The real site is "${host}", not what comes first.`);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) add("high", "The address is raw numbers instead of a name. Real businesses almost never do this.");
    if (labels.some((l) => l.startsWith("xn--"))) add("high", "The name uses look-alike characters from another alphabet to imitate a real site.");

    const brand = BRANDS.find((b) => host.includes(b));
    if (brand) {
      if (core === brand) { /* looks like the brand's own domain; we cannot verify ownership */ }
      else if (core.includes(brand)) add("medium", `The name contains "${brand}" but the real domain is "${registrable}". Brand names are often stuffed into other addresses.`);
      else add("high", `It pretends to be "${brand}" but the real domain is "${registrable}".`);
    }
    if (SHORTENERS.has(host)) add("medium", "A shortened link hides where it really goes. Be careful before opening it.");
    if (BAD_TLDS.has(tld)) add("medium", `The ending ".${tld}" is cheap and common in scam links. That is a hint, not proof.`);
    if (hadScheme && u.protocol === "http:") add("medium", "The link is not encrypted (http, not https). Never enter a password or card on it.");
    if (labels.length - (threePart ? 3 : 2) >= 3) add("low", "A very long chain of sub-names is used to hide the real domain at the end.");
    if ((host.match(/-/g) || []).length >= 3) add("low", "Lots of hyphens in the name is a common pattern in fake sites.");
    if (u.port) add("low", `It uses an unusual port (${u.port}).`);

    const hay = (u.pathname + " " + u.search).toLowerCase();
    const hits = WORDS.filter((w) => hay.includes(w));
    if (hits.length >= 2) add("medium", `Pressure words in the link: ${hits.slice(0, 4).join(", ")}. Scam messages love these.`);
    else if (hits.length === 1) add("low", `The link contains "${hits[0]}", a word scam messages often use.`);

    const params = [...u.searchParams.entries()];
    if (params.some(([, v]) => /^https?:\/\//i.test(v))) add("medium", "This link carries another link inside it, a trick used to bounce you to a different site.");
    if (s.length > 120) add("low", "The link is unusually long.");

    const removed = [];
    const cleanUrl = new URL(u.toString());
    params.forEach(([k]) => { if (isTracker(k)) { removed.push(k); cleanUrl.searchParams.delete(k); } });
    let cleaned = cleanUrl.toString();
    if (!cleanUrl.search) cleaned = cleaned.replace(/\?$/, "");
    if (!hadScheme) cleaned = cleaned.replace(/^https:\/\//, "");

    const score = findings.reduce((n, f) => n + (f.sev === "high" ? 3 : f.sev === "medium" ? 2 : 1), 0);
    const bad = findings.some((f) => f.sev === "high") || score >= 4;
    const warn = !bad && score >= 2;
    return { findings, bad, warn, cleaned, removed: [...new Set(removed)], host };
  }

  const urlOut = $("#urlOut");
  const ICONS = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
  };
  function renderLink(res) {
    urlOut.hidden = false;
    if (res.error) { urlOut.innerHTML = `<div class="verdict warn">${ICONS.warn}<div><b>Cannot check this</b><span>${esc(res.error)}</span></div></div>`; return; }
    const cls = res.bad ? "bad" : res.warn ? "warn" : "ok";
    const head = res.bad ? "Looks dangerous" : res.warn ? "Be careful" : "Nothing odd in the shape";
    const sub = res.bad ? "Several signs match common scam links. Do not open it or enter any details."
      : res.warn ? "A few warning signs. Confirm with the sender through another channel first."
      : "This only checks the shape of the address. It cannot prove a site is safe.";
    let html = `<div class="verdict ${cls}">${ICONS[cls]}<div><b>${head}</b><span>${sub}</span></div></div>`;
    if (res.findings.length) html += `<div><p class="out-label">What we noticed</p><div class="findings">${res.findings.map((f) => `<div class="finding ${f.sev}"><span class="sev"></span><span>${esc(f.text)}</span></div>`).join("")}</div></div>`;
    if (res.cleaned) {
      html += `<div><p class="out-label">Cleaned link${res.removed.length ? "" : " (no tracking found)"}</p><div class="clean-box"><code>${esc(res.cleaned)}</code><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(res.cleaned)}">Copy</button></div></div>`;
    }
    if (res.removed.length) html += `<div><p class="out-label">Tracking removed (${res.removed.length})</p><div class="removed">${res.removed.map((r) => `<code>${esc(r)}</code>`).join("")}</div></div>`;
    urlOut.innerHTML = html;
  }
  $("#urlForm").addEventListener("submit", (e) => { e.preventDefault(); renderLink(checkLink($("#urlInput").value)); });
  $("#urlSample").addEventListener("click", () => {
    $("#urlInput").value = "http://paytm.secure-kyc-update.top/login?otp=verify&utm_source=sms&fbclid=A1b2C3&gclid=zz99";
    renderLink(checkLink($("#urlInput").value));
  });
  urlOut.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (b) toast((await copy(b.dataset.copy)) ? "Cleaned link copied." : "Copy failed.", "success");
  });

  /* ======================================================
     3. AUDIO TAP
     ====================================================== */
  const canvas = $("#tapCanvas");
  const g = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const status = $("#tapStatus");
  const btnSynth = $("#tapSynth"), btnMic = $("#tapMic"), btnStop = $("#tapStop");
  let ac = null, analyser = null, stream = null, nodes = [], raf = 0, micMode = false;

  function sizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, canvas.clientWidth * dpr);
    canvas.height = Math.max(120, canvas.clientHeight * dpr);
  }
  function clearCanvas() { if (g) { sizeCanvas(); g.clearRect(0, 0, canvas.width, canvas.height); } }

  function stopTap(message) {
    cancelAnimationFrame(raf); raf = 0;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    nodes.forEach((n) => { try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ } });
    nodes = [];
    if (ac) { try { ac.close(); } catch (e) { /* ignore */ } ac = null; }
    analyser = null;
    btnSynth.disabled = false; btnMic.disabled = false; btnStop.disabled = true;
    clearCanvas();
    status.textContent = message || "Stopped. Nothing was recorded.";
  }

  function draw() {
    if (!analyser || !g) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const w = canvas.width, h = canvas.height, bars = 40, gap = 4;
    const bw = (w - gap * (bars - 1)) / bars;
    g.clearRect(0, 0, w, h);
    const usable = Math.floor(data.length * 0.7);
    let peak = 0;
    for (let i = 0; i < bars; i++) {
      const v = data[Math.floor((i / bars) * usable)] / 255;
      peak = Math.max(peak, v);
      const bh = Math.max(4, v * (h - 8));
      const grad = g.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, "#a56bff");
      grad.addColorStop(1, v > 0.7 ? "#ff3d5a" : "#ffd23f");
      g.fillStyle = grad;
      const x = i * (bw + gap);
      g.beginPath();
      if (g.roundRect) g.roundRect(x, h - bh, bw, bh, 4); else g.rect(x, h - bh, bw, bh);
      g.fill();
    }
    if (micMode) status.textContent = peak > 0.15 ? "Listening: sound picked up. This is what an app with mic access hears." : "Listening: quiet. Speak or clap and watch the bars.";
    raf = requestAnimationFrame(draw);
  }

  function startContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !g) { status.textContent = "This browser cannot draw audio. Try Chrome, Edge or Firefox."; return false; }
    ac = new AC();
    analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    const mute = ac.createGain();
    mute.gain.value = 0;
    analyser.connect(mute);
    mute.connect(ac.destination);
    nodes.push(mute);
    sizeCanvas();
    return true;
  }
  function afterStart() {
    btnSynth.disabled = true; btnMic.disabled = true; btnStop.disabled = false;
    if (ac && ac.state === "suspended") ac.resume();
    raf = requestAnimationFrame(draw);
  }

  btnSynth.addEventListener("click", () => {
    stopTap();
    if (!startContext()) return;
    micMode = false;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.35;
    const lfoGain = ac.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    [[110, "sawtooth"], [220, "square"], [330, "sawtooth"], [440, "triangle"]].forEach(([f, type], i) => {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
      lfoGain.connect(o.frequency);
      const gn = ac.createGain(); gn.gain.value = 0.25 / (i + 1);
      o.connect(gn); gn.connect(analyser);
      o.start(); nodes.push(o);
    });
    lfo.start(); nodes.push(lfo);
    status.textContent = "Playing a silent test signal. No sound comes out of your speakers.";
    afterStart();
  });

  btnMic.addEventListener("click", async () => {
    stopTap();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = "This browser or page cannot use the microphone. Open the site over https or from a local file in a modern browser.";
      return;
    }
    status.textContent = "Waiting for your permission...";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      status.textContent = e && e.name === "NotAllowedError"
        ? "Microphone blocked. That is the point: your browser asked first, and you stayed in control."
        : "No microphone could be opened on this device.";
      return;
    }
    if (!startContext()) { stopTap(); return; }
    micMode = true;
    ac.createMediaStreamSource(stream).connect(analyser);
    afterStart();
  });

  btnStop.addEventListener("click", () => stopTap());
  document.addEventListener("visibilitychange", () => { if (document.hidden && raf) stopTap("Stopped because you left the tab."); });
  window.addEventListener("pagehide", () => { if (raf) stopTap(); });
  window.addEventListener("resize", () => { if (!raf) clearCanvas(); });
  clearCanvas();
})();
