import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { mulberry32 } from '@/lib/prng';
import { Footer } from '@/components/ui/Brand';
import { Header } from '@/features/header/Header';
import { AssessmentDialog } from '@/features/cpot/AssessmentDialog';
import { AuditDrawer } from '@/features/audit/AuditDrawer';
import { useCompact } from '@/features/monitor/useCompact';
import { Dot } from '@/components/ui/StatusPill';
import { RouteIcon } from '@/components/ui/RouteIcon';
import { ArrowRight, AlertTriangle, Anchor } from 'lucide-react';

/* ── Sparkline component ─────────────────────────────────────────── */
function Sparkline({
  seed,
  pain,
  status,
}: {
  seed: number;
  pain: number | null;
  status: string;
}) {
  const rnd = mulberry32(seed);
  const pts: number[] = [];
  const count = 32;
  let v = pain ?? 2.0;

  for (let i = 0; i < count; i++) {
    // Bed 4 has an upward rise at the end (episode)
    if (seed === 42 && i > 22) {
      v = Math.min(6.4, v + 0.35 + (rnd() - 0.4) * 0.2);
    } else if (seed === 7 && i > 12) {
      // Bed 7 rises then stays flat before sensor drop
      v = Math.min(3.8, v + 0.2);
    } else {
      v = Math.max(0.5, Math.min(9.5, v + (rnd() - 0.5) * 0.3));
    }
    pts.push(v);
  }

  // Force the last point to match the painScore if available
  if (pain != null) {
    pts[pts.length - 1] = pain;
  }

  const w = 320;
  const h = 32;
  const toY = (val: number) => {
    // Map 0..10 to h-4 .. 4
    return h - 4 - ((val / 10) * (h - 8));
  };

  if (status === 'CALIBRATING') {
    return (
      <div className="relative flex h-8 w-full items-center">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
          <line
            x1="0"
            y1={h / 2}
            x2={w * 0.72}
            y2={h / 2}
            stroke="rgb(var(--muted))"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity={0.4}
          />
        </svg>
        <div
          className="absolute right-0 top-0 flex h-full w-[26%] items-center justify-center rounded bg-sky/60 px-1 text-center text-[10px] font-medium leading-tight text-text-2"
        >
          Trend starts after calibration
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    // Hatched abstention on right 30%
    const validCount = Math.floor(count * 0.68);
    const validPts = pts.slice(0, validCount);
    const cutX = w * 0.68;
    const d = validPts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (validCount - 1)) * cutX},${toY(p)}`)
      .join(' ');

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
        <defs>
          <pattern id={`hatch-${seed}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--band))" strokeWidth="2" />
          </pattern>
        </defs>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-ink" />
        <rect x={cutX} y={2} width={w - cutX} height={h - 4} fill={`url(#hatch-${seed})`} opacity={0.6} />
      </svg>
    );
  }

  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * w},${toY(p)}`)
    .join(' ');
  const lastY = toY(pts[pts.length - 1] ?? 0);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-ink" />
      <circle cx={w - 2} cy={lastY} r={2.5} fill="currentColor" className="text-ink" />
    </svg>
  );
}

/* ── Calibration ring ────────────────────────────────────────────── */
function CalibrationRing({ elapsed, total }: { elapsed: number; total: number }) {
  const frac = Math.min(1, elapsed / total);
  const r = 20, cx = 25, cy = 25, circ = 2 * Math.PI * r;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const label = `${mins}:${String(secs).padStart(2, '0')}`;
  const totalLabel = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3">
      <svg width={50} height={50} viewBox="0 0 50 50" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--track))" strokeWidth={4} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div>
        <p className="text-2xl font-bold leading-none text-ink tabular">{label}</p>
        <p className="mt-1 text-xs text-muted">of {totalLabel}</p>
      </div>
    </div>
  );
}

/* ── Severity helper ─────────────────────────────────────────────── */
function severityLabel(score: number | null): { text: string; color: string } | null {
  if (score == null) return null;
  if (score < 4) return { text: 'Mild', color: '#16a34a' }; // Green
  if (score < 7) return { text: 'Moderate', color: '#d97706' }; // Amber
  return { text: 'Severe', color: '#dc2626' }; // Red
}

/* ── Bed data ────────────────────────────────────────────────────── */
interface BedData {
  bedId: number;
  patientRef: string;
  description: string;
  painScore: number | null;
  lo: number | null;
  hi: number | null;
  status: 'OK' | 'DEGRADED' | 'REJECTED' | 'CALIBRATING';
  alertKind: 'none' | 'alert' | 'advisory-unavailable' | 'advisory-nmb';
  context: { label: string; kind: 'persistent' | 'timed'; remaining?: string; route: 'prior' | 'measurement' | 'baseline' }[];
  seed: number;
  priority: number;
}

const BEDS: BedData[] = [
  {
    bedId: 4,
    patientRef: 'P-7F3A',
    description: 'Post-op day 1 · ventilated',
    painScore: 6.4,
    lo: 4.3,
    hi: 8.1,
    status: 'OK',
    alertKind: 'alert',
    context: [
      { label: 'Ventilated', kind: 'persistent', route: 'measurement' },
      { label: 'Suction 1:24', kind: 'timed', remaining: '1:24', route: 'prior' },
    ],
    seed: 42,
    priority: 0,
  },
  {
    bedId: 7,
    patientRef: 'P-2C91',
    description: 'Trauma · day 3',
    painScore: null,
    lo: null,
    hi: null,
    status: 'REJECTED',
    alertKind: 'advisory-unavailable',
    context: [{ label: 'Ventilated', kind: 'persistent', route: 'measurement' }],
    seed: 7,
    priority: 1,
  },
  {
    bedId: 2,
    patientRef: 'P-5D07',
    description: 'Septic shock · day 2',
    painScore: 5.2,
    lo: 2.9,
    hi: 7.8,
    status: 'DEGRADED',
    alertKind: 'advisory-nmb',
    context: [
      { label: 'NMB', kind: 'persistent', route: 'measurement' },
      { label: 'β-blocker', kind: 'persistent', route: 'measurement' },
      { label: 'Norepi.', kind: 'persistent', route: 'measurement' },
    ],
    seed: 23,
    priority: 2,
  },
  {
    bedId: 9,
    patientRef: 'P-9A06',
    description: 'Post-op day 0 · just admitted',
    painScore: null,
    lo: null,
    hi: null,
    status: 'CALIBRATING',
    alertKind: 'none',
    context: [],
    seed: 9,
    priority: 3,
  },
  {
    bedId: 6,
    patientRef: 'P-6F28',
    description: 'Post-op day 1',
    painScore: 2.6,
    lo: 1.2,
    hi: 3.9,
    status: 'OK',
    alertKind: 'none',
    context: [],
    seed: 6,
    priority: 4,
  },
  {
    bedId: 3,
    patientRef: 'P-8B13',
    description: 'Post-op day 3',
    painScore: 2.1,
    lo: 0.9,
    hi: 3.4,
    status: 'OK',
    alertKind: 'none',
    context: [],
    seed: 3,
    priority: 5,
  },
  {
    bedId: 1,
    patientRef: 'P-1A42',
    description: 'Cardiac surgery · day 2',
    painScore: 1.6,
    lo: 0.5,
    hi: 2.9,
    status: 'OK',
    alertKind: 'none',
    context: [{ label: 'Ventilated', kind: 'persistent', route: 'measurement' }],
    seed: 1,
    priority: 6,
  },
  {
    bedId: 5,
    patientRef: 'P-3E60',
    description: 'Pneumonia · day 5',
    painScore: 1.2,
    lo: 0.3,
    hi: 2.4,
    status: 'OK',
    alertKind: 'none',
    context: [],
    seed: 5,
    priority: 7,
  },
];

/* ── Bed card ────────────────────────────────────────────────────── */
function BedCard({ bed }: { bed: BedData }) {
  const navigate = useNavigate();
  const hasAlert = bed.alertKind === 'alert';
  const sev = severityLabel(bed.painScore);

  return (
    <div
      className={cn(
        'group flex cursor-pointer flex-col justify-between rounded-[20px] border border-card-border bg-card p-5 shadow-sm transition-all',
        'hover:border-ink/20 hover:shadow-md min-h-[290px]',
        hasAlert && 'ring-2 ring-[rgb(var(--alert))] border-transparent',
      )}
      onClick={() => navigate(`/bed/${bed.bedId}/monitor`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/bed/${bed.bedId}/monitor`)}
    >
      <div>
        {/* Card Header: Bed ID + Ref + Status pill */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-ink">Bed {bed.bedId}</span>
              <span className="text-sm font-normal text-muted">{bed.patientRef}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{bed.description}</p>
          </div>

          {/* Top Right Badges */}
          {hasAlert && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'rgb(var(--alert))', color: 'rgb(var(--alert-fg))' }}
            >
              <AlertTriangle className="h-3 w-3" /> Alert
            </span>
          )}

          {bed.alertKind === 'advisory-unavailable' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-2.5 py-1 text-xs font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full border border-amber-600 border-dashed" />
              Assessment unavailable
            </span>
          )}

          {bed.alertKind === 'advisory-nmb' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-card px-2.5 py-1 text-xs font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full border border-amber-500" />
              Reduced sensors
            </span>
          )}

          {bed.status === 'CALIBRATING' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-2.5 py-1 text-xs font-medium text-text-2">
              <Anchor className="h-3 w-3 text-ink" />
              Calibrating 0:54
            </span>
          )}
        </div>

        {/* Card Middle: Score / CI / Calibration */}
        <div className="mt-4">
          {bed.status === 'CALIBRATING' ? (
            <div className="py-1">
              <CalibrationRing elapsed={54} total={90} />
              <p className="mt-2 text-xs text-muted">Scores appear after calibration</p>
            </div>
          ) : bed.painScore != null ? (
            <>
              {/* Score + Signals OK */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-[44px] font-bold leading-none tracking-tight text-ink tabular">
                    {bed.painScore.toFixed(1)}
                  </span>
                  <span className="text-base font-normal text-muted">/10</span>
                </div>

                {bed.status === 'OK' && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-text-2">
                    <Dot kind="ok" /> Signals OK
                  </span>
                )}
              </div>

              {/* Horizontal CI Bar */}
              <div className="relative mt-3 h-1.5 w-full rounded-full bg-track">
                {/* 80% CI interval band */}
                <div
                  className="absolute top-0 h-full rounded-full bg-band"
                  style={{
                    left: `${((bed.lo ?? 0) / 10) * 100}%`,
                    width: `${(((bed.hi ?? 0) - (bed.lo ?? 0)) / 10) * 100}%`,
                  }}
                />
                {/* Current score vertical marker */}
                <div
                  className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-ink"
                  style={{
                    left: `${((bed.painScore) / 10) * 100}%`,
                  }}
                />
              </div>

              {/* 80% CI range text + Severity pill */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted tabular">
                  80% {bed.lo?.toFixed(1)} – {bed.hi?.toFixed(1)}
                </span>
                {sev && (
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: sev.color }}>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: sev.color }} />
                    {sev.text}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="h-6 w-16 rounded-md bg-track" />
              {bed.status === 'REJECTED' && (
                <p className="mt-3 text-xs text-muted">Last valid 3.1 · 2 min ago</p>
              )}
            </div>
          )}
        </div>

        {/* Sparkline trend section */}
        <div className="mt-3">
          <p className="text-[11px] font-medium text-muted">Last 10 min</p>
          <div className="mt-1">
            <Sparkline seed={bed.seed} pain={bed.painScore} status={bed.status} />
          </div>
        </div>
      </div>

      {/* Card Footer: Clinical Context Chips + Open Monitor CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-card-border/60 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {bed.context.length === 0 ? (
            <span className="text-xs text-muted">No active context</span>
          ) : (
            bed.context.map((c, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium',
                  c.kind === 'timed'
                    ? 'border border-[rgb(var(--chip-timed-border))] bg-butter text-ink'
                    : 'border border-card-border bg-subtle text-text-2',
                )}
              >
                <RouteIcon route={c.route} size={11} />
                {c.label}
              </span>
            ))
          )}
        </div>

        {hasAlert && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/bed/${bed.bedId}/monitor`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-85"
          >
            Open monitor <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Unit Page ───────────────────────────────────────────────────── */
export function UnitPage() {
  const compact = useCompact();
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainTop, setMainTop] = useState(209);

  useLayoutEffect(() => {
    const measure = () => setMainTop(mainRef.current?.getBoundingClientRect().top ?? 209);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  const beds = [...BEDS].sort((a, b) => a.priority - b.priority);
  const alertCount = beds.filter((b) => b.alertKind === 'alert').length;
  const unavailableCount = beds.filter((b) => b.alertKind === 'advisory-unavailable').length;
  const calibratingCount = beds.filter((b) => b.status === 'CALIBRATING').length;

  return (
    <div className={cn('themed-page flex min-h-screen flex-col overflow-y-auto', compact && 'compact')}>
      <Header />

      <main
        ref={mainRef}
        className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col gap-6 px-8 py-6 compact:px-4"
      >
        {/* Page Title & Summary Stat Cards */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">ICU · Beds 1–12</h1>
            <p className="mt-1 text-sm text-muted">Sorted by priority</p>
          </div>

          {/* 4 Summary Stat Cards matching reference */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Beds Monitored (Sky blue) */}
            <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-sky px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-ink tabular">{beds.length}</span>
              <span className="text-xs font-medium leading-tight text-text-2">
                beds<br />monitored
              </span>
            </div>

            {/* 2. Active Alert (Yellow / Butter) */}
            <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--chip-timed-border))] bg-butter px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-ink tabular">{alertCount}</span>
              <span className="text-xs font-medium leading-tight text-text-2">
                active<br />alert
              </span>
            </div>

            {/* 3. Assessment Unavailable (Sky blue) */}
            <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-sky px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-ink tabular">{unavailableCount}</span>
              <span className="text-xs font-medium leading-tight text-text-2">
                assessment<br />unavailable
              </span>
            </div>

            {/* 4. Calibrating (Yellow / Butter) */}
            <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--chip-timed-border))] bg-butter px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-ink tabular">{calibratingCount}</span>
              <span className="text-xs font-medium leading-tight text-text-2">
                calibrating
              </span>
            </div>
          </div>
        </div>

        {/* Beds Grid: 4 columns, comfortable spacing, scrollable */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 pb-8">
          {beds.map((bed) => (
            <BedCard key={bed.bedId} bed={bed} />
          ))}
        </div>
      </main>

      <Footer className="mt-auto h-[41px] shrink-0 compact:h-8" />
      <AssessmentDialog prefill={false} />
      <AuditDrawer top={mainTop} />
    </div>
  );
}
