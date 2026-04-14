"""Inspect the downloaded raw CSV files and print compact dataset summaries."""

from __future__ import annotations

import sqlite3
import tempfile
import textwrap
from pathlib import Path

from utils import RAW_DIR, ensure_data_directories


REQUIRED_FILES = (
    "AnimeList.csv",
    "UserList.csv",
    "UserAnimeList.csv",
)
KEY_COLUMN_CANDIDATES = ("anime_id", "user_id", "username")
CHUNK_SIZE = 100_000
PREVIEW_ROWS = 3
MAX_CELL_WIDTH = 80
MISSING_SENTINEL = "<NA>"
DISK_HASH_THRESHOLD_BYTES = 250 * 1024 * 1024


def load_pandas():
    """Import pandas lazily so missing dependencies raise a clear error."""
    try:
        import pandas as pd
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency `pandas`. Install dependencies with "
            "`pip install -r requirements.txt`."
        ) from exc

    return pd


class DuplicateTracker:
    """Track seen row hashes without loading the full file into memory."""

    def __init__(self, use_disk: bool) -> None:
        self.use_disk = use_disk
        self._seen_hashes: set[int] | None = None
        self._connection: sqlite3.Connection | None = None
        self._temp_dir: tempfile.TemporaryDirectory[str] | None = None

        if use_disk:
            self._temp_dir = tempfile.TemporaryDirectory(prefix="inspect_raw_")
            database_path = Path(self._temp_dir.name) / "row_hashes.sqlite"
            self._connection = sqlite3.connect(database_path)
            self._connection.execute("PRAGMA journal_mode=OFF")
            self._connection.execute("PRAGMA synchronous=OFF")
            self._connection.execute("PRAGMA locking_mode=EXCLUSIVE")
            self._connection.execute("PRAGMA temp_store=MEMORY")
            self._connection.execute(
                "CREATE TABLE seen_hashes (row_hash INTEGER PRIMARY KEY) WITHOUT ROWID"
            )
        else:
            self._seen_hashes = set()

    def add_hashes(self, row_hashes) -> int:
        """Insert a batch of row hashes and return the duplicate count."""
        int_hashes = row_hashes.astype("uint64", copy=False).view("int64")

        if self._seen_hashes is not None:
            duplicate_count = 0
            for row_hash in int_hashes:
                normalized_hash = int(row_hash)
                if normalized_hash in self._seen_hashes:
                    duplicate_count += 1
                else:
                    self._seen_hashes.add(normalized_hash)
            return duplicate_count

        if self._connection is None:
            raise RuntimeError("Duplicate tracker is not initialized.")

        before_changes = self._connection.total_changes
        self._connection.executemany(
            "INSERT OR IGNORE INTO seen_hashes(row_hash) VALUES (?)",
            ((int(row_hash),) for row_hash in int_hashes),
        )
        inserted_rows = self._connection.total_changes - before_changes
        return len(int_hashes) - inserted_rows

    def close(self) -> None:
        """Release any temporary resources used during duplicate tracking."""
        if self._connection is not None:
            self._connection.commit()
            self._connection.close()
            self._connection = None
        if self._temp_dir is not None:
            self._temp_dir.cleanup()
            self._temp_dir = None


def detect_key_columns(column_names: list[str]) -> list[str]:
    """Return likely identifier columns present in the CSV."""
    normalized_lookup = {column.lower(): column for column in column_names}
    return [
        normalized_lookup[candidate]
        for candidate in KEY_COLUMN_CANDIDATES
        if candidate in normalized_lookup
    ]


def format_items(items: list[str]) -> str:
    """Wrap a list of summary items into a compact multi-line string."""
    if not items:
        return "  (none)"

    return textwrap.fill(
        ", ".join(items),
        width=100,
        initial_indent="  ",
        subsequent_indent="  ",
    )


def format_dtype(dtype_names: set[str]) -> str:
    """Format one or more observed pandas dtypes for a column."""
    if not dtype_names:
        return "unknown"
    if len(dtype_names) == 1:
        return next(iter(dtype_names))
    return f"mixed[{', '.join(sorted(dtype_names))}]"


def normalize_series(series, pd):
    """Convert a Series to stable string values for hashing and unique counts."""
    if pd.api.types.is_float_dtype(series):
        return series.map(
            lambda value: MISSING_SENTINEL if pd.isna(value) else format(value, ".15g")
        ).astype("string")

    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.strftime("%Y-%m-%d %H:%M:%S").fillna(MISSING_SENTINEL).astype("string")

    return series.astype("string").fillna(MISSING_SENTINEL)


