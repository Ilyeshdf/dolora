import { cn } from '@/lib/cn';

/* Small hand-drawn SVG icons that lucide doesn't provide in the design's form. */

/** Degraded state: half amber ring around a dot (A8 sheet 2). */
export function HalfRingIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={cn('h-5 w-5 text-sensor-degraded', className)}>
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.2" />
      <path d="M10 2.5 A7.5 7.5 0 0 1 10 17.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

/** Rejected: crossed point. */
export function RejectedIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={cn('h-5 w-5', className)}>
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4.8 15.2 L15.2 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Abstention: pulse line crossed out (A3 hero, unit overview). */
export function NoSignalIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={cn('h-10 w-10', className)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22 H11 L15 13 L21 29 L25 19 H36" />
      <path d="M8 8 L32 32" />
    </svg>
  );
}

/** Masked by context: dashed circle with a slashed padlock. */
export function MaskedIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 22 22" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="11" cy="11" r="9" strokeWidth="1.5" strokeDasharray="2.6 2.4" />
      <rect x="7.4" y="10" width="7.2" height="5.2" rx="1" strokeWidth="1.4" />
      <path d="M8.8 10 V8.6 a2.2 2.2 0 0 1 4.4 0 V10" strokeWidth="1.4" />
      <path d="M6.5 15.8 L15.5 6.8" strokeWidth="1.4" />
    </svg>
  );
}
