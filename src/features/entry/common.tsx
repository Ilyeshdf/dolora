import { useId, useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { FLAGS, type FlagId, type Route } from '@/clinical/clinicalEffects';
import type { Contradiction } from '@/clinical/profile';
import type { EffectSet } from '@/engine/effects';
import { useL10n, useT } from '@/i18n';
import { groupByRoute } from './routes';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { Button } from '@/components/ui/Button';
import { EffectLine, RelativeTimePicker, type RelativePick } from '@/components/ui/Form';
import { RouteIcon } from '@/components/ui/RouteIcon';

/* ------------------------------------------------------------------------ time pick */

/**
 * "now · 5 · 15 · 30 min ago · custom" (task §3.1-3). Custom = HH:MM on the bed clock, must be
 * in the past (amber message otherwise). Returns the chosen timestamp via onChange.
 */
export function TimePick({ now, value, onChange, label }: { now: number; value: number; onChange: (t: number) => void; label: string }) {
  const t = useT();
  const id = useId();
  const [pick, setPick] = useState<RelativePick>(() => {
    const m = Math.round((now - value) / 60_000);
    return m === 0 ? '0' : m === 5 ? '5' : m === 15 ? '15' : m === 30 ? '30' : 'custom';
  });
  const [custom, setCustom] = useState(() => fmtTime(value, false));
  const [err, setErr] = useState(false);

  const applyCustom = (hhmm: string) => {
    setCustom(hhmm);
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return setErr(true);
    const d = new Date(now);
    d.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
    let ts = d.getTime();
    if (ts > now) ts -= 24 * 3_600_000; // "23:50" entered just after midnight = yesterday
    const ok = now - ts <= 24 * 3_600_000 && Number(m[1]) < 24 && Number(m[2]) < 60;
    setErr(!ok);
    if (ok) onChange(ts);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <RelativeTimePicker
        label={label}
        value={pick}
        onChange={(v) => {
          setPick(v);
          if (v !== 'custom') {
            setErr(false);
            onChange(now - Number(v) * 60_000);
          } else applyCustom(custom);
        }}
      />
      {pick === 'custom' ? (
        <span className="flex items-center gap-2">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder="HH:MM"
            value={custom}
            aria-invalid={err || undefined}
            onChange={(e) => applyCustom(e.target.value)}
            className={cn(
              'h-9 w-[84px] rounded-[10px] border-theme bg-card px-2 text-center text-base tabular-nums',
              err ? 'border-advisory-border' : 'border-card-border hc:border-ink',
            )}
          />
          {err ? <span className="text-sm font-medium text-advisory-text hc:text-advisory-border">{t.entry.errors.custom}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- effect lines */

/** "Effect on ALGOS‑Δ" for a flag — one line per route it acts through (task §3.1-2). */
export function FlagEffect({ flag, className }: { flag: FlagId; className?: string }) {
  const l = useL10n();
  const def = FLAGS[flag];
  return (
    <EffectLine route={def.routes[0] ?? 'measurement'} className={className}>
      {def.routes.length > 1 ? (
        <span className="mr-1 inline-flex gap-0.5 align-[-2px]">
          {def.routes.slice(1).map((r) => (
            <RouteIcon key={r} route={r} size={13} />
          ))}
        </span>
      ) : null}
      {l(def.effect)}
    </EffectLine>
  );
}

/** Route-grouped summary (wizard summary, drawer footer). */
export function EffectsSummary({ effects, compact }: { effects: EffectSet; compact?: boolean }) {
  const t = useT();
  const l = useL10n();
  const groups = groupByRoute(effects.active);
  const routes: Route[] = ['prior', 'measurement', 'baseline'];
  if (effects.active.length === 0) return <p className="text-md text-text-2">{t.entry.noEffects}</p>;
  return (
    <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
      {routes.map((r) => (
        <section key={r} aria-label={t.routes[r]} className="rounded-[16px] border-theme border-card-border p-4 hc:border-ink">
          <h3 className="nowrap flex items-center gap-2 text-md font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-chip-icon text-chip-icon-fg">
              <RouteIcon route={r} size={15} />
            </span>
            {t.routes[r]}
          </h3>
          <p className="mt-1 text-xs text-muted">{t.routes[`${r}Desc`]}</p>
          {groups[r].length === 0 ? (
            <p className="mt-3 text-sm text-muted">—</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {groups[r].map((a) => (
                <li key={`${r}-${a.flag}`} className="text-sm">
                  <p className="font-semibold">{l(FLAGS[a.flag].label)}</p>
                  <p className="text-text-2">{l(FLAGS[a.flag].effect)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/** Compact "Effects active now" chips (profile drawer sticky footer). */
export function EffectChips({ effects }: { effects: EffectSet }) {
  const t = useT();
  const l = useL10n();
  if (!effects.active.length) return <p className="text-sm text-muted">{t.entry.noEffectsNow}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {effects.active.map((a) => (
        <li key={a.flag} title={l(FLAGS[a.flag].effect)} className="nowrap inline-flex h-7 items-center gap-1.5 rounded-full bg-track px-2.5 text-xs font-medium text-text-2 hc:border hc:border-ink hc:text-ink">
          <RouteIcon route={FLAGS[a.flag].routes[0] ?? 'measurement'} size={13} />
          {l(FLAGS[a.flag].short ?? FLAGS[a.flag].label)}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ rule warnings */

/**
 * Amber, specific warning for clinically impossible / unusual combinations (task §3.1-7).
 * block → cannot proceed; confirm → explicit confirmation required.
 */
export function RuleWarnings({
  items,
  onConfirm,
  onCancel,
  confirmLabel,
}: {
  items: Contradiction[];
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
}) {
  const t = useT();
  if (!items.length) return null;
  const blocked = items.some((c) => c.severity === 'block');
  return (
    <div role="alert" className="rounded-[14px] border border-advisory-border/50 bg-advisory-fill p-3.5 text-advisory-text hc:border-2 hc:border-advisory-border hc:text-ink">
      <ul className="flex flex-col gap-1.5">
        {items.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm font-medium">
            <TriangleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {t.entry.contradictions[c.id]}
          </li>
        ))}
      </ul>
      {!blocked && onConfirm ? (
        <div className="mt-3 flex justify-end gap-2">
          {onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t.common.cancel}
            </Button>
          ) : null}
          <Button variant="advisory" size="sm" onClick={onConfirm}>
            {confirmLabel ?? t.entry.confirmAnyway}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Section label with Required / Recommended / Optional marker. */
export function Tier({ tier, children }: { tier: 'required' | 'recommended' | 'optional'; children?: ReactNode }) {
  const t = useT();
  return (
    <span
      className={cn(
        'nowrap inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold',
        tier === 'required' && 'bg-pill-active text-pill-active-fg',
        tier === 'recommended' && 'bg-sky text-ink hc:border hc:border-ink',
        tier === 'optional' && 'bg-track text-text-2 hc:border hc:border-ink',
      )}
    >
      {children ?? t.entry[tier]}
    </span>
  );
}
