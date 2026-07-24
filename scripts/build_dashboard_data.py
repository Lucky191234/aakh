"""
build_dashboard_data.py
Merges all data files into data/data.json for the frontend.
Maintains 7-day rolling history for weekly digest.
"""

import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH  = "data/data.json"
HISTORY_PATH = "data/data_history.json"

FILES = {
    "repos":       "data/repos.json",
    "competitions":"data/competitions.json",
    "hn":          "data/hn.json",
    "hot_topics":  "data/hot_topics.json",
    "word_of_day": "data/word_of_day.json",
}


def load_or_empty(path: str, key: str):
    p = Path(path)
    if not p.exists():
        print(f"  ⚠ missing: {path}")
        return [] if key != "word_of_day" else {}
    return json.loads(p.read_text()).get(key, [] if key != "word_of_day" else {})


def is_monday() -> bool:
    return datetime.now(timezone.utc).weekday() == 0


def update_history(repos: list) -> set:
    path = Path(HISTORY_PATH)
    history = json.loads(path.read_text()) if path.exists() else {"days": []}

    today_entry = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "repo_names": [r["name"] for r in repos],
    }

    days = [d for d in history.get("days", []) if d["date"] != today_entry["date"]]
    days.append(today_entry)
    days = sorted(days, key=lambda d: d["date"])[-7:]
    history["days"] = days

    with open(HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)

    all_names = [name for day in days for name in day["repo_names"]]
    counts = Counter(all_names)
    return {name for name, count in counts.items() if count >= 2}


def tag_competitions(competitions: list):
    today = datetime.now(timezone.utc)
    for comp in competitions:
        comp["closing_soon"] = False
        try:
            from dateutil import parser as dp
            dt = dp.parse(comp.get("deadline", ""))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            days_left = (dt - today).days
            comp["closing_soon"] = 0 <= days_left <= 7
            comp["days_left"] = days_left
        except Exception:
            pass


def main():
    repos       = load_or_empty(FILES["repos"],        "repos")
    competitions= load_or_empty(FILES["competitions"],  "competitions")
    stories     = load_or_empty(FILES["hn"],            "stories")
    hot_topics  = load_or_empty(FILES["hot_topics"],    "hot_topics")
    word_of_day = load_or_empty(FILES["word_of_day"],   "word_of_day")

    os.makedirs("data", exist_ok=True)
    trending_multiday = update_history(repos)

    for repo in repos:
        repo["trending_multiday"] = repo["name"] in trending_multiday

    tag_competitions(competitions)

    monday = is_monday()
    if monday:
        print("  → Monday mode enabled")

    dashboard_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_label":   datetime.now(timezone.utc).strftime("%A, %d %B %Y"),
        "is_monday":    monday,
        "word_of_day":  word_of_day,
        "hot_topics":   hot_topics,
        "repos":        repos[:20],
        "competitions": competitions[:8],
        "hn_stories":   stories[:10],
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(dashboard_data, f, indent=2)

    print(f"✓ data.json built")
    print(f"  word: {word_of_day.get('word', 'n/a')}")
    print(f"  repos: {len(repos[:20])} ({len(trending_multiday)} multiday)")
    print(f"  competitions: {len(competitions[:8])}")
    print(f"  hot topics: {len(hot_topics)}")


if __name__ == "__main__":
    main()
