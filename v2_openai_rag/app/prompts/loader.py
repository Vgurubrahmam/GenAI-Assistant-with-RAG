import json
from pathlib import Path

PROMPTS_DIR=Path(__file__).parent

def load_prompt(filename: str) -> dict:
    """
    Load prompt JSON from prompts folder
    """
    path = PROMPTS_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)