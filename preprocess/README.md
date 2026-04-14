# Preprocessing Setup

This directory contains the preprocessing setup for the CIS450 final project. The current focus is environment configuration, Kaggle authentication, raw data download, and basic raw-data inspection. Cleaning scripts remain placeholders for later implementation.

## Recommended Environment Setup

Using Conda is recommended so the preprocessing dependencies stay isolated from the rest of your system.

Run these commands from the `preprocess/` directory:

```bash
conda create -n cis450proj python=3.11 -y
conda activate cis450proj
pip install -r requirements.txt
python -m ipykernel install --user --name cis450proj --display-name "Python (cis450proj)"
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

## Preprocessing Workflow

1. Set up the Conda environment and install dependencies.
2. Configure `.env` with `KAGGLE_USERNAME` and `KAGGLE_KEY`.
3. Run the download script:

```bash
python download_data.py
```

4. Run inspection and cleaning scripts later as the preprocessing pipeline is implemented:

```bash
python inspect_raw.py
python run_pipeline.py
```

## Directory Layout

- Raw Kaggle data is saved to `preprocess/data/raw/`.
- Cleaned outputs will be saved to `preprocess/data/cleaned/`.

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
├── run_pipeline.py
├── requirements.txt
└── utils.py
```

## Dataset

The raw dataset is downloaded from Kaggle:

- `azathoth42/myanimelist`

The download step keeps only the files needed for this project:

- `AnimeList.csv`
- `UserList.csv`
- `UserAnimeList.csv`
