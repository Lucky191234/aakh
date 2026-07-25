/**
 * Aakh v1.1.0 — app.js
 * Theme toggle, word of day, hot topics (2+2+2+2),
 * fixed pinning, scrollable sections, audio popup (4 voices).
 */

const DATA_URL  = "data/data.json";
const AUDIO_DIR = "audio/";
const PINS_KEY  = "aakh_pins";
const THEME_KEY = "aakh_theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function lnk(href, cls) {
  const a = el("a", cls);
  a.href = href && href.startsWith("http") ? href : "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function txt(parent, tag, cls, content) {
  const e = el(tag, cls);
  e.textContent = content;
  parent.appendChild(e);
  return e;
}

function icon(name, size = 14) {
  const i = document.createElement("i");
  i.setAttribute("data-lucide", name);
  i.style.cssText = `width:${size}px;height:${size}px;display:inline-block;vertical-align:middle`;
  return i;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const sunEl  = document.getElementById("icon-sun");
  const moonEl = document.getElementById("icon-moon");
  if (sunEl && moonEl) {
    sunEl.hidden  = theme === "dark";
    moonEl.hidden = theme === "light";
  }
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
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
  // Sync all pin buttons for this url
  document.querySelectorAll(".pin-btn").forEach(btn => {
    if (btn.dataset.url === url) {
      btn.classList.toggle("pinned", !!getPins()[url]);
    }
  });
}

function renderPinned() {
  const pins    = getPins();
  const section = document.getElementById("pinned-section");
  const list    = document.getElementById("pinned-list");
  if (!section || !list) return;

  const entries = Object.entries(pins);
  if (!entries.length) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = "";

  entries
    .sort((a, b) => b[1].ts - a[1].ts)
    .forEach(([url, { title }]) => {
      const chip  = el("div", "pinned-chip");
      const a     = lnk(url, "pinned-chip-title");
      a.textContent = title;

      // Remove button — using a plain button, no emoji, Lucide icon
      const removeBtn = el("button", "pinned-chip-remove");
      removeBtn.title = "Unpin";
      removeBtn.type  = "button";
      removeBtn.appendChild(icon("x", 12));

      // Attach listener directly — no delegation, no shared state
      removeBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const currentPins = getPins();
        delete currentPins[url];
        setPins(currentPins);
        chip.remove();
        // Sync card pin button
        document.querySelectorAll(".pin-btn").forEach(btn => {
          if (btn.dataset.url === url) btn.classList.remove("pinned");
        });
        // Hide section if no pins left
        if (!list.children.length) section.hidden = true;
        refreshIcons();
      });

      chip.appendChild(a);
      chip.appendChild(removeBtn);
      list.appendChild(chip);
    });

  refreshIcons();
}

function makePinBtn(url, title) {
  const btn = el("button", `pin-btn${getPins()[url] ? " pinned" : ""}`);
  btn.dataset.url = url || "";
  btn.title = "Pin";
  btn.type  = "button";
  btn.appendChild(icon("bookmark", 13));
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
  if (hours > 25) {
    const banner = document.getElementById("health-banner");
    document.getElementById("stale-hours").textContent = Math.floor(hours);
    if (banner) banner.hidden = false;
  }
}

// ── Word of the Day ───────────────────────────────────────────────────────────

function renderWotd(wotd) {
  if (!wotd || !wotd.word) return;
  const wordEl    = document.getElementById("wotd-word");
  const posEl     = document.getElementById("wotd-pos");
  const defEl     = document.getElementById("wotd-def");
  const exEl      = document.getElementById("wotd-example");

  if (wordEl) wordEl.textContent = wotd.word;
  if (posEl)  posEl.textContent  = wotd.part_of_speech
    ? `${wotd.part_of_speech}${wotd.phonetic ? "  ·  " + wotd.phonetic : ""}`
    : "";
  if (defEl)  defEl.textContent  = wotd.definition || "";
  if (exEl) {
    if (wotd.example) { exEl.textContent = wotd.example; exEl.hidden = false; }
    else { exEl.hidden = true; }
  }
}

// ── Hot Topics ────────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  repo:        "github",
  hn:          "newspaper",
  competition: "trophy",
  floater:     "sparkles",
};

const TYPE_LABELS = {
  repo:        "GitHub",
  hn:          "Hacker News",
  competition: "Hackathon",
  floater:     "Pick",
};

