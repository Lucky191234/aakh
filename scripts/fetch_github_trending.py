"""
fetch_github_trending.py
Pulls trending/recently-starred repos from GitHub API per language.
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


def fetch_repos_for_language(language: str, since_date: str, min_stars: int,
                              per_language: int, token: str) -> list[dict]:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    query = f"language:{language} created:>{since_date} stars:>={min_stars}"
    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": per_language,
    }

    resp = requests.get(GITHUB_API, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    items = resp.json().get("items", [])

    results = []
    for item in items:
        results.append({
            "name": item["full_name"],
            "description": item.get("description") or "",
            "url": item["html_url"],
            "stars": item["stargazers_count"],
            "language": item.get("language") or language,
            "created_at": item["created_at"],
            "topics": item.get("topics", []),
        })
    return results


def main():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("GITHUB_TOKEN environment variable not set")

    config = load_config()
    since_date = (
        datetime.now(timezone.utc) - timedelta(days=config["since_days"])
    ).strftime("%Y-%m-%d")

    all_repos = []
    seen = set()

    for lang in config["languages"]:
        print(f"  → fetching {lang}...")
        try:
            repos = fetch_repos_for_language(
                language=lang,
                since_date=since_date,
                min_stars=config["min_stars"],
                per_language=config["per_language"],
                token=token,
            )
            for repo in repos:
                if repo["name"] not in seen:
                    seen.add(repo["name"])
                    all_repos.append(repo)
        except requests.HTTPError as e:
            print(f"  ✗ failed for {lang}: {e}")
        time.sleep(0.5)  # stay well within rate limits

    # Sort overall by stars descending
    all_repos.sort(key=lambda r: r["stars"], reverse=True)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "repos": all_repos,
        }, f, indent=2)

    print(f"✓ Saved {len(all_repos)} repos → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
