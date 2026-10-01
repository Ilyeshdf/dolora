import { ArrowUp, Clock, Pause } from 'lucide-react';
import { useFormat, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { SeverityTag } from './severity';
import { arousalLevelOf, severityOf } from '@/lib/clinical';


// Arc geometry (A1): ~200° sweep, open at the bottom; interval drawn as a thin outer arc.
const SWEEP = 200;
// SVG angles run clockwise from 3 o'clock; start at lower-left so the gap is centred at the bottom.
const START = 90 + (360 - SWEEP) / 2;
const CX = 74;
const CY = 76;
const R = 60;
const W = 14;

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}
/** Arc from fraction a to b (0–1 of the sweep) at radius r. */
function arc(a: number, b: number, r = R) {
  const s = polar(START + SWEEP * a, r);
  const e = polar(START + SWEEP * b, r);
  const large = SWEEP * (b - a) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

interface ArcGaugeProps {
  kind: 'arousal' | 'pain';
  value: number | null;
  /** Pain: upper interval bound shown as a lighter extension (A1). */
  hi?: number;
  label: string;
  paused?: boolean;
}

/** Hand-written SVG arc gauge (spec: no chart lib for gauges). */
export function ArcGauge({ kind, value, hi, label, paused }: ArcGaugeProps) {
  const t = useT();
  const f = useFormat();
  const max = kind === 'arousal' ? 4 : 10;
  const frac = value === null ? 0 : Math.min(1, Math.max(0, value / max));
  const hiFrac = hi === undefined ? frac : Math.min(1, Math.max(frac, hi / max));
  const showValue = !paused && value !== null;
  const level = kind === 'arousal' && value !== null ? arousalLevelOf(value) : null;
  const levelText = level === 'HIGH' ? t.arousal.high : level === 'MODERATE' ? t.arousal.moderate : t.arousal.low;

  return (
    <figure className="flex w-[170px] flex-col items-center">
      <div className="relative h-[100px] w-[148px]">
        <svg viewBox="0 0 148 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <path d={arc(0, 1)} fill="none" stroke="rgb(var(--card))" strokeWidth={W} strokeLinecap="round" className="hc:[stroke:rgb(var(--band))]" />
          {showValue && kind === 'pain' && hiFrac > frac ? (
            <path d={arc(frac, hiFrac, R + 13)} fill="none" stroke="rgb(var(--band))" strokeWidth={5} strokeLinecap="round" />
          ) : null}
          {showValue && frac > 0 ? (
            <path
              d={arc(0, frac)}
              fill="none"
              stroke={kind === 'arousal' ? 'rgb(var(--arousal))' : 'rgb(var(--ink))'}
              strokeWidth={W}
              strokeLinecap="round"
              className={kind === 'arousal' ? 'hc:[stroke-dasharray:3_3] hc:[stroke-linecap:butt]' : undefined}
            />
          ) : null}
          {kind === 'arousal' ? (
            // Tick at the HIGH threshold (z = 2) — top centre.
            <line x1={CX} y1={CY - R - 14} x2={CX} y2={CY - R - 4} stroke="rgb(var(--ink))" strokeOpacity=".7" strokeWidth="1.5" />
          ) : null}
        </svg>
        <div className="absolute inset-x-0 top-[46px] flex items-baseline justify-center font-bold">
          {showValue ? (
            <>
              {kind === 'arousal' && <span className="mr-0.5 text-lg font-semibold text-text-2">z</span>}
              <span className="text-gauge">{f.num(value)}</span>
              {kind === 'pain' && <span className="ml-0.5 text-base font-normal text-text-2">/10</span>}
            </>
          ) : (
            <span aria-hidden className="mt-4 block h-1 w-8 rounded-full bg-muted/70" />
          )}
        </div>
      </div>
      <figcaption className="nowrap mt-1 text-base font-medium">{label}</figcaption>
      <div className="mt-2 h-8">
        {showValue && kind === 'arousal' ? (
          <span className="nowrap inline-flex h-8 items-center gap-1 rounded-full bg-card px-3 text-sm font-semibold hc:border-2 hc:border-ink">
            {level === 'HIGH' ? <ArrowUp aria-hidden size={14} strokeWidth={2.25} /> : null}
            {levelText}
          </span>
        ) : null}
        {showValue && kind === 'pain' && value !== null ? <SeverityTag severity={severityOf(value)} /> : null}
      </div>
    </figure>
  );
}

/** "Arousal vs pain" pastel-sky card (A1/A2/A3/A4/A9). */
export function ArousalPainCard({
  z,
  pain,
  hi,
  notEqual,
  state = 'live',
  className,
}: {
  z: number | null;
  pain: number | null;
  hi?: number;
  notEqual?: boolean;
  state?: 'live' | 'paused' | 'waiting';
  className?: string;
}) {
  const t = useT();
  const inactive = state !== 'live';
  return (
    <Card tone="sky" padding="none" className={cn('flex flex-col px-8 pb-6 pt-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="nowrap text-xl font-semibold">{t.arousal.title}</h2>
        {state === 'paused' ? (
          <span className="nowrap inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-medium hc:border-2 hc:border-ink">
            <Pause aria-hidden size={14} strokeWidth={1.75} />
            {t.arousal.paused}
          </span>
        ) : null}
        {state === 'waiting' ? (
          <span className="nowrap inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-medium hc:border-2 hc:border-ink">
            <Clock aria-hidden size={14} strokeWidth={1.75} />
            {t.arousal.waiting}
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex items-start justify-between">
        <ArcGauge kind="arousal" value={inactive ? null : z} label={t.arousal.autonomic} paused={inactive} />
        {notEqual && !inactive ? (
          <span className="mt-10 text-4xl font-bold text-text-2" aria-label={t.arousal.notEqual}>
            ≠
          </span>
        ) : null}
        <ArcGauge kind="pain" value={inactive ? null : pain} hi={hi} label={t.arousal.pain} paused={inactive} />
      </div>
      <p className="mt-auto pt-3 text-sm leading-[22px] text-text-2">{t.arousal.caption}</p>
    </Card>
  );
}
