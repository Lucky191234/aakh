"""
rank_hot_topics.py
Calls Groq API to rank and return exactly 8 hot topics:
2 repos, 2 HN stories, 2 competitions, 2 floaters (best signal).
Writes -> data/hot_topics.json
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from groq import Groq
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/hot_topics.json"


def load_activity(digest_path: str) -> str:
    path = Path(digest_path)
    if not path.exists():
        return ""
    return path.read_text().strip()


def build_pool() -> str:
    lines = []

    repos_path = Path("data/repos.json")
    if repos_path.exists():
        repos = json.loads(repos_path.read_text()).get("repos", [])
        lines.append("=== GITHUB REPOS ===")
        for r in repos[:20]:
            lines.append(
                f"[REPO] {r['name']} -- {r['description'][:120]} "
                f"(stars:{r['stars']}, lang:{r['language']}) {r['url']}"
            )

    hn_path = Path("data/hn.json")
    if hn_path.exists():
        stories = json.loads(hn_path.read_text()).get("stories", [])
        lines.append("\n=== HACKER NEWS ===")
        for s in stories[:15]:
            lines.append(f"[HN] {s['title']} -- {s['url']}")

    comp_path = Path("data/competitions.json")
    if comp_path.exists():
        comps = json.loads(comp_path.read_text()).get("competitions", [])
        lines.append("\n=== COMPETITIONS ===")
        for c in comps[:10]:
            lines.append(
                f"[COMPETITION] {c['title']} -- deadline: {c.get('deadline', 'TBD')} -- {c['url']}"
            )

    return "\n".join(lines)


def call_groq(activity: str, pool: str, fallback: str) -> list:
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    activity_section = (
        f"User's recent activity:\n---\n{activity}\n---"
        if activity else f"No activity log. {fallback}"
    )

    system = """You are a personalization engine for a student developer morning dashboard.

Return EXACTLY 8 items as a JSON array. No markdown, no explanation, just the array.

REQUIRED distribution:
- Exactly 2 items with type "repo"
- Exactly 2 items with type "hn"
- Exactly 2 items with type "competition"
- Exactly 2 items with type "floater" (best signal from any category)

Each object must have:
{
  "type": "repo" | "hn" | "competition" | "floater",
  "title": "concise title",
  "description": "one sentence — why relevant to this user today",
  "url": "https://...",
  "big_question": "a non-obvious curiosity-gap question this item raises",
  "head_fake": "what it seems to be about vs what it actually reveals"
}

big_question and head_fake must be specific and surprising, not generic."""

    user_msg = f"""{activity_section}

Content pool:
{pool}

Return exactly 8 items following the distribution above."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=2000,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg},
        ],
    )

    raw = response.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    activity_cfg = config["activity"]
    activity     = load_activity(activity_cfg["digest_path"])
    fallback     = activity_cfg["fallback_prompt"]

    print(f"  -> activity: {'loaded' if activity else 'using fallback'}")
    pool = build_pool()
    print(f"  -> pool: {len(pool.splitlines())} items")
    print("  -> calling Groq...")

    topics = call_groq(activity, pool, fallback)

    # Validate distribution — pad/trim if model misbehaves
    by_type = {"repo": [], "hn": [], "competition": [], "floater": []}
    for t in topics:
        typ = t.get("type", "floater")
        by_type.setdefault(typ, []).append(t)

    final = []
    for typ, count in [("repo", 2), ("hn", 2), ("competition", 2), ("floater", 2)]:
        items = by_type.get(typ, [])
        final.extend(items[:count])

    # If we have fewer than 8, fill from any remaining
    all_remaining = [t for t in topics if t not in final]
    while len(final) < 8 and all_remaining:
        final.append(all_remaining.pop(0))

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "hot_topics": final,
        }, f, indent=2)

    print(f"Done: {len(final)} hot topics -> {OUTPUT_PATH}")
    for t in final:
        print(f"  [{t.get('type','?'):12}] {t.get('title','')[:60]}")


if __name__ == "__main__":
    main()
