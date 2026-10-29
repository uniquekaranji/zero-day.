/* ==========================================================
   ZERO-DAY - recon.js (Home page)
   Reads what the browser freely exposes (no permission needed),
   shows it, and builds a "device fingerprint" from it.
   NOTHING is sent anywhere or saved.
   ========================================================== */
(() => {
  "use strict";
  const { $, $$, reduceMotion, sleep } = window.ZD;
  const grid = $("#readouts");
  if (!grid) return;

  /* tiny, fast string hash (cyrb53) -> number */
  function hash53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  const hex = (n, len = 8) => n.toString(16).toUpperCase().padStart(len, "0").slice(-len);

  /* ---------- helpers that read the browser ---------- */
  function parseBrowser() {
    const ua = navigator.userAgent || "";
    let browser = "Unknown browser";
    const m = (re) => { const r = ua.match(re); return r ? r[1].split(".")[0] : ""; };
    if (/Edg\//.test(ua)) browser = "Edge " + m(/Edg\/([\d.]+)/);
    else if (/OPR\//.test(ua)) browser = "Opera " + m(/OPR\/([\d.]+)/);
    else if (/Firefox\//.test(ua)) browser = "Firefox " + m(/Firefox\/([\d.]+)/);
    else if (/Chrome\//.test(ua)) browser = "Chrome " + m(/Chrome\/([\d.]+)/);
    else if (/Safari\//.test(ua)) browser = "Safari " + m(/Version\/([\d.]+)/);
    let os = "Unknown OS";
    if (/Windows NT/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Mac OS X/.test(ua)) os = "macOS";
    else if (/CrOS/.test(ua)) os = "ChromeOS";
    else if (/Linux/.test(ua)) os = "Linux";
    return { browser: browser.trim(), os };
  }

  function readGpu() {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return { value: "Hidden: WebGL is switched off in this browser", exposed: false };
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      let raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      raw = String(raw || "").trim();
      if (!raw) return { value: "Hidden: the browser returned nothing", exposed: false };
      let name = raw;
      const angle = raw.match(/^ANGLE \((.*)\)$/i);
      if (angle) {
        const parts = angle[1].split(",").map((s) => s.trim());
        name = parts[1] || parts[0];
      }
      name = name.replace(/Direct3D\d+.*$/i, "").replace(/vs_\d_\d.*$/i, "").replace(/\(0x[0-9a-f]+\)/gi, "").trim();
      const generic = !ext && /webkit|mozilla/i.test(raw);
      return generic
        ? { value: `Masked: only a generic label (${name})`, exposed: false }
        : { value: name, exposed: true };
    } catch (e) {
      return { value: "Hidden: the browser blocked this reading", exposed: false };
    }
  }

  function readCanvas() {
    try {
      const c = document.createElement("canvas");
      c.width = 260; c.height = 60;
      const x = c.getContext("2d");
      x.textBaseline = "top";
      x.font = "16px Arial";
      x.fillStyle = "#f60"; x.fillRect(100, 1, 62, 20);
      x.fillStyle = "#069"; x.fillText("ZERO-DAY fingerprint \u{1F50D}", 2, 15);
      x.fillStyle = "rgba(102,204,0,0.7)"; x.fillText("ZERO-DAY fingerprint \u{1F50D}", 4, 17);
      const data = c.toDataURL();
      if (!data || data.length < 100) throw new Error("blank");
      return { value: "Drawing signature " + hex(hash53(data), 8), exposed: true };
    } catch (e) {
      return { value: "Hidden: the browser blocked canvas reading", exposed: false };
    }
  }

  /* ---------- what we read ---------- */
  const probes = [
    {
      key: "battery", label: "Battery",
      why: "Level and charging state were once used to tell devices apart, which is why Firefox and Safari removed this.",
      run: async () => {
        if (!navigator.getBattery) return { value: "Hidden: this browser does not share battery data", exposed: false };
        const b = await navigator.getBattery();
        const fmt = () => `${Math.round(b.level * 100)}%, ${b.charging ? "charging" : "on battery"}`;
        return {
          value: fmt(), exposed: true, stable: false,
          live: (set) => {
            b.addEventListener("levelchange", () => set(fmt()));
            b.addEventListener("chargingchange", () => set(fmt()));
          },
        };
      },
    },
    { key: "gpu", label: "Graphics card", why: "The exact GPU model narrows down which kind of device you use.", run: async () => readGpu() },
    {
      key: "screen", label: "Screen",
      why: "Resolution and pixel density are a strong clue about your hardware.",
      run: async () => ({ value: `${screen.width} x ${screen.height}, ${window.devicePixelRatio || 1}x density, window ${window.innerWidth} x ${window.innerHeight}`, exposed: true }),
    },
    {
      key: "cpu", label: "Processor threads",
      why: "The number of CPU threads separates a basic phone from a gaming laptop.",
      run: async () => navigator.hardwareConcurrency
        ? { value: `${navigator.hardwareConcurrency} logical cores`, exposed: true }
        : { value: "Hidden: this browser does not share it", exposed: false },
    },
    {
      key: "memory", label: "Memory",
      why: "Rounded memory size is another small piece for the puzzle.",
      run: async () => navigator.deviceMemory
        ? { value: `About ${navigator.deviceMemory} GB (rounded by the browser)`, exposed: true }
        : { value: "Hidden: this browser does not share it", exposed: false },
    },
    {
      key: "software", label: "Browser and system",
      why: "Your exact browser version tells attackers which known bugs might work on you.",
      run: async () => {
        const p = parseBrowser();
        let os = p.os;
        const uad = navigator.userAgentData;
        if (uad && uad.platform) os = uad.platform;
        return { value: `${os}, ${p.browser}`, exposed: true, sub: `${os} / ${p.browser}` };
      },
    },
    {
      key: "network", label: "Network",
      why: "Connection type and speed show whether you are on mobile data, Wi-Fi or a slow line.",
      run: async () => {
        const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!c) return { value: "Hidden: this browser does not share it", exposed: false };
        const bits = [];
        if (c.effectiveType) bits.push(c.effectiveType.toUpperCase());
        if (typeof c.downlink === "number") bits.push(`about ${c.downlink} Mbps`);
        if (typeof c.rtt === "number") bits.push(`${c.rtt} ms delay`);
        return bits.length ? { value: bits.join(", "), exposed: true, stable: false } : { value: "Hidden: no details given", exposed: false };
      },
    },
    {
      key: "locale", label: "Time zone and language",
      why: "Time zone alone places you in a region. Combined with language it is a strong signal.",
      run: async () => {
        let tz = "";
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ }
        const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean).slice(0, 3).join(", ");
        return tz || langs ? { value: `${tz || "unknown zone"}, ${langs || "unknown language"}`, exposed: true } : { value: "Hidden", exposed: false };
      },
    },
    {
      key: "input", label: "Touch and pointer",
      why: "Tells a site whether you are on a phone, a tablet or a laptop with a mouse.",
      run: async () => {
        const touch = navigator.maxTouchPoints || 0;
        const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        return { value: `${touch} touch points, ${coarse ? "finger" : "mouse or trackpad"} as main pointer`, exposed: true };
      },
    },
    {
      key: "prefs", label: "Display preferences",
      why: "Your dark mode and reduced-motion choices are visible to every page you open.",
      run: async () => {
        const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
        return { value: `${mm("(prefers-color-scheme: dark)") ? "Dark" : "Light"} theme, motion ${mm("(prefers-reduced-motion: reduce)") ? "reduced" : "allowed"}`, exposed: true };
      },
    },
    { key: "canvas", label: "Canvas signature", why: "Every device draws shapes and text a tiny bit differently. That difference works like a signature.", run: async () => readCanvas() },
    {
      key: "storage", label: "Cookies and storage",
      why: "Trackers drop identifiers here, but fingerprinting works even when you clear them.",
      run: async () => {
        let ls = false;
        try { localStorage.setItem("zd_t", "1"); localStorage.removeItem("zd_t"); ls = true; } catch (e) { /* blocked */ }
        const cookies = navigator.cookieEnabled;
        return cookies || ls
          ? { value: `Cookies ${cookies ? "on" : "off"}, local storage ${ls ? "available" : "blocked"}`, exposed: true }
          : { value: "Blocked: cookies and storage are both off", exposed: false };
      },
    },
  ];

  /* ---------- build the cards ---------- */
  grid.innerHTML = probes.map((p) => `
    <article class="readout" data-key="${p.key}">
      <div class="readout-top"><h3>${p.label}</h3><span class="chip wait" data-chip>Waiting</span></div>
      <div class="val" data-val>-</div>
      <p class="why">${p.why}</p>
    </article>`).join("");

  const radar = $("#radar");
  const status = $("#reconStatus");
  const statusBox = $("#statusBox");
  const title = $("#targetTitle");
  const sub = $("#targetSub");
  const ring = $("#exposureRing");
  const num = $("#exposureNum");
  const verdict = $("#exposureVerdict");
  const verdictText = $("#exposureText");
  const fpValue = $("#fpValue");
  const scanBtn = $("#scanBtn");
  let running = false;

  const card = (key) => $(`.readout[data-key="${key}"]`, grid);

  function addBlip(i, exposed) {
    const a = ((i * 137.5) % 360) * (Math.PI / 180);
    const r = 22 + ((i * 29) % 26);
    const b = document.createElement("span");
    b.className = "blip" + (exposed ? "" : " shielded");
    b.style.left = 50 + r * Math.cos(a) + "%";
    b.style.top = 50 + r * Math.sin(a) + "%";
    radar.appendChild(b);
  }

  function setExposure(count, total) {
    const ratio = total ? count / total : 0;
    ring.style.strokeDashoffset = String(326.7 * (1 - ratio));
    num.textContent = `${count}/${total}`;
    ring.style.stroke = ratio >= 0.75 ? "var(--alert)" : ratio >= 0.45 ? "var(--evidence)" : "var(--safe)";
  }

  async function scan() {
    if (running) return;
    running = true;
    scanBtn.disabled = true;
    $$(".blip", radar).forEach((b) => b.remove());
    radar.classList.remove("idle");
    statusBox.classList.remove("done");
    status.textContent = "Scanning this device";
    title.textContent = "Scanning";
    title.classList.remove("found");
    sub.textContent = "Reading what your browser shares...";
    verdict.textContent = "Scanning";
    verdictText.textContent = "Counting what your browser exposes.";
    fpValue.textContent = "Calculating";
    setExposure(0, probes.length);
    probes.forEach((p) => {
      const c = card(p.key);
      c.className = "readout";
      $("[data-val]", c).textContent = "-";
      const chip = $("[data-chip]", c);
      chip.className = "chip wait";
      chip.textContent = "Waiting";
    });

    let exposedCount = 0;
    const stableParts = [];
    let softwareSub = "";
    let screenText = "";

    for (let i = 0; i < probes.length; i++) {
      const p = probes[i];
      const c = card(p.key);
      c.classList.add("scanning");
      if (!reduceMotion) await sleep(330);
      let res;
      try { res = await p.run(); } catch (e) { res = { value: "Hidden: the browser refused this reading", exposed: false }; }
      c.classList.remove("scanning");
      c.classList.add(res.exposed ? "exposed" : "shielded");
      $("[data-val]", c).textContent = res.value;
      const chip = $("[data-chip]", c);
      chip.className = "chip " + (res.exposed ? "exposed" : "shielded");
      chip.textContent = res.exposed ? "Exposed" : "Shielded";
      if (res.live) res.live((v) => { $("[data-val]", c).textContent = v; });
      if (res.exposed) exposedCount++;
      if (res.stable !== false) stableParts.push(p.key + "=" + res.value);
      if (p.key === "software") softwareSub = res.sub || "";
      if (p.key === "screen") screenText = `${screen.width}x${screen.height}`;
      addBlip(i, res.exposed);
      setExposure(exposedCount, probes.length);
    }

    /* results */
    title.textContent = "Target detected";
    title.classList.add("found");
    sub.textContent = [softwareSub, screenText].filter(Boolean).join(" / ") || "This device";
    const ratio = exposedCount / probes.length;
    if (ratio >= 0.75) { verdict.textContent = "Highly recognisable"; verdictText.textContent = "Your browser hands over most of what a tracker needs to spot you again."; }
    else if (ratio >= 0.45) { verdict.textContent = "Fairly recognisable"; verdictText.textContent = "Some readings are hidden, but enough remain to build a useful profile."; }
    else { verdict.textContent = "Mostly shielded"; verdictText.textContent = "Your browser is hiding a lot. Privacy settings or a privacy browser are working."; }
    fpValue.textContent = "ZD-" + hex(hash53(stableParts.join("|")), 4) + "-" + hex(hash53(stableParts.join("|"), 7), 4);
    statusBox.classList.add("done");
    status.textContent = `Scan complete: ${exposedCount} of ${probes.length} readings exposed`;
    radar.classList.add("idle");
    scanBtn.disabled = false;
    scanBtn.textContent = "Run the scan again";
    running = false;
  }

  scanBtn.addEventListener("click", scan);
  setTimeout(scan, 500);
})();
