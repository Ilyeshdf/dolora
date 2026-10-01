import { useState, useLayoutEffect, useRef } from 'react';
import { useL10n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { Footer } from '@/components/ui/Brand';
import { Card, CardTitle } from '@/components/ui/Card';
import { Header } from '@/features/header/Header';
import { ContextBar } from '@/features/context-bar/ContextBar';
import { AlertSlotView } from '@/features/monitor/AlertSlotView';
import { AssessmentDialog } from '@/features/cpot/AssessmentDialog';
import { AuditDrawer } from '@/features/audit/AuditDrawer';
import { useCompact } from '@/features/monitor/useCompact';
import { Segmented } from '@/components/ui/Segmented';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  FileText,
  Minus,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type TimeRange = '1h' | '4h' | '12h' | '24h';

export function TimelinePage() {
  const l = useL10n();
  const compact = useCompact();
  const view = useMonitor((s) => s.view);
  const [range, setRange] = useState<TimeRange>('1h');

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainTop, setMainTop] = useState(209);
  useLayoutEffect(() => {
    const measure = () => setMainTop(mainRef.current?.getBoundingClientRect().top ?? 209);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  const { timeline, drivers } = view;
  const rangeMs = { '1h': 3600_000, '4h': 4 * 3600_000, '12h': 12 * 3600_000, '24h': 24 * 3600_000 }[range];
  const cutoff = timeline.now - rangeMs;
  const samples = timeline.samples.filter((s) => s.t >= cutoff);
  const validSamples = samples.filter((s) => s.pain != null);
  const avgPain = validSamples.length > 0 ? validSamples.reduce((a, s) => a + (s.pain ?? 0), 0) / validSamples.length : null;
  const maxPain = validSamples.length > 0 ? Math.max(...validSamples.map((s) => s.pain ?? 0)) : null;
  const minPain = validSamples.length > 0 ? Math.min(...validSamples.map((s) => s.pain ?? 0)) : null;

  // Events feed
  const events: { t: number; label: string; detail?: string; kind: 'alert' | 'context' | 'reference' | 'region' }[] = [];
  timeline.alerts.forEach((a) => events.push({ t: a.t, label: l(a.label), detail: a.acknowledged ? 'Acknowledged' : 'Active', kind: 'alert' }));
  timeline.contextEvents.forEach((c) => events.push({ t: c.t, label: l(c.label), kind: 'context' }));
  timeline.references.forEach((r) => events.push({ t: r.t, label: `${r.scale} ${r.value}`, kind: 'reference' }));
  timeline.regions.forEach((r) => events.push({ t: r.from, label: l(r.label), detail: r.kind, kind: 'region' }));
  events.sort((a, b) => b.t - a.t);

  const eventColor = (kind: string) => {
    if (kind === 'alert') return `rgb(var(--alert))`;
    if (kind === 'context') return `rgb(var(--accent))`;
    if (kind === 'reference') return `rgb(var(--pain-mild))`;
    return `rgb(var(--muted))`;
  };

  const thinSamples = samples.filter((_, i) => i % 6 === 0).reverse().slice(0, 80);

  return (
    <div className={cn('themed-page flex min-h-dvh flex-col overflow-y-auto', compact && 'compact')}>
      <Header />
      <ContextBar />
      <div className="mt-2"><AlertSlotView /></div>

      <main
        ref={mainRef}
        className="mt-[17px] grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-5 px-8 pb-4 compact:mt-3 compact:grid-cols-1 compact:overflow-y-auto compact:px-4"
      >
        {/* Left: stats + data table */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Stats + range */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="grid flex-1 grid-cols-4 gap-3">
              {[
                { label: 'Avg pain', value: avgPain?.toFixed(1) ?? '—', token: avgPain != null && avgPain >= 4 ? 'pain-severe' : 'ink' },
                { label: 'Peak', value: maxPain?.toFixed(1) ?? '—', token: 'pain-severe' },
                { label: 'Trough', value: minPain?.toFixed(1) ?? '—', token: 'pain-mild' },
                { label: 'Samples', value: `${validSamples.length}`, token: 'ink' },
              ].map(({ label, value, token }) => (
                <Card key={label} padding="md">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-0.5 text-2xl font-bold tabular" style={{ color: `rgb(var(--${token}))` }}>{value}</p>
                </Card>
              ))}
            </div>
            <Segmented<TimeRange>
              options={[
                { value: '1h', label: '1h' },
                { value: '4h', label: '4h' },
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
              value={range}
              onChange={setRange}
            />
          </div>

          {/* Data table */}
          <Card padding="md" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardTitle subtitle={`${samples.length} samples · 5 s resolution`}>Pain history</CardTitle>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-card-border text-left text-xs font-medium text-muted">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Pain</th>
                    <th className="pb-2 pr-4">80% CI</th>
                    <th className="pb-2 pr-4">Arousal z</th>
                    <th className="pb-2">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {thinSamples.map((s, i) => {
                    const prev = thinSamples[i - 1];
                    const diff = s.pain != null && prev?.pain != null ? s.pain - prev.pain : null;
                    return (
                      <tr key={s.t} className="border-b border-card-border/50 last:border-0">
                        <td className="py-1.5 pr-4 text-xs text-muted tabular">{fmtTime(s.t)}</td>
                        <td
                          className="py-1.5 pr-4 font-semibold tabular"
                          style={{ color: s.pain != null ? `rgb(var(--${s.pain >= 4 ? 'pain-severe' : 'pain-mild'}))` : `rgb(var(--muted))` }}
                        >
                          {s.pain?.toFixed(1) ?? '—'}
                        </td>
                        <td className="py-1.5 pr-4 text-xs text-muted tabular">
                          {s.lo != null && s.hi != null ? `${s.lo.toFixed(1)} – ${s.hi.toFixed(1)}` : '—'}
                        </td>
                        <td className="py-1.5 pr-4 text-xs text-muted tabular">
                          {s.z != null ? (s.z > 0 ? '+' : '') + s.z.toFixed(1) : '—'}
                        </td>
                        <td className="py-1.5">
                          {diff == null ? <Minus className="h-3 w-3 text-muted" /> :
                            diff > 0.3 ? <TrendingUp className="h-3 w-3" style={{ color: `rgb(var(--pain-severe))` }} /> :
                              diff < -0.3 ? <TrendingDown className="h-3 w-3" style={{ color: `rgb(var(--pain-mild))` }} /> :
                                <Minus className="h-3 w-3 text-muted" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: events + drivers */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Events */}
          <Card padding="md" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardTitle subtitle={`${events.length} events`}>Event feed</CardTitle>
            <ol className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
              {events.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No events in window</p>
              ) : events.map((e, i) => (
                <li key={`${e.t}-${i}`} className="flex gap-3">
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border"
                    style={{ color: eventColor(e.kind), borderColor: `${eventColor(e.kind)}33`, background: `${eventColor(e.kind)}14` }}
                  >
                    {e.kind === 'alert' ? <Bell className="h-4 w-4" /> :
                      e.kind === 'context' ? <Tag className="h-4 w-4" /> :
                        <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-ink">{e.label}</p>
                    <p className="text-xs text-muted">{fmtTime(e.t)}{e.detail && ` · ${e.detail}`}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Drivers */}
          <Card padding="md" className="shrink-0">
            <CardTitle>Active drivers</CardTitle>
            <div className="mt-3 space-y-2">
              {drivers.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{ background: `rgb(var(--${d.direction === 'up' ? 'pain-severe' : 'accent'}) / 0.12)` }}
                  >
                    {d.direction === 'up'
                      ? <ArrowUp className="h-3.5 w-3.5" style={{ color: `rgb(var(--pain-severe))` }} />
                      : <ArrowDown className="h-3.5 w-3.5" style={{ color: `rgb(var(--accent))` }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{l(d.title)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-track">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.contribution * 100}%`,
                            background: `rgb(var(--${d.direction === 'up' ? 'pain-severe' : 'accent'}))`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted tabular">{(d.contribution * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Footer className="h-[41px] shrink-0 compact:h-8" />
      <AssessmentDialog prefill={false} />
      <AuditDrawer top={mainTop} />
    </div>
  );
}
