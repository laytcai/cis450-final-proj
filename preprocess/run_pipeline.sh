#!/bin/bash

set -e  # stop on error

echo "======================================"
echo "Starting preprocessing pipeline"
echo "======================================"

# Step 1: Download data (skip if already exists)
if [ -f "data/raw/AnimeList.csv" ] && [ -f "data/raw/UserList.csv" ] && [ -f "data/raw/UserAnimeList.csv" ]; then
    echo "[1/4] Raw data already exists. Skipping download."
else
    echo "[1/4] Downloading data..."
    python download_data.py
    echo "[✓] Download complete"
fi

echo "--------------------------------------"

# Step 2: Clean anime
echo "[2/4] Cleaning anime..."
python clean_anime.py
echo "[✓] Anime cleaned"

echo "--------------------------------------"

# Step 3: Clean animelists
echo "[3/4] Cleaning animelists..."
python clean_animelists.py
echo "[✓] Animelists cleaned"

echo "--------------------------------------"

# Step 4: Clean users
echo "[4/4] Cleaning users..."
python clean_users.py
echo "[✓] Users cleaned"

echo "======================================"
echo "Pipeline completed successfully"
echo "======================================"