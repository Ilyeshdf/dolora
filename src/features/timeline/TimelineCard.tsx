import { useMemo, type ReactNode } from 'react';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFormat, useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Form';
import { AbstentionGlyph, AlertTriangleGlyph, DiamondGlyph } from '@/components/clinical/TimelineMarkers';
import type { TimelineView } from '@/contracts/monitor';
import { useCompact } from '@/features/monitor/useCompact';

type Row = { t: number; pain: number | null; band: [number, number] | null; z: number | null };

const C = {
  ink: 'rgb(var(--ink))',
  band: 'rgb(var(--band))',
  arousal: 'rgb(var(--arousal))',
  butter: 'rgb(var(--event-region))',
  alert: 'rgb(var(--alert))',
  muted: 'rgb(var(--muted))',
  text2: 'rgb(var(--text-2))',
  card: 'rgb(var(--card))',
};

/**
 * Floating timeline card (A1–A4). recharts for the series; markers are recharts reference
 * elements with custom SVG shapes. Interval band = grey, always (§18-2). Red only for alert
 * triangles (D-6); HC turns them yellow via the --alert token.
 */
export function TimelineCard({ className }: { className?: string }) {
  const t = useT();
  const l = useL10n();
  const f = useFormat();
  const tl = useMonitor((s) => s.view.timeline);
  const mode = useMonitor((s) => s.view.mode);
  const windowMin = useMonitor((s) => s.windowMin);
  const setWindow = useMonitor((s) => s.setWindow);
  const compare = useMonitor((s) => s.compareModes);
  const setCompare = useMonitor((s) => s.setCompare);

  const from = tl.now - windowMin * 60_000;
  const rows: Row[] = useMemo(
    () =>
      tl.samples
        .filter((s) => s.t >= from && s.t <= tl.now)
        .map((s) => ({ t: s.t, pain: s.pain, band: s.lo !== null && s.hi !== null ? [s.lo, s.hi] : null, z: s.z })),
    [tl.samples, from, tl.now],
  );
  const ticks = useMemo(() => xTicks(from, tl.now, windowMin), [from, tl.now, windowMin]);
  const last = [...rows].reverse().find((r) => r.pain !== null);
  const inWin = (x: number) => x >= from && x <= tl.now;
  const ghosts = compare ? ghostsFor(tl, mode) : [];
  const otherMode = mode === 'ICU' ? t.mode.ward : t.mode.icu;

  const hasEvent = tl.regions.find((r) => r.kind === 'event' && r.to >= from);
  const hasAbst = tl.regions.some((r) => r.kind === 'abstention');
  const hasRefs = tl.references.some((r) => inWin(r.t)) || !!tl.beforeWindow;
  const hasAlert = tl.alerts.some((a) => inWin(a.t));
  const ack = tl.alerts.some((a) => a.acknowledged);
  const hasCtx = tl.contextEvents.some((e) => inWin(e.t));
  const compact = useCompact();
  const crowded = compact || [hasEvent, hasAbst, hasRefs, hasAlert, hasCtx, compare].filter(Boolean).length >= (f.lang === 'fr' ? 3 : 4);

  return (
    <section
      aria-labelledby="tl-title"
      className={cn('flex flex-col rounded-card border-theme border-card-outline bg-card px-6 pb-5 pt-5 shadow-card compact:pb-3 compact:pt-4', className)}
    >
      <div className="flex items-center gap-4">
        <h2 id="tl-title" className="nowrap text-xl font-semibold">
          {t.timeline.windowTitle(windowMin)}
        </h2>
        <div className="ml-auto flex items-center gap-3">
          <Segmented<'5' | '10' | '30'>
            aria-label={t.timeline.windowTitle(windowMin)}
            size="sm"
            value={String(windowMin) as '5' | '10' | '30'}
            onChange={(v) => setWindow(Number(v) as 5 | 10 | 30)}
            options={[
              { value: '5', label: '5' },
              { value: '10', label: '10' },
              { value: '30', label: '30' },
            ]}
          />
          <span className="text-sm text-muted">{t.common.min}</span>
          <label className="nowrap ml-3 flex items-center gap-2.5 text-md font-medium compact:hidden">
            <Switch checked={compare} onCheckedChange={setCompare} aria-label={t.timeline.compare} />
            {t.timeline.compare}
          </label>
        </div>
      </div>

      <div className="relative -mt-1 h-[112px] min-h-0 flex-1" role="img" aria-label={t.timeline.chart(windowMin)}>
        <svg aria-hidden className="absolute h-0 w-0">
          <defs>
            <pattern id="tl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={C.card} />
              <line x1="0" y1="0" x2="0" y2="6" stroke={C.band} strokeWidth="2.2" />
            </pattern>
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 18, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[from, tl.now]}
              ticks={ticks}
              tickFormatter={(v: number) => (v === tl.now ? t.common.now : fmtTime(v, false))}
              tick={<XTick now={tl.now} />}
              axisLine={false}
              tickLine={false}
              height={20}
              allowDataOverflow
            />
            <YAxis yAxisId="p" domain={[0, 10]} ticks={[0, 4, 10]} width={26} axisLine={false} tickLine={false} tick={{ fill: C.text2, fontSize: 13 }} />
            <YAxis
              yAxisId="z"
              orientation="right"
              domain={[-0.6, 4.6]}
              ticks={[0, 2, 4]}
              tickFormatter={(v: number) => `z${v}`}
              width={30}
              axisLine={false}
              tickLine={false}
              tick={{ fill: C.arousal, fontSize: 13 }}
            />

            {tl.regions
              .filter((r) => r.to >= from)
              .map((r) => (
                <ReferenceArea
                  key={`${r.kind}-${r.from}`}
                  yAxisId="p"
                  x1={Math.max(r.from, from)}
                  x2={Math.min(r.to, tl.now)}
                  y1={0}
                  y2={10}
                  fill={r.kind === 'event' ? C.butter : 'url(#tl-hatch)'}
                  fillOpacity={r.kind === 'event' ? 0.85 : 1}
                  stroke={r.kind === 'abstention' ? C.band : 'var(--event-stroke)'}
                  ifOverflow="hidden"
                  label={<RegionLabel text={l(r.label)} kind={r.kind} />}
                />
              ))}

            <ReferenceLine yAxisId="p" y={4} stroke={C.muted} strokeDasharray="2 3" strokeOpacity={0.7} />

            <Area yAxisId="p" dataKey="band" stroke="none" fill={C.band} fillOpacity={0.75} isAnimationActive={false} connectNulls={false} />
            <Line yAxisId="z" dataKey="z" stroke={C.arousal} strokeWidth={1.75} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls={false} />
            <Line yAxisId="p" dataKey="pain" stroke={C.ink} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} />

            {tl.contextEvents.filter((e) => inWin(e.t)).map((e) => (
              <ReferenceLine key={`ce-${e.t}`} yAxisId="p" x={e.t} stroke={C.ink} strokeDasharray="3 3" label={<TopLabel text={l(e.label)} />} />
            ))}

            {tl.alerts.filter((a) => inWin(a.t)).map((a) => (
              <ReferenceLine
                key={`al-${a.t}`}
                yAxisId="p"
                x={a.t}
                stroke={C.ink}
                strokeOpacity={0.6}
                strokeDasharray="2 3"
                label={<TriangleLabel text={compare ? t.timeline.modeAlert(mode === 'ICU' ? t.mode.icu : t.mode.ward) : a.acknowledged ? '' : `${l(a.label)}`} />}
              />
            ))}

            {ghosts.filter(inWin).map((g) => (
              <ReferenceLine key={`gh-${g}`} yAxisId="p" x={g} stroke={C.text2} strokeDasharray="2 3" strokeOpacity={0.6} label={<TriangleLabel ghost text={t.timeline.wouldAlert(otherMode)} />} />
            ))}

            {tl.references.filter((r) => inWin(r.t)).map((r) => (
              <ReferenceDot
                key={`ref-${r.t}`}
                yAxisId="p"
                x={r.t}
                y={Math.min(10, r.scale === 'CPOT' ? (r.value * 10) / 8 : r.scale === 'BPS' ? ((r.value - 3) * 10) / 9 : r.value)}
                shape={<Diamond label={`${r.scale} ${r.value} · ${fmtTime(r.t)}`} />}
              />
            ))}

            {tl.beforeWindow && rows[0] ? (
              <ReferenceDot
                yAxisId="p"
                x={rows[0].t}
                y={Math.min(10, (tl.beforeWindow.value * 10) / 8)}
                shape={
                  <Diamond
                    edge
                    label={`‹ ${t.timeline.beforeWindow(tl.beforeWindow.scale, tl.beforeWindow.value, tl.beforeWindow.time, tl.beforeWindow.agoMin)}`}
                  />
                }
              />
            ) : null}

            {tl.annotation && last ? (
              <ReferenceLine yAxisId="p" x={tl.annotation.from + (tl.annotation.to - tl.annotation.from) * 0.97} stroke="none" label={<Bracket text={l(tl.annotation.text)} pain={last.pain ?? 0} z={last.z ?? 0} />} />
            ) : null}

            {last && last.t >= tl.now - 15_000 && last.pain !== null ? (
              <ReferenceDot yAxisId="p" x={last.t} y={last.pain} r={4.5} fill={C.ink} stroke={C.card} strokeWidth={1.5} />
            ) : null}

            <RTooltip
              cursor={{ stroke: C.ink, strokeOpacity: 0.35, strokeWidth: 1 }}
              isAnimationActive={false}
              content={<ChartTip />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="nowrap mt-1 flex items-center gap-5 overflow-hidden text-sm text-text-2 compact:flex-wrap compact:gap-x-3 compact:gap-y-0.5 compact:text-xs">
        <Legend glyph={<span className="h-[3px] w-5 rounded-full bg-ink" />}>{t.timeline.painEstimate}</Legend>
        <Legend glyph={<span className="h-2.5 w-5 rounded-full bg-band" />}>{t.timeline.interval}</Legend>
        <Legend glyph={<span className="w-5 border-t-2 border-dashed border-arousal" />}>{crowded ? t.timeline.arousalShort : t.timeline.arousal}</Legend>
        {hasEvent ? <Legend glyph={<span className="h-3.5 w-5 rounded-[3px] bg-event-region hc:border hc:border-ink" />}>{l(hasEvent.label)}</Legend> : null}
        {hasCtx ? <Legend glyph={<span className="h-4 border-l-2 border-dotted border-ink" />}>{t.timeline.contextEvent}</Legend> : null}
        {hasRefs ? <Legend glyph={<DiamondGlyph className="h-4 w-4" />}>{crowded ? t.timeline.assessment : t.timeline.manualAssessment}</Legend> : null}
        {hasAlert ? (
          <Legend glyph={<AlertTriangleGlyph className="h-5 w-3.5" />}>
            {compare ? t.timeline.modeAlert(mode === 'ICU' ? t.mode.icu : t.mode.ward) : ack ? t.timeline.alertAck : t.timeline.alert}
          </Legend>
        ) : null}
        {compare ? <Legend glyph={<AlertTriangleGlyph ghost className="h-5 w-3.5" />}>{t.timeline.wouldAlert(otherMode)}</Legend> : null}
        {hasAbst ? <Legend glyph={<AbstentionGlyph className="h-3.5 w-5" />}>{t.timeline.abstentionLegend}</Legend> : null}
      </ul>
      <span className="sr-only">{last?.pain !== null && last?.pain !== undefined ? `${t.timeline.tipPain} ${f.num(last.pain)}` : ''}</span>
    </section>
  );
}

