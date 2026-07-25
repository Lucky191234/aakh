"""
fetch_competitions.py
Sources: Unstop, Devpost, MLH
MLH year is configurable via config/sources.yaml (mlh_year field).
"""

import json
import os
import time
from datetime import datetime, timezone

import requests
import yaml
from bs4 import BeautifulSoup

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/competitions.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_unstop() -> list[dict]:
    results = []
    try:
        session = requests.Session()
        session.get("https://unstop.com", headers=HEADERS, timeout=20)
        time.sleep(1)
        resp = session.get("https://unstop.com/hackathons", headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("div.opportunity-card, div[class*='hackathon'], div.single-opportunity")
        for card in cards[:12]:
            title_el = card.select_one("h2, h3, .title, [class*='title'], strong")
            link_el  = card.select_one("a[href]")
            date_el  = card.select_one("[class*='date'], [class*='deadline'], time")
            if not (title_el and link_el):
                continue
            href = link_el["href"]
            if href.startswith("/"):
                href = "https://unstop.com" + href
            title = title_el.get_text(strip=True)
            if len(title) < 5:
                continue
            results.append({
                "title":    title,
                "url":      href,
                "deadline": date_el.get_text(strip=True) if date_el else "See link",
                "source":   "Unstop",
            })
    except Exception as e:
        print(f"  x Unstop failed: {e}")
    return results


def fetch_devpost() -> list[dict]:
    results = []
    try:
        session = requests.Session()
        session.get("https://devpost.com", headers=HEADERS, timeout=20)
        time.sleep(1)
        resp = session.get(
            "https://devpost.com/hackathons?open_to=public&status=open",
            headers={**HEADERS, "Referer": "https://devpost.com"},
            timeout=20,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("article.hackathon-tile, li.hackathon-tile, div[class*='hackathon-tile']")
        for card in cards[:10]:
            title_el = card.select_one("h2, h3, .hackathon-title, [class*='title']")
            link_el  = card.select_one("a[href]")
            date_el  = card.select_one(".submission-period, [class*='date'], time")
            prize_el = card.select_one("[class*='prize']")
            if not (title_el and link_el):
                continue
            href = link_el["href"]
            if href.startswith("/"):
                href = "https://devpost.com" + href
            results.append({
                "title":    title_el.get_text(strip=True),
                "url":      href,
                "deadline": date_el.get_text(strip=True) if date_el else "See link",
                "prize":    prize_el.get_text(strip=True) if prize_el else None,
                "source":   "Devpost",
            })
    except Exception as e:
        print(f"  x Devpost failed: {e}")
    return results


def fetch_mlh(year: int) -> list[dict]:
    results = []
    try:
        url = f"https://mlh.io/seasons/{year}/events"
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        events = soup.select(".event, div.feature.event, [class*='event-wrapper']")
        for event in events[:10]:
            title_el = event.select_one("h3.event-name, h2, h3, [class*='name']")
            link_el  = event.select_one("a[href]")
            date_el  = event.select_one("p.event-date, [class*='date'], time")
            loc_el   = event.select_one("[class*='location'], [class*='where']")
            if not title_el:
                continue
            href = "#"
            if link_el:
                href = link_el["href"]
                if href.startswith("/"):
                    href = "https://mlh.io" + href
            results.append({
                "title":    title_el.get_text(strip=True),
                "url":      href,
                "deadline": date_el.get_text(strip=True) if date_el else "See link",
                "location": loc_el.get_text(strip=True) if loc_el else None,
                "source":   "MLH",
            })
    except Exception as e:
        print(f"  x MLH ({year}) failed: {e}")
    return results


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    sources_cfg = config["competitions"]["sources"]
    mlh_year    = next((s["mlh_year"] for s in sources_cfg if s.get("mlh_year")), datetime.now().year)

    all_comps = []
    print("  -> Unstop...")
    all_comps.extend(fetch_unstop())
    time.sleep(1)
    print("  -> Devpost...")
    all_comps.extend(fetch_devpost())
    time.sleep(1)
    print(f"  -> MLH ({mlh_year})...")
    all_comps.extend(fetch_mlh(mlh_year))

    seen, unique = set(), []
    for c in all_comps:
        key = c["title"].lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(c)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at":   datetime.now(timezone.utc).isoformat(),
            "competitions": unique,
        }, f, indent=2)

    print(f"Done: {len(unique)} competitions -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
