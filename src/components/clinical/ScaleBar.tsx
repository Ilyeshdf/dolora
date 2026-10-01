import { useFormat, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { severityOf, type Severity } from '@/lib/clinical';

const SEGMENTS: { sev: Severity; from: number; to: number }[] = [
  { sev: 'mild', from: 0, to: 3.5 },
  { sev: 'moderate', from: 3.5, to: 6.5 },
  { sev: 'severe', from: 6.5, to: 10 },
];

const lineColor: Record<Severity, string> = {
  mild: 'bg-pain-mild',
  moderate: 'bg-pain-moderate',
  severe: 'bg-pain-severe',
};

// Literal class names so Tailwind generates them (HC: patterned underlines, A7).
const hcLine: Record<Severity, string> = {
  mild: 'hc:bg-transparent hc:pat-dots',
  moderate: 'hc:bg-transparent hc:pat-stripes',
  severe: 'hc:bg-ink',
};

/**
 * 0–10 scale bar — A8 sheet 1 §02. Grey interval band (always grey, §18-2), ink marker,
 * ticks, coloured band underlines + labels. The active band label is bold.
 * Interval width animates over 300 ms; the marker does not tween (§10.5-8).
 */
export function ScaleBar({ score, lo, hi, className }: { score: number; lo: number; hi: number; className?: string }) {
  const t = useT();
  const f = useFormat();
  const pct = (v: number) => `${(Math.min(10, Math.max(0, v)) / 10) * 100}%`;
  const active = severityOf(score);
  const labels: Record<Severity, string> = {
    mild: t.scale.mildRange,
    moderate: t.scale.moderateRange,
    severe: t.scale.severeRange,
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        role="img"
        aria-label={t.scale.ariaScale(f.num(score), f.num(lo), f.num(hi))}
        className="relative h-3 rounded-full bg-track hc:border hc:border-ink"
      >
        <div
          className="absolute inset-y-0 rounded-full bg-band transition-[left,width] duration-300"
          style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }}
        />
        <div
          className="absolute top-1/2 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink hc:outline hc:outline-2 hc:outline-card"
          style={{ left: pct(score) }}
        />
      </div>
      {/* ticks + numbers */}
      <div aria-hidden className="relative mt-1.5 h-6">
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${i * 10}%` }}>
            <span className="h-1.5 w-px bg-muted/60 hc:bg-ink" />
            <span className="text-xs leading-4 text-muted">{i}</span>
          </div>
        ))}
      </div>
      {/* band underlines */}
      <div aria-hidden className="relative mt-1 h-[3px] hc:h-2">
        {SEGMENTS.map((s) => (
          <span
            key={s.sev}
            className={cn('absolute inset-y-0 rounded-full text-ink', lineColor[s.sev], 'hc:ring-1 hc:ring-ink', hcLine[s.sev])}
            style={{ left: `calc(${s.from * 10}% + ${s.from ? 2 : 0}px)`, width: `calc(${(s.to - s.from) * 10}% - ${s.from && s.to < 10 ? 4 : 2}px)` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        {SEGMENTS.map((s) => (
          <span key={s.sev} className={cn('nowrap', s.sev === active ? 'font-bold text-ink' : 'text-muted')}>
            {labels[s.sev]}
          </span>
        ))}
      </div>
    </div>
  );
}
