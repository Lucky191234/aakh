"""
build_dashboard_data.py
Merges all individual data files into data/data.json for the frontend.
Also maintains a 7-day rolling history for the weekly digest feature.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path


OUTPUT_PATH = "data/data.json"
HISTORY_PATH = "data/data_history.json"

FILES = {
    "repos": "data/repos.json",
    "competitions": "data/competitions.json",
    "hn": "data/hn.json",
    "hot_topics": "data/hot_topics.json",
}


def load_or_empty(path: str, key: str):
    p = Path(path)
    if not p.exists():
        print(f"  ⚠ missing: {path} (will be empty in dashboard)")
        return []
    data = json.loads(p.read_text())
    return data.get(key, [])


def derive_big_question(hot_topics: list) -> str:
    if hot_topics and hot_topics[0].get("big_question"):
        return hot_topics[0]["big_question"]
    return "What did the dev world quietly ship while you were sleeping?"


def is_monday() -> bool:
    return datetime.now(timezone.utc).weekday() == 0


def update_history(repos: list, history_path: str) -> dict:
    """
    Keep a rolling 7-day history of repo names.
    Returns a set of repo names that appeared on multiple days (trending).
    """
    path = Path(history_path)
    history = json.loads(path.read_text()) if path.exists() else {"days": []}

    today_entry = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "repo_names": [r["name"] for r in repos],
    }

    days = history.get("days", [])
    # Remove today's entry if already present (re-run case)
    days = [d for d in days if d["date"] != today_entry["date"]]
    days.append(today_entry)
    # Keep only last 7 days
    days = sorted(days, key=lambda d: d["date"])[-7:]

    history["days"] = days

    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)

    # Find repos appearing on 2+ days
    from collections import Counter
    all_names = [name for day in days for name in day["repo_names"]]
    counts = Counter(all_names)
    trending_multiday = {name for name, count in counts.items() if count >= 2}
    return trending_multiday


def main():
    repos = load_or_empty(FILES["repos"], "repos")
    competitions = load_or_empty(FILES["competitions"], "competitions")
    stories = load_or_empty(FILES["hn"], "stories")
    hot_topics = load_or_empty(FILES["hot_topics"], "hot_topics")

    os.makedirs("data", exist_ok=True)
    trending_multiday = update_history(repos, HISTORY_PATH)

    # Tag repos that have trended multiple days
    for repo in repos:
        repo["trending_multiday"] = repo["name"] in trending_multiday

    # Tag competitions closing within 7 days
    today = datetime.now(timezone.utc)
    for comp in competitions:
        comp["closing_soon"] = False  # default; parsed below
        deadline_str = comp.get("deadline", "")
        try:
            from dateutil import parser as dateparser
            deadline_dt = dateparser.parse(deadline_str)
            if deadline_dt:
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                days_left = (deadline_dt - today).days
                comp["closing_soon"] = 0 <= days_left <= 7
                comp["days_left"] = days_left
        except Exception:
            pass

    monday = is_monday()
    if monday:
        print("  → Monday mode: weekly digest enabled")

    dashboard_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_label": datetime.now(timezone.utc).strftime("%A, %d %B %Y"),
        "is_monday": monday,
        "big_question": derive_big_question(hot_topics),
        "hot_topics": hot_topics,
        "repos": repos[:20],
        "competitions": competitions[:8],
        "hn_stories": stories[:10],
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(dashboard_data, f, indent=2)

    print(f"✓ Dashboard data built → {OUTPUT_PATH}")
    print(f"  repos: {len(repos[:20])} ({len(trending_multiday)} trending multiday)")
    print(f"  competitions: {len(competitions[:8])}")
    print(f"  hn stories: {len(stories[:10])}")
    print(f"  hot topics: {len(hot_topics)}")
    print(f"  monday mode: {monday}")


if __name__ == "__main__":
    main()
