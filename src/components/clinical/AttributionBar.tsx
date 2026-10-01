import { Info } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export type AttributionClass = 'pain' | 'stress' | 'agitation' | 'rest' | 'unexplained';

export interface AttributionShares {
  pain: number;
  stress: number;
  /** null = not available (motion masked, A4). */
  agitation: number | null;
  rest: number;
  unexplained: number;
}

const FILL: Record<AttributionClass, string> = {
  pain: 'bg-attr-pain',
  stress: 'bg-attr-stress',
  agitation: 'bg-attr-agitation',
  rest: 'bg-attr-rest',
  unexplained: 'pat-hatch bg-card',
};
// HC (A8 sheet 2): solid, stripes, dots, cross-hatch, sparse hatch — white on black.
const HC_FILL: Record<AttributionClass, string> = {
  pain: 'hc:bg-ink',
  stress: 'hc:bg-card hc:pat-stripes hc:text-ink',
  agitation: 'hc:bg-card hc:pat-dots hc:text-ink',
  rest: 'hc:bg-card hc:pat-crosshatch hc:text-ink',
  unexplained: 'hc:bg-card hc:pat-sparse hc:text-ink',
};
const ORDER: AttributionClass[] = ['pain', 'stress', 'agitation', 'rest', 'unexplained'];

/**
 * Attribution bar — A8 sheet 2 §03. Explains WHY THE AROUSAL is attributed (D-5).
 * The largest share carries an inline label. Legend is a 2-column grid.
 * `agitationLabel` switches Agitation (ICU) / Activity (Ward) — D-20.
 */
export function AttributionBar({
  shares,
  agitationLabel = 'agitation',
  emptyText,
  className,
}: {
  shares: AttributionShares | null;
  /** Empty-state text override (calibration: "Available after calibration"). */
  emptyText?: string;
  agitationLabel?: 'agitation' | 'activity';
  className?: string;
}) {
  const t = useT();
  const names: Record<AttributionClass, string> = {
    pain: t.attribution.pain,
    stress: t.attribution.stress,
    agitation: agitationLabel === 'activity' ? t.attribution.activity : t.attribution.agitation,
    rest: t.attribution.rest,
    unexplained: t.attribution.unexplained,
  };

  if (!shares) {
    return (
      <div className={className}>
        <div className="h-9 rounded-[10px] border border-dashed border-card-border hc:border-ink" />
        <p className="mt-4 flex items-center gap-2 text-md text-text-2">
          <Info aria-hidden size={18} strokeWidth={1.75} />
          {emptyText ?? t.attribution.emptyRejected}
        </p>
      </div>
    );
  }

  const value = (c: AttributionClass) => (c === 'agitation' ? shares.agitation : shares[c]);
  const present = ORDER.filter((c) => (value(c) ?? 0) > 0);
  const largest = present.reduce<AttributionClass>((a, c) => ((value(c) ?? 0) > (value(a) ?? 0) ? c : a), 'pain');
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const summary = ORDER.map((c) => `${names[c]} ${value(c) === null ? t.common.notAvailable : pct(value(c) ?? 0)}`).join(', ');

  return (
    <div className={className}>
      <div role="img" aria-label={summary} className="flex h-9 gap-[3px] overflow-hidden rounded-[10px] hc:rounded-[8px] hc:border-2 hc:border-ink hc:bg-ink">
        {present.map((c) => (
          <div
            key={c}
            className={cn('relative flex h-full items-center overflow-hidden text-ink', FILL[c], HC_FILL[c])}
            style={{ flexGrow: value(c) ?? 0, flexBasis: 0, minWidth: 6 }}
          >
            {c === largest ? (
              <span
                className={cn(
                  'nowrap px-3 text-sm font-semibold',
                  c === 'pain' ? 'text-card' : 'text-[#111418]',
                  'hc:mx-1 hc:rounded hc:bg-ink hc:px-2 hc:text-card',
                )}
              >
                {names[c]} {pct(value(c) ?? 0)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-5 gap-y-2 compact:mt-3 compact:gap-y-1">
        {/* An unavailable class moves to the end of the legend (A4). */}
        {/* Zero shares are omitted from the legend (A8 sheet 2 "Standard"). */}
        {[...ORDER.filter((c) => (value(c) ?? 0) > 0), ...ORDER.filter((c) => value(c) === null)].map((c) => {
          const v = value(c);
          return (
            <div key={c} className={cn('flex min-w-0 items-center gap-2.5', v === null && 'col-span-2 max-w-[calc(50%+170px)]')}>
              <span
                aria-hidden
                className={cn(
                  'h-3.5 w-3.5 shrink-0 rounded-[3px] text-ink',
                  v === null ? 'border border-dashed border-muted bg-transparent' : [FILL[c], HC_FILL[c], 'hc:border hc:border-ink'],
                )}
              />
              <dt className="nowrap min-w-0 truncate text-base text-text-2 compact:text-sm">
                {names[c]}
                {v === null ? <span className="text-muted"> · {t.attribution.motionMasked}</span> : null}
              </dt>
              <dd className="ml-auto pl-2 text-base font-bold compact:text-sm">{v === null ? t.common.notAvailable : pct(v)}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
