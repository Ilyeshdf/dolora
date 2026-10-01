import {
  forwardRef,
  useId,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import * as RS from '@radix-ui/react-switch';
import * as RSel from '@radix-ui/react-select';
import { Check, ChevronDown, Clock, Minus, Plus, TriangleAlert } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { RouteIcon, type Route } from './RouteIcon';
import { Segmented } from './Segmented';

/*
 * Form primitives. The only designed form states are A11 (sign-in inputs, amber error) and A5
 * (note field, switch). Everything else follows those: 52 px fields, radius 14, 1 px border,
 * amber — never red — validation (D-6, task §3.1-7). Assumptions: DECISIONS.md D-35.
 */

const fieldBase =
  'w-full rounded-[14px] border-theme bg-card px-4 text-md text-ink placeholder:text-muted ' +
  'transition-colors duration-150 hover:border-muted/60 focus-visible:border-accent';

/* ---------- Field wrapper: label, hint, message, effect ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  effect,
  children,
  className,
  required,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  effect?: { route: Route; text: string } | null;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  const t = useT();
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="nowrap flex items-center gap-2 text-base font-medium text-ink">
        {label}
        {required ? <span className="text-sm font-normal text-muted">· {t.common.required}</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <FieldMessage>{error}</FieldMessage> : null}
      {effect ? <EffectLine route={effect.route}>{effect.text}</EffectLine> : null}
    </div>
  );
}

/** Amber validation message with warning icon (A11 error variant). Never red. */
export function FieldMessage({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-sm font-medium text-advisory-text hc:text-advisory-border">
      <TriangleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** "Effect on ALGOS‑Δ" line: route icon + route name + effect (task §3.1-2). */
export function EffectLine({ route, children, className }: { route: Route; children: ReactNode; className?: string }) {
  const t = useT();
  return (
    <p className={cn('flex items-start gap-2 text-sm text-text-2', className)}>
      <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-chip-icon text-chip-icon-fg">
        <RouteIcon route={route} size={13} />
      </span>
      <span>
        <span className="sr-only">{t.forms.effectOn}: </span>
        <span className="font-semibold text-ink">{t.routes[route]}</span> · {children}
      </span>
    </p>
  );
}

/** Age of a time-sensitive input; amber (never red) when stale (task §3.1-6). */
export function FreshnessTag({ children, stale }: { children: ReactNode; stale?: boolean }) {
  const t = useT();
  return (
    <span
      className={cn(
        'nowrap inline-flex items-center gap-1.5 text-sm',
        stale ? 'font-semibold text-advisory-text hc:text-advisory-border' : 'text-muted',
      )}
    >
      <Clock aria-hidden size={14} strokeWidth={1.75} />
      {children}
      {stale ? <span className="sr-only">({t.forms.stale})</span> : null}
    </span>
  );
}

/* ---------- Text input / textarea ---------- */

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  trailing?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ className, invalid, trailing, ...props }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        'h-13',
        invalid ? 'border-advisory-border pr-11' : 'border-card-border hc:border-ink',
        trailing && 'pr-12',
        className,
      )}
      {...props}
    />
    {invalid && !trailing ? (
      <TriangleAlert aria-hidden size={20} strokeWidth={1.75} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-advisory-border" />
    ) : null}
    {trailing ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div> : null}
  </div>
));
TextInput.displayName = 'TextInput';

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-13 resize-y border-card-border py-3 hc:border-ink', className)} {...props} />
));
TextArea.displayName = 'TextArea';

/* ---------- Stepper (tap, don't type) ---------- */

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  id,
  invalid,
  'aria-describedby': describedBy,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  id?: string;
  invalid?: boolean;
  'aria-describedby'?: string;
  label: string;
}) {
  const t = useT();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const bump = (d: number) => onChange(clamp((value ?? min) + d));
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`${t.forms.decrease} ${label}`}
        onClick={() => bump(-step)}
        disabled={value !== null && value <= min}
        className="grid h-13 w-13 place-items-center rounded-full border-theme border-card-border bg-card hover:bg-subtle disabled:text-muted hc:border-ink"
      >
        <Minus aria-hidden size={20} strokeWidth={1.75} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'PageUp') {
            e.preventDefault();
            bump(step * 10);
          } else if (e.key === 'PageDown') {
            e.preventDefault();
            bump(-step * 10);
          }
        }}
        className={cn(
          fieldBase,
          'h-13 w-24 text-center text-xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          invalid ? 'border-advisory-border' : 'border-card-border hc:border-ink',
        )}
      />
      <button
        type="button"
        aria-label={`${t.forms.increase} ${label}`}
        onClick={() => bump(step)}
        disabled={value !== null && value >= max}
        className="grid h-13 w-13 place-items-center rounded-full border-theme border-card-border bg-card hover:bg-subtle disabled:text-muted hc:border-ink"
      >
        <Plus aria-hidden size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/* ---------- Relative time quick-pick (now · 5 · 15 · 30 min ago · custom) ---------- */

