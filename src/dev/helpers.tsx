import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Theme } from '@/store/prefs';
import { cn } from '@/lib/cn';

/** "01  Pain hero card   note" section header with a hairline, as on the A8 sheets. */
export function SectionHeader({ n, title, note, className }: { n: string; title: string; note?: string; className?: string }) {
  return (
    <div className={cn('flex items-baseline gap-3 border-b border-ink/10 pb-2 hc:border-ink/40', className)}>
      <span className="text-xs font-semibold text-muted">{n}</span>
      <h2 className="nowrap text-lg font-semibold">{title}</h2>
      {note ? <p className="nowrap ml-6 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function VariantLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('nowrap mb-2 text-xs text-text-2', className)}>{children}</p>;
}

/** Renders children in another theme (tokens are scoped by [data-theme]). */
export function ThemeScope({ theme, children, className, style }: { theme: Theme; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div data-theme={theme} className={className} style={style}>
      {children}
    </div>
  );
}

/** Scales a full-size component for the sheet without changing its internals (A8 uses miniatures). */
export function Zoom({ factor, children, className }: { factor: number; children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ zoom: factor }}>
      {children}
    </div>
  );
}

/** Reads the token's computed value from the themed ancestor, so the sheet always shows the real CSS. */
export function TokenSwatch({ token, label, pattern }: { token: string; label: string; pattern?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState('');
  useLayoutEffect(() => {
    if (pattern || !ref.current) return;
    const raw = getComputedStyle(ref.current).getPropertyValue(`--${token}`).trim();
    const parts = raw.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
      setHex('#' + parts.map((p) => p.toString(16).padStart(2, '0')).join('').toUpperCase());
    }
  }, [token, pattern]);
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        ref={ref}
        aria-hidden
        className={cn('h-6 w-6 shrink-0 rounded-[6px] border border-ink/15 hc:border-ink', pattern)}
        style={pattern ? undefined : { background: `rgb(var(--${token}))` }}
      />
      <span className="nowrap min-w-0 flex-1 truncate text-text-2">{label}</span>
      <span className="nowrap font-semibold">{pattern ? label.split(' · ')[1] : hex}</span>
    </li>
  );
}
