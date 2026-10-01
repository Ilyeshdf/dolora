import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /** Accessible description, e.g. the RASS descriptor. */
  description?: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Stretch options to fill the container (forms). */
  block?: boolean;
  className?: string;
  /** Called on activation instead of changing immediately (e.g. mode change needs confirmation). */
  id?: string;
}

/**
 * Dark-pill segmented control (header ICU/Ward, timeline 5/10/30, CPOT/BPS tabs, forms).
 * Implements the WAI-ARIA radio-group pattern: one tab stop, arrow keys move and select.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  block,
  className,
  id,
  ...aria
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);
  const focusIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value && !o.disabled),
  );

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key) || enabled.length === 0) return;
    e.preventDefault();
    const cur = enabled.findIndex((o) => o.value === value);
    let next: number;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % enabled.length;
    else next = (cur - 1 + enabled.length) % enabled.length;
    const opt = enabled[next];
    if (!opt) return;
    onChange(opt.value);
    refs.current[options.indexOf(opt)]?.focus();
  }

  const item = {
    sm: 'h-8 px-3.5 text-sm',
    md: 'h-[34px] px-3.5 text-base',
    lg: 'h-11 px-5 text-md',
  }[size];
  const pad = size === 'lg' ? 'p-1' : 'p-[5px]';

  return (
    <div
      id={id}
      role="radiogroup"
      {...aria}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border-theme border-card-border bg-card hc:border-ink',
        pad,
        block && 'flex w-full',
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'nowrap inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150',
              item,
              block && 'flex-1',
              active
                ? 'bg-pill-active font-semibold text-pill-active-fg'
                : 'text-text-2 hover:bg-subtle hover:text-ink',
              o.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {o.label}
            {o.description ? <span className="sr-only">{`, ${o.description}`}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
