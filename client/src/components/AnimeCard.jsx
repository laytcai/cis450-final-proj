import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function formatScore(n) {
  if (n === null || n === undefined || n === '') return null;
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : null;
}

export default function AnimeCard({ anime, footer, className }) {
  const {
    anime_id,
    title,
    title_english,
    type,
    score,
    mal_score,
    aired_from_year,
    image_url,
  } = anime;
  const displayScore = formatScore(score ?? mal_score);
  const displayTitle = title_english?.trim() || title;

  return (
    <Link to={`/anime/${anime_id}`} className="group">
      <Card
        className={cn(
          'flex h-full flex-col overflow-hidden transition-colors group-hover:border-primary/50',
          className,
        )}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {image_url ? (
            <img
              src={image_url}
              alt={displayTitle}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-background/95 via-background/70 to-transparent p-2">
            {displayScore ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                {displayScore}
              </span>
            ) : (
              <span />
            )}
            {type ? (
              <Badge variant="secondary" className="text-[10px]">
                {type}
              </Badge>
            ) : null}
          </div>
        </div>
        <CardContent className="flex flex-1 flex-col gap-1 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">
            {displayTitle}
          </p>
          {title_english && title_english !== title ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {title}
            </p>
          ) : null}
          <p className="mt-auto text-xs text-muted-foreground">
            {aired_from_year ?? '—'}
          </p>
          {footer}
        </CardContent>
      </Card>
    </Link>
  );
}
