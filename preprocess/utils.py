"""Shared paths and helper utilities for preprocessing scripts."""

from pathlib import Path


PREPROCESS_DIR = Path(__file__).resolve().parent
DATA_DIR = PREPROCESS_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
CLEANED_DIR = DATA_DIR / "cleaned"


def ensure_data_directories() -> None:
    """Create the expected data directories if they do not already exist."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)
