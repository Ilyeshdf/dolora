import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MessageSquare, RefreshCw, Tag, ZoomIn, Sparkles, Maximize2 } from 'lucide-react';
import { useFormat, useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import type { ChannelView, DriverView, SensorId } from '@/contracts/monitor';
import { SensorHotspot, SensorLegend, type HotspotState } from '@/components/clinical/SensorHotspot';
import { Tooltip } from '@/components/ui/Tooltip';
import { MaskedIcon } from '@/components/clinical/icons';
import { Silhouette } from './Silhouette';
import { SignalCheck } from '@/features/monitor/Calibration';
import { FIGURE_VIEWBOX } from './figure';
import { useCompact } from '@/features/monitor/useCompact';
import { Anatomy3DView } from './Anatomy3D/Anatomy3DView';
import { Anatomy3DStudioDialog } from './Anatomy3D/Anatomy3DStudioDialog';

/*
 * Design canvas = the A1 centre column at 1920×1080: 928 × 830 px. All positions below are
 * measured from A1 in that space; the figure is drawn at 0.70 of the A11 trace.
 */
const DESIGN_W = 928;
const FIG_SCALE = 0.7;
const FIG_LEFT = 255; // design-space x of FIGURE_VIEWBOX.x
const FIG_TOP = 43; // design-space y of FIGURE_VIEWBOX.y

/** Hotspot positions in figure coordinates (A11 trace space). */
const SENSOR_POS: Record<SensorId, { x: number; y: number }> = {
  face: { x: 786, y: 123 },
  breathing: { x: 787, y: 301 },
  motion: { x: 928, y: 577 },
  temp: { x: 964, y: 593 },
  eda: { x: 978, y: 661 },
  ppg: { x: 943, y: 677 },
};

/** Label placement relative to the hotspot (A1/A3/A4). */
const LABEL_SIDE: Record<SensorId, 'left' | 'right' | 'upright'> = {
  face: 'right',
  breathing: 'right',
  motion: 'left',
  temp: 'right',
  eda: 'upright',
  ppg: 'left',
};

/** Callout column per sensor: face/breathing on the left, wrist sensors on the right (A1, A2). */
const CALLOUT_SIDE: Record<SensorId, 'left' | 'right'> = {
  face: 'left',
  breathing: 'left',
  motion: 'right',
  temp: 'right',
  eda: 'right',
  ppg: 'right',
};

const CALLOUT_W = 327;
const CALLOUT_H = 63;
const CALLOUT_GAP = 20;

/** `reserveBottom` = height covered by the floating timeline card. */
export function BodyStage({ reserveBottom = 238 }: { reserveBottom?: number }) {
  const t = useT();
  const view = useView();
  const rail = useMonitor((s) => s.rail);
  const highlight = useMonitor((s) => s.highlight);
  const sensorHighlight = useMonitor((s) => s.sensorHighlight);
  const compact = useCompact();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: DESIGN_W, h: 830 });
  const [bodyMode, setBodyMode] = useState<'3d' | '2d'>('3d');
  const [studioOpen, setStudioOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scale the figure with the column width (never up), keep text at native size.
  const zoom = rail.zoom ? 1.45 : 1;
  const s = Math.min(1, size.w / (compact ? 660 : DESIGN_W), (size.h - reserveBottom - 24) / 470) * zoom;
  const zoomOrigin = rail.zoom ? SENSOR_POS.eda : null;
  const toStage = (p: { x: number; y: number }) => {
    let x = (p.x - FIGURE_VIEWBOX.x) * FIG_SCALE + FIG_LEFT;
    let y = (p.y - FIGURE_VIEWBOX.y) * FIG_SCALE + FIG_TOP;
    x = size.w / 2 + (x - DESIGN_W / 2) * s;
    y = y * s;
    if (zoomOrigin) {
      const o = { x: (zoomOrigin.x - FIGURE_VIEWBOX.x) * FIG_SCALE + FIG_LEFT, y: (zoomOrigin.y - FIGURE_VIEWBOX.y) * FIG_SCALE + FIG_TOP };
      x -= (o.x - DESIGN_W / 2) * (s - s / zoom);
      y -= o.y * (s - s / zoom) - 60;
    }
    return { x, y };
  };
  const figOrigin = toStage({ x: FIGURE_VIEWBOX.x, y: FIGURE_VIEWBOX.y });
  const figW = FIGURE_VIEWBOX.w * FIG_SCALE * s;

  const sensors = (Object.keys(view.channels) as SensorId[]).filter((k) => view.channels[k]);
  const highlightedSensor: SensorId | null = sensorHighlight ?? view.drivers.find((d) => d.id === highlight)?.sensor ?? null;
  const legendStates: HotspotState[] = ['ok', 'degraded', 'rejected'];
  if (sensors.some((k) => view.channels[k]?.state === 'derived')) legendStates.push('derived');
  if (sensors.some((k) => view.channels[k]?.state === 'masked')) legendStates.push('masked');

  const showCallouts = !compact && rail.drivers && !rail.back && view.drivers.length > 0;
  const callouts = showCallouts ? layoutCallouts(view.drivers, (k) => toStage(SENSOR_POS[k]), size.w) : [];

  return (
    <div ref={ref} role="group" aria-label={t.body.stage} className="relative h-full w-full overflow-hidden">
      <FloorGrid />

      {/* Mode Switcher: 3D Muscled Anatomy vs 2D Flat Map */}
      <div className="absolute left-6 top-3 z-20 flex items-center gap-1 rounded-full border border-card-outline bg-card/90 p-1 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => setBodyMode('3d')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition',
            bodyMode === '3d'
              ? 'bg-accent text-accent-contrast shadow-xs'
              : 'text-text-2 hover:bg-subtle hover:text-text-1',
          )}
        >
          <Sparkles size={13} />
          3D Muscled Anatomy
        </button>
        <button
          type="button"
          onClick={() => setBodyMode('2d')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition',
            bodyMode === '2d'
              ? 'bg-accent text-accent-contrast shadow-xs'
              : 'text-text-2 hover:bg-subtle hover:text-text-1',
          )}
        >
          2D Map
        </button>
        <div className="mx-1 h-3.5 w-px bg-card-outline" />
        <button
          type="button"
          onClick={() => setStudioOpen(true)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-accent transition hover:bg-accent/15"
          title="Open Fullscreen 3D Anatomy Studio"
        >
          <Maximize2 size={13} />
          <span className="compact:hidden">3D Studio</span>
        </button>
      </div>

      {/* Body Visualization */}
      {bodyMode === '3d' ? (
        <div
          className="absolute inset-x-0 top-10 flex items-center justify-center overflow-hidden"
          style={{ bottom: reserveBottom - 20 }}
        >
          <Anatomy3DView
            onOpenStudio={() => setStudioOpen(true)}
            compact={compact}
            className="h-full w-full max-w-[680px]"
          />
        </div>
      ) : (
        <>
          <div className="absolute" style={{ left: figOrigin.x, top: figOrigin.y, width: figW }}>
            <Silhouette className="h-auto w-full" />
          </div>

          {rail.back ? (
            <p className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-sm text-text-2 shadow-card">
              {t.body.backView}
            </p>
          ) : null}

          {/* leader lines */}
          {callouts.length > 0 ? (
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {callouts.map((c) => (
                <polyline
                  key={c.driver.id}
                  points={c.leader.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  className="stroke-muted hc:stroke-ink"
                  strokeWidth="1.25"
                />
              ))}
              {callouts.map((c) => {
                const end = c.leader[c.leader.length - 1];
                return end ? (
                  <circle
                    key={`${c.driver.id}-dot`}
                    cx={end.x}
                    cy={end.y}
                    r="2.5"
                    className="fill-muted hc:fill-ink"
                  />
                ) : null;
              })}
            </svg>
          ) : null}

          {/* hotspots + labels */}
          {!rail.back &&
            sensors.map((k) => {
              const ch = view.channels[k] as ChannelView;
              const p = toStage(SENSOR_POS[k]);
              return (
                <Hotspot
                  key={k}
                  sensor={k}
                  channel={ch}
                  x={p.x}
                  y={p.y}
                  highlighted={highlightedSensor === k}
                  showLabel={rail.labels}
                  farLabel={k === 'ppg' && !!ch.note && ch.state !== 'rejected'}
                  stageW={size.w}
                />
              );
            })}
        </>
      )}

      {/* driver callouts (in 2D mode) */}
      {bodyMode === '2d' &&
        callouts.map((c) => (
          <Callout
            key={c.driver.id}
            driver={c.driver}
            x={c.x}
            y={c.y}
            w={c.w}
            highlighted={highlight === c.driver.id || highlightedSensor === c.driver.sensor}
          />
        ))}

      {view.calibrating ? <SignalCheck channels={view.channels} /> : null}
      <ToolRail hasDrivers={view.drivers.length > 0} onOpenStudio={() => setStudioOpen(true)} />
      <SensorLegend states={legendStates} withShapes={false} className="absolute bottom-[262px] left-6 compact:hidden" />

      {/* Fullscreen 3D Anatomy Studio Dialog */}
      <Anatomy3DStudioDialog open={studioOpen} onOpenChange={setStudioOpen} />
    </div>
  );
}

