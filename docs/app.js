/**
 * Aakh — app.js
 * Renders the morning dashboard from data/data.json
 * Features: health check, pinning, audio, weekly digest mode
 */

const DATA_URL = "data/data.json";
const AUDIO_URL = "audio/morning.mp3";
const PINS_KEY = "aakh_pins"; // localStorage key

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function link(href, cls, html) {
  const a = el("a", cls, html);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function formatStars(n) {
  return n >= 1000 ? `⭐ ${(n / 1000).toFixed(1)}k` : `⭐ ${n}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
      timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch { return iso; }
}

function accentLastWord(text) {
  const words = text.trim().split(" ");
  const last = words.pop();
  return words.join(" ") + ` <span class="accent-word">${last}</span>`;
}

// ── Pins (localStorage) ───────────────────────────────────────────────────────

function getPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || "{}"); }
  catch { return {}; }
}

function setPins(pins) {
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
}

function togglePin(url, title) {
  const pins = getPins();
  if (pins[url]) { delete pins[url]; }
  else { pins[url] = { title, pinned_at: Date.now() }; }
  setPins(pins);
  renderPinned();
  // Update all pin buttons for this URL
  document.querySelectorAll(`.pin-btn[data-url="${CSS.escape(url)}"]`).forEach(btn => {
    btn.classList.toggle("pinned", !!getPins()[url]);
    btn.title = getPins()[url] ? "Unpin" : "Pin for tomorrow";
  });
}

function renderPinned() {
  const pins = getPins();
  const section = document.getElementById("pinned-section");
  const list = document.getElementById("pinned-list");
  const entries = Object.entries(pins);

  if (!entries.length) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = "";

  entries.sort((a, b) => b[1].pinned_at - a[1].pinned_at).forEach(([url, { title }]) => {
    const chip = el("div", "pinned-chip");
    const a = link(url, "pinned-chip-title", title);
    const unpinBtn = el("button", "pinned-unpin", "✕");
    unpinBtn.title = "Unpin";
    unpinBtn.onclick = (e) => { e.preventDefault(); togglePin(url, title); };
    chip.appendChild(a);
    chip.appendChild(unpinBtn);
    list.appendChild(chip);
  });
}

function makePinBtn(url, title) {
  const pins = getPins();
  const btn = el("button", `pin-btn${pins[url] ? " pinned" : ""}`, "📌");
  btn.dataset.url = url;
  btn.title = pins[url] ? "Unpin" : "Pin for tomorrow";
  btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); togglePin(url, title); };
  return btn;
}

// ── Health check ──────────────────────────────────────────────────────────────

function checkHealth(generatedAt) {
  if (!generatedAt) return;
  const ageHours = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000;
  if (ageHours > 25) {
    const banner = document.getElementById("health-banner");
    document.getElementById("stale-hours").textContent = Math.floor(ageHours);
    banner.hidden = false;
  }
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function setupAudio() {
  const btn = document.getElementById("audio-btn");
  // Check if audio file exists
  fetch(AUDIO_URL, { method: "HEAD" })
    .then(r => { if (r.ok) btn.hidden = false; })
    .catch(() => {});

  let audio = null;
  btn.onclick = () => {
    if (!audio) {
      audio = new Audio(AUDIO_URL);
      audio.onended = () => { btn.classList.remove("playing"); btn.textContent = "🎧 Listen"; };
      audio.onerror = () => { btn.textContent = "🎧 No audio yet"; btn.disabled = true; };
    }
    if (audio.paused) {
      audio.play();
      btn.classList.add("playing");
      btn.textContent = "⏸ Pause";
    } else {
      audio.pause();
      btn.classList.remove("playing");
      btn.textContent = "🎧 Resume";
    }
  };
}

// ── Render functions ──────────────────────────────────────────────────────────

function renderHero(data) {
  document.getElementById("date-label").textContent = data.date_label || "—";
  const q = data.big_question || "What did the dev world quietly ship?";
  document.getElementById("big-question").innerHTML = accentLastWord(q);

  if (data.is_monday) {
    document.getElementById("monday-banner").hidden = false;
    document.getElementById("repos-title").textContent = "Trending this week";
  }
}

function renderStakesBar(hotTopics) {
  const stakeText = document.getElementById("stake-text");
  const first = hotTopics?.[0];
  stakeText.textContent = first?.stake || "No activity signal today — showing global trending.";
}

function renderHotTopics(hotTopics) {
  const container = document.getElementById("hot-topics-list");
  container.innerHTML = "";
  if (!hotTopics?.length) {
    container.appendChild(el("p", "empty", "No hot topics today — check back tomorrow.")); return;
  }

  const typeLabel = { repo: "GITHUB REPO", hn: "HACKER NEWS", competition: "HACKATHON" };

  hotTopics.forEach((topic, i) => {
    const card = el("div", `hot-card${i === 0 ? " hot-card--first" : ""}`);
    const cardLink = link(topic.url, "hot-card-link");

    cardLink.appendChild(el("span", "hot-type", typeLabel[topic.type] || topic.type?.toUpperCase() || ""));
    cardLink.appendChild(el("p", "hot-title", topic.title));
    if (topic.big_question) cardLink.appendChild(el("p", "hot-big-q", `"${topic.big_question}"`));
    if (topic.description)  cardLink.appendChild(el("p", "hot-description", topic.description));
    if (topic.head_fake)    cardLink.appendChild(el("p", "hot-headfake", topic.head_fake));

    card.appendChild(cardLink);
    card.appendChild(makePinBtn(topic.url, topic.title));
    container.appendChild(card);
  });
}

function renderRepos(repos, isMonday) {
  const container = document.getElementById("repos-list");
  container.innerHTML = "";
  if (!repos?.length) {
    container.appendChild(el("p", "empty", "No repos fetched yet.")); return;
  }

  // On Monday, show multiday-trending repos first
  const sorted = isMonday
    ? [...repos].sort((a, b) => (b.trending_multiday ? 1 : 0) - (a.trending_multiday ? 1 : 0))
    : repos;

  sorted.forEach(repo => {
    const row = link(repo.url, "repo-row");
    const info = el("div", "repo-info");
    info.appendChild(el("p", "repo-name", repo.name));
    if (repo.description) info.appendChild(el("p", "repo-desc", repo.description));

    if (repo.trending_multiday || repo.closing_soon) {
      const badges = el("div", "repo-badges");
      if (repo.trending_multiday) badges.appendChild(el("span", "badge badge--multiday", "TRENDING MULTIDAY"));
      badges && info.appendChild(badges);
    }

    const meta = el("div", "repo-meta");
    meta.appendChild(el("span", "repo-stars", formatStars(repo.stars)));
    if (repo.language) meta.appendChild(el("span", "repo-lang", repo.language));

    row.appendChild(info);
    row.appendChild(meta);
    container.appendChild(row);
  });
}

function renderCompetitions(competitions) {
  const container = document.getElementById("comps-list");
  container.innerHTML = "";
  if (!competitions?.length) {
    container.appendChild(el("p", "empty", "No competitions found.")); return;
  }

  competitions.forEach(comp => {
    const row = link(comp.url, "comp-row");
    row.appendChild(el("p", "comp-title", comp.title));

    const meta = el("div", "comp-meta");
    if (comp.deadline) meta.appendChild(el("span", "comp-deadline", `Deadline: ${comp.deadline}`));
    if (comp.closing_soon) meta.appendChild(el("span", "comp-closing", `${comp.days_left}d left`));
    if (comp.source)   meta.appendChild(el("span", "comp-source", comp.source));
    if (comp.prize)    meta.appendChild(el("span", "comp-prize", comp.prize));

    row.appendChild(meta);
    container.appendChild(row);
  });
}

function renderHN(stories) {
  const container = document.getElementById("hn-list");
  container.innerHTML = "";
  if (!stories?.length) {
    container.appendChild(el("p", "empty", "No HN stories today.")); return;
  }
  stories.forEach(story => {
    const row = link(story.url, "hn-row");
    row.appendChild(el("p", "hn-title", story.title));
    container.appendChild(row);
  });
}

function renderFooter(data) {
  const ts = document.getElementById("generated-at");
  if (data.generated_at) ts.textContent = `last updated ${formatDate(data.generated_at)}`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  renderPinned();
  setupAudio();

  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    checkHealth(data.generated_at);
    renderHero(data);
    renderStakesBar(data.hot_topics);
    renderHotTopics(data.hot_topics);
    renderRepos(data.repos, data.is_monday);
    renderCompetitions(data.competitions);
    renderHN(data.hn_stories);
    renderFooter(data);

  } catch (err) {
    console.error("Aakh: failed to load data.json", err);
    document.getElementById("big-question").textContent =
      "Dashboard data not found. Run the nightly pipeline first.";
    document.getElementById("stake-text").textContent =
      "data/data.json missing — trigger the workflow from the Actions tab.";
  }
}

document.addEventListener("DOMContentLoaded", init);
