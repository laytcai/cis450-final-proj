"""Download required raw CSV files from Kaggle into the local raw data folder."""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from utils import PREPROCESS_DIR, RAW_DIR, ensure_data_directories


DATASET = "azathoth42/myanimelist"
REQUIRED_FILES = (
    "AnimeList.csv",
    "UserList.csv",
    "UserAnimeList.csv",
)


def load_kaggle_credentials(env_path: Path) -> None:
    """Load Kaggle credentials from a local .env file into the environment."""
    if not env_path.exists():
        raise FileNotFoundError(
            f"Missing .env file at {env_path}. Copy .env.example to .env and fill in "
            "KAGGLE_USERNAME and KAGGLE_KEY."
        )

    try:
        from dotenv import load_dotenv
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency `python-dotenv`. Install dependencies with "
            "`pip install -r requirements.txt`."
        ) from exc

    load_dotenv(dotenv_path=env_path, override=True)

    username = os.getenv("KAGGLE_USERNAME", "").strip()
    key = os.getenv("KAGGLE_KEY", "").strip()

    missing_vars = []
    if not username:
        missing_vars.append("KAGGLE_USERNAME")
    if not key:
        missing_vars.append("KAGGLE_KEY")

    if missing_vars:
        missing_text = ", ".join(missing_vars)
        raise RuntimeError(
            f"Missing Kaggle credential(s) in {env_path}: {missing_text}. "
            "Update .env and try again."
        )

    os.environ["KAGGLE_USERNAME"] = username
    os.environ["KAGGLE_KEY"] = key


def download_dataset(download_dir: Path) -> None:
    """Download the Kaggle dataset into a temporary working directory."""
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency `kaggle`. Install dependencies with "
            "`pip install -r requirements.txt`."
        ) from exc

    api = KaggleApi()

    try:
        api.authenticate()
    except Exception as exc:
        raise RuntimeError(
            "Failed to authenticate with Kaggle. Check the credentials in .env."
        ) from exc

    try:
        api.dataset_download_files(
            dataset=DATASET,
            path=str(download_dir),
            quiet=False,
            force=True,
            unzip=False,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to download dataset `{DATASET}` from Kaggle."
        ) from exc


def extract_archives(download_dir: Path) -> Path:
    """Extract downloaded zip archives and return the directory to search."""
    zip_paths = list(download_dir.glob("*.zip"))
    if not zip_paths:
        return download_dir

    extracted_dir = download_dir / "extracted"
    extracted_dir.mkdir(parents=True, exist_ok=True)

    for zip_path in zip_paths:
        with ZipFile(zip_path, "r") as archive:
            archive.extractall(extracted_dir)

    return extracted_dir


def locate_required_files(search_dir: Path) -> dict[str, Path]:
    """Locate the required CSV files after download and extraction."""
    located_files: dict[str, Path] = {}
    missing_files = []

    for filename in REQUIRED_FILES:
        matches = [path for path in search_dir.rglob(filename) if path.is_file()]
        if matches:
            located_files[filename] = matches[0]
        else:
            missing_files.append(filename)

    if missing_files:
        missing_text = ", ".join(missing_files)
        raise FileNotFoundError(
            "Download completed, but the following required files were not found: "
            f"{missing_text}."
        )

    return located_files


def copy_required_files(source_files: dict[str, Path], destination_dir: Path) -> None:
    """Copy only the required CSV files into the raw data directory."""
    for filename, source_path in source_files.items():
        destination_path = destination_dir / filename
        shutil.copy2(source_path, destination_path)
        print(f"Saved {filename} -> {destination_path}")


def main() -> None:
    """Download and prepare the required raw CSV files for preprocessing."""
    ensure_data_directories()
    env_path = PREPROCESS_DIR / ".env"

    try:
        load_kaggle_credentials(env_path)

        with TemporaryDirectory(prefix="cis450_kaggle_") as temp_dir_name:
            temp_dir = Path(temp_dir_name)

            print(f"Downloading dataset `{DATASET}` from Kaggle...")
            download_dataset(temp_dir)

            search_dir = extract_archives(temp_dir)
            source_files = locate_required_files(search_dir)
            copy_required_files(source_files, RAW_DIR)

        print(f"Download complete. Raw files are available in {RAW_DIR}")
    except Exception as exc:
        raise SystemExit(f"Error: {exc}") from exc


if __name__ == "__main__":
    main()
