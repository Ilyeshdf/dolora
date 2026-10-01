import type { ReactNode } from 'react';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StatusDot = 'ok' | 'degraded' | 'rejected' | 'pending' | 'offline' | 'none';

/** Dot + text status pill ("● Simulator", "● Signals OK"). Colour never carries meaning alone. */
export function StatusPill({
  dot = 'ok',
  children,
  icon,
  size = 'md',
  tone = 'card',
  className,
}: {
  dot?: StatusDot;
  children: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md';
  tone?: 'card' | 'slate';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'nowrap inline-flex items-center gap-2 rounded-full font-semibold',
        size === 'md' ? 'h-10 px-3.5 text-base' : 'h-8 px-3 text-sm',
        tone === 'card' && 'border-theme border-card-border bg-card text-ink hc:border-ink',
        tone === 'slate' && 'bg-sensor-rejected text-white hc:border-2 hc:border-ink hc:bg-card hc:text-ink',
        className,
      )}
    >
      {icon ?? <Dot kind={dot} />}
      {children}
    </span>
  );
}

export function Dot({ kind, className }: { kind: StatusDot; className?: string }) {
  if (kind === 'none') return null;
  if (kind === 'offline') return <Ban aria-hidden size={14} strokeWidth={2} className={cn('text-muted', className)} />;
  if (kind === 'pending') {
    // Reconnecting: amber half ring, gentle pulse (disabled under reduced motion).
    return (
      <span aria-hidden className={cn('relative inline-block h-3 w-3 animate-pulse', className)}>
        <svg viewBox="0 0 12 12" className="h-3 w-3">
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgb(var(--sensor-degraded))" strokeOpacity=".3" strokeWidth="2" />
          <path d="M6 1.5 A4.5 4.5 0 0 1 6 10.5" fill="none" stroke="rgb(var(--sensor-degraded))" strokeWidth="2" />
        </svg>
      </span>
    );
  }
  const color = {
    ok: 'bg-sensor-ok',
    degraded: 'bg-sensor-degraded',
    rejected: 'bg-sensor-rejected',
  }[kind];
  return <span aria-hidden className={cn('inline-block h-2 w-2 rounded-full', color, 'hc:bg-ink', className)} />;
}
