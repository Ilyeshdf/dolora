import { useMemo } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { SensorHotspot } from './SensorHotspot';
import { syntheticPath, type Channel } from '@/lib/clinical';

const TRACE: Record<Channel, string> = {
  ppg: 'stroke-trace-ppg',
  eda: 'stroke-trace-eda',
  temp: 'stroke-trace-temp',
  motion: 'stroke-trace-motion',
};

/**
 * Telemetry mini-trace row — A8 sheet 4 §12, inside the dark monitor card.
 * Rejected: overlay pill on the trace, "⊘ Rejected" status (A3).
 */
export function TelemetryRow({
  channel,
  label,
  value,
  state,
  rejectedReason,
  seed = 1,
}: {
  channel: Channel;
  label: string;
  value: string;
  state: 'ok' | 'degraded' | 'rejected' | 'masked';
  rejectedReason?: string;
  seed?: number;
}) {
  const t = useT();
  const path = useMemo(() => syntheticPath(channel, 190, 30, seed, state !== 'ok'), [channel, seed, state]);
  const stateLabel = { ok: t.sensors.ok, degraded: t.sensors.degraded, rejected: t.sensors.rejected, masked: t.sensors.masked }[state];
  return (
    <div className="flex items-center gap-3">
      <div className="w-[118px] shrink-0">
        <p className="nowrap text-xs leading-[14px] text-monitor-muted">{label}</p>
        <p className="nowrap text-md font-bold leading-[22px] text-monitor-fg">{value}</p>
      </div>
      <div className="relative h-[30px] min-w-0 flex-1">
        {state !== 'masked' ? (
          <svg viewBox="0 0 190 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
            <path d={path} fill="none" className={cn(TRACE[channel], state === 'rejected' && 'opacity-30')} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-monitor-line" />
        )}
        {state === 'rejected' && rejectedReason ? (
          <span className="nowrap absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-monitor-fg/40 bg-monitor px-2.5 py-0.5 text-xs font-medium text-monitor-fg">
            {rejectedReason}
          </span>
        ) : null}
      </div>
      <span className="nowrap flex shrink-0 items-center justify-end gap-1.5 text-sm font-medium text-monitor-fg">
        <SensorHotspot state={state === 'ok' ? 'ok' : state} size={14} className="[--card:var(--monitor)]" />
        {stateLabel}
      </span>
    </div>
  );
}