function renderHotTopics(hotTopics) {
  const c = document.getElementById("hot-topics-list");
  if (!c) return;
  c.innerHTML = "";

  if (!hotTopics?.length) {
    const e = el("p", "empty");
    e.appendChild(icon("inbox", 14));
    e.append(" No hot topics today — check back tomorrow.");
    c.appendChild(e);
    return;
  }

  hotTopics.forEach((t, i) => {
    const card = el("div", `hot-card${i === 0 ? " hot-card--first" : ""}`);
    const a    = lnk(t.url, "hot-card-link");

    // Type row
    const typeRow = el("span", "hot-type");
    typeRow.appendChild(icon(TYPE_ICONS[t.type] || "star", 11));
    typeRow.append(" " + (TYPE_LABELS[t.type] || t.type || ""));
    a.appendChild(typeRow);

    txt(a, "p", "hot-title",       t.title || "");
    if (t.big_question) txt(a, "p", "hot-big-q",      t.big_question);
    if (t.description)  txt(a, "p", "hot-description", t.description);

    if (t.head_fake) {
      const hf = el("p", "hot-headfake");
      hf.appendChild(icon("corner-down-left", 11));
      hf.append(" " + t.head_fake);
      a.appendChild(hf);
    }

    card.appendChild(a);
    if (t.url && t.url !== "#") card.appendChild(makePinBtn(t.url, t.title));
    c.appendChild(card);
  });

  refreshIcons();
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

    txt(info, "p", "repo-name", r.name);
    if (r.description) txt(info, "p", "repo-desc", r.description);

    if (r.trending_multiday) {
      const badges = el("div", "repo-badges");
      txt(badges, "span", "badge badge--multiday", "trending this week");
      info.appendChild(badges);
    }

    const meta  = el("div", "repo-meta");
    const stars = el("span", "repo-stars");
    stars.appendChild(icon("star", 11));
    stars.append(" " + (r.stars >= 1000 ? `${(r.stars/1000).toFixed(1)}k` : r.stars));
    meta.appendChild(stars);

    if (r.language) txt(meta, "span", "repo-lang", r.language);

    row.appendChild(info);
    row.appendChild(meta);
    c.appendChild(row);
  });

  refreshIcons();
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

    txt(row, "p", "comp-title", comp.title);

    const meta = el("div", "comp-meta");
    if (comp.source)   txt(meta, "span", "comp-source",   comp.source);
    if (comp.deadline) txt(meta, "span", "comp-deadline",  comp.deadline);
    if (comp.closing_soon && comp.days_left != null)
                       txt(meta, "span", "comp-closing",  `${comp.days_left}d left`);
    if (comp.prize)    txt(meta, "span", "comp-source",   comp.prize);
    if (comp.location) txt(meta, "span", "comp-source",   comp.location);

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
    txt(row, "p", "hn-title", s.title);
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
    const title  = document.getElementById("repos-title");
    if (banner) banner.hidden = false;
    if (title)  title.textContent = "Trending this week";
  }
}

// ── Audio Popup ───────────────────────────────────────────────────────────────

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
  const playIcon  = document.getElementById("icon-play");
  const pauseIcon = document.getElementById("icon-pause");

  if (!trigger) return;
  trigger.hidden = false;

  let audio     = null;
  let currentFile = voiceSel?.value || "morning_neerja.mp3";

  function setPlaying(playing) {
    if (playIcon)  playIcon.hidden  = playing;
    if (pauseIcon) pauseIcon.hidden = !playing;
  }

  function loadAudio(file) {
    if (audio) { audio.pause(); audio.src = ""; }
    audio = new Audio(AUDIO_DIR + file);
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      seek.max   = audio.duration;
      seek.value = audio.currentTime;
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
      if (np) np.textContent = "Audio not generated yet — trigger the workflow first.";
    };
  }

  function openPopup() {
    if (!audio) loadAudio(currentFile);
    if (popup)   popup.hidden   = false;
    if (overlay) overlay.hidden = false;
    document.body.style.overflow = "hidden";
    refreshIcons();
  }

  function closePopup() {
    if (popup)   popup.hidden   = true;
    if (overlay) overlay.hidden = true;
    document.body.style.overflow = "";
    if (audio) audio.pause();
    setPlaying(false);
  }

  trigger.addEventListener("click", openPopup);
  if (overlay) overlay.addEventListener("click", closePopup);
  if (closeBtn) closeBtn.addEventListener("click", closePopup);

  // Play / pause
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (!audio) loadAudio(currentFile);
      if (audio.paused) { audio.play(); setPlaying(true); }
      else              { audio.pause(); setPlaying(false); }
    });
  }

  // Restart
  if (restart) {
    restart.addEventListener("click", () => {
      if (!audio) loadAudio(currentFile);
      audio.currentTime = 0;
      audio.play();
      setPlaying(true);
    });
  }

  // Skip 15s
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
    });
  }

  // Seek
  if (seek) {
    seek.addEventListener("input", () => {
      if (audio) audio.currentTime = parseFloat(seek.value);
    });
  }

  // Speed
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("speed-active"));
      btn.classList.add("speed-active");
      if (audio) audio.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  // Voice / file switch
  if (voiceSel) {
    voiceSel.addEventListener("change", () => {
      currentFile = voiceSel.value;
      const wasPlaying = audio && !audio.paused;
      loadAudio(currentFile);
      if (wasPlaying) { audio.play(); setPlaying(true); }
    });
  }

  // Update now-playing text
  if (data?.word_of_day?.word) {
    const np = document.getElementById("audio-np-text");
    if (np) np.textContent = `Aakh briefing  ·  Word today: ${data.word_of_day.word}  ·  ${data.date_label || ""}`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  initTheme();
  renderPinned();

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
    if (defEl)  defEl.textContent  = "Run the nightly workflow from the Actions tab to generate data.";
  }

  refreshIcons();
}

document.addEventListener("DOMContentLoaded", init);
