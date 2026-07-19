"""
rank_hot_topics.py
Reads today's activity digest + all fetched data, calls Claude API,
gets back a ranked list of hot topics relevant to the user's recent work.
Writes → data/hot_topics.json

The activity digest (activity_today.md) is meant to be edited by the user
before this script runs. If it's missing or empty, a fallback prompt is used.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/hot_topics.json"


def load_activity_digest(digest_path: str) -> str:
    path = Path(digest_path)
    if not path.exists():
        return ""
    content = path.read_text().strip()
    return content


def build_candidate_pool() -> str:
    """Collect all fetched data into a single text block for the LLM."""
    lines = []

    # GitHub repos
    repos_path = Path("data/repos.json")
    if repos_path.exists():
        repos = json.loads(repos_path.read_text()).get("repos", [])
        lines.append("=== GITHUB REPOS (trending today) ===")
        for r in repos[:20]:
            lines.append(
                f"[REPO] {r['name']} — {r['description'][:120]} "
                f"(⭐{r['stars']}, language: {r['language']}) {r['url']}"
            )

    # HN stories
    hn_path = Path("data/hn.json")
    if hn_path.exists():
        stories = json.loads(hn_path.read_text()).get("stories", [])
        lines.append("\n=== HACKER NEWS (today) ===")
        for s in stories[:15]:
            lines.append(f"[HN] {s['title']} — {s['url']}")

    # Competitions
    comp_path = Path("data/competitions.json")
    if comp_path.exists():
        comps = json.loads(comp_path.read_text()).get("competitions", [])
        lines.append("\n=== COMPETITIONS ===")
        for c in comps[:10]:
            lines.append(
                f"[COMPETITION] {c['title']} — deadline: {c['deadline']} "
                f"— {c['url']}"
            )

    return "\n".join(lines)


def call_claude(activity: str, candidate_pool: str, fallback_prompt: str) -> list[dict]:
    """Call Claude API, return ranked list of hot topics."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    if activity:
        activity_section = f"""Here is what the user was doing recently (their own notes):
---
{activity}
---
Use this to rank items most relevant to their current work and interests."""
    else:
        activity_section = f"No activity log today. {fallback_prompt}"

    system_prompt = """You are a personalization engine for a student developer's morning dashboard.
Given the user's recent activity and a pool of content, you pick the 6 most relevant
and interesting items across repos, HN stories, and competitions.

You MUST return ONLY a JSON array, no markdown, no explanation. Each item:
{
  "type": "repo" | "hn" | "competition",
  "title": "short title",
  "description": "one sentence why this is relevant to the user today",
  "url": "https://...",
  "stake": "one sentence naming what is at stake or why this matters right now",
  "big_question": "a single curiosity-gap question this item answers or raises",
  "head_fake": "what the user might expect this to be about vs what it's actually about"
}

The stake must be specific to the user's activity, not generic. The big_question
should feel personal and non-obvious. The head_fake should be genuinely surprising."""

    user_message = f"""{activity_section}

Here is today's content pool:
{candidate_pool}

Return the top 6 items as a JSON array."""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    activity_config = config["activity"]
    digest_path = activity_config["digest_path"]
    fallback_prompt = activity_config["fallback_prompt"]

    activity = load_activity_digest(digest_path)
    if activity:
        print(f"  → activity digest loaded ({len(activity)} chars)")
    else:
        print("  → no activity digest found, using fallback prompt")

    candidate_pool = build_candidate_pool()
    print(f"  → candidate pool built ({len(candidate_pool.splitlines())} items)")

    print("  → calling Claude API for ranking...")
    hot_topics = call_claude(activity, candidate_pool, fallback_prompt)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "hot_topics": hot_topics,
        }, f, indent=2)

    print(f"✓ Saved {len(hot_topics)} hot topics → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
