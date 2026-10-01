import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { severityBg, severityPattern, type Severity } from '@/lib/clinical';


/** Bar glyph: three ascending bars (A1 severity pill). */
export function BarGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="currentColor">
      <rect x="1.5" y="9" width="3" height="5.5" rx="1" />
      <rect x="6.5" y="5.5" width="3" height="9" rx="1" />
      <rect x="11.5" y="2" width="3" height="12.5" rx="1" />
    </svg>
  );
}

/** HC swatch: a circle filled with the severity pattern. */
export function PatternSwatch({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-4 w-4 rounded-full border-2 border-current text-current', severityPattern[severity], className)}
    />
  );
}

/** Filled severity pill (hero card). HC: white pill, black text, pattern swatch. */
export function SeverityPill({ severity, size = 'lg', className }: { severity: Severity; size?: 'lg' | 'md'; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        'nowrap inline-flex items-center gap-2 rounded-full font-bold text-severity-fg',
        size === 'lg' ? 'h-10 px-4 text-[22px] compact:h-8 compact:px-3 compact:text-base' : 'h-8 px-3 text-base',
        severityBg[severity],
        'hc:border-2 hc:border-ink hc:bg-card hc:text-ink',
        className,
      )}
    >
      <BarGlyph className="hc:hidden" />
      <PatternSwatch severity={severity} className="hidden hc:inline-block" />
      {t.severity[severity]}
    </span>
  );
}

/** Small white tag with a severity square ("■ Moderate") under the pain gauge. */
export function SeverityTag({ severity, className }: { severity: Severity; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        'nowrap inline-flex h-8 items-center gap-2 rounded-full bg-card px-3 text-sm font-semibold text-ink hc:border-2 hc:border-ink',
        className,
      )}
    >
      <span aria-hidden className={cn('h-2.5 w-2.5 rounded-[3px] hc:hidden', severityBg[severity])} />
      <PatternSwatch severity={severity} className="hidden h-3.5 w-3.5 hc:inline-block" />
      {t.severity[severity]}
    </span>
  );
}
