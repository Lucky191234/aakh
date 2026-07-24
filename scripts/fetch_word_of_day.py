"""
fetch_word_of_day.py
Pulls Merriam-Webster's word of the day from their RSS feed.
Free, no API key, reliable.
Writes → data/word_of_day.json
"""

import json
import os
import re
from datetime import datetime, timezone

import feedparser
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/word_of_day.json"


def clean_html(text: str) -> str:
    """Strip HTML tags from MW descriptions."""
    return re.sub(r"<[^>]+>", "", text).strip()


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    rss_url = config["word_of_day"]["rss_url"]
    print(f"  → fetching word of the day from Merriam-Webster...")

    feed = feedparser.parse(rss_url)

    if not feed.entries:
        print("  ✗ no entries in MW RSS feed")
        word_data = {
            "word": "serendipity",
            "part_of_speech": "noun",
            "definition": "the faculty or phenomenon of finding valuable or agreeable things not sought for",
            "example": "",
            "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        }
    else:
        entry = feed.entries[0]
        title = entry.get("title", "")
        summary = clean_html(entry.get("summary", ""))

        # MW RSS title format: "word : part of speech"
        # e.g. "ephemeral : adjective"
        parts = title.split(":")
        word = parts[0].strip() if parts else title
        pos = parts[1].strip() if len(parts) > 1 else ""

        # Summary usually starts with definition then example
        lines = [l.strip() for l in summary.split("\n") if l.strip()]
        definition = lines[0] if lines else summary[:200]
        example = lines[1] if len(lines) > 1 else ""

        word_data = {
            "word": word,
            "part_of_speech": pos,
            "definition": definition[:300],
            "example": example[:200],
            "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
            "source_url": entry.get("link", "https://www.merriam-webster.com/word-of-the-day"),
        }

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "word_of_day": word_data,
        }, f, indent=2)

    print(f"✓ Word of the day: '{word_data['word']}' → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
