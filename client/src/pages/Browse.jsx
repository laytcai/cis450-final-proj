import { useEffect, useMemo, useState } from 'react';
import { apiGet, ApiError } from '@/api/client';
import { useFetch } from '@/hooks/useFetch';
import SearchBar from '@/components/SearchBar';
import AnimeCard from '@/components/AnimeCard';
import ErrorBanner from '@/components/ErrorBanner';
import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 24;
const EMPTY_FILTERS = {
  q: '',
  genre: '',
  type: '',
  year_from: '',
  year_to: '',
  min_score: '',
};

function buildQueryParams(filters, { limit, offset }) {
  const p = { limit, offset };
  if (filters.q?.trim()) p.q = filters.q.trim();
  if (filters.genre) p.genre = filters.genre;
  if (filters.type) p.type = filters.type;
  if (filters.year_from) p.year_from = filters.year_from;
  if (filters.year_to) p.year_to = filters.year_to;
  if (filters.min_score) p.min_score = filters.min_score;
  return p;
}

export default function Browse() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const { data: optionsData } = useFetch('/api/options');
  const { data: genresData } = useFetch('/api/genres');
  const types = optionsData?.types ?? [];
  const genres = genresData?.genres ?? [];
  const minYear = optionsData?.min_year ?? 1917;
  const maxYear = optionsData?.max_year ?? new Date().getFullYear();

  const paramsKey = useMemo(() => JSON.stringify(applied), [applied]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOffset(0);
    apiGet('/api/anime', {
      params: buildQueryParams(applied, { limit: PAGE_SIZE, offset: 0 }),
      signal: controller.signal,
    })
      .then((body) => {
        setResults(body.results ?? []);
        setTotal(body.total ?? 0);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [paramsKey, applied]);

  const loadMore = async () => {
    if (loadingMore) return;
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    setError(null);
    try {
      const body = await apiGet('/api/anime', {
        params: buildQueryParams(applied, {
          limit: PAGE_SIZE,
          offset: nextOffset,
        }),
      });
      setResults((prev) => [...prev, ...(body.results ?? [])]);
      setOffset(nextOffset);
      setTotal(body.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = () => setApplied(draft);
  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const hasMore = results.length < total;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Browse anime</h1>
        <p className="text-muted-foreground">
          Filter 6,600+ titles by title, genre, type, year, and minimum score.
        </p>
      </div>

      <SearchBar
        filters={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        onReset={handleReset}
        genres={genres}
        types={types}
        minYear={minYear}
        maxYear={maxYear}
      />

      <ErrorBanner error={error} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {loading ? (
          <Loader label="Searching…" />
        ) : (
          <span>
            {total.toLocaleString()} result{total === 1 ? '' : 's'}
            {results.length > 0 && ` · showing ${results.length}`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No anime match those filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((anime) => (
            <AnimeCard key={anime.anime_id} anime={anime} />
          ))}
        </div>
      )}

      {hasMore && !loading ? (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