export type RelativePick = '0' | '5' | '15' | '30' | 'custom';

export function RelativeTimePicker({
  value,
  onChange,
  label,
}: {
  value: RelativePick;
  onChange: (v: RelativePick) => void;
  label: string;
}) {
  const t = useT();
  return (
    <Segmented<RelativePick>
      aria-label={label}
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: '0', label: t.common.now },
        { value: '5', label: t.forms.minAgo(5) },
        { value: '15', label: t.forms.minAgo(15) },
        { value: '30', label: t.forms.minAgo(30) },
        { value: 'custom', label: t.forms.custom },
      ]}
    />
  );
}

/* ---------- Switch (A5 "Intubated / Extubated") ---------- */

export function Switch({
  checked,
  onCheckedChange,
  id,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <RS.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border-2 transition-colors duration-150',
        checked ? 'border-pill-active bg-pill-active' : 'border-band bg-band hc:border-ink hc:bg-card',
      )}
    >
      <RS.Thumb
        className={cn(
          'block h-5 w-5 rounded-full bg-card shadow transition-transform duration-150 hc:bg-ink',
          checked ? 'translate-x-4' : 'translate-x-0',
          checked && 'hc:bg-pill-active-fg',
        )}
      />
    </RS.Root>
  );
}

/* ---------- Select (A11 unit select) ---------- */

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  id,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: T | undefined;
  onValueChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  id?: string;
  placeholder?: string;
  'aria-label'?: string;
}) {
  return (
    <RSel.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <RSel.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(fieldBase, 'nowrap flex h-13 items-center justify-between border-card-border hc:border-ink')}
      >
        <RSel.Value placeholder={placeholder} />
        <RSel.Icon>
          <ChevronDown aria-hidden size={20} strokeWidth={1.75} />
        </RSel.Icon>
      </RSel.Trigger>
      <RSel.Portal>
        <RSel.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] border-theme border-card-border bg-card p-1.5 shadow-card hc:border-ink"
        >
          <RSel.Viewport>
            {options.map((o) => (
              <RSel.Item
                key={o.value}
                value={o.value}
                className="nowrap relative flex h-11 cursor-pointer select-none items-center rounded-[10px] pl-9 pr-4 text-md outline-none data-[highlighted]:bg-subtle"
              >
                <RSel.ItemIndicator className="absolute left-3">
                  <Check aria-hidden size={16} />
                </RSel.ItemIndicator>
                <RSel.ItemText>{o.label}</RSel.ItemText>
              </RSel.Item>
            ))}
          </RSel.Viewport>
        </RSel.Content>
      </RSel.Portal>
    </RSel.Root>
  );
}

/* ---------- PIN input (A13) ---------- */

export function PinInput({
  value,
  onChange,
  length = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const t = useT();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const groupId = useId();
  function onKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      onChange(value.slice(0, i - 1));
      refs.current[i - 1]?.focus();
      e.preventDefault();
    }
  }
  return (
    <div role="group" aria-labelledby={groupId} className="flex gap-3">
      <span id={groupId} className="sr-only">
        {t.forms.pin}
      </span>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          aria-label={t.forms.pinDigit(i + 1)}
          value={value[i] ?? ''}
          onKeyDown={(e) => onKey(i, e)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            if (!d) return;
            const next = (value.slice(0, i) + d).slice(0, length);
            onChange(next);
            refs.current[Math.min(i + 1, length - 1)]?.focus();
          }}
          className="h-[72px] w-16 rounded-[14px] border-theme border-card-border bg-card text-center text-3xl font-bold focus-visible:border-accent hc:border-ink"
        />
      ))}
    </div>
  );
}
