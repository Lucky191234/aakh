# Aakh

**v1.1.0** — [Live](https://lucky191234.github.io/aakh/)

A self-updating morning dashboard. Pulls trending repos, open hackathons, and developer news every night. Ready before you wake up.

---

## Changelog

### v1.1.0
- Word of the day in hero (Free Dictionary API, clean definitions)
- Dark / light theme toggle, saved across sessions
- Audio briefing in 4 voices — Indian English (f/m), US English, British English
- Hot picks guaranteed distribution: 2 repos, 2 HN, 2 competitions, 2 wildcards
- Individual scrollbars for Rising Repos and Open Hackathons
- Fixed pinned bar remove button (last card was unresponsive)
- Removed Today's Stake bar
- Softer color palette, no purple/violet, Lucide icons throughout
- MLH season year now configurable in `config/sources.yaml`
- Cron adjusted to `30 22 * * *` for reliable 4:30 AM IST delivery

### v1.0.0
- Initial release: GitHub trending, competitions, HN, Groq ranking, audio, pinning

---

## What it shows

- **Word of the day** — rotating curated vocabulary, definition and example
- **Hot picks for you** — 8 cards ranked by an LLM: 2 repos, 2 HN stories, 2 hackathons, 2 wildcards
- **Rising repos** — trending GitHub repositories across Python, JS, TS, Rust, Go, C, C++, Java, Shell, Kotlin, Swift
- **Open hackathons** — Unstop, Devpost, MLH with deadlines and closing-soon badges
- **Hacker News** — keyword-filtered top stories
- **Audio briefing** — 3-minute spoken summary, 4 voice options, playback speed control

---

## How it works

```
22:30 UTC daily  (~4:00 AM IST, reaches you by 4:30 AM)
|
|- fetch_github_trending.py     GitHub REST API (2 passes)   -> data/repos.json
|- fetch_competitions.py        Unstop / Devpost / MLH       -> data/competitions.json
|- fetch_hackernews_rss.py      HNRSS                        -> data/hn.json
|- fetch_word_of_day.py         Free Dictionary API          -> data/word_of_day.json
|- rank_hot_topics.py           Groq llama-3.1-8b            -> data/hot_topics.json
|- build_dashboard_data.py      merge + 7d history           -> data/data.json
|- generate_audio.py            edge-tts x4 voices           -> docs/audio/*.mp3
|
git commit + push -> GitHub Pages redeploys automatically
```

Each script fails independently. One broken source does not affect the others.

---

## Stack

| Layer        | Tool                                    |
|--------------|-----------------------------------------|
| Scheduling   | GitHub Actions (cron)                   |
| Hosting      | GitHub Pages                            |
| Repo data    | GitHub REST API                         |
| Competitions | Unstop, Devpost, MLH (scraped)          |
| News         | HNRSS                                   |
| Vocabulary   | Free Dictionary API                     |
| LLM ranking  | Groq API (llama-3.1-8b-instant)         |
| TTS          | edge-tts (Microsoft Edge neural voices) |
| Icons        | Lucide                                  |
| Frontend     | HTML, CSS, vanilla JS — no framework    |
| Storage      | Flat JSON committed to repo             |

No database. No server. No paid infrastructure.

---

## Frontend features

**Word of the day** — hero section, changes daily, definition + example.

**Theme toggle** — dark (default) and light, saved to localStorage.

**Hot picks** — 8 cards with guaranteed diversity: 2 from each of repos, HN, competitions, plus 2 wildcards from whichever category has the strongest signal that day.

**Pinning** — bookmark any card. Pinned items appear in a bar at the top and survive nightly refreshes until you remove them.

**Audio popup** — 4 pre-generated MP3s (Neerja, Prabhat, Guy, Ryan). Controls: play/pause, restart, skip 15s, seek bar, playback speed, voice selector.

**Scrollable sections** — Rising Repos and Open Hackathons each have their own scroll container.

**Health indicator** — quiet warning if data is more than 25 hours old.

**Monday mode** — repos trending across multiple days surface first, competitions closing within 7 days get a countdown badge.

---

## Configuration

Edit `config/sources.yaml` — no code changes needed.

```yaml
competitions:
  sources:
    - name: MLH
      mlh_year: 2026   # update every January

audio:
  voices:
    - name: "Neerja (Indian English)"
      voice: "en-IN-NeerjaNeural"
      file: "morning_neerja.mp3"
    # add or remove voices here
```

---

## Running locally

```bash
git clone https://github.com/Lucky191234/aakh.git
cd aakh
pip install -r requirements.txt
cp .env.example .env   # add GH_TOKEN and GROQ_API_KEY

python scripts/fetch_github_trending.py
python scripts/fetch_competitions.py
python scripts/fetch_hackernews_rss.py
python scripts/fetch_word_of_day.py
python scripts/rank_hot_topics.py
python scripts/build_dashboard_data.py
python scripts/generate_audio.py

# open docs/index.html in browser
```

---

## Hardcoded assumptions to review

| Item | Location | Action needed |
|---|---|---|
| MLH season year | `config/sources.yaml` → `mlh_year` | Update every January |
| Groq model | `scripts/rank_hot_topics.py` | Update if Groq deprecates the model |
| edge-tts voices | `config/sources.yaml` → `audio.voices` | Update if Microsoft retires a voice |

---

## Roadmap

- Activity tracker — git log + browser history signal for genuinely personal ranking
- Playwright fallback for JS-rendered scrape targets
- Mobile PWA — offline audio, lock screen controls

---

Developed by [Lakshya Varshney](https://github.com/Lucky191234).
