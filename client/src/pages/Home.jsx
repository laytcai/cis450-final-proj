import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Database, LineChart, Search, Users } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBanner from '@/components/ErrorBanner';

const featureCards = [
  {
    to: '/browse',
    icon: Database,
    title: 'Browse the catalog',
    body: 'Search and filter 6,600+ anime by genre, type, year, and score.',
  },
  {
    to: '/compare',
    icon: Users,
    title: 'Compare two viewers',
    body: 'Pearson correlation, mean score delta, and titles you both rated alike.',
  },
  {
    to: '/trends',
    icon: LineChart,
    title: 'Genre trends over time',
    body: 'Year-by-year release counts and average scores for any genre.',
  },
];

export default function Home() {
  const { data, error, loading } = useFetch('/api/genres');
  const genres = data?.genres ?? [];
  const topGenres = genres.slice(0, 8);
  const totalGenres = genres.length;
  const totalTagged = genres.reduce(
    (acc, g) => acc + Number(g.anime_count ?? 0),
    0,
  );

  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const submitLookup = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    navigate(`/users/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Badge variant="outline" className="border-primary/40 text-primary">
          CIS 5500 · Spring 2026
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="gradient-text">Anime Analytics</span> over a{' '}
          <span className="text-primary">MyAnimeList</span> scrape.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A PostgreSQL-backed exploration of 6.6k anime and 100k+ user
          watchlists. Browse titles, compare viewers, surface studio quality,
          and track genre trends across decades.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild>
            <Link to="/browse">
              Start browsing <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/studios">Studio leaderboard</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Genres indexed"
          value={loading ? null : totalGenres}
          loading={loading}
        />
        <StatCard
          label="Anime–genre tags"
          value={loading ? null : totalTagged.toLocaleString()}
          loading={loading}
        />
        <StatCard
          label="Top genre"
          value={loading ? null : topGenres[0]?.genre_name ?? '—'}
          loading={loading}
        />
      </section>

      <ErrorBanner error={error} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Popular genres</h2>
          <Link
            to="/browse"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            See all →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24" />
            ))}
          {!loading &&
            topGenres.map((g) => (
              <Badge
                key={g.genre_id}
                variant="secondary"
                className="text-sm font-normal"
              >
                {g.genre_name}
                <span className="ml-2 text-muted-foreground">
                  {Number(g.anime_count).toLocaleString()}
                </span>
              </Badge>
            ))}
        </div>
      </section>

      <section>
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Look up a viewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={submitLookup}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="MyAnimeList username"
                  className="pl-8"
                />
              </div>
              <Button type="submit" disabled={!username.trim()}>
                View profile
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              See their top-rated titles, stats, and how they compare to other
              viewers.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureCards.map(({ to, icon: Icon, title, body }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {body}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}

function StatCard({ label, value, loading }) {
  return (
    <Card className="card-glow">
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-32" />
        ) : (
          <p className="mt-1 text-3xl font-semibold">{value ?? '—'}</p>
        )}
      </CardContent>
    </Card>
  );
}
