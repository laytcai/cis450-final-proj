import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Loader({ className, label = 'Loading…' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className,
      )}
      role="status"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
