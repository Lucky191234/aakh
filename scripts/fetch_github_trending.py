"""
fetch_github_trending.py
Pulls trending repos from GitHub API.

Strategy: two passes per language —
  1. Recently CREATED repos gaining traction (new and rising)
  2. Recently PUSHED repos with high stars (established but newly active)

This catches both breakout new projects AND established repos
that just shipped something big.

Writes → data/repos.json
"""

import os
import json
import time
from datetime import datetime, timedelta, timezone

import requests
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/repos.json"
GITHUB_API = "https://api.github.com/search/repositories"


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)["github"]


def search(query: str, per_page: int, token: str) -> list[dict]:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": per_page,
    }
    resp = requests.get(GITHUB_API, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("items", [])


def normalise(item: dict, language: str) -> dict:
    return {
        "name": item["full_name"],
        "description": item.get("description") or "",
        "url": item["html_url"],
        "stars": item["stargazers_count"],
        "language": item.get("language") or language,
        "created_at": item["created_at"],
        "pushed_at": item.get("pushed_at", ""),
        "topics": item.get("topics", []),
        "trending_multiday": False,
    }


def main():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("GITHUB_TOKEN not set")

    config = load_config()
    languages = config["languages"]
    min_stars = config["min_stars"]
    per_language = config["per_language"]
    since_days = config["since_days"]

    since_date = (
        datetime.now(timezone.utc) - timedelta(days=since_days)
    ).strftime("%Y-%m-%d")

    # pushed:>date catches repos active in the last N days regardless of age
    pushed_date = (
        datetime.now(timezone.utc) - timedelta(days=3)
    ).strftime("%Y-%m-%d")

    all_repos = []
    seen = set()

    for lang in languages:
        print(f"  → {lang}...")
        try:
            # Pass 1: new repos gaining traction
            q1 = f"language:{lang} created:>{since_date} stars:>={min_stars}"
            for item in search(q1, per_language, token):
                if item["full_name"] not in seen:
                    seen.add(item["full_name"])
                    all_repos.append(normalise(item, lang))

            time.sleep(0.5)

            # Pass 2: active established repos (pushed recently, higher star floor)
            q2 = f"language:{lang} pushed:>{pushed_date} stars:>=500"
            for item in search(q2, per_language, token):
                if item["full_name"] not in seen:
                    seen.add(item["full_name"])
                    all_repos.append(normalise(item, lang))

            time.sleep(0.5)

        except requests.HTTPError as e:
            print(f"  ✗ failed for {lang}: {e}")

    # Sort by stars descending
    all_repos.sort(key=lambda r: r["stars"], reverse=True)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "repos": all_repos,
        }, f, indent=2)

    print(f"✓ {len(all_repos)} repos → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
