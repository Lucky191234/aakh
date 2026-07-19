/**
 * Aakh — app.js
 * Fetches data/data.json (generated nightly) and renders all dashboard sections.
 * No framework. No build step. Just reads JSON and builds DOM.
 */

const DATA_URL = "../data/data.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function a(href, cls, html) {
  const link = el("a", cls, html);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function formatStars(n) {
  return n >= 1000 ? `⭐ ${(n / 1000).toFixed(1)}k` : `⭐ ${n}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch {
    return iso;
  }
}

// Accent the last word of the big question for emphasis
function accentLastWord(text) {
  const words = text.trim().split(" ");
  const last = words.pop();
  return words.join(" ") + ` <span class="accent-word">${last}</span>`;
}

// ── Render functions ──────────────────────────────────────────────────────────

function renderHero(data) {
  document.getElementById("date-label").textContent = data.date_label || "—";
  const q = data.big_question || "What did the dev world quietly ship?";
  document.getElementById("big-question").innerHTML = accentLastWord(q);
}

function renderStakesBar(hotTopics) {
  const first = hotTopics?.[0];
  const stakeText = document.getElementById("stake-text");
  if (first?.stake) {
    stakeText.textContent = first.stake;
  } else {
    stakeText.textContent = "No activity signal today — showing global trending.";
  }
}

function renderHotTopics(hotTopics) {
  const container = document.getElementById("hot-topics-list");
  container.innerHTML = "";

  if (!hotTopics?.length) {
    container.appendChild(el("p", "empty", "No hot topics today — check back tomorrow."));
    return;
  }

  hotTopics.forEach((topic, i) => {
    const card = a(topic.url, `hot-card${i === 0 ? " hot-card--first" : ""}`);

    const typeLabel = { repo: "GITHUB REPO", hn: "HACKER NEWS", competition: "HACKATHON" };

    card.appendChild(el("span", "hot-type", typeLabel[topic.type] || topic.type?.toUpperCase()));
    card.appendChild(el("p", "hot-title", topic.title));

    if (topic.big_question) {
      card.appendChild(el("p", "hot-big-q", `"${topic.big_question}"`));
    }

    if (topic.description) {
      card.appendChild(el("p", "hot-description", topic.description));
    }

    if (topic.head_fake) {
      card.appendChild(el("p", "hot-headfake", topic.head_fake));
    }

    container.appendChild(card);
  });
}

function renderRepos(repos) {
  const container = document.getElementById("repos-list");
  container.innerHTML = "";

  if (!repos?.length) {
    container.appendChild(el("p", "empty", "No repos fetched yet."));
    return;
  }

  repos.forEach((repo) => {
    const row = a(repo.url, "repo-row");

    const info = el("div", "repo-info");
    info.appendChild(el("p", "repo-name", repo.name));
    if (repo.description) {
      info.appendChild(el("p", "repo-desc", repo.description));
    }

    const meta = el("div", "repo-meta");
    meta.appendChild(el("span", "repo-stars", formatStars(repo.stars)));
    if (repo.language) {
      meta.appendChild(el("span", "repo-lang", repo.language));
    }

    row.appendChild(info);
    row.appendChild(meta);
    container.appendChild(row);
  });
}

function renderCompetitions(competitions) {
  const container = document.getElementById("comps-list");
  container.innerHTML = "";

  if (!competitions?.length) {
    container.appendChild(el("p", "empty", "No competitions found — scrapers may need updating."));
    return;
  }

  competitions.forEach((comp) => {
    const row = a(comp.url, "comp-row");

    row.appendChild(el("p", "comp-title", comp.title));

    const meta = el("div", "comp-meta");
    if (comp.deadline) meta.appendChild(el("span", "comp-deadline", `Deadline: ${comp.deadline}`));
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
    container.appendChild(el("p", "empty", "No HN stories today."));
    return;
  }

  stories.forEach((story) => {
    const row = a(story.url, "hn-row");
    row.appendChild(el("p", "hn-title", story.title));
    container.appendChild(row);
  });
}

function renderFooter(data) {
  const ts = document.getElementById("generated-at");
  if (data.generated_at) {
    ts.textContent = `last updated ${formatDate(data.generated_at)}`;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    renderHero(data);
    renderStakesBar(data.hot_topics);
    renderHotTopics(data.hot_topics);
    renderRepos(data.repos);
    renderCompetitions(data.competitions);
    renderHN(data.hn_stories);
    renderFooter(data);

  } catch (err) {
    // Graceful degradation: show error in hero, leave sections empty
    console.error("Aakh: failed to load data.json", err);
    document.getElementById("big-question").textContent =
      "Dashboard data not found. Run the nightly pipeline first.";
    document.getElementById("stake-text").textContent =
      "data/data.json missing — run scripts/build_dashboard_data.py locally to test.";
  }
}

document.addEventListener("DOMContentLoaded", init);