/* ------------------------------------------------------------------------- pieces */

function Legend({ glyph, children }: { glyph: ReactNode; children: ReactNode }) {
  return (
    <li className="flex shrink-0 items-center gap-2">
      <span aria-hidden className="flex w-5 items-center justify-center">
        {glyph}
      </span>
      {children}
    </li>
  );
}

function xTicks(from: number, now: number, windowMin: number): number[] {
  const step = (windowMin === 5 ? 1 : windowMin === 10 ? 2 : 5) * 60_000;
  const out: number[] = [];
  for (let x = Math.ceil(from / step) * step; x < now - step * 0.45; x += step) if (x > from + step * 0.25) out.push(x);
  out.push(now);
  return out;
}

/** Alerts the other mode would have raised (A10 compare). Fixture-level approximation (D-45). */
function ghostsFor(tl: TimelineView, mode: 'ICU' | 'WARD'): number[] {
  if (tl.ghosts.length) return tl.ghosts.map((g) => g.t);
  // Ward fires later than ICU (lower bound for 60 s); ICU fires earlier than Ward.
  return tl.alerts.map((a) => (mode === 'WARD' ? a.t - 70_000 : a.t + 70_000));
}

type VB = { x?: number; y?: number; width?: number; height?: number };
interface LabelProps {
  viewBox?: VB;
}

