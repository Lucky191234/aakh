/**
 * Aakh — app.js
 * Word of day hero, audio popup with speed/voice/seek, pinning, health check.
 */

const DATA_URL  = "data/data.json";
const AUDIO_URL = "audio/morning.mp3";
const PINS_KEY  = "aakh_pins";

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function lnk(href, cls, html) {
  const a = el("a", cls, html);
  a.href = href || "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Pins ──────────────────────────────────────────────────────────────────────

function getPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || "{}"); } catch { return {}; } }
function setPins(p) { localStorage.setItem(PINS_KEY, JSON.stringify(p)); }

function togglePin(url, title) {
  const pins = getPins();
  if (pins[url]) delete pins[url]; else pins[url] = { title, ts: Date.now() };
  setPins(pins);
  renderPinned();
  document.querySelectorAll(`.pin-btn[data-url]`).forEach(btn => {
    if (btn.dataset.url === url) btn.classList.toggle("pinned", !!getPins()[url]);
  });
}

function renderPinned() {
  const pins = getPins();
  const section = document.getElementById("pinned-section");
  const list    = document.getElementById("pinned-list");
  const entries = Object.entries(pins);
  if (!entries.length) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = "";
  entries.sort((a, b) => b[1].ts - a[1].ts).forEach(([url, { title }]) => {
    const chip = el("div", "pinned-chip");
    chip.appendChild(lnk(url, "pinned-chip-title", title));
    const x = el("button", "pinned-unpin", "✕");
    x.onclick = e => { e.preventDefault(); togglePin(url, title); };
    chip.appendChild(x);
    list.appendChild(chip);
  });
}

function makePinBtn(url, title) {
  const btn = el("button", `pin-btn${getPins()[url] ? " pinned" : ""}`, "📌");
  btn.dataset.url = url;
  btn.title = "Pin for tomorrow";
  btn.onclick = e => { e.preventDefault(); e.stopPropagation(); togglePin(url, title); };
  return btn;
}

// ── Health check ──────────────────────────────────────────────────────────────

function checkHealth(generatedAt) {
  if (!generatedAt) return;
  const hours = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000;
  if (hours > 25) {
    document.getElementById("stale-hours").textContent = Math.floor(hours);
    document.getElementById("health-banner").hidden = false;
  }
}

// ── Word of the Day ───────────────────────────────────────────────────────────

function renderWotd(wotd) {
  if (!wotd || !wotd.word) return;
  document.getElementById("wotd-word").textContent = wotd.word;
  document.getElementById("wotd-pos").textContent  = wotd.part_of_speech || "";
  document.getElementById("wotd-def").textContent  = wotd.definition || "";
  const exEl = document.getElementById("wotd-example");
  if (wotd.example) { exEl.textContent = wotd.example; }
  else { exEl.hidden = true; }
}

// ── Audio Popup ───────────────────────────────────────────────────────────────

