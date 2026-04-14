"""Conservatively clean the raw anime metadata CSV."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


PREPROCESS_DIR = Path(__file__).resolve().parent
RAW_CSV_PATH = PREPROCESS_DIR / "data" / "raw" / "AnimeList.csv"
CLEANED_CSV_PATH = PREPROCESS_DIR / "data" / "cleaned" / "anime_cleaned.csv"
TARGET_COLUMNS = [
    "anime_id",
    "title",
    "title_english",
    "title_japanese",
    "title_synonyms",
    "image_url",
    "type",
    "source",
    "episodes",
    "status",
    "airing",
    "aired_string",
    "aired",
    "duration",
    "rating",
    "score",
    "scored_by",
    "rank",
    "popularity",
    "members",
    "favorites",
    "background",
    "premiered",
    "broadcast",
    "related",
    "producer",
    "licensor",
    "studio",
    "genre",
    "opening_theme",
    "ending_theme",
    "duration_min",
    "aired_from_year",
]
NUMERIC_NAME_HINTS = (
    "_id",
    "episode",
    "score",
    "rank",
    "popularity",
    "member",
    "favorite",
)


def load_anime_data(csv_path: Path) -> pd.DataFrame:
    """Load the raw anime CSV into a DataFrame."""
    if not csv_path.exists():
        raise SystemExit(
            f"Error: Missing raw anime file at {csv_path}. "
            "Run `python download_data.py` first."
        )

    return pd.read_csv(csv_path, low_memory=False)


def standardize_column_names(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and trim column names without altering the data."""
    cleaned = dataframe.copy()
    cleaned.columns = [column.strip().lower() for column in cleaned.columns]
    return cleaned


def remove_duplicate_rows(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove exact duplicate rows and report how many were dropped."""
    deduplicated = dataframe.drop_duplicates()
    removed_count = len(dataframe) - len(deduplicated)
    return deduplicated, removed_count


def remove_duplicate_anime_ids(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, int | None]:
    """Drop duplicate anime IDs when the column is present."""
    if "anime_id" not in dataframe.columns:
        return dataframe, None

    deduplicated = dataframe.drop_duplicates(subset="anime_id", keep="first")
    removed_count = len(dataframe) - len(deduplicated)
    return deduplicated, removed_count


def should_coerce_to_numeric(series: pd.Series, column_name: str) -> bool:
    """Identify conservative candidates for numeric coercion."""
    if pd.api.types.is_bool_dtype(series):
        return False

    if pd.api.types.is_numeric_dtype(series):
        return True

    non_null = series.dropna()
    if non_null.empty:
        return False

    column_name = column_name.lower()
    if any(hint in column_name for hint in NUMERIC_NAME_HINTS):
        return True

    stripped = non_null.astype("string").str.strip()
    converted = pd.to_numeric(stripped, errors="coerce")
    return converted.notna().mean() >= 0.95


def coerce_numeric_columns(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Convert obviously numeric columns to numeric types where safe."""
    cleaned = dataframe.copy()
    converted_columns: list[str] = []

    for column in cleaned.columns:
        series = cleaned[column]
        if not should_coerce_to_numeric(series, column):
            continue

        if pd.api.types.is_numeric_dtype(series):
            converted = pd.to_numeric(series, errors="coerce")
        else:
            converted = pd.to_numeric(series.astype("string").str.strip(), errors="coerce")

        if converted.notna().sum() == 0 and series.notna().sum() > 0:
            continue

        cleaned[column] = converted
        converted_columns.append(column)

    return cleaned, converted_columns


def add_schema_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Add conservative derived columns needed by the target output schema."""
    cleaned = dataframe.copy()

    if "duration_min" not in cleaned.columns:
        if "duration" in cleaned.columns:
            duration_values = cleaned["duration"].astype("string").str.extract(r"(\d+)\s*min")[0]
        else:
            duration_values = pd.Series(pd.NA, index=cleaned.index, dtype="object")
        cleaned["duration_min"] = pd.to_numeric(duration_values, errors="coerce")

    if "aired_from_year" not in cleaned.columns:
        if "aired" in cleaned.columns:
            aired_year = cleaned["aired"].astype("string").str.extract(r"(\d{4})")[0]
        else:
            aired_year = pd.Series(pd.NA, index=cleaned.index, dtype="object")

        if "aired_string" in cleaned.columns:
            aired_string_year = cleaned["aired_string"].astype("string").str.extract(r"(\d{4})")[0]
        else:
            aired_string_year = pd.Series(pd.NA, index=cleaned.index, dtype="object")

        cleaned["aired_from_year"] = pd.to_numeric(
            aired_year.fillna(aired_string_year),
            errors="coerce",
        )

    return cleaned


def validate_and_select_target_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Validate the final schema and return only the target columns in order."""
    missing = [column for column in TARGET_COLUMNS if column not in dataframe.columns]
    if missing:
        raise ValueError(f"Missing required columns for final output: {missing}")

    return dataframe[TARGET_COLUMNS]


def print_summary(
    dataframe: pd.DataFrame,
    original_shape: tuple[int, int],
    exact_duplicates_removed: int,
    anime_id_duplicates_removed: int | None,
    converted_columns: list[str],
) -> None:
    """Print a compact cleaning summary."""
    print(f"Original shape: {original_shape}")
    print(f"Final shape: {dataframe.shape}")
    print(f"Exact duplicate rows removed: {exact_duplicates_removed}")

    if anime_id_duplicates_removed is None:
        print("Duplicate anime_id rows removed: anime_id column not found")
    else:
        print(f"Duplicate anime_id rows removed: {anime_id_duplicates_removed}")

    if converted_columns:
        print(f"Numeric columns coerced: {', '.join(converted_columns)}")
    else:
        print("Numeric columns coerced: none")

    print(f"Columns: {list(dataframe.columns)}")
    print("Missing values:")
    for column, count in dataframe.isna().sum().items():
        print(f"  {column}: {int(count)}")


def main() -> None:
    """Run the conservative anime cleaning pipeline."""
    CLEANED_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    anime_df = load_anime_data(RAW_CSV_PATH)
    original_shape = anime_df.shape

    anime_df = standardize_column_names(anime_df)
    anime_df, exact_duplicates_removed = remove_duplicate_rows(anime_df)
    anime_df, anime_id_duplicates_removed = remove_duplicate_anime_ids(anime_df)
    anime_df, converted_columns = coerce_numeric_columns(anime_df)
    anime_df = add_schema_columns(anime_df)
    anime_df = validate_and_select_target_columns(anime_df)

    anime_df.to_csv(CLEANED_CSV_PATH, index=False)

    print_summary(
        anime_df,
        original_shape=original_shape,
        exact_duplicates_removed=exact_duplicates_removed,
        anime_id_duplicates_removed=anime_id_duplicates_removed,
        converted_columns=converted_columns,
    )
    print(f"Saved cleaned data to: {CLEANED_CSV_PATH}")


if __name__ == "__main__":
    main()
