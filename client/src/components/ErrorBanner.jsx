import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ErrorBanner({ error, className }) {
  if (!error) return null;
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'Something went wrong.';
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Request failed</p>
        <p className="text-destructive/90">{message}</p>
      </div>
    </div>
  );
}