function setupAudioPopup() {
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
  const npText   = document.getElementById("audio-np-text");

  let audio    = null;
  let synth    = null;  // Web Speech API instance
  let useFile  = true;  // true = MP3 file, false = Web Speech
  let utterance = null;

  // Check if MP3 exists
  fetch(AUDIO_URL, { method: "HEAD" })
    .then(r => { if (r.ok) trigger.hidden = false; })
    .catch(() => { trigger.hidden = false; }); // show anyway for speech fallback

  // Populate Web Speech voices
  function loadVoices() {
    const voices = window.speechSynthesis?.getVoices() || [];
    // Keep the first option (generated file), then add speech voices
    const existing = voiceSel.options[0];
    voiceSel.innerHTML = "";
    voiceSel.appendChild(existing);
    voices.filter(v => v.lang.startsWith("en")).forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `🗣 ${v.name.split(" ").slice(0,3).join(" ")}`;
      voiceSel.appendChild(opt);
    });
  }

  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function openPopup() {
    popup.hidden   = false;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closePopup() {
    popup.hidden   = true;
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (audio) { audio.pause(); }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPlayIcon();
  }

  trigger.onclick  = openPopup;
  overlay.onclick  = closePopup;
  closeBtn.onclick = closePopup;

  // Speed buttons
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("speed-btn--active"));
      btn.classList.add("speed-btn--active");
      const rate = parseFloat(btn.dataset.speed);
      if (audio) audio.playbackRate = rate;
      if (utterance) utterance.rate = rate;
    };
  });

  // Voice selection
  voiceSel.onchange = () => {
    useFile = voiceSel.value === "file";
    if (audio) { audio.pause(); setPlayIcon(); }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPlayIcon();
  };

  // Seek bar
  seek.oninput = () => { if (audio && useFile) audio.currentTime = parseFloat(seek.value); };

  // Restart
  restart.onclick = () => {
    if (useFile && audio) { audio.currentTime = 0; audio.play(); setPlayIcon(true); }
    else if (!useFile) { window.speechSynthesis.cancel(); startSpeech(); }
  };

  // Skip 15s
  skipBtn.onclick = () => { if (audio && useFile) audio.currentTime = Math.min(audio.duration, audio.currentTime + 15); };

  function setPlayIcon(playing) {
    playBtn.textContent = playing ? "⏸" : "▶";
  }

  function startSpeech() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = npText.textContent;
    utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const chosen = voices.find(v => v.name === voiceSel.value);
    if (chosen) utterance.voice = chosen;
    const rate = parseFloat(document.querySelector(".speed-btn--active")?.dataset.speed || "1");
    utterance.rate = rate;
    utterance.onend  = () => setPlayIcon(false);
    utterance.onerror = () => setPlayIcon(false);
    window.speechSynthesis.speak(utterance);
    setPlayIcon(true);
  }

  // Play / Pause
  playBtn.onclick = () => {
    if (useFile) {
      // File-based playback
      if (!audio) {
        audio = new Audio(AUDIO_URL);
        audio.ontimeupdate = () => {
          seek.max = audio.duration || 0;
          seek.value = audio.currentTime;
          curEl.textContent = fmt(audio.currentTime);
        };
        audio.onloadedmetadata = () => {
          durEl.textContent = fmt(audio.duration);
          seek.max = audio.duration;
        };
        audio.onended = () => setPlayIcon(false);
        audio.onerror = () => {
          // MP3 missing — fall back to speech
          useFile = false;
          voiceSel.value = voiceSel.options[1]?.value || "file";
          startSpeech();
        };
      }
      if (audio.paused) { audio.play(); setPlayIcon(true); }
      else              { audio.pause(); setPlayIcon(false); }
    } else {
      // Web Speech
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause(); setPlayIcon(false);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume(); setPlayIcon(true);
      } else {
        startSpeech();
      }
    }
  };
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderMeta(data) {
  document.getElementById("date-label").textContent = data.date_label || "—";
  const ts = document.getElementById("generated-at");
  if (data.generated_at) {
    const t = new Date(data.generated_at).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata"
    });
    ts.textContent = `last updated ${t} IST`;
  }
  if (data.is_monday) {
    document.getElementById("monday-banner").hidden = false;
    document.getElementById("repos-title").textContent = "Trending this week";
  }
}

function renderStakes(hotTopics) {
  document.getElementById("stake-text").textContent =
    hotTopics?.[0]?.stake || "No activity signal — showing global trending.";
}

function renderHotTopics(hotTopics) {
  const c = document.getElementById("hot-topics-list");
  c.innerHTML = "";
  if (!hotTopics?.length) { c.appendChild(el("p", "empty", "No hot topics today.")); return; }
  const label = { repo: "GITHUB REPO", hn: "HACKER NEWS", competition: "HACKATHON" };
  hotTopics.forEach((t, i) => {
    const card = el("div", `hot-card${i === 0 ? " hot-card--first" : ""}`);
    const a    = lnk(t.url, "hot-card-link");
    a.appendChild(el("span", "hot-type",        label[t.type] || t.type?.toUpperCase() || ""));
    a.appendChild(el("p",    "hot-title",        t.title));
    if (t.big_question)  a.appendChild(el("p", "hot-big-q",      `"${t.big_question}"`));
    if (t.description)   a.appendChild(el("p", "hot-description", t.description));
    if (t.head_fake)     a.appendChild(el("p", "hot-headfake",    t.head_fake));
    card.appendChild(a);
    card.appendChild(makePinBtn(t.url, t.title));
    c.appendChild(card);
  });
}

