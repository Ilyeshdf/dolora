import { cn } from '@/lib/cn';

/** Timeline legend glyphs — A8 sheet 4 §13. Red alert triangle is alert semantics (D-6); yellow in HC. */

export function EventRegionGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 44 28" className={cn('h-7 w-11', className)}>
      <rect width="44" height="28" rx="3" className="fill-butter hc:fill-card hc:stroke-ink" strokeWidth="1.5" />
      <path d="M4 22 C14 20 18 12 40 7" fill="none" className="stroke-ink" strokeWidth="2" />
    </svg>
  );
}

export function DiamondGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={cn('h-5 w-5', className)}>
      <path d="M10 2.5 L17.5 10 L10 17.5 L2.5 10 Z" className="fill-card stroke-ink" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertTriangleGlyph({ ghost, className }: { ghost?: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 28" className={cn('h-7 w-5', className)}>
      <path
        d="M3 2 H17 L10 12 Z"
        className={ghost ? 'fill-none stroke-text-2' : 'fill-alert stroke-alert'}
        strokeWidth="1.5"
        strokeDasharray={ghost ? '2 1.6' : undefined}
        strokeLinejoin="round"
      />
      <line x1="10" y1="13" x2="10" y2="27" className={ghost ? 'stroke-text-2' : 'stroke-alert'} strokeWidth="1.25" strokeDasharray="2 2" />
    </svg>
  );
}

export function AbstentionGlyph({ className }: { className?: string }) {
  return <span aria-hidden className={cn('pat-hatch block h-7 w-11 rounded-[3px] border border-band hc:pat-sparse hc:text-ink', className)} />;
}
