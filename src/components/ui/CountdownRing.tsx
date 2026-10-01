import { cn } from '@/lib/cn';

/**
 * Countdown ring for timed context chips (A1 "Suctioning · 1:24 left").
 * `fraction` = remaining / total, 0–1. Purely visual; the time is always in the text too.
 */
export function CountdownRing({ fraction, size = 20, className }: { fraction: number; size?: number; className?: string }) {
  const f = Math.min(1, Math.max(0, fraction));
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn('shrink-0 -rotate-90', className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`}
      />
    </svg>
  );
}
