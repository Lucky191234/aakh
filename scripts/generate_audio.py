"""
generate_audio.py
Generates 4 MP3 files using different edge-tts voices defined in sources.yaml.
Writes -> docs/audio/morning_{voice_file}.mp3
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import edge_tts
import yaml

CONFIG_PATH = "config/sources.yaml"
DATA_PATH   = "data/data.json"
AUDIO_DIR   = "docs/audio"


def build_script(data: dict) -> str:
    lines = []
    date_label = data.get("date_label", "today")
    wotd = data.get("word_of_day", {})

    lines.append(f"Good morning. It's {date_label}.")
    lines.append("Here is your Aakh briefing.")
    lines.append("")

    if wotd.get("word"):
        lines.append(f"Word of the day: {wotd['word']}.")
        if wotd.get("part_of_speech"):
            lines.append(f"{wotd['part_of_speech']}.")
        if wotd.get("definition"):
            lines.append(f"{wotd['definition']}")
        lines.append("")

    hot = data.get("hot_topics", [])
    if hot:
        lines.append("Hot for you today.")
        lines.append("")
        for i, topic in enumerate(hot[:4], 1):
            lines.append(f"Number {i}. {topic.get('title', '')}.")
            if topic.get("big_question"):
                lines.append(topic["big_question"])
            if topic.get("description"):
                lines.append(topic["description"])
            lines.append("")

    comps = data.get("competitions", [])
    if comps:
        c = comps[0]
        lines.append(f"One competition: {c['title']}. Deadline: {c.get('deadline', 'check the link')}.")
        lines.append("")

    repos = data.get("repos", [])
    if repos:
        lines.append("Two repos rising on GitHub.")
        for repo in repos[:2]:
            name = repo["name"].split("/")[-1].replace("-", " ").replace("_", " ")
            desc = repo.get("description", "")
            lines.append(f"{name}. {desc[:100]}. {repo.get('stars', 0):,} stars.")
        lines.append("")

    lines.append("That's your briefing. Have a good day.")
    return "\n".join(lines)


async def generate_one(script: str, voice: str, output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    communicate = edge_tts.Communicate(script, voice)
    await communicate.save(output_path)


async def generate_all(script: str, voices: list):
    tasks = [
        generate_one(script, v["voice"], f"{AUDIO_DIR}/{v['file']}")
        for v in voices
    ]
    await asyncio.gather(*tasks)


def main():
    data_path = Path(DATA_PATH)
    if not data_path.exists():
        print("  x data/data.json not found — skipping audio")
        return

    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    voices = config["audio"]["voices"]
    data   = json.loads(data_path.read_text())
    script = build_script(data)

    word_count = len(script.split())
    print(f"  -> script: {word_count} words (~{word_count // 130 + 1} min)")
    print(f"  -> generating {len(voices)} MP3 files...")

    asyncio.run(generate_all(script, voices))

    for v in voices:
        path = Path(f"{AUDIO_DIR}/{v['file']}")
        if path.exists():
            print(f"  ok {v['file']} ({path.stat().st_size // 1024} KB)")
        else:
            print(f"  x {v['file']} — generation failed")

    print(f"Done: audio files -> {AUDIO_DIR}/")


if __name__ == "__main__":
    main()
