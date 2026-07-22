"""
fetch_competitions.py
Fetches hackathons from Devpost and Devfolio public APIs.
No scraping, no headless browser — pure JSON API calls.
Writes → data/competitions.json
"""

import json
import os
from datetime import datetime, timezone

import requests
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/competitions.json"

HEADERS = {
    "User-Agent": "aakh-student-dashboard/1.0",
    "Accept": "application/json",
}


def fetch_devpost() -> list[dict]:
    """Devpost semi-public API — returns JSON directly."""
    results = []
    try:
        url = "https://devpost.com/api/hackathons"
        params = {
            "status[]": "open",
            "order_by": "deadline",
            "per_page": 10,
        }
        resp = requests.get(url, headers=HEADERS, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()

        for h in data.get("hackathons", []):
            results.append({
                "title": h.get("title", ""),
                "url": h.get("url", ""),
                "deadline": h.get("submission_period_dates", "See link"),
                "prize": h.get("prize_amount", None),
                "participants": h.get("registrations_count", None),
                "source": "Devpost",
            })
    except Exception as e:
        print(f"  ✗ Devpost API failed: {e}")
    return results


def fetch_devfolio() -> list[dict]:
    """Devfolio public API."""
    results = []
    try:
        url = "https://api.devfolio.co/api/hackathons"
        params = {
            "type": "open",
            "page": 1,
            "per_page": 10,
        }
        resp = requests.get(url, headers=HEADERS, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()

        hackathons = data if isinstance(data, list) else data.get("results", [])

        for h in hackathons[:10]:
            ends_at = h.get("ends_at") or h.get("submission_deadline") or "See link"
            # Format date if ISO string
            if "T" in str(ends_at):
                try:
                    dt = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                    ends_at = dt.strftime("%b %d, %Y")
                except Exception:
                    pass

            results.append({
                "title": h.get("name", h.get("title", "")),
                "url": f"https://devfolio.co/hackathons/{h.get('slug', '')}",
                "deadline": ends_at,
                "prize": h.get("prize_pool", None),
                "participants": h.get("total_applications", None),
                "source": "Devfolio",
            })
    except Exception as e:
        print(f"  ✗ Devfolio API failed: {e}")
    return results


def main():
    os.makedirs("data", exist_ok=True)
    all_competitions = []

    print("  → fetching Devpost...")
    all_competitions.extend(fetch_devpost())

    print("  → fetching Devfolio...")
    all_competitions.extend(fetch_devfolio())

    # Deduplicate by title
    seen = set()
    unique = []
    for c in all_competitions:
        if c["title"] not in seen and c["title"]:
            seen.add(c["title"])
            unique.append(c)

    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "competitions": unique,
        }, f, indent=2)

    print(f"✓ Saved {len(unique)} competitions → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
