"""Conservatively clean the raw user-anime interaction CSV."""

from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

import pandas as pd


PREPROCESS_DIR = Path(__file__).resolve().parent
RAW_CSV_PATH = PREPROCESS_DIR / "data" / "raw" / "UserAnimeList.csv"
ANIME_CLEANED_PATH = PREPROCESS_DIR / "data" / "cleaned" / "anime_cleaned.csv"
OUTPUT_CSV_PATH = PREPROCESS_DIR / "data" / "cleaned" / "animelists_cleaned.csv"
TARGET_COLUMNS = [
    "username",
    "anime_id",
    "my_watched_episodes",
    "my_start_date",
    "my_finish_date",
    "my_score",
    "my_status",
    "my_rewatching",
    "my_rewatching_ep",
    "my_last_updated",
    "my_tags",
]
CHUNK_SIZE = 100_000
MISSING_SENTINEL = "<NA>"
NUMERIC_NAME_HINTS = (
    "_id",
    "score",
    "episode",
    "episodes",
    "rewatch",
    "status",
    "updated",
)


class DuplicateTracker:
    """Track duplicate rows on disk so large CSVs can be processed in chunks."""

    def __init__(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory(prefix="clean_animelists_")
        database_path = Path(self._temp_dir.name) / "row_hashes.sqlite"
        self._connection = sqlite3.connect(database_path)
        self._connection.execute("PRAGMA journal_mode=OFF")
        self._connection.execute("PRAGMA synchronous=OFF")
        self._connection.execute("PRAGMA locking_mode=EXCLUSIVE")
        self._connection.execute("PRAGMA temp_store=MEMORY")
        self._connection.execute(
            "CREATE TABLE seen_hashes (row_hash INTEGER PRIMARY KEY) WITHOUT ROWID"
        )
        self._connection.execute(
            "CREATE TEMP TABLE batch_hashes (row_index INTEGER, row_hash INTEGER)"
        )

    def keep_mask(self, row_hashes) -> tuple[list[bool], int]:
        """Return a boolean keep mask and duplicate count for one chunk."""
        int_hashes = row_hashes.astype("uint64", copy=False).view("int64")

        self._connection.execute("DELETE FROM batch_hashes")
        self._connection.executemany(
            "INSERT INTO batch_hashes(row_index, row_hash) VALUES (?, ?)",
            ((index, int(row_hash)) for index, row_hash in enumerate(int_hashes)),
        )

        keep_indices = {
            row_index
            for (row_index,) in self._connection.execute(
                """
                SELECT MIN(batch.row_index)
                FROM batch_hashes AS batch
                LEFT JOIN seen_hashes AS seen
                    ON batch.row_hash = seen.row_hash
                WHERE seen.row_hash IS NULL
                GROUP BY batch.row_hash
                ORDER BY MIN(batch.row_index)
                """
            )
        }

        self._connection.execute(
            """
            INSERT OR IGNORE INTO seen_hashes(row_hash)
            SELECT DISTINCT row_hash
            FROM batch_hashes
            """
        )

        keep_mask = [index in keep_indices for index in range(len(int_hashes))]
        duplicate_count = len(int_hashes) - len(keep_indices)
        return keep_mask, duplicate_count

    def close(self) -> None:
        """Release temporary SQLite resources."""
        self._connection.commit()
        self._connection.close()
        self._temp_dir.cleanup()


def ensure_required_files() -> None:
    """Fail early if the expected raw or reference files are missing."""
    missing_paths = [
        path
        for path in (RAW_CSV_PATH, ANIME_CLEANED_PATH)
        if not path.exists()
    ]
    if missing_paths:
        missing_text = ", ".join(str(path) for path in missing_paths)
        raise SystemExit(f"Error: Missing required input file(s): {missing_text}")


def standardize_column_names(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and trim column names without altering the row data."""
    cleaned = dataframe.copy()
    cleaned.columns = [column.strip().lower() for column in cleaned.columns]
    return cleaned


def find_user_key_column(column_names: list[str]) -> str:
    """Choose the available user identifier column."""
    if "user_id" in column_names:
        return "user_id"
    if "username" in column_names:
        return "username"
    raise SystemExit("Error: Expected either `user_id` or `username` in UserAnimeList.csv.")


def find_watched_episodes_column(column_names: list[str]) -> str | None:
    """Locate the watched-episode field without renaming raw columns."""
    preferred_names = ("watched_episodes", "my_watched_episodes")
    for column in preferred_names:
        if column in column_names:
            return column

    for column in column_names:
        if "watch" in column and "episode" in column:
            return column

    return None


def normalize_key_column(dataframe: pd.DataFrame, column_name: str) -> pd.DataFrame:
    """Strip whitespace from string key columns and convert blanks to missing values."""
    cleaned = dataframe.copy()
    if column_name not in cleaned.columns:
        return cleaned

    series = cleaned[column_name]
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        cleaned[column_name] = series.astype("string").str.strip().replace("", pd.NA)

    return cleaned


def should_coerce_to_numeric(column_name: str) -> bool:
    """Identify conservative numeric candidates by column name."""
    return any(hint in column_name for hint in NUMERIC_NAME_HINTS)


def convert_numeric_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Convert obvious numeric fields using pandas' safe coercion."""
    cleaned = dataframe.copy()
    for column in cleaned.columns:
        if not should_coerce_to_numeric(column):
            continue
        cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
    return cleaned


def normalize_series(series: pd.Series) -> pd.Series:
    """Convert values to stable strings so row hashes remain chunk-independent."""
    if pd.api.types.is_float_dtype(series):
        return series.map(
            lambda value: MISSING_SENTINEL if pd.isna(value) else format(value, ".15g")
        ).astype("string")

    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.strftime("%Y-%m-%d %H:%M:%S").fillna(MISSING_SENTINEL).astype("string")

    return series.astype("string").fillna(MISSING_SENTINEL)


def normalize_chunk_for_hashing(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Normalize a chunk before hashing so mixed inferred dtypes hash consistently."""
    normalized_columns = {
        column: normalize_series(dataframe[column]) for column in dataframe.columns
    }
    return pd.DataFrame(normalized_columns, columns=dataframe.columns)


def load_anime_reference(csv_path: Path) -> pd.DataFrame:
    """Load the cleaned anime reference used to enforce episode consistency."""
    anime_df = pd.read_csv(csv_path, low_memory=False)
    anime_df = standardize_column_names(anime_df)

    required_columns = {"anime_id", "episodes"}
    missing_columns = sorted(required_columns - set(anime_df.columns))
    if missing_columns:
        missing_text = ", ".join(missing_columns)
        raise SystemExit(
            "Error: anime_cleaned.csv is missing required column(s): "
            f"{missing_text}"
        )

    anime_df = anime_df[["anime_id", "episodes"]].copy()
    anime_df["anime_id"] = pd.to_numeric(anime_df["anime_id"], errors="coerce")
    anime_df["episodes"] = pd.to_numeric(anime_df["episodes"], errors="coerce")
    anime_df = anime_df.dropna(subset=["anime_id"])
    anime_df["anime_id"] = anime_df["anime_id"].astype("int64")
    anime_df = anime_df.drop_duplicates(subset="anime_id", keep="first")
    return anime_df


def fix_episode_inconsistencies(
    dataframe: pd.DataFrame,
    watched_episodes_column: str | None,
) -> tuple[pd.DataFrame, int]:
    """Cap watched episodes at the anime's known total episode count."""
    if watched_episodes_column is None or watched_episodes_column not in dataframe.columns:
        return dataframe, 0

    if "episodes" not in dataframe.columns:
        return dataframe, 0

    cleaned = dataframe.copy()
    valid_total = cleaned["episodes"].notna() & (cleaned["episodes"] > 0)
    exceeds_total = cleaned[watched_episodes_column].notna() & (
        cleaned[watched_episodes_column] > cleaned["episodes"]
    )
    fix_mask = valid_total & exceeds_total
    fixed_count = int(fix_mask.sum())

    if fixed_count:
        cleaned.loc[fix_mask, watched_episodes_column] = cleaned.loc[fix_mask, "episodes"]

    return cleaned, fixed_count


def validate_and_select_target_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Validate the final schema and return only the target columns in order."""
    missing = [column for column in TARGET_COLUMNS if column not in dataframe.columns]
    if missing:
        raise ValueError(f"Missing required columns for final output: {missing}")

    return dataframe[TARGET_COLUMNS]


def write_empty_output() -> None:
    """Write an empty CSV with the exact target schema."""
    pd.DataFrame(columns=TARGET_COLUMNS).to_csv(OUTPUT_CSV_PATH, index=False)


def print_summary(
    original_shape: tuple[int, int],
    final_shape: tuple[int, int],
    duplicates_removed: int,
    episode_rows_fixed: int,
    missing_counts: pd.Series,
) -> None:
    """Print a compact summary of the cleaning run."""
    print(f"Original shape: {original_shape}")
    print(f"Final shape: {final_shape}")
    print(f"Duplicate rows removed: {duplicates_removed}")
    print(f"Rows fixed for episode inconsistency: {episode_rows_fixed}")
    print("Missing values:")
    for column, count in missing_counts.items():
        print(f"  {column}: {int(count)}")


def main() -> None:
    """Run the conservative animelist cleaning pipeline."""
    ensure_required_files()
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    anime_reference = load_anime_reference(ANIME_CLEANED_PATH)

    raw_header = pd.read_csv(RAW_CSV_PATH, nrows=0)
    raw_header = standardize_column_names(raw_header)
    raw_columns = list(raw_header.columns)

    if "anime_id" not in raw_columns:
        raise SystemExit("Error: Expected `anime_id` in UserAnimeList.csv.")

    missing_target_columns = [column for column in TARGET_COLUMNS if column not in raw_columns]
    if missing_target_columns:
        raise ValueError(f"Missing required columns for final output: {missing_target_columns}")

    user_key_column = find_user_key_column(raw_columns)
    watched_episodes_column = find_watched_episodes_column(raw_columns)

    if OUTPUT_CSV_PATH.exists():
        OUTPUT_CSV_PATH.unlink()

    duplicate_tracker = DuplicateTracker()
    original_row_count = 0
    final_row_count = 0
    duplicates_removed = 0
    episode_rows_fixed = 0
    missing_counts = pd.Series(0, index=TARGET_COLUMNS, dtype="int64")
    wrote_header = False

    try:
        reader = pd.read_csv(RAW_CSV_PATH, chunksize=CHUNK_SIZE, low_memory=False)

        for chunk in reader:
            original_row_count += len(chunk)
            chunk = standardize_column_names(chunk)

            # Remove exact duplicate rows across the whole file before other fixes.
            normalized_chunk = normalize_chunk_for_hashing(chunk)
            row_hashes = pd.util.hash_pandas_object(normalized_chunk, index=False).to_numpy()
            keep_mask, duplicate_count = duplicate_tracker.keep_mask(row_hashes)
            duplicates_removed += duplicate_count
            chunk = chunk.loc[keep_mask].copy()
            if chunk.empty:
                continue

            # Treat blank key fields as missing, then drop rows missing the required keys.
            chunk = normalize_key_column(chunk, user_key_column)
            chunk = normalize_key_column(chunk, "anime_id")
            chunk = chunk.dropna(subset=[user_key_column, "anime_id"]).copy()
            if chunk.empty:
                continue

            # Coerce numeric-like fields conservatively and drop rows with invalid key values.
            chunk = convert_numeric_columns(chunk)
            chunk = chunk.dropna(subset=[user_key_column, "anime_id"]).copy()
            if chunk.empty:
                continue

            chunk["anime_id"] = chunk["anime_id"].astype("int64")

            if "episodes" in chunk.columns:
                chunk = chunk.drop(columns=["episodes"])

            # Join on anime_id to bring in the total episode count for consistency checks.
            chunk = chunk.merge(anime_reference, on="anime_id", how="left")

            chunk, fixed_count = fix_episode_inconsistencies(chunk, watched_episodes_column)
            episode_rows_fixed += fixed_count

            chunk = validate_and_select_target_columns(chunk)
            missing_counts = missing_counts.add(
                chunk.isna().sum().reindex(TARGET_COLUMNS, fill_value=0),
                fill_value=0,
            ).astype("int64")

            chunk.to_csv(
                OUTPUT_CSV_PATH,
                index=False,
                mode="w" if not wrote_header else "a",
                header=not wrote_header,
            )
            wrote_header = True
            final_row_count += len(chunk)
    finally:
        duplicate_tracker.close()

    if not wrote_header:
        write_empty_output()

    print_summary(
        original_shape=(original_row_count, len(raw_columns)),
        final_shape=(final_row_count, len(TARGET_COLUMNS)),
        duplicates_removed=duplicates_removed,
        episode_rows_fixed=episode_rows_fixed,
        missing_counts=missing_counts,
    )


if __name__ == "__main__":
    main()
