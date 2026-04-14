"""Conservatively clean raw user data and add animelist-derived comparison columns."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import pandas as pd


PREPROCESS_DIR = Path(__file__).resolve().parent
RAW_USERS_PATH = PREPROCESS_DIR / "data" / "raw" / "UserList.csv"
ANIMELISTS_CLEANED_PATH = PREPROCESS_DIR / "data" / "cleaned" / "animelists_cleaned.csv"
OUTPUT_USERS_PATH = PREPROCESS_DIR / "data" / "cleaned" / "users_cleaned.csv"
TARGET_COLUMNS = [
    "username",
    "user_id",
    "user_watching",
    "user_completed",
    "user_onhold",
    "user_dropped",
    "user_plantowatch",
    "user_days_spent_watching",
    "gender",
    "location",
    "birth_date",
    "access_rank",
    "join_date",
    "last_online",
    "stats_mean_score",
    "stats_rewatched",
    "stats_episodes",
]
ANIMELISTS_CHUNK_SIZE = 100_000

USER_NUMERIC_COLUMNS = (
    "user_id",
    "user_watching",
    "user_completed",
    "user_onhold",
    "user_dropped",
    "user_plantowatch",
    "user_days_spent_watching",
    "stats_mean_score",
    "stats_rewatched",
    "stats_episodes",
    "access_rank",
)
USER_DATE_COLUMNS = ("join_date", "last_online", "birth_date")


def ensure_required_files() -> None:
    """Fail early if the expected inputs are missing."""
    missing_paths = [
        path
        for path in (RAW_USERS_PATH, ANIMELISTS_CLEANED_PATH)
        if not path.exists()
    ]
    if missing_paths:
        missing_text = ", ".join(str(path) for path in missing_paths)
        raise SystemExit(f"Error: Missing required input file(s): {missing_text}")


def standardize_column_names(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and trim column names without changing row data."""
    cleaned = dataframe.copy()
    cleaned.columns = [column.strip().lower() for column in cleaned.columns]
    return cleaned


def normalize_string_identifier(dataframe: pd.DataFrame, column_name: str) -> pd.DataFrame:
    """Trim string identifier columns and convert blanks to missing values."""
    cleaned = dataframe.copy()
    if column_name not in cleaned.columns:
        return cleaned

    series = cleaned[column_name]
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        cleaned[column_name] = series.astype("string").str.strip().replace("", pd.NA)

    return cleaned


def convert_numeric_columns(dataframe: pd.DataFrame, column_names: tuple[str, ...]) -> pd.DataFrame:
    """Safely coerce numeric columns with pandas."""
    cleaned = dataframe.copy()
    for column in column_names:
        if column in cleaned.columns:
            cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
    return cleaned


def parse_date_columns(dataframe: pd.DataFrame, column_names: tuple[str, ...]) -> pd.DataFrame:
    """Safely parse date-like columns with pandas."""
    cleaned = dataframe.copy()
    for column in column_names:
        if column in cleaned.columns:
            cleaned[column] = pd.to_datetime(cleaned[column], errors="coerce")
    return cleaned


def remove_duplicate_user_ids(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, int | None]:
    """Drop duplicate user IDs when the column is available."""
    if "user_id" not in dataframe.columns:
        return dataframe, None

    deduplicated = dataframe.drop_duplicates(subset="user_id", keep="first")
    removed_count = len(dataframe) - len(deduplicated)
    return deduplicated, removed_count


def choose_main_user_identifier(column_names: list[str]) -> str:
    """Prefer user_id as the main identifier, otherwise fall back to username."""
    if "user_id" in column_names:
        return "user_id"
    if "username" in column_names:
        return "username"
    raise SystemExit("Error: Expected either `user_id` or `username` in UserList.csv.")


def choose_merge_key(user_columns: list[str], animelist_columns: list[str]) -> str:
    """Choose the shared key used to compare users with animelist aggregates."""
    if "user_id" in user_columns and "user_id" in animelist_columns:
        return "user_id"
    if "username" in user_columns and "username" in animelist_columns:
        return "username"
    raise SystemExit(
        "Error: Could not find a shared user key between UserList.csv and "
        "animelists_cleaned.csv."
    )


