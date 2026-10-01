import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CountdownRing } from './CountdownRing';
import { RouteIcon, type Route } from './RouteIcon';

interface ContextChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  route: Route;
  kind: 'persistent' | 'timed';
  /** Timed chips: remaining time text (m:ss) and fraction remaining. */
  remaining?: string;
  fraction?: number;
  /** Visual state used by the component sheet for the hover example. */
  forceHover?: boolean;
}

/**
 * Context chip — A8 sheet 3 §06. Persistent: white with "Persistent" suffix.
 * Timed: butter fill, countdown ring. Height 40, icon disc 32.
 */
export const ContextChip = forwardRef<HTMLButtonElement, ContextChipProps>(
  ({ label, route, kind, remaining, fraction = 1, forceHover, className, ...props }, ref) => {
    const t = useT();
    const timed = kind === 'timed';
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'nowrap inline-flex h-10 items-center gap-2.5 rounded-full border-theme pl-1 pr-4 text-md font-medium transition-[transform,background-color] duration-150 active:scale-[0.97]',
          timed
            ? 'border-chip-timed-border bg-butter text-ink'
            : 'border-card-border bg-card text-ink hover:border-accent/40 hc:border-ink',
          forceHover && !timed && 'border-accent/40 bg-subtle',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'grid h-8 w-8 place-items-center rounded-full text-chip-icon-fg',
            timed ? 'bg-card hc:bg-chip-icon' : 'bg-chip-icon',
          )}
        >
          <RouteIcon route={route} size={17} />
        </span>
        <span>{timed && remaining ? `${label} · ${t.chips.left(remaining)}` : label}</span>
        {kind === 'persistent' && <span className="font-normal text-muted">{t.chips.persistent}</span>}
        {timed && <CountdownRing fraction={fraction} />}
      </button>
    );
  },
);
ContextChip.displayName = 'ContextChip';

/** Dashed "+ Add context" chip. */
export const AddChip = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }>(
  ({ className, children, ...props }, ref) => {
    const t = useT();
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'nowrap inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-dashed border-muted/60 px-4 text-md font-medium text-text-2',
          'hover:border-ink hover:text-ink hc:border-ink hc:text-ink',
          className,
        )}
        {...props}
      >
        <Plus aria-hidden size={18} strokeWidth={1.75} />
        {children ?? t.chips.addContext}
      </button>
    );
  },
);
AddChip.displayName = 'AddChip';
