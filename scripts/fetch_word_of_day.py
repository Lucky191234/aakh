"""
fetch_word_of_day.py
Fetches word of the day using Free Dictionary API (no key, clean JSON).
Falls back to a curated word if the API fails.
Writes -> data/word_of_day.json
"""

import json
import os
import random
from datetime import datetime, timezone

import requests
import yaml

CONFIG_PATH = "config/sources.yaml"
OUTPUT_PATH = "data/word_of_day.json"

# Curated fallback words — used only if API is down
FALLBACKS = [
    {"word": "ephemeral",   "part_of_speech": "adjective", "definition": "Lasting for a very short time.", "example": "The ephemeral beauty of cherry blossoms makes them all the more precious."},
    {"word": "perspicuous", "part_of_speech": "adjective", "definition": "Clearly expressed and easily understood.", "example": "Her perspicuous explanation made the complex topic accessible to everyone."},
    {"word": "sonder",      "part_of_speech": "noun",      "definition": "The realization that each passerby has a life as vivid and complex as your own.", "example": ""},
    {"word": "lucid",       "part_of_speech": "adjective", "definition": "Expressed clearly; easy to understand.", "example": "He gave a lucid account of the incident."},
    {"word": "cadence",     "part_of_speech": "noun",      "definition": "A rhythmic sequence or flow of sounds.", "example": "The cadence of her voice was calm and reassuring."},
]

# Word list to pick from daily (seeded by day so same word all day)
WORD_LIST = [
    "ephemeral", "lucid", "perspicacious", "sanguine", "melancholy",
    "serendipity", "eloquent", "resilient", "pragmatic", "altruistic",
    "ubiquitous", "paradox", "tenacious", "candid", "astute",
    "brevity", "catalyst", "diligent", "empirical", "frugal",
    "gratitude", "hubris", "impartial", "juxtapose", "kinetic",
]


def fetch_word(word: str, api_url: str) -> dict | None:
    try:
        resp = requests.get(f"{api_url}/{word}", timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data or not isinstance(data, list):
            return None

        entry = data[0]
        word_str = entry.get("word", word)
        meanings = entry.get("meanings", [])
        if not meanings:
            return None

        meaning = meanings[0]
        pos = meaning.get("partOfSpeech", "")
        defs = meaning.get("definitions", [])
        if not defs:
            return None

        definition = defs[0].get("definition", "")
        example    = defs[0].get("example", "")
        phonetic   = entry.get("phonetic", "")

        return {
            "word":           word_str,
            "phonetic":       phonetic,
            "part_of_speech": pos,
            "definition":     definition,
            "example":        example,
            "date":           datetime.now(timezone.utc).strftime("%B %d, %Y"),
            "source_url":     f"https://www.merriam-webster.com/dictionary/{word_str}",
        }
    except Exception as e:
        print(f"  ✗ API error for '{word}': {e}")
        return None


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    api_url = config["word_of_day"]["api_url"]

    # Pick word seeded by day-of-year so it's stable all day
    day_seed = datetime.now(timezone.utc).timetuple().tm_yday
    word = WORD_LIST[day_seed % len(WORD_LIST)]

    print(f"  -> fetching definition for '{word}'...")
    result = fetch_word(word, api_url)

    if not result:
        print("  -> API failed, using fallback word")
        result = random.choice(FALLBACKS)
        result["date"] = datetime.now(timezone.utc).strftime("%B %d, %Y")

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "fetched_at":  datetime.now(timezone.utc).isoformat(),
            "word_of_day": result,
        }, f, indent=2)

    print(f"Done: '{result['word']}' ({result['part_of_speech']}) -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