def normalize_chunk(chunk, pd):
    """Normalize a chunk so row hashes stay stable across mixed inferred dtypes."""
    normalized_columns = {
        column: normalize_series(chunk[column], pd) for column in chunk.columns
    }
    return pd.DataFrame(normalized_columns, columns=chunk.columns)


def truncate_preview(preview, pd):
    """Truncate long cell values in the preview rows."""

    def truncate_value(value):
        if pd.isna(value):
            return MISSING_SENTINEL

        text = str(value).replace("\n", " ").strip()
        if len(text) <= MAX_CELL_WIDTH:
            return text
        return f"{text[: MAX_CELL_WIDTH - 3]}..."

    truncated = preview.copy()
    for column in truncated.columns:
        truncated[column] = truncated[column].map(truncate_value)
    return truncated


def print_summary(csv_path: Path, pd) -> None:
    """Print the requested compact summary for one CSV file."""
    try:
        header_frame = pd.read_csv(csv_path, nrows=0)
        reader = pd.read_csv(csv_path, chunksize=CHUNK_SIZE)
    except Exception as exc:
        raise RuntimeError(f"Failed to read {csv_path.name}: {exc}") from exc

    column_names = list(header_frame.columns)
    missing_counts = pd.Series(0, index=column_names, dtype="int64")
    observed_dtypes = {column: set() for column in column_names}
    key_columns = detect_key_columns(column_names)
    key_uniques = {column: set() for column in key_columns}
    preview_frames = []
    preview_row_count = 0
    row_count = 0
    duplicate_count = 0

    tracker = DuplicateTracker(use_disk=csv_path.stat().st_size > DISK_HASH_THRESHOLD_BYTES)
    try:
        for chunk in reader:
            row_count += len(chunk)
            missing_counts = missing_counts.add(chunk.isna().sum(), fill_value=0).astype("int64")

            for column in column_names:
                observed_dtypes[column].add(str(chunk[column].dtype))

            if preview_row_count < PREVIEW_ROWS:
                needed_rows = PREVIEW_ROWS - preview_row_count
                preview_slice = chunk.head(needed_rows).copy()
                if not preview_slice.empty:
                    preview_frames.append(preview_slice)
                    preview_row_count += len(preview_slice)

            normalized_chunk = normalize_chunk(chunk, pd)

            for column in key_columns:
                values = normalized_chunk[column]
                key_uniques[column].update(
                    value for value in values if value != MISSING_SENTINEL
                )

            row_hashes = pd.util.hash_pandas_object(normalized_chunk, index=False).to_numpy()
            duplicate_count += tracker.add_hashes(row_hashes)
    finally:
        tracker.close()

    preview = (
        pd.concat(preview_frames, ignore_index=True)
        if preview_frames
        else pd.DataFrame(columns=column_names)
    )
    preview = truncate_preview(preview, pd)

    dtype_items = [
        f"{column}={format_dtype(observed_dtypes[column])}" for column in column_names
    ]
    missing_items = [f"{column}={int(missing_counts[column])}" for column in column_names]
    unique_items = [f"{column}={len(key_uniques[column])}" for column in key_columns]

    print("=" * 80)
    print(csv_path.name)
    print(f"Shape: ({row_count}, {len(column_names)})")
    print("Columns:")
    print(format_items(column_names))
    print("Dtypes:")
    print(format_items(dtype_items))
    print("Missing counts:")
    print(format_items(missing_items))
    print(f"Duplicate rows: {duplicate_count}")
    print("Likely key unique counts:")
    print(format_items(unique_items))
    print("First 3 rows (truncated):")
    print(preview.to_string(index=False))
    print()


def main() -> None:
    """Inspect the required raw CSV files in preprocess/data/raw/."""
    ensure_data_directories()
    pd = load_pandas()

    missing_files = [filename for filename in REQUIRED_FILES if not (RAW_DIR / filename).exists()]
    if missing_files:
        missing_text = ", ".join(missing_files)
        raise SystemExit(
            "Error: Missing raw data file(s) in "
            f"{RAW_DIR}: {missing_text}. Run `python download_data.py` first."
        )

    for filename in REQUIRED_FILES:
        print_summary(RAW_DIR / filename, pd)


if __name__ == "__main__":
    main()
