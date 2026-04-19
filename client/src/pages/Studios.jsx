import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Factory } from 'lucide-react';
import { apiGet, ApiError } from '@/api/client';
import ErrorBanner from '@/components/ErrorBanner';
import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const DEFAULTS = { min_productions: 5, score_floor: 7 };

function fmt(n, digits = 2) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const columns = [
  { key: 'rank', label: '#', numeric: true, sortable: false },
  { key: 'studio_name', label: 'Studio', numeric: false, sortable: true },
  { key: 'productions', label: 'Productions', numeric: true, sortable: true },
  { key: 'avg_score', label: 'Avg score', numeric: true, sortable: true },
  { key: 'min_score', label: 'Min', numeric: true, sortable: true },
  { key: 'max_score', label: 'Max', numeric: true, sortable: true },
];

export default function Studios() {
  const [minProductions, setMinProductions] = useState(
    String(DEFAULTS.min_productions),
  );
  const [scoreFloor, setScoreFloor] = useState(String(DEFAULTS.score_floor));
  const [results, setResults] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: 'avg_score', dir: 'desc' });

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'desc' };
      return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
    });
  };

  const sorted = useMemo(() => {
    if (!results) return null;
    const arr = [...results];
    const { key, dir } = sort;
    const mul = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av ?? '').localeCompare(String(bv ?? '')) * mul;
      }
      return (Number(av ?? 0) - Number(bv ?? 0)) * mul;
    });
    return arr;
  }, [results, sort]);

  const run = async (e) => {
    e?.preventDefault?.();
    const mp = Number(minProductions);
    const sf = Number(scoreFloor);
    if (!Number.isFinite(mp) || mp < 1) {
      setError(new Error('Min productions must be ≥ 1.'));
      return;
    }
    if (!Number.isFinite(sf) || sf < 0 || sf > 10) {
      setError(new Error('Score floor must be between 0 and 10.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = await apiGet('/api/studios/quality', {
        params: { min_productions: mp, score_floor: sf },
      });
      setResults(body.results ?? []);
      setMeta({
        min_productions: body.min_productions,
        score_floor: body.score_floor,
      });
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Studio quality leaderboard
        </h1>
        <p className="text-muted-foreground">
          Studios where <em>every</em> production clears a score floor, with at
          least a minimum number of works.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={run}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Min productions
              </label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={minProductions}
                onChange={(e) => setMinProductions(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Score floor (0–10)
              </label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={scoreFloor}
                onChange={(e) => setScoreFloor(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Running…' : 'Run'}
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Lower the score floor to see more studios; raise it for elites
            only.
          </p>
        </CardContent>
      </Card>

      <ErrorBanner error={error} />

      {loading ? (
        <Loader label="Running universal-check across studios…" />
      ) : null}

      {sorted && meta ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              {sorted.length} studio{sorted.length === 1 ? '' : 's'} pass
            </h2>
            <p className="text-sm text-muted-foreground">
              score floor {fmt(meta.score_floor, 1)} · min{' '}
              {meta.min_productions} productions
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <p className="p-12 text-center text-sm text-muted-foreground">
                  No studios meet those thresholds.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={cn(
                            col.numeric && 'text-right',
                            col.sortable && 'cursor-pointer select-none',
                          )}
                          onClick={
                            col.sortable ? () => toggleSort(col.key) : undefined
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {col.sortable ? (
                              sort.key === col.key ? (
                                sort.dir === 'desc' ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUp className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                              )
                            ) : null}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((s, i) => (
                      <TableRow key={s.studio_name}>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {s.studio_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(s.productions, 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {fmt(s.avg_score, 2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt(s.min_score, 2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt(s.max_score, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
