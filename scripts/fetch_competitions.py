"""
fetch_competitions.py
Scrapes Devpost and MLH for upcoming hackathons.
Writes → data/competitions.json

Note: scrapers break when sites change their HTML.
Each source fails independently — one broken source never kills the whole run.
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

import requests
import yaml
from bs4 import BeautifulSoup

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/competitions.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def parse_devpost(url: str, min_days: int) -> list[dict]:
    """Scrape Devpost hackathons listing page."""
    results = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        cards = soup.select("li.hackathon-tile, div.hackathon-tile, article.hackathon")
        if not cards:
            # Try JSON-LD or other structures Devpost might use
            cards = soup.select("[data-type='hackathon']")

        for card in cards[:15]:
            title_el = card.select_one("h2, h3, .title, [class*='title']")
            link_el = card.select_one("a[href]")
            date_el = card.select_one(
                ".submission-period, [class*='date'], [class*='deadline'], time"
            )
            prize_el = card.select_one("[class*='prize'], [class*='Prize']")

            if not (title_el and link_el):
                continue

            href = link_el["href"]
            if not href.startswith("http"):
                href = "https://devpost.com" + href

            results.append({
                "title": title_el.get_text(strip=True),
                "url": href,
                "deadline": date_el.get_text(strip=True) if date_el else "See link",
                "prize": prize_el.get_text(strip=True) if prize_el else None,
                "source": "Devpost",
            })
    except Exception as e:
        print(f"  ✗ Devpost scrape failed: {e}")
    return results


def parse_mlh(url: str) -> list[dict]:
    """Scrape MLH events listing page."""
    results = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        events = soup.select(".event, .event-wrapper, [class*='event']")
        for event in events[:15]:
            title_el = event.select_one("h3, h2, .event-name, [class*='name']")
            link_el = event.select_one("a[href]")
            date_el = event.select_one(
                "p.date, [class*='date'], time, [class*='when']"
            )
            location_el = event.select_one("[class*='location'], [class*='where']")

            if not (title_el and link_el):
                continue

            href = link_el["href"]
            if not href.startswith("http"):
                href = "https://mlh.io" + href

            results.append({
                "title": title_el.get_text(strip=True),
                "url": href,
                "deadline": date_el.get_text(strip=True) if date_el else "See link",
                "location": location_el.get_text(strip=True) if location_el else None,
                "source": "MLH",
            })
    except Exception as e:
        print(f"  ✗ MLH scrape failed: {e}")
    return results


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    sources = config["competitions"]["sources"]
    min_days = config["competitions"]["min_days_remaining"]

    all_competitions = []

    for source in sources:
        name = source["name"]
        url = source["url"]
        print(f"  → scraping {name}...")

        if name == "Devpost":
            all_competitions.extend(parse_devpost(url, min_days))
        elif name == "MLH":
            all_competitions.extend(parse_mlh(url))
        else:
            print(f"  ✗ unknown source: {name}")

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "competitions": all_competitions,
        }, f, indent=2)

    print(f"✓ Saved {len(all_competitions)} competitions → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
