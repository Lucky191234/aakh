"""
fetch_hackernews_rss.py
Pulls top stories from Hacker News RSS, filtered by keywords from config.
Writes → data/hn.json
"""

import json
import os
from datetime import datetime, timezone

import feedparser
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/hn.json"


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)["hackernews"]

    rss_url = config["rss_url"]
    limit = config["limit"]
    keywords = [kw.lower() for kw in config.get("keywords", [])]

    print(f"  → fetching HN RSS ({rss_url})...")
    feed = feedparser.parse(rss_url)

    stories = []
    for entry in feed.entries[:limit]:
        title = entry.get("title", "")
        link = entry.get("link", "")
        summary = entry.get("summary", "")
        published = entry.get("published", "")

        # Filter by keyword if list is non-empty
        if keywords:
            text = (title + " " + summary).lower()
            if not any(kw in text for kw in keywords):
                continue

        stories.append({
            "title": title,
            "url": link,
            "summary": summary[:300] if summary else "",
            "published": published,
            "source": "Hacker News",
        })

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "stories": stories,
        }, f, indent=2)

    print(f"✓ Saved {len(stories)} HN stories → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
