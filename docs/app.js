/**
 * Aakh v1.1.0 — app.js
 * Self-contained inline SVG icons (no CDN dependency).
 * Fixes: icon rendering, pinned section visibility, health threshold, pin button.
 */

const DATA_URL  = "data/data.json";
const AUDIO_DIR = "audio/";
const PINS_KEY  = "aakh_pins";
const THEME_KEY = "aakh_theme";

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
// All icons: 24x24 viewBox, stroke-based, inherit currentColor.

const SVG = {
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,

  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,

  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,

  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,

  x: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  github: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,

  newspaper: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>`,

  trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 11 8 16 16 16 16 11"/><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><polyline points="6 4 6 14 18 14 18 4"/></svg>`,

  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,

  arrowleft: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>`,

  star: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

  rotateccw: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>`,

  skipforward: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`,

  play: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,

  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,

  inbox: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
};

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function lnk(href, cls) {
  const a = el("a", cls);
  a.href   = href && href.startsWith("http") ? href : "#";
  a.target = "_blank";
  a.rel    = "noopener noreferrer";
  return a;
}

function setHTML(parent, tag, cls, content) {
  const e = el(tag, cls);
  e.textContent = content;
  parent.appendChild(e);
  return e;
}

function svgEl(name) {
  const span = el("span", "svg-icon");
  span.innerHTML = SVG[name] || "";
  return span;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.innerHTML = SVG[theme === "dark" ? "sun" : "moon"];
    btn.title = theme === "dark" ? "Switch to light" : "Switch to dark";
  }
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
}

// ── Pins ──────────────────────────────────────────────────────────────────────

function getPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "{}"); }
  catch { return {}; }
}

function setPins(p) {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(p)); }
  catch (e) { console.warn("Pins save failed:", e); }
}

function togglePin(url, title) {
  if (!url || url === "#") return;
  const pins = getPins();
  if (pins[url]) delete pins[url];
  else pins[url] = { title, ts: Date.now() };
  setPins(pins);
  renderPinned();
  // sync all matching pin buttons on cards
  document.querySelectorAll(".pin-btn").forEach(btn => {
    if (btn.dataset.url === url) {
      btn.classList.toggle("pinned", !!getPins()[url]);
      btn.title = getPins()[url] ? "Unpin" : "Pin";
    }
  });
}

function renderPinned() {
  const section = document.getElementById("pinned-section");
  const list    = document.getElementById("pinned-list");
  if (!section || !list) return;

  const entries = Object.entries(getPins()).sort((a, b) => b[1].ts - a[1].ts);

  // Hide section completely when nothing is pinned
  if (!entries.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  // Set label icon
  const labelIcon = document.getElementById("pin-label-icon");
  if (labelIcon) labelIcon.innerHTML = SVG.bookmark;

  list.innerHTML = "";
  entries.forEach(([url, { title }]) => {
    const chip  = el("div", "pinned-chip");
    const a     = lnk(url, "pinned-chip-title");
    a.textContent = title;

    const removeBtn = el("button", "pinned-chip-remove");
    removeBtn.type  = "button";
    removeBtn.title = "Unpin";
    removeBtn.innerHTML = SVG.x;

    // Each button gets its own closure — no shared state, no delegation
    removeBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const pins = getPins();
      delete pins[url];
      setPins(pins);
      chip.remove();
      // Sync card button
      document.querySelectorAll(".pin-btn").forEach(btn => {
        if (btn.dataset.url === url) btn.classList.remove("pinned");
      });
      // Hide section if empty now
      if (!list.children.length) section.hidden = true;
    });

    chip.appendChild(a);
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

function makePinBtn(url, title) {
  const btn = el("button", `pin-btn${getPins()[url] ? " pinned" : ""}`);
  btn.dataset.url = url || "";
  btn.title = getPins()[url] ? "Unpin" : "Pin";
  btn.type  = "button";
  btn.innerHTML = SVG.bookmark;
  btn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(url, title);
  });
  return btn;
}

// ── Health ────────────────────────────────────────────────────────────────────

function checkHealth(generatedAt) {
  if (!generatedAt) return;
  const hours = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000;
  // Only warn if data is genuinely stale — more than 24 hours old
  if (hours > 24) {
    const banner = document.getElementById("health-banner");
    const healthIcon = document.getElementById("health-icon");
    if (healthIcon) healthIcon.innerHTML = SVG.warning;
    document.getElementById("stale-hours").textContent = Math.floor(hours);
    if (banner) banner.hidden = false;
  }
}

// ── Word of the Day ───────────────────────────────────────────────────────────

function renderWotd(wotd) {
  if (!wotd?.word) return;
  const wordEl = document.getElementById("wotd-word");
  const posEl  = document.getElementById("wotd-pos");
  const defEl  = document.getElementById("wotd-def");
  const exEl   = document.getElementById("wotd-example");

  if (wordEl) wordEl.textContent = wotd.word;
  if (posEl)  posEl.textContent  = [wotd.part_of_speech, wotd.phonetic].filter(Boolean).join("  ·  ");
  if (defEl)  defEl.textContent  = wotd.definition || "";
  if (exEl) {
    if (wotd.example) { exEl.textContent = wotd.example; exEl.hidden = false; }
    else               { exEl.hidden = true; }
  }
}

// ── Hot Topics ────────────────────────────────────────────────────────────────

const TYPE_ICON  = { repo: "github", hn: "newspaper", competition: "trophy", floater: "zap" };
const TYPE_LABEL = { repo: "GitHub", hn: "Hacker News", competition: "Hackathon", floater: "Pick" };

function renderHotTopics(hotTopics) {
  const c = document.getElementById("hot-topics-list");
  if (!c) return;
  c.innerHTML = "";

  if (!hotTopics?.length) {
    const e = el("p", "empty");
    e.appendChild(svgEl("inbox"));
    e.append(" No hot topics today.");
    c.appendChild(e);
    return;
  }

  hotTopics.forEach((t, i) => {
    const card = el("div", `hot-card${i === 0 ? " hot-card--first" : ""}`);
    const a    = lnk(t.url, "hot-card-link");

    const typeRow = el("span", "hot-type");
    typeRow.appendChild(svgEl(TYPE_ICON[t.type] || "zap"));
    typeRow.append(" " + (TYPE_LABEL[t.type] || t.type || ""));
    a.appendChild(typeRow);

    setHTML(a, "p", "hot-title", t.title || "");
    if (t.big_question) setHTML(a, "p", "hot-big-q",      t.big_question);
    if (t.description)  setHTML(a, "p", "hot-description", t.description);

    if (t.head_fake) {
      const hf = el("p", "hot-headfake");
      hf.appendChild(svgEl("arrowleft"));
      hf.append(" " + t.head_fake);
      a.appendChild(hf);
    }

    card.appendChild(a);
    // Pin button always visible on every card
    if (t.url && t.url !== "#") card.appendChild(makePinBtn(t.url, t.title));
    c.appendChild(card);
  });
}

// ── Repos ─────────────────────────────────────────────────────────────────────

function renderRepos(repos, isMonday) {
  const c = document.getElementById("repos-list");
  if (!c) return;
  c.innerHTML = "";

  if (!repos?.length) {
    const e = el("p", "empty"); e.append("No repos fetched."); c.appendChild(e); return;
  }

  const sorted = isMonday
    ? [...repos].sort((a, b) => (b.trending_multiday ? 1 : 0) - (a.trending_multiday ? 1 : 0))
    : repos;

  sorted.forEach(r => {
    const row  = lnk(r.url, "repo-row");
    const info = el("div", "repo-info");

    setHTML(info, "p", "repo-name", r.name);
    if (r.description) setHTML(info, "p", "repo-desc", r.description);

    if (r.trending_multiday) {
      const b = el("div", "repo-badges");
      setHTML(b, "span", "badge badge--multiday", "trending this week");
      info.appendChild(b);
    }

    const meta  = el("div", "repo-meta");
    const stars = el("span", "repo-stars");
    stars.appendChild(svgEl("star"));
    stars.append(" " + (r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars));
    meta.appendChild(stars);
    if (r.language) setHTML(meta, "span", "repo-lang", r.language);

    row.appendChild(info);
    row.appendChild(meta);
    c.appendChild(row);
  });
}

// ── Competitions ──────────────────────────────────────────────────────────────

function renderCompetitions(comps) {
  const c = document.getElementById("comps-list");
  if (!c) return;
  c.innerHTML = "";

  if (!comps?.length) {
    const e = el("p", "empty"); e.append("No competitions found."); c.appendChild(e); return;
  }

  comps.forEach(comp => {
    if (!comp.title) return;
    const row = lnk(comp.url, "comp-row");
    setHTML(row, "p", "comp-title", comp.title);
    const meta = el("div", "comp-meta");
    if (comp.source)   setHTML(meta, "span", "comp-source",   comp.source);
    if (comp.deadline) setHTML(meta, "span", "comp-deadline",  comp.deadline);
    if (comp.closing_soon && comp.days_left != null)
                       setHTML(meta, "span", "comp-closing",  `${comp.days_left}d left`);
    if (comp.prize)    setHTML(meta, "span", "comp-source",   comp.prize);
    if (comp.location) setHTML(meta, "span", "comp-source",   comp.location);
    row.appendChild(meta);
    c.appendChild(row);
  });
}

// ── HN ────────────────────────────────────────────────────────────────────────

function renderHN(stories) {
  const c = document.getElementById("hn-list");
  if (!c) return;
  c.innerHTML = "";

  if (!stories?.length) {
    const e = el("p", "empty"); e.append("No HN stories."); c.appendChild(e); return;
  }

  stories.forEach(s => {
    const row = lnk(s.url, "hn-row");
    setHTML(row, "p", "hn-title", s.title);
    c.appendChild(row);
  });
}

// ── Meta ──────────────────────────────────────────────────────────────────────

function renderMeta(data) {
  const dateEl = document.getElementById("date-label");
  const tsEl   = document.getElementById("generated-at");
  if (dateEl) dateEl.textContent = data.date_label || "";
  if (tsEl && data.generated_at) {
    const t = new Date(data.generated_at).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    });
    tsEl.textContent = `updated ${t} IST`;
  }
  if (data.is_monday) {
    const banner = document.getElementById("monday-banner");
    const mIcon  = document.getElementById("monday-icon");
    const title  = document.getElementById("repos-title");
    if (banner) banner.hidden = false;
    if (mIcon)  mIcon.innerHTML = SVG.calendar;
    if (title)  title.textContent = "Trending this week";
  }
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function setupAudio(data) {
  const trigger  = document.getElementById("audio-trigger");
  const overlay  = document.getElementById("audio-overlay");
  const popup    = document.getElementById("audio-popup");
  const closeBtn = document.getElementById("audio-close");
  const playBtn  = document.getElementById("audio-playpause");
  const restart  = document.getElementById("audio-restart");
  const skipBtn  = document.getElementById("audio-skip");
  const seek     = document.getElementById("audio-seek");
  const curEl    = document.getElementById("audio-current");
  const durEl    = document.getElementById("audio-duration");
  const voiceSel = document.getElementById("voice-select");

  if (!trigger) return;

  // Set icons
  trigger.innerHTML = SVG.headphones;
  trigger.hidden = false;
  if (closeBtn) closeBtn.innerHTML = SVG.x;
  if (restart)  restart.innerHTML  = SVG.rotateccw;
  if (skipBtn)  skipBtn.innerHTML  = SVG.skipforward;
  if (playBtn)  playBtn.innerHTML  = SVG.play;

  let audio       = null;
  let isPlaying   = false;
  let currentFile = voiceSel?.value || "morning_neerja.mp3";

  function setPlaying(playing) {
    isPlaying = playing;
    if (playBtn) playBtn.innerHTML = playing ? SVG.pause : SVG.play;
  }

  function loadAudio(file) {
    if (audio) { audio.pause(); audio.src = ""; }
    audio = new Audio(AUDIO_DIR + file);
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      if (seek)  { seek.max = audio.duration; seek.value = audio.currentTime; }
      if (curEl) curEl.textContent = fmt(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      if (durEl) durEl.textContent = fmt(audio.duration);
      if (seek)  seek.max = audio.duration;
    };
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      setPlaying(false);
      const np = document.getElementById("audio-np-text");
      if (np) np.textContent = "Audio not generated yet — trigger the nightly workflow first.";
    };
  }

  function openPopup() {
    if (!audio) loadAudio(currentFile);
    if (popup)   popup.hidden   = false;
    if (overlay) overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closePopup() {
    if (popup)   popup.hidden   = true;
    if (overlay) overlay.hidden = true;
    document.body.style.overflow = "";
    if (audio) audio.pause();
    setPlaying(false);
  }

  trigger.addEventListener("click", openPopup);
  overlay?.addEventListener("click", closePopup);
  closeBtn?.addEventListener("click", closePopup);

  playBtn?.addEventListener("click", () => {
    if (!audio) loadAudio(currentFile);
    if (audio.paused) { audio.play(); setPlaying(true); }
    else              { audio.pause(); setPlaying(false); }
  });

  restart?.addEventListener("click", () => {
    if (!audio) loadAudio(currentFile);
    audio.currentTime = 0;
    audio.play();
    setPlaying(true);
  });

  skipBtn?.addEventListener("click", () => {
    if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
  });

  seek?.addEventListener("input", () => {
    if (audio) audio.currentTime = parseFloat(seek.value);
  });

  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("speed-active"));
      btn.classList.add("speed-active");
      if (audio) audio.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  voiceSel?.addEventListener("change", () => {
    currentFile = voiceSel.value;
    const wasPlaying = audio && !audio.paused;
    loadAudio(currentFile);
    if (wasPlaying) { audio.play(); setPlaying(true); }
  });

  const np = document.getElementById("audio-np-text");
  if (np && data?.word_of_day?.word) {
    np.textContent = `Aakh briefing  ·  Word: ${data.word_of_day.word}  ·  ${data.date_label || ""}`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  initTheme();
  renderPinned(); // runs on load — section starts hidden if no pins

  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    checkHealth(data.generated_at);
    renderMeta(data);
    renderWotd(data.word_of_day);
    renderHotTopics(data.hot_topics);
    renderRepos(data.repos, data.is_monday);
    renderCompetitions(data.competitions);
    renderHN(data.hn_stories);
    setupAudio(data);

  } catch (err) {
    console.error("Aakh:", err);
    const wordEl = document.getElementById("wotd-word");
    const defEl  = document.getElementById("wotd-def");
    if (wordEl) wordEl.textContent = "Not ready";
    if (defEl)  defEl.textContent  = "Trigger the nightly workflow from the Actions tab.";
    // Still set up theme toggle even on error
    const trigger = document.getElementById("audio-trigger");
    if (trigger) trigger.innerHTML = SVG.headphones;
  }
}

document.addEventListener("DOMContentLoaded", init);