def find_score_column(column_names: list[str]) -> str | None:
    """Find the most likely score column in the animelist data."""
    preferred_names = ("score", "my_score")
    for column in preferred_names:
        if column in column_names:
            return column

    for column in column_names:
        if "score" in column:
            return column

    return None


def find_watched_episodes_column(column_names: list[str]) -> str | None:
    """Find the most likely watched-episodes column in the animelist data."""
    preferred_names = ("watched_episodes", "my_watched_episodes")
    for column in preferred_names:
        if column in column_names:
            return column

    for column in column_names:
        if "watch" in column and "episode" in column:
            return column

    return None


def prepare_animelist_chunk(dataframe: pd.DataFrame, key_column: str) -> pd.DataFrame:
    """Standardize one animelist chunk and drop rows missing the merge key."""
    cleaned = standardize_column_names(dataframe)
    cleaned = normalize_string_identifier(cleaned, key_column)

    if key_column == "user_id":
        cleaned[key_column] = pd.to_numeric(cleaned[key_column], errors="coerce")

    cleaned = cleaned.dropna(subset=[key_column]).copy()
    if cleaned.empty:
        return cleaned

    if key_column == "user_id":
        cleaned[key_column] = cleaned[key_column].astype("int64")

    return cleaned


def build_animelist_aggregates(csv_path: Path, key_column: str) -> pd.DataFrame:
    """Compute conservative per-user animelist aggregates in chunks."""
    header = standardize_column_names(pd.read_csv(csv_path, nrows=0))
    animelist_columns = list(header.columns)
    score_column = find_score_column(animelist_columns)
    watched_episodes_column = find_watched_episodes_column(animelist_columns)

    anime_counts: defaultdict[object, int] = defaultdict(int)
    score_sums: defaultdict[object, float] = defaultdict(float)
    score_counts: defaultdict[object, int] = defaultdict(int)
    watched_totals: defaultdict[object, float] = defaultdict(float)

    reader = pd.read_csv(csv_path, chunksize=ANIMELISTS_CHUNK_SIZE, low_memory=False)
    for chunk in reader:
        chunk = prepare_animelist_chunk(chunk, key_column)
        if chunk.empty:
            continue

        row_counts = chunk.groupby(key_column).size()
        for key, count in row_counts.items():
            anime_counts[key] += int(count)

        if score_column and score_column in chunk.columns:
            scores = pd.to_numeric(chunk[score_column], errors="coerce")
            valid_scores = chunk[[key_column]].copy()
            valid_scores["score_value"] = scores
            valid_scores = valid_scores.dropna(subset=["score_value"])

            if not valid_scores.empty:
                grouped_scores = valid_scores.groupby(key_column)["score_value"].agg(["sum", "count"])
                for key, values in grouped_scores.iterrows():
                    score_sums[key] += float(values["sum"])
                    score_counts[key] += int(values["count"])

        if watched_episodes_column and watched_episodes_column in chunk.columns:
            watched = pd.to_numeric(chunk[watched_episodes_column], errors="coerce")
            valid_watched = chunk[[key_column]].copy()
            valid_watched["watched_value"] = watched
            valid_watched = valid_watched.dropna(subset=["watched_value"])

            if not valid_watched.empty:
                grouped_watched = valid_watched.groupby(key_column)["watched_value"].sum()
                for key, total in grouped_watched.items():
                    watched_totals[key] += float(total)

    aggregate_keys = list(anime_counts.keys())
    aggregates_df = pd.DataFrame({key_column: aggregate_keys})
    aggregates_df["computed_anime_count"] = [anime_counts[key] for key in aggregate_keys]

    if score_column:
        aggregates_df["computed_mean_score"] = [
            score_sums[key] / score_counts[key] if score_counts[key] else pd.NA
            for key in aggregate_keys
        ]

    if watched_episodes_column:
        aggregates_df["computed_total_watched_episodes"] = [
            watched_totals.get(key, pd.NA) if key in watched_totals else pd.NA
            for key in aggregate_keys
        ]

    return aggregates_df


