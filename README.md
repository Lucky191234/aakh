# Aakh

A self-updating morning dashboard. Pulls trending repos, open hackathons, and developer news every night at 5:30 AM IST. Ready before you wake up.

**Live:** https://lucky191234.github.io/aakh/

---

## What it shows

- Trending GitHub repositories across Python, JS, TS, Rust, Go, C, C++, Java
- Open hackathons from Unstop, Devpost, and MLH with deadlines
- Filtered Hacker News stories
- Hot topics ranked by an LLM against your recent work
- A 3-minute audio briefing generated every morning — tap play before you leave

---

## How it works

A GitHub Actions cron job runs nightly and commits the output back to the repo. GitHub Pages serves the result.

```
00:00 UTC daily
├── fetch_github_trending.py    GitHub REST API       → data/repos.json
├── fetch_competitions.py       Unstop / Devpost / MLH → data/competitions.json
├── fetch_hackernews_rss.py     HNRSS                 → data/hn.json
├── rank_hot_topics.py          Groq llama-3.1-8b     → data/hot_topics.json
├── build_dashboard_data.py     merge + 7d history    → data/data.json
└── generate_audio.py           edge-tts              → docs/audio/morning.mp3
```

Each script fails independently. One broken source does not affect the others.

---

## Stack

| | |
|---|---|
| Scheduling | GitHub Actions |
| Hosting | GitHub Pages |
| LLM | Groq API (llama-3.1-8b-instant) |
| TTS | edge-tts (Microsoft Edge neural voices) |
| Frontend | HTML, CSS, vanilla JS |
| Scripts | Python |
| Storage | Flat JSON committed to the repo |


---

## Frontend features

**Health indicator** — warns if data is more than 25 hours old, meaning last night's run failed.

**Pinning** — pin any card via localStorage. Pinned items survive the nightly refresh until manually removed.

**Monday mode** — on Mondays, repos that appeared across multiple days are surfaced first. Competitions closing within 7 days get a countdown badge.

**Audio** — a `🎧 Listen` button in the header plays the morning briefing. Designed to be tapped once and pocketed.

---

## Running locally

```bash
git clone https://github.com/Lucky191234/aakh.git
cd aakh
pip install -r requirements.txt
cp .env.example .env          # add GH_TOKEN and GROQ_API_KEY

python scripts/fetch_github_trending.py
python scripts/fetch_competitions.py
python scripts/fetch_hackernews_rss.py
python scripts/rank_hot_topics.py
python scripts/build_dashboard_data.py
python scripts/generate_audio.py

# open docs/index.html
```

---

## Personalisation (roadmap)

The LLM ranking step is designed to accept an activity digest — a plain text summary of what you worked on — and weight today's content against it. The digest file (`activity_today.md`) is gitignored and never committed. When present, the ranking becomes personal. When absent, it falls back to general developer interest.

Activity tracking via browser history, git log, and window titles (ActivityWatch) is planned but not yet implemented.

---

## Configuration

Edit `config/sources.yaml` to change languages, star thresholds, HN keywords, and fetch limits. No code changes needed.

---

Developed by [Lakshya Varshney](https://github.com/Lucky191234).