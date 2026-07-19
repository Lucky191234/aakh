"""
build_dashboard_data.py
Merges all individual data files into a single data/data.json
that the dashboard frontend reads. This is the only file the
frontend ever needs to fetch.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path


OUTPUT_PATH = "data/data.json"

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


def derive_big_question(hot_topics: list[dict]) -> str:
    """Pick the top hot topic's big_question as the hero question for the day."""
    if hot_topics and hot_topics[0].get("big_question"):
        return hot_topics[0]["big_question"]
    return "What did the dev world quietly ship while you were sleeping?"


def main():
    repos = load_or_empty(FILES["repos"], "repos")
    competitions = load_or_empty(FILES["competitions"], "competitions")
    stories = load_or_empty(FILES["hn"], "stories")
    hot_topics = load_or_empty(FILES["hot_topics"], "hot_topics")

    dashboard_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_label": datetime.now(timezone.utc).strftime("%A, %d %B %Y"),
        "big_question": derive_big_question(hot_topics),
        "hot_topics": hot_topics,
        "repos": repos[:12],
        "competitions": competitions[:8],
        "hn_stories": stories[:10],
    }

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(dashboard_data, f, indent=2)

    print(f"✓ Dashboard data built → {OUTPUT_PATH}")
    print(f"  repos: {len(repos[:12])}")
    print(f"  competitions: {len(competitions[:8])}")
    print(f"  hn stories: {len(stories[:10])}")
    print(f"  hot topics: {len(hot_topics)}")
    print(f"  big question: {dashboard_data['big_question'][:80]}...")


if __name__ == "__main__":
    main()