def add_difference_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Add conservative comparison columns against the original user aggregates."""
    cleaned = dataframe.copy()

    if {"stats_mean_score", "computed_mean_score"}.issubset(cleaned.columns):
        cleaned["stats_mean_score_diff"] = (
            cleaned["stats_mean_score"] - cleaned["computed_mean_score"]
        )

    if {"stats_episodes", "computed_total_watched_episodes"}.issubset(cleaned.columns):
        cleaned["stats_episodes_diff"] = (
            cleaned["stats_episodes"] - cleaned["computed_total_watched_episodes"]
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
    duplicate_rows_removed: int,
    duplicate_user_id_rows_removed: int | None,
    matched_users: int,
) -> None:
    """Print a compact summary of the cleaning run."""
    print(f"Original shape: {original_shape}")
    print(f"Final shape: {dataframe.shape}")
    print(f"Duplicate rows removed: {duplicate_rows_removed}")

    if duplicate_user_id_rows_removed is None:
        print("Duplicate user_id rows removed: user_id column not found")
    else:
        print(f"Duplicate user_id rows removed: {duplicate_user_id_rows_removed}")

    print(f"Users matched to animelist aggregates: {matched_users}")
    print("Missing values:")
    for column, count in dataframe.isna().sum().items():
        print(f"  {column}: {int(count)}")


def main() -> None:
    """Run the conservative user cleaning pipeline."""
    ensure_required_files()
    OUTPUT_USERS_PATH.parent.mkdir(parents=True, exist_ok=True)

    user_df = pd.read_csv(RAW_USERS_PATH, low_memory=False)
    original_shape = user_df.shape

    user_df = standardize_column_names(user_df)
    user_df = normalize_string_identifier(user_df, "username")
    user_df = normalize_string_identifier(user_df, "user_id")

    deduplicated_users = user_df.drop_duplicates()
    duplicate_rows_removed = len(user_df) - len(deduplicated_users)
    user_df = deduplicated_users

    user_df, duplicate_user_id_rows_removed = remove_duplicate_user_ids(user_df)
    user_df = convert_numeric_columns(user_df, USER_NUMERIC_COLUMNS)
    user_df = parse_date_columns(user_df, USER_DATE_COLUMNS)

    main_identifier = choose_main_user_identifier(list(user_df.columns))
    user_df = user_df.dropna(subset=[main_identifier]).copy()

    if "user_id" in user_df.columns and user_df["user_id"].notna().all():
        user_df["user_id"] = user_df["user_id"].astype("int64")

    animelist_header = standardize_column_names(pd.read_csv(ANIMELISTS_CLEANED_PATH, nrows=0))
    merge_key = choose_merge_key(list(user_df.columns), list(animelist_header.columns))
    user_df = normalize_string_identifier(user_df, merge_key)

    if merge_key == "user_id":
        user_df[merge_key] = pd.to_numeric(user_df[merge_key], errors="coerce")
        user_df = user_df.dropna(subset=[merge_key]).copy()
        user_df[merge_key] = user_df[merge_key].astype("int64")

    aggregate_df = build_animelist_aggregates(ANIMELISTS_CLEANED_PATH, key_column=merge_key)
    user_df = user_df.merge(aggregate_df, on=merge_key, how="left")
    user_df = add_difference_columns(user_df)

    matched_users = (
        int(user_df["computed_anime_count"].notna().sum())
        if "computed_anime_count" in user_df.columns
        else 0
    )

    final_user_df = validate_and_select_target_columns(user_df)
    final_user_df.to_csv(OUTPUT_USERS_PATH, index=False)

    print_summary(
        final_user_df,
        original_shape=original_shape,
        duplicate_rows_removed=duplicate_rows_removed,
        duplicate_user_id_rows_removed=duplicate_user_id_rows_removed,
        matched_users=matched_users,
    )
    print(f"Saved cleaned data to: {OUTPUT_USERS_PATH}")


if __name__ == "__main__":
    main()
