import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';

export default function SearchBar({
  filters,
  onChange,
  onSubmit,
  onReset,
  genres = [],
  types = [],
  minYear = 1917,
  maxYear = new Date().getFullYear(),
}) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="grid gap-3 rounded-xl border bg-card/40 p-4 md:grid-cols-6"
    >
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Title
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q ?? ''}
            onChange={(e) => set('q')(e.target.value)}
            placeholder="e.g. steins;gate"
            className="pl-8"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Genre
        </label>
        <Select
          value={filters.genre || ALL}
          onValueChange={(v) => set('genre')(v === ALL ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.genre_id} value={g.genre_name}>
                {g.genre_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Type</label>
        <Select
          value={filters.type || ALL}
          onValueChange={(v) => set('type')(v === ALL ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
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
          inputMode="numeric"
          min={minYear}
          max={maxYear}
          value={filters.year_from ?? ''}
          onChange={(e) => set('year_from')(e.target.value)}
          placeholder={String(minYear)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Year to
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={minYear}
          max={maxYear}
          value={filters.year_to ?? ''}
          onChange={(e) => set('year_to')(e.target.value)}
          placeholder={String(maxYear)}
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Min score
        </label>
        <Input
          type="number"
          step="0.1"
          min={0}
          max={10}
          value={filters.min_score ?? ''}
          onChange={(e) => set('min_score')(e.target.value)}
          placeholder="0.0 — 10.0"
        />
      </div>

      <div className="flex items-end justify-end gap-2 md:col-span-4">
        {onReset ? (
          <Button type="button" variant="ghost" onClick={onReset}>
            Reset
          </Button>
        ) : null}
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}
