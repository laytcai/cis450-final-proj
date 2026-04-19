import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Star, User as UserIcon } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import AnimeCard from '@/components/AnimeCard';
import ErrorBanner from '@/components/ErrorBanner';
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

function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return String(s);
  }
}

const statusPalette = {
  completed: 'bg-emerald-500/20 text-emerald-300',
  watching: 'bg-sky-500/20 text-sky-300',
  on_hold: 'bg-amber-500/20 text-amber-300',
  dropped: 'bg-rose-500/20 text-rose-300',
  plan_to_watch: 'bg-violet-500/20 text-violet-300',
};

export default function UserProfile() {
  const { username } = useParams();
  const trimmed = username?.trim();
  const enabled = Boolean(trimmed);

  const { data, error, loading } = useFetch(
    enabled ? `/api/users/${encodeURIComponent(trimmed)}` : null,
    { params: { top: 5 } },
  );

  if (!enabled) {
    return <ErrorBanner error="Username is required." />;
  }

  const profile = data?.profile;
  const topAnime = data?.top_anime ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/40 text-primary">
            User profile
          </Badge>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <UserIcon className="h-6 w-6 text-primary" />
            {trimmed}
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link to="/compare">Compare with another user →</Link>
        </Button>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <ProfileSkeleton />
      ) : profile ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetaCard
              label="Mean score"
              value={fmt(profile.computed_mean_score ?? profile.stats_mean_score, 2)}
            />
            <MetaCard
              label="Completed"
              value={fmt(profile.user_completed ?? profile.completed_in_list)}
            />
            <MetaCard label="Watching" value={fmt(profile.user_watching)} />
            <MetaCard label="Plan to watch" value={fmt(profile.user_plantowatch)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <InfoRow
                icon={MapPin}
                label="Location"
                value={profile.location || '—'}
              />
              <InfoRow
                icon={CalendarDays}
                label="Joined"
                value={fmtDate(profile.join_date)}
              />
              <InfoRow
                icon={Clock}
                label="Last online"
                value={fmtDate(profile.last_online)}
              />
              <InfoRow
                icon={UserIcon}
                label="Gender"
                value={profile.gender || '—'}
              />
              <InfoRow
                icon={Clock}
                label="Days watched"
                value={fmt(profile.user_days_spent_watching, 2)}
              />
              <InfoRow
                icon={Star}
                label="List entries"
                value={fmt(profile.list_entries)}
              />
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">
                Top {topAnime.length || 5} anime
              </h2>
              <p className="text-sm text-muted-foreground">
                Ranked by this user's own rating
              </p>
            </div>
            {topAnime.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No scored anime on this user's list yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {topAnime.map((a) => (
                  <AnimeCard
                    key={a.anime_id}
                    anime={a}
                    footer={
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Star className="h-3 w-3" /> {fmt(a.my_score, 0)}
                        </span>
                        {a.status_name ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                              statusPalette[a.status_name] ??
                              'bg-muted text-muted-foreground'
                            }`}
                          >
                            {a.status_name.replace(/_/g, ' ')}
                          </span>
                        ) : null}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetaCard({ label, value }) {
  return (
    <Card className="card-glow">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    </div>
  );
}