function XTick(props: { x?: number; y?: number; payload?: { value: number }; now: number }) {
  const t = useT();
  const { x = 0, y = 0, payload, now } = props;
  if (!payload) return null;
  const isNow = payload.value === now;
  return (
    <text x={x} y={y + 12} textAnchor={isNow ? 'end' : 'middle'} fontSize={13} fontWeight={isNow ? 700 : 400} fill={isNow ? C.ink : C.text2}>
      {isNow ? t.common.now : fmtTime(payload.value, false)}
    </text>
  );
}

function RegionLabel({ viewBox, text, kind }: LabelProps & { text: string; kind: 'event' | 'abstention' }) {
  const { x = 0, y = 0, width = 0 } = viewBox ?? {};
  if (kind === 'abstention') {
    return (
      <text x={x + width - 6} y={y - 8} textAnchor="end" fontSize={13} fontWeight={600} fill={C.ink}>
        {text}
      </text>
    );
  }
  return (
    <text x={x + 8} y={y + 30} fontSize={14} fontWeight={500} fill={C.text2}>
      {text}
    </text>
  );
}

function TopLabel({ viewBox, text }: LabelProps & { text: string }) {
  const { x = 0, y = 0 } = viewBox ?? {};
  return (
    <text x={x + 6} y={y + 12} fontSize={13} fontWeight={600} fill={C.ink}>
      {text}
    </text>
  );
}

