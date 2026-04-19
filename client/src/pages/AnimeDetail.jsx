import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, Star, Users } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import AnimeCard from '@/components/AnimeCard';
import ErrorBanner from '@/components/ErrorBanner';
import Loader from '@/components/Loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function fmt(n, digits = 0) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function AnimeDetail() {
  const { id } = useParams();
  const idNum = Number(id);
  const isValidId = Number.isInteger(idNum) && idNum > 0;

  const anime = useFetch(isValidId ? `/api/anime/${idNum}` : null);
  const stats = useFetch(isValidId ? `/api/anime/${idNum}/stats` : null);
  const recs = useFetch(
    isValidId ? `/api/anime/${idNum}/recommendations` : null,
    { params: { limit: 12, min_co_viewers: 5 } },
  );

  if (!isValidId) {
    return (
      <ErrorBanner error={`"${id}" is not a valid anime id.`} />
    );
  }

  const a = anime.data;

  return (
    <div className="space-y-8">
      <Button variant="ghost" asChild size="sm">
        <Link to="/browse">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </Button>

      <ErrorBanner error={anime.error} />

      {anime.loading ? (
        <HeaderSkeleton />
      ) : a ? (
        <Header anime={a} />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">User score distribution</h2>
          {stats.data ? (
            <p className="text-sm text-muted-foreground">
              {fmt(stats.data.total_ratings)} ratings
            </p>
          ) : null}
        </div>
        <ErrorBanner error={stats.error} />
        <Card>
          <CardContent className="p-4">
            {stats.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.data ? (
              <Histogram rows={stats.data.histogram} />
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Users also liked</h2>
          <p className="text-sm text-muted-foreground">
            Collaborative filter from users who rated this ≥ 8
          </p>
        </div>
        <ErrorBanner error={recs.error} />
        {recs.loading ? (
          <Loader label="Crunching co-viewer overlap… this query is intentionally heavy on the full dataset." />
        ) : recs.data?.results?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recs.data.results.map((r) => (
              <AnimeCard
                key={r.anime_id}
                anime={r}
                footer={
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {fmt(r.co_viewers)}
                    </span>
                    <span>co-score {fmt(r.avg_co_score, 2)}</span>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Not enough co-viewers to generate recommendations for this title.
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ anime }) {
  const title = anime.title_english?.trim() || anime.title;
  const subtitle =
    anime.title_english && anime.title_english !== anime.title
      ? anime.title
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-xl border bg-muted">
        {anime.image_url ? (
          <img
            src={anime.image_url}
            alt={title}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center text-muted-foreground">
            no image
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {anime.type ? <Badge variant="secondary">{anime.type}</Badge> : null}
          {anime.status ? <Badge variant="outline">{anime.status}</Badge> : null}
          {anime.rating ? <Badge variant="outline">{anime.rating}</Badge> : null}
          {anime.aired_from_year ? <span>• {anime.aired_from_year}</span> : null}
          {anime.episodes ? <span>• {anime.episodes} eps</span> : null}
        </div>

        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}

        <div className="flex flex-wrap gap-6 pt-2">
          <Stat
            label="MAL Score"
            value={
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400" />
                {fmt(anime.score, 2)}
              </span>
            }
          />
          <Stat label="Scored by" value={fmt(anime.scored_by)} />
          <Stat label="Members" value={fmt(anime.members)} />
          <Stat label="Favorites" value={fmt(anime.favorites)} />
          <Stat label="Rank" value={anime.rank ? `#${anime.rank}` : '—'} />
          <Stat
            label="Popularity"
            value={anime.popularity ? `#${anime.popularity}` : '—'}
          />
        </div>

        {anime.genres?.length ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {anime.genres.map((g) => (
              <Badge key={g} variant="secondary">
                {g}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-2 pt-2 text-sm md:grid-cols-2">
          {anime.studios?.length ? (
            <p>
              <span className="text-muted-foreground">Studios: </span>
              {anime.studios.join(', ')}
            </p>
          ) : null}
          {anime.producers?.length ? (
            <p>
              <span className="text-muted-foreground">Producers: </span>
              {anime.producers.join(', ')}
            </p>
          ) : null}
          {anime.licensors?.length ? (
            <p>
              <span className="text-muted-foreground">Licensors: </span>
              {anime.licensors.join(', ')}
            </p>
          ) : null}
          {anime.source ? (
            <p>
              <span className="text-muted-foreground">Source: </span>
              {anime.source}
            </p>
          ) : null}
          {anime.aired_string ? (
            <p>
              <span className="text-muted-foreground">Aired: </span>
              {anime.aired_string}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Histogram({ rows }) {
  const data = (rows ?? []).map((r) => ({
    bucket: String(r.bucket),
    n: Number(r.n ?? 0),
  }));
  const total = data.reduce((sum, r) => sum + r.n, 0);
  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No user ratings yet for this title.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="bucket"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            fontSize: 12,
          }}
          formatter={(value) => [Number(value).toLocaleString(), 'ratings']}
          labelFormatter={(l) => `Score ${l}`}
        />
        <Bar dataKey="n" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
