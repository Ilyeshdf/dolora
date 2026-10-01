import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Bold Δ drawn as a triangle with a counter, so it matches the wordmark weight (A1). */
export function DeltaGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 18" className={cn('inline-block h-[0.74em] w-[0.82em]', className)}>
      <path fillRule="evenodd" fill="currentColor" d="M10 0 L20 18 H0 Z M10 7.2 L5.6 14.6 H14.4 Z" />
    </svg>
  );
}

/** ALGOS‑Δ wordmark: dark tile with yellow triangle + text. Never wraps (D-0). */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();
  return (
    <div className={cn('nowrap flex items-center gap-3', className)} aria-label={t.app.name} role="img">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-[#111418] hc:border-2 hc:border-ink hc:bg-card">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
          <path d="M12 4.5 L20 19 H4 Z" fill="none" stroke="rgb(var(--action))" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="flex items-baseline text-[23px] font-extrabold tracking-[-0.01em] text-ink">
          ALGOS‑<DeltaGlyph />
        </span>
      )}
    </div>
  );
}

/** Permanent footer disclaimer (§10.5-7) — shown in full, never truncated (D-0). */
export function Footer({ className }: { className?: string }) {
  const t = useT();
  return (
    <footer className={cn('flex items-center justify-between gap-6 px-8 text-xs text-muted', className)}>
      <p className="min-w-0">{t.app.disclaimer}</p>
      <p className="nowrap shrink-0">{t.app.model('algos-delta-0.3')}</p>
    </footer>
  );
}
