import { useState } from 'react';
import { ArrowLeftRight, Users } from 'lucide-react';
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

function fmt(n, digits = 2) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pearsonLabel(r) {
  if (r === null || r === undefined) return 'n/a';
  const num = Number(r);
  if (!Number.isFinite(num)) return 'n/a';
  const abs = Math.abs(num);
  const sign = num >= 0 ? 'positive' : 'negative';
  if (abs >= 0.7) return `strong ${sign}`;
  if (abs >= 0.4) return `moderate ${sign}`;
  if (abs >= 0.2) return `weak ${sign}`;
  return 'near zero';
}

export default function Compare() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit =
    a.trim().length > 0 && b.trim().length > 0 && a.trim() !== b.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const body = await apiGet(
        `/api/users/${encodeURIComponent(a.trim())}/compatibility/${encodeURIComponent(b.trim())}`,
      );
      setData(body);
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
          Compare two viewers
        </h1>
        <p className="text-muted-foreground">
          Overlap count, Pearson correlation, and mean score delta across
          anime both users rated.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]"
          >
            <Input
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="Username A"
            />
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <Input
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="Username B"
            />
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? 'Comparing…' : 'Compare'}
            </Button>
          </form>
          {a.trim() && a.trim() === b.trim() ? (
            <p className="mt-2 text-xs text-destructive">
              Please enter two different usernames.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ErrorBanner error={error} />

      {loading ? <Loader label="Joining watchlists…" /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Overlap"
              value={fmt(data.overlap, 0)}
              hint="anime both rated"
            />
            <MetricCard
              label="Pearson r"
              value={fmt(data.pearson, 3)}
              hint={pearsonLabel(data.pearson)}
            />
            <MetricCard
              label="Mean |Δ score|"
              value={fmt(data.mean_abs_diff, 3)}
              hint="lower is more aligned"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top agreements · {data.user_a} vs {data.user_b}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.top_agreements?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">
                        {data.user_a}
                      </TableHead>
                      <TableHead className="text-right">
                        {data.user_b}
                      </TableHead>
                      <TableHead className="text-right">|Δ|</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_agreements.map((row) => (
                      <TableRow key={row.anime_id}>
                        <TableCell className="font-medium">
                          {row.title}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(row.score_a, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(row.score_b, 0)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt(
                            Math.abs(Number(row.score_a) - Number(row.score_b)),
                            0,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No titles rated within 1 point by both users.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <Card className="card-glow">
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-3xl font-semibold">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
