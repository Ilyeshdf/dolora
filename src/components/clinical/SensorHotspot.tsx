import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export type HotspotState = 'ok' | 'degraded' | 'rejected' | 'masked' | 'derived';

/**
 * Sensor hotspot — A8 sheet 2 §05 / D-31. Shape carries the state; colour reinforces it.
 * OK filled ring · Degraded half ring · Rejected crossed point · Masked dashed + slash-lock ·
 * Derived diamond · Highlighted = hover halo.
 */
export function SensorHotspot({
  state,
  highlighted,
  size = 22,
  className,
}: {
  state: HotspotState;
  highlighted?: boolean;
  size?: number;
  className?: string;
}) {
  const box = highlighted ? size * 2.2 : size;
  const o = (box - 22) / 2; // offset to centre the 22-unit glyph
  return (
    <svg aria-hidden width={box} height={box} viewBox={`${-o} ${-o} ${box} ${box}`} className={cn('shrink-0 overflow-visible', className)}>
      {highlighted ? (
        <circle cx="11" cy="11" r={box / 2 - 1} className="fill-sensor-ok/20 stroke-sensor-ok/30 hc:fill-transparent hc:stroke-action" strokeWidth="1.5" />
      ) : null}
      {state === 'ok' && (
        <>
          <circle cx="11" cy="11" r="8.5" className="fill-card stroke-sensor-ok" strokeWidth="2" />
          <circle cx="11" cy="11" r="3.6" className="fill-sensor-ok" />
        </>
      )}
      {state === 'degraded' && (
        <>
          <circle cx="11" cy="11" r="8.5" className="fill-card stroke-sensor-degraded/25" strokeWidth="2" />
          <path d="M11 2.5 A8.5 8.5 0 0 1 11 19.5" fill="none" className="stroke-sensor-degraded" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="11" cy="11" r="3.6" className="fill-sensor-degraded" />
        </>
      )}
      {state === 'rejected' && (
        <>
          <circle cx="11" cy="11" r="8" className="fill-card stroke-sensor-rejected" strokeWidth="2" />
          <path d="M5.4 16.6 L16.6 5.4" className="stroke-sensor-rejected" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {state === 'masked' && (
        <g fill="none" className="stroke-muted hc:stroke-ink" strokeLinecap="round">
          <circle cx="11" cy="11" r="9" className="fill-card" strokeWidth="1.5" strokeDasharray="2.6 2.4" />
          <rect x="7.4" y="10" width="7.2" height="5.2" rx="1" strokeWidth="1.4" />
          <path d="M8.8 10 V8.6 a2.2 2.2 0 0 1 4.4 0 V10" strokeWidth="1.4" />
          <path d="M6.5 15.8 L15.5 6.8" strokeWidth="1.4" />
        </g>
      )}
      {state === 'derived' && (
        <path d="M11 3 L19 11 L11 19 L3 11 Z" className="fill-card stroke-ink" strokeWidth="1.75" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Sensor legend — title on its own row so it never overlaps "OK" (D-0). */
export function SensorLegend({
  states = ['ok', 'degraded', 'rejected'],
  withShapes,
  className,
}: {
  states?: HotspotState[];
  /** HC variant spells out the shape ("OK · filled ring"). */
  withShapes?: boolean;
  className?: string;
}) {
  const t = useT();
  const label: Record<HotspotState, string> = {
    ok: t.sensors.ok,
    degraded: t.sensors.degraded,
    rejected: t.sensors.rejected,
    masked: t.sensors.maskedByContext,
    derived: t.sensors.derived,
  };
  const shape: Record<HotspotState, string> = {
    ok: t.sensors.okShape,
    degraded: t.sensors.degradedShape,
    rejected: t.sensors.rejectedShape,
    masked: t.sensors.maskedShape,
    derived: t.sensors.derivedShape,
  };
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="nowrap text-sm font-medium text-text-2">{withShapes ? t.sensors.state : t.sensors.reliability}</p>
      <ul className="flex flex-col gap-1.5">
        {states.map((s) => (
          <li key={s} className="nowrap flex items-center gap-2 text-sm text-text-2">
            <SensorHotspot state={s} size={16} />
            {label[s]}
            {withShapes ? <span className="text-muted">· {shape[s].toLowerCase()}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
