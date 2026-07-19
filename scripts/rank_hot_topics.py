"""
rank_hot_topics.py
Reads today's activity digest + all fetched data, calls Groq API (free),
gets back a ranked list of hot topics relevant to the user's recent work.
Writes → data/hot_topics.json
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from groq import Groq
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/hot_topics.json"


def load_activity_digest(digest_path: str) -> str:
    path = Path(digest_path)
    if not path.exists():
        return ""
    return path.read_text().strip()


def build_candidate_pool() -> str:
    lines = []

    repos_path = Path("data/repos.json")
    if repos_path.exists():
        repos = json.loads(repos_path.read_text()).get("repos", [])
        lines.append("=== GITHUB REPOS (trending today) ===")
        for r in repos[:20]:
            lines.append(
                f"[REPO] {r['name']} — {r['description'][:120]} "
                f"(stars:{r['stars']}, lang:{r['language']}) {r['url']}"
            )

    hn_path = Path("data/hn.json")
    if hn_path.exists():
        stories = json.loads(hn_path.read_text()).get("stories", [])
        lines.append("\n=== HACKER NEWS (today) ===")
        for s in stories[:15]:
            lines.append(f"[HN] {s['title']} — {s['url']}")

    comp_path = Path("data/competitions.json")
    if comp_path.exists():
        comps = json.loads(comp_path.read_text()).get("competitions", [])
        lines.append("\n=== COMPETITIONS ===")
        for c in comps[:10]:
            lines.append(
                f"[COMPETITION] {c['title']} — deadline: {c['deadline']} — {c['url']}"
            )

    return "\n".join(lines)


def call_groq(activity: str, candidate_pool: str, fallback_prompt: str) -> list:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    if activity:
        activity_section = (
            f"Here is what the user was doing recently:\n---\n{activity}\n---\n"
            "Use this to rank items most relevant to their current work."
        )
    else:
        activity_section = f"No activity log today. {fallback_prompt}"

    system_prompt = (
        "You are a personalization engine for a student developer's morning dashboard. "
        "Given recent activity and a content pool, pick the 6 most relevant items. "
        "Return ONLY a JSON array, no markdown, no explanation. Each object must have: "
        "type (repo|hn|competition), title, description, url, stake, big_question, head_fake."
    )

    user_message = (
        f"{activity_section}\n\nContent pool:\n{candidate_pool}\n\n"
        "Return the top 6 as a JSON array."
    )

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if present
    if "```" in raw:
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

    print("  → calling Groq API for ranking...")
    hot_topics = call_groq(activity, candidate_pool, fallback_prompt)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "hot_topics": hot_topics,
        }, f, indent=2)

    print(f"✓ Saved {len(hot_topics)} hot topics → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
