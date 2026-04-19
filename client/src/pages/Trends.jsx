import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFetch } from '@/hooks/useFetch';
import { apiGet, ApiError } from '@/api/client';
import ErrorBanner from '@/components/ErrorBanner';
import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const DEFAULTS = { year_from: 1990, year_to: currentYear };

function clampYear(v, fallback) {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2100, Math.max(1900, Math.floor(n)));
}

export default function Trends() {
  const { data: genresData } = useFetch('/api/genres');
  const genres = genresData?.genres ?? [];

  const [genre, setGenre] = useState('');
  const [yearFrom, setYearFrom] = useState(String(DEFAULTS.year_from));
  const [yearTo, setYearTo] = useState(String(DEFAULTS.year_to));

  const [points, setPoints] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!genre && genres.length > 0) setGenre(genres[0].genre_name);
  }, [genre, genres]);

  const canRun = Boolean(genre);

  const run = async (e) => {
    e?.preventDefault?.();
    if (!canRun) return;
    const from = clampYear(yearFrom, DEFAULTS.year_from);
    const to = clampYear(yearTo, DEFAULTS.year_to);
    if (from > to) {
      setError(new Error('"Year from" must be ≤ "Year to".'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = await apiGet(
        `/api/genres/${encodeURIComponent(genre)}/trend`,
        { params: { year_from: from, year_to: to } },
      );
      setPoints(body.points ?? []);
      setMeta({ genre: body.genre, year_from: body.year_from, year_to: body.year_to });
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) setError(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(
    () =>
      (points ?? []).map((p) => ({
        year: Number(p.year),
        releases: Number(p.releases ?? 0),
        avg_score: p.avg_score === null ? null : Number(p.avg_score),
        top_title: p.top_title,
      })),
    [points],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Genre trends</h1>
        <p className="text-muted-foreground">
          Per-year release counts and average scores for a single genre.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={run}
            className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Genre
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g.genre_id} value={g.genre_name}>
                      {g.genre_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Year from
              </label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Year to
              </label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!canRun || loading}>
                {loading ? 'Running…' : 'Run'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ErrorBanner error={error} />

      {loading ? <Loader label="Aggregating per-year stats…" /> : null}

      {meta && points ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            {meta.genre} · {meta.year_from}–{meta.year_to}
          </h2>
          <Card>
            <CardContent className="p-4">
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No anime match that genre + year range.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="year"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => v.toLocaleString()}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 10]}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="releases"
                      name="Releases"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_score"
                      name="Avg score"
                      stroke="hsl(200 95% 60%)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top title per year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-x-6 text-sm md:grid-cols-2">
                  {chartData.map((p) => (
                    <div
                      key={p.year}
                      className="flex items-center justify-between border-b border-border/50 py-1"
                    >
                      <span className="font-mono text-muted-foreground">
                        {p.year}
                      </span>
                      <span className="truncate px-3">
                        {p.top_title ?? '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.releases} rel.
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
