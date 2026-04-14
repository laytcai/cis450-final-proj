# Preprocessing Setup

This directory contains the preprocessing scripts for the CIS450 final project. It handles raw data download, raw-data inspection, and staged cleaning into project-ready CSV files.

## Recommended Environment Setup

Using Conda is recommended so the preprocessing dependencies stay isolated from the rest of your system.

Run these commands from the `preprocess/` directory:

```bash
conda create -n cis450proj python=3.11 -y
conda activate cis450proj
pip install -r requirements.txt
```

## Kaggle API Authentication

This project uses a local `.env` file for Kaggle credentials instead of `kaggle.json`.

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Open `.env` and fill in:

```env
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
```

The `.env` file is ignored by git, so Kaggle credentials stay local and are not committed to the repository.

## How to Run

The main preprocessing entry point is the shell pipeline script in this directory:

```bash
bash run_pipeline.sh
```

At a high level, `run_pipeline.sh`:

1. Downloads the raw Kaggle CSVs if they are not already present.
2. Runs `clean_anime.py`.
3. Runs `clean_animelists.py`.
4. Runs `clean_users.py`.

This produces cleaned datasets in `preprocess/data/cleaned/`.

## Raw Inspection

`inspect_raw.py` is a diagnostic script for exploratory inspection of the large raw CSV files before cleaning. It is not part of the main cleaning pipeline.

Run it from the `preprocess/` directory with:

```bash
python inspect_raw.py
```

It:

- reads the raw CSVs in chunks so large files can be inspected without loading everything into memory at once
- prints compact schema summaries, including column names and observed dtypes
- reports missing values, duplicate rows, and likely key-column unique counts
- shows the first few sample rows with long fields truncated for readability

Use it to understand the raw data shape and validate assumptions before changing the cleaning scripts.

## Project Structure

- Raw Kaggle data is stored in `preprocess/data/raw/`.
- Cleaned outputs are written to `preprocess/data/cleaned/`.

```text
preprocess/
├── .env.example
├── data/
│   ├── raw/
│   └── cleaned/
├── download_data.py
├── inspect_raw.py
├── clean_anime.py
├── clean_animelists.py
├── clean_users.py
├── run_pipeline.sh
├── requirements.txt
└── utils.py
```

Script roles:

- `download_data.py`: downloads the required raw Kaggle files into `data/raw/`
- `inspect_raw.py`: diagnostic raw-data inspection tool for schema and quality checks
- `clean_anime.py`: cleans anime metadata into `data/cleaned/anime_cleaned.csv`
- `clean_animelists.py`: cleans per-user anime list records into `data/cleaned/animelists_cleaned.csv`
- `clean_users.py`: cleans user profile data into `data/cleaned/users_cleaned.csv`
- `run_pipeline.sh`: main shell entry point that runs the full preprocessing pipeline
- `utils.py`: shared path and directory helpers for preprocessing scripts

## Dataset

The raw dataset is downloaded from Kaggle:

- `azathoth42/myanimelist`

The download step keeps only the files needed for this project:

- `AnimeList.csv`
- `UserList.csv`
- `UserAnimeList.csv`