/* ---------------------------------------------------------------------------- helpers */

interface PlacedCallout {
  driver: DriverView;
  w: number;
  x: number;
  y: number;
  leader: { x: number; y: number }[];
}

/** Stack callouts per side, centred on their hotspot when possible (A1: face left, EDA/PPG right). */
function layoutCallouts(drivers: DriverView[], at: (k: SensorId) => { x: number; y: number }, stageW: number): PlacedCallout[] {
  const out: PlacedCallout[] = [];
  const nextFree = { left: -Infinity, right: -Infinity };
  const ordered = [...drivers].sort((a, b) => at(a.sensor).y - at(b.sensor).y);
  for (const d of ordered) {
    const side = CALLOUT_SIDE[d.sensor];
    const h = at(d.sensor);
    let y = Math.max(h.y - CALLOUT_H / 2, nextFree[side]);
    nextFree[side] = y + CALLOUT_H + CALLOUT_GAP;
    const w = side === 'left' ? 309 : CALLOUT_W;
    const x = side === 'left' ? 25 : stageW - 9 - CALLOUT_W;
    const edgeX = side === 'left' ? x + w : x;
    const midY = y + CALLOUT_H / 2;
    const leader =
      Math.abs(midY - h.y) < 6
        ? [h, { x: edgeX, y: h.y }]
        : [h, { x: side === 'left' ? edgeX + 45 : edgeX - 45, y: midY }, { x: edgeX, y: midY }];
    y = Math.round(y);
    out.push({ driver: d, x, y, w, leader });
  }
  return out;
}