function TriangleLabel({ viewBox, text, ghost }: LabelProps & { text: string; ghost?: boolean }) {
  const { x = 0, y = 0 } = viewBox ?? {};
  return (
    <g>
      <path
        d={`M ${x - 6} ${y - 14} L ${x + 6} ${y - 14} L ${x} ${y - 5} Z`}
        fill={ghost ? 'none' : C.alert}
        stroke={ghost ? C.text2 : C.alert}
        strokeDasharray={ghost ? '2 1.5' : undefined}
        strokeWidth={1.4}
      />
      {text ? (
        <text x={x - 10} y={y + 12} textAnchor="end" fontSize={13} fontWeight={600} fill={C.ink}>
          {text}
        </text>
      ) : null}
    </g>
  );
}

function Diamond(props: { cx?: number; cy?: number; label: string; edge?: boolean }) {
  const { cx = 0, cy = 0, label, edge } = props;
  const d = 6.5;
  return (
    <g>
      <path d={`M ${cx} ${cy - d} L ${cx + d} ${cy} L ${cx} ${cy + d} L ${cx - d} ${cy} Z`} fill={C.card} stroke={C.ink} strokeWidth={1.75} />
      {edge ? (
        // Off-window reference: label sits on its own row above the threshold line (no overlap, D-0).
        <g>
          <rect x={cx + 10} y={cy - 40} width={label.length * 6.6} height={18} rx={4} fill={C.card} opacity={0.92} />
          <text x={cx + 14} y={cy - 27} fontSize={13} fill={C.text2}>
            {label}
          </text>
        </g>
      ) : (
        <text x={cx + 10} y={cy + 22} fontSize={13} fontWeight={600} fill={C.ink}>
          {label}
        </text>
      )}
    </g>
  );
}

/** "Arousal ≠ Pain" bracket between the pain line and the arousal line (A2). */
function Bracket({ viewBox, text, pain, z }: LabelProps & { text: string; pain: number; z: number }) {
  const { x = 0, y = 0, height = 0 } = viewBox ?? {};
  const yPain = y + height * (1 - pain / 10);
  const yZ = y + height * (1 - (z + 0.6) / 5.2);
  const top = Math.min(yPain, yZ);
  const bot = Math.max(yPain, yZ);
  return (
    <g>
      <path d={`M ${x - 4} ${top} H ${x} V ${bot} H ${x - 4}`} fill="none" stroke={C.ink} strokeWidth={1.4} />
      <text x={x - 10} y={(top + bot) / 2 + 4} textAnchor="end" fontSize={13} fontWeight={700} fill={C.ink}>
        {text}
      </text>
    </g>
  );
}

function ChartTip(props: { active?: boolean; payload?: { payload: Row }[] }) {
  const t = useT();
  const f = useFormat();
  const row = props.active ? props.payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-tip bg-tooltip px-3 py-2 text-xs leading-5 text-tooltip-fg shadow-card">
      <p className="font-semibold">{fmtTime(row.t)}</p>
      {row.pain === null ? (
        <p>{t.timeline.tipRejected}</p>
      ) : (
        <>
          <p>
            {t.timeline.tipPain} {f.num(row.pain)}
            {row.band ? ` · ${t.timeline.tipInterval} ${f.num(row.band[0])} – ${f.num(row.band[1])}` : ''}
          </p>
          {row.z !== null ? (
            <p>
              {t.timeline.tipArousal} z {f.num(row.z)}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