function renderRepos(repos, isMonday) {
  const c = document.getElementById("repos-list");
  c.innerHTML = "";
  if (!repos?.length) { c.appendChild(el("p", "empty", "No repos fetched.")); return; }
  const sorted = isMonday
    ? [...repos].sort((a, b) => (b.trending_multiday ? 1 : 0) - (a.trending_multiday ? 1 : 0))
    : repos;
  sorted.forEach(r => {
    const row  = lnk(r.url, "repo-row");
    const info = el("div", "repo-info");
    info.appendChild(el("p", "repo-name", r.name));
    if (r.description) info.appendChild(el("p", "repo-desc", r.description));
    if (r.trending_multiday) {
      const b = el("div", "repo-badges");
      b.appendChild(el("span", "badge badge--multiday", "TRENDING MULTIDAY"));
      info.appendChild(b);
    }
    const meta = el("div", "repo-meta");
    meta.appendChild(el("span", "repo-stars", r.stars >= 1000 ? `⭐ ${(r.stars/1000).toFixed(1)}k` : `⭐ ${r.stars}`));
    if (r.language) meta.appendChild(el("span", "repo-lang", r.language));
    row.appendChild(info);
    row.appendChild(meta);
    c.appendChild(row);
  });
}

function renderCompetitions(comps) {
  const c = document.getElementById("comps-list");
  c.innerHTML = "";
  if (!comps?.length) { c.appendChild(el("p", "empty", "No competitions found — Unstop, Devpost, MLH checked.")); return; }
  comps.forEach(comp => {
    if (!comp.title) return;
    const row = lnk(comp.url && comp.url.startsWith("http") ? comp.url : "#", "comp-row");
    row.appendChild(el("p", "comp-title", comp.title));
    const meta = el("div", "comp-meta");
    if (comp.source)      meta.appendChild(el("span", "comp-source",   comp.source));
    if (comp.deadline)    meta.appendChild(el("span", "comp-deadline",  comp.deadline));
    if (comp.closing_soon && comp.days_left != null)
                          meta.appendChild(el("span", "comp-closing",   `${comp.days_left}d left`));
    if (comp.prize)       meta.appendChild(el("span", "comp-prize",     comp.prize));
    if (comp.organiser)   meta.appendChild(el("span", "comp-source",    comp.organiser));
    if (comp.location)    meta.appendChild(el("span", "comp-source",    comp.location));
    row.appendChild(meta);
    c.appendChild(row);
  });
}

function renderHN(stories) {
  const c = document.getElementById("hn-list");
  c.innerHTML = "";
  if (!stories?.length) { c.appendChild(el("p", "empty", "No HN stories.")); return; }
  stories.forEach(s => {
    const row = lnk(s.url, "hn-row");
    row.appendChild(el("p", "hn-title", s.title));
    c.appendChild(row);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  renderPinned();
  setupAudioPopup();

  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    checkHealth(data.generated_at);
    renderMeta(data);
    renderWotd(data.word_of_day);
    renderStakes(data.hot_topics);
    renderHotTopics(data.hot_topics);
    renderRepos(data.repos, data.is_monday);
    renderCompetitions(data.competitions);
    renderHN(data.hn_stories);

    // Update audio popup "now playing" text with today's word
    if (data.word_of_day?.word) {
      document.getElementById("audio-np-text").textContent =
        `Aakh briefing · Word: ${data.word_of_day.word} · ${data.date_label || ""}`;
    }

  } catch (err) {
    console.error("Aakh:", err);
    document.getElementById("wotd-word").textContent = "Data not found";
    document.getElementById("wotd-def").textContent  = "Run the nightly pipeline first, or trigger the workflow from the Actions tab.";
    document.getElementById("stake-text").textContent = "data/data.json missing";
  }
}

document.addEventListener("DOMContentLoaded", init);
