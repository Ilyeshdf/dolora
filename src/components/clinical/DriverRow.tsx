import { forwardRef, type HTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, TriangleAlert } from 'lucide-react';
import { useFormat, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';

export interface DriverRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subline: string;
  /** Physiological direction (§18-6) — may differ from the contribution sign. */
  direction: 'up' | 'down';
  /** SHAP contribution to the PAIN SCORE (D-5). */
  contribution: number;
  /** Down-weighted by clinical context, e.g. 0.3 (A4). */
  weight?: number;
  /** Source sensor degraded: reliability value shown with an amber warning. */
  degradedReliability?: number;
  highlighted?: boolean;
}

/**
 * Driver row — A8 sheet 3 §11. Plain language first, numbers second.
 * Layout fix (D-0): the title gets the full row; contribution + bar sit on the subline row,
 * so titles no longer wrap into their sublines.
 */
export const DriverRow = forwardRef<HTMLDivElement, DriverRowProps>(
  ({ title, subline, direction, contribution, weight, degradedReliability, highlighted, className, ...props }, ref) => {
    const t = useT();
    const f = useFormat();
    const Arrow = direction === 'up' ? ArrowUp : ArrowDown;
    // Bar: zero line at 30 %, ±0.5 spans the rest.
    const zero = 30;
    const span = Math.min(1, Math.abs(contribution) / 0.5) * (contribution >= 0 ? 100 - zero : zero);
    return (
      <div
        ref={ref}
        tabIndex={0}
        className={cn(
          'flex gap-2.5 rounded-[16px] border border-transparent px-3 py-3 outline-none transition-colors duration-150',
          'hover:border-sky hover:bg-subtle focus-visible:border-sky focus-visible:bg-subtle',
          highlighted && 'border-[#D5E3F5] bg-subtle night:border-card-border',
          highlighted && 'hc:border-2 hc:border-action hc:bg-card',
          className,
        )}
        {...props}
      >
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-track hc:border hc:border-ink">
          <Arrow aria-label={direction === 'up' ? t.drivers.up : t.drivers.down} size={15} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="nowrap min-w-0 truncate text-base font-semibold" title={title}>
              {title}
            </p>
            {weight !== undefined ? (
              <Badge tone="weight" size="sm" className="shrink-0">
                {t.drivers.weight(f.num(weight))}
              </Badge>
            ) : null}
            {degradedReliability !== undefined ? (
              <TriangleAlert aria-hidden size={16} strokeWidth={1.75} className="shrink-0 text-sensor-degraded" />
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <p className="nowrap min-w-0 flex-1 truncate text-sm text-muted" title={subline}>
              {degradedReliability !== undefined ? `${subline} · ${t.drivers.degradedSource(f.num(degradedReliability, 2))}` : subline}
            </p>
            <span className="nowrap shrink-0 text-base font-bold">{f.signed(contribution)}</span>
            <span aria-hidden className="relative h-2 w-20 shrink-0 rounded-full bg-track hc:border hc:border-ink">
              <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" style={{ left: `${zero}%` }} />
              <span
                className="absolute inset-y-0 rounded-full bg-[#3F4A56] night:bg-text-2 hc:bg-ink"
                style={contribution >= 0 ? { left: `${zero}%`, width: `${span}%` } : { right: `${100 - zero}%`, width: `${span}%` }}
              />
            </span>
          </div>
        </div>
      </div>
    );
  },
);
DriverRow.displayName = 'DriverRow';