function Hotspot({
  sensor,
  channel,
  x,
  y,
  highlighted,
  showLabel,
  farLabel,
  stageW,
}: {
  sensor: SensorId;
  channel: ChannelView;
  x: number;
  y: number;
  highlighted: boolean;
  showLabel: boolean;
  farLabel: boolean;
  stageW: number;
}) {
  const t = useT();
  const l = useL10n();
  const f = useFormat();
  const setHighlight = useMonitor((s) => s.setHighlight);
  const name = sensor === 'breathing' ? t.sensors.breathing : t.sensors[sensor];
  const stateName = { ok: t.sensors.ok, degraded: t.sensors.degraded, rejected: t.sensors.rejected, masked: t.sensors.masked, derived: t.sensors.derived }[channel.state];
  const extras = [
    channel.sqi !== undefined ? t.body.sqi(f.num(channel.sqi, 2)) : '',
    channel.reliability !== undefined ? t.body.reliability(f.num(channel.reliability, 2)) : '',
    channel.note ? l(channel.note) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const label = channel.note ? `${name} · ${l(channel.note)}` : name;
  const size = 22;

  return (
    <>
      <Tooltip
        side="top"
        content={
          <span>
            <span className="font-semibold">{name}</span> · {stateName}
            {extras ? <span className="block opacity-80">{extras}</span> : null}
          </span>
        }
      >
        <button
          type="button"
          aria-label={t.body.hotspot(name, stateName, extras)}
          onMouseEnter={() => setHighlight(null, sensor)}
          onMouseLeave={() => setHighlight(null, null)}
          onFocus={() => setHighlight(null, sensor)}
          onBlur={() => setHighlight(null, null)}
          className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
          style={{ left: x, top: y, width: highlighted ? size * 2.2 : size + 6, height: highlighted ? size * 2.2 : size + 6 }}
        >
          <SensorHotspot state={channel.state} highlighted={highlighted} size={size} />
        </button>
      </Tooltip>
      {sensor === 'motion' && channel.state === 'degraded' ? <MotionWaves x={x} y={y} /> : null}
      {showLabel ? (
        farLabel ? (
          <FarLabel x={x} y={y} stageW={stageW} state={channel.state}>
            {label}
          </FarLabel>
        ) : (
          <HotspotLabel side={LABEL_SIDE[sensor]} x={x} y={y} state={channel.state} gap={sensor === 'face' ? 43 : sensor === 'breathing' ? 20 : 14}>
            {label}
          </HotspotLabel>
        )
      ) : null}
    </>
  );
}

function labelTone(state: HotspotState) {
  return state === 'degraded' ? 'text-advisory-text hc:text-ink' : 'text-ink';
}

function HotspotLabel({ side, x, y, state, gap = 14, children }: { side: 'left' | 'right' | 'upright'; x: number; y: number; state: HotspotState; gap?: number; children: ReactNode }) {
  const pos =
    side === 'right'
      ? { left: x + gap, top: y, transform: 'translateY(-50%)' }
      : side === 'left'
        ? { left: x - 14, top: y, transform: 'translate(-100%, -50%)' }
        : { left: x + 14, top: y - 6, transform: 'translateY(-100%)' };
  return (
    <span
      aria-hidden
      style={pos}
      className={cn(
        'nowrap pointer-events-none absolute inline-flex h-[22px] items-center gap-1 rounded-full bg-card/90 px-2 text-sm font-medium compact:hidden hc:border hc:border-ink',
        labelTone(state),
      )}
    >
      {state === 'masked' ? <MaskedIcon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

/** Long note labels sit in the right column with a leader (A4 "PPG · Reliability 0.28 · beta-blocker"). */
function FarLabel({ x, y, stageW, state, children }: { x: number; y: number; stageW: number; state: HotspotState; children: ReactNode }) {
  const lx = Math.min(x + 83, stageW - 270);
  const ly = y + 73;
  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <polyline points={`${x},${y} ${x + 36},${ly} ${lx},${ly}`} fill="none" className="stroke-muted hc:stroke-ink" strokeWidth="1.25" />
      </svg>
      <span
        aria-hidden
        style={{ left: lx, top: ly }}
        className={cn(
          'nowrap pointer-events-none absolute inline-flex h-[26px] -translate-y-1/2 items-center gap-1.5 rounded-full bg-card px-2.5 text-sm font-medium compact:hidden hc:border hc:border-ink',
          labelTone(state),
        )}
      >
        <SensorHotspot state={state} size={14} />
        {children}
      </span>
    </>
  );
}

function MotionWaves({ x, y }: { x: number; y: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute overflow-visible" style={{ left: x - 30, top: y - 12 }} width="20" height="24">
      <path d="M12 2 Q4 12 12 22" fill="none" className="stroke-sensor-degraded" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 5 Q12 12 18 19" fill="none" className="stroke-sensor-degraded" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Callout({ driver, x, y, w, highlighted }: { driver: DriverView; x: number; y: number; w: number; highlighted: boolean }) {
  const l = useL10n();
  const Arrow = driver.direction === 'up' ? '↑' : '↓';
  return (
    <div
      aria-hidden
      style={{ left: x, top: y, width: w, height: CALLOUT_H }}
      className={cn(
        'absolute flex flex-col justify-center rounded-[16px] border bg-card px-3.5 shadow-card compact:hidden',
        highlighted ? 'border-accent/70 hc:border-2 hc:border-action' : 'border-card-outline hc:border-ink',
      )}
    >
      <p className="nowrap truncate text-base font-semibold leading-6 tracking-[-0.01em]">
        {Arrow} {l(driver.callout.title)}
      </p>
      <p className="nowrap truncate text-sm text-text-2">{l(driver.callout.detail)}</p>
    </div>
  );
}

function ToolRail({ hasDrivers, onOpenStudio }: { hasDrivers: boolean; onOpenStudio?: () => void }) {
  const t = useT();
  const rail = useMonitor((s) => s.rail);
  const toggle = useMonitor((s) => s.toggleRail);
  const items = [
    { key: 'labels' as const, label: t.body.sensorLabels, Icon: Tag },
    { key: 'drivers' as const, label: hasDrivers ? t.body.drivers : t.body.driversNone, Icon: MessageSquare, muted: !hasDrivers },
    { key: 'back' as const, label: t.body.frontBack, Icon: RefreshCw },
    { key: 'zoom' as const, label: t.body.zoom, Icon: ZoomIn },
  ];
  return (
    <div className="absolute right-0 top-3 flex items-start gap-3">
      <ul className="flex flex-col items-end pt-1">
        {items.map((i) => (
          <li key={i.key} className={cn('nowrap flex h-[52px] items-center text-sm compact:hidden', i.muted ? 'text-muted' : 'text-text-2')} aria-hidden>
            {i.label}
          </li>
        ))}
        {onOpenStudio && (
          <li className="nowrap flex h-[52px] items-center text-sm text-accent compact:hidden" aria-hidden>
            3D Studio
          </li>
        )}
      </ul>
      <div className="flex flex-col rounded-full bg-card p-1 shadow-card hc:border-2 hc:border-ink">
        {items.map((i) => {
          const on = rail[i.key] && !(i.key === 'drivers' && !hasDrivers);
          return (
            <button
              key={i.key}
              type="button"
              aria-label={i.label}
              aria-pressed={on}
              disabled={i.key === 'drivers' && !hasDrivers}
              onClick={() => toggle(i.key)}
              className={cn(
                'my-1 grid h-11 w-11 place-items-center rounded-full transition-colors duration-150',
                on ? 'bg-pill-active text-pill-active-fg' : 'text-ink hover:bg-subtle disabled:text-muted',
              )}
            >
              <i.Icon aria-hidden size={20} strokeWidth={1.75} />
            </button>
          );
        })}
        {onOpenStudio && (
          <button
            type="button"
            aria-label="Open 3D Muscled Anatomy Studio"
            onClick={onOpenStudio}
            className="my-1 grid h-11 w-11 place-items-center rounded-full text-accent transition-colors duration-150 hover:bg-accent/15"
          >
            <Sparkles aria-hidden size={19} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Faint perspective floor grid under the figure (§10.1). */
function FloorGrid() {
  const lines = [];
  for (let i = -8; i <= 8; i++) lines.push(<line key={`r${i}`} x1={464 + i * 18} y1={0} x2={464 + i * 160} y2={160} />);
  const rows = [12, 30, 54, 84, 120, 160].map((y) => <line key={`h${y}`} x1={0} y1={y} x2={928} y2={y} />);
  return (
    <svg aria-hidden viewBox="0 0 928 160" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[238px] h-[150px] w-full compact:hidden">
      <g className="stroke-ink/[0.06]" strokeWidth="1">
        {lines}
        {rows}
      </g>
    </svg>
  );
}
