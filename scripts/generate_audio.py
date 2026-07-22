"""
generate_audio.py
Generates a morning audio briefing MP3 from data/data.json
using edge-tts (Microsoft Edge neural TTS — free, no API key).
Writes → docs/audio/morning.mp3

The audio is ~3 minutes and designed for bike commutes:
- No screen needed after pressing play
- Natural spoken pacing
- Hot topics first, then one competition, then two repos
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import edge_tts

DATA_PATH = "data/data.json"
OUTPUT_PATH = "docs/audio/morning.mp3"
VOICE = "en-IN-NeerjaNeural"  # Indian English, natural female voice
# Alternatives: "en-US-GuyNeural", "en-GB-RyanNeural"


def build_script(data: dict) -> str:
    """Turn data.json into a natural spoken briefing script."""
    lines = []

    date_label = data.get("date_label", "today")
    big_q = data.get("big_question", "")

    lines.append(f"Good morning. It's {date_label}.")
    lines.append("Here is your Aakh briefing. Estimated listening time: 3 minutes.")
    lines.append("")

    # Big question as the opener
    if big_q:
        lines.append(f"Today's big question: {big_q}")
        lines.append("")

    # Hot topics
    hot = data.get("hot_topics", [])
    if hot:
        lines.append("Hot for you today.")
        lines.append("")
        for i, topic in enumerate(hot[:4], 1):
            title = topic.get("title", "")
            desc = topic.get("description", "")
            big_q_item = topic.get("big_question", "")
            lines.append(f"Number {i}. {title}.")
            if big_q_item:
                lines.append(f"{big_q_item}")
            if desc:
                lines.append(f"{desc}")
            lines.append("")

    # One competition with a deadline
    comps = data.get("competitions", [])
    if comps:
        lines.append("One competition to note.")
        c = comps[0]
        lines.append(
            f"{c['title']}. Deadline: {c.get('deadline', 'check the link')}. "
            f"Source: {c.get('source', '')}."
        )
        lines.append("")

    # Two repos
    repos = data.get("repos", [])
    if repos:
        lines.append("Two repos rising on GitHub.")
        for repo in repos[:2]:
            name = repo["name"].split("/")[-1].replace("-", " ").replace("_", " ")
            desc = repo.get("description", "")
            stars = repo.get("stars", 0)
            lines.append(
                f"{name}. {desc[:100] + '...' if len(desc) > 100 else desc} "
                f"— {stars:,} stars."
            )
        lines.append("")

    lines.append("That's your briefing. Have a good ride.")
    return "\n".join(lines)


async def generate_mp3(script: str, output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    communicate = edge_tts.Communicate(script, VOICE)
    await communicate.save(output_path)


def main():
    data_path = Path(DATA_PATH)
    if not data_path.exists():
        print("  ✗ data/data.json not found — skipping audio generation")
        return

    data = json.loads(data_path.read_text())
    script = build_script(data)

    print(f"  → script ready ({len(script.split())} words, ~{len(script.split()) // 130 + 1} min)")
    print("  → generating MP3 with edge-tts...")

    asyncio.run(generate_mp3(script, OUTPUT_PATH))

    size_kb = Path(OUTPUT_PATH).stat().st_size // 1024
    print(f"✓ Audio saved → {OUTPUT_PATH} ({size_kb} KB)")


if __name__ == "__main__":
    main()
