import { useState, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import { useProfile } from '@/store/profile';
import { Footer } from '@/components/ui/Brand';
import { Card, CardTitle } from '@/components/ui/Card';
import { Header } from '@/features/header/Header';
import { ContextBar } from '@/features/context-bar/ContextBar';
import { AlertSlotView } from '@/features/monitor/AlertSlotView';
import { AssessmentDialog } from '@/features/cpot/AssessmentDialog';
import { AuditDrawer } from '@/features/audit/AuditDrawer';
import { useCompact } from '@/features/monitor/useCompact';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react';

type Scale = 'All' | 'CPOT' | 'BPS' | 'NRS';

interface AssessmentRecord {
  id: string;
  t: number;
  scale: 'CPOT' | 'BPS' | 'NRS';
  value: number;
  max: number;
  clinician: string;
  note?: string;
}

const DAY = Date.UTC(2026, 9, 2);
const at = (hh: number, mm: number) => DAY + (hh * 60 + mm) * 60 * 1000;

const DEMO_RECORDS: AssessmentRecord[] = [
  { id: 'a1', t: at(13, 58), scale: 'CPOT', value: 1, max: 8, clinician: 'DR', note: 'Post baseline' },
  { id: 'a2', t: at(14, 15), scale: 'CPOT', value: 3, max: 8, clinician: 'DR' },
  { id: 'a3', t: at(14, 32), scale: 'CPOT', value: 5, max: 8, clinician: 'DR', note: 'During pain episode' },
  { id: 'a4', t: at(14, 45), scale: 'BPS', value: 6, max: 12, clinician: 'NJ', note: 'Post-suctioning' },
  { id: 'a5', t: at(15, 0), scale: 'CPOT', value: 2, max: 8, clinician: 'DR', note: 'After analgesia' },
  { id: 'a6', t: at(15, 20), scale: 'BPS', value: 4, max: 12, clinician: 'DR' },
  { id: 'a7', t: at(15, 45), scale: 'CPOT', value: 1, max: 8, clinician: 'NJ' },
  { id: 'a8', t: at(16, 10), scale: 'CPOT', value: 4, max: 8, clinician: 'DR', note: 'Turning' },
];

function scoreTone(value: number, max: number) {
  const pct = value / max;
  if (pct >= 0.5) return 'pain-severe';
  if (pct >= 0.25) return 'pain-moderate';
  return 'pain-mild';
}

export function AssessmentsPage() {
  const compact = useCompact();
  const view = useView();
  const setDialog = useMonitor((s) => s.setDialog);
  const profile = useProfile((s) => s.profile);
  const [filterScale, setFilterScale] = useState<Scale>('All');

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainTop, setMainTop] = useState(209);
  useLayoutEffect(() => {
    const measure = () => setMainTop(mainRef.current?.getBoundingClientRect().top ?? 209);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  const records = filterScale === 'All' ? DEMO_RECORDS : DEMO_RECORDS.filter((r) => r.scale === filterScale);
  const cpotRecords = DEMO_RECORDS.filter((r) => r.scale === 'CPOT');
  const bpsRecords = DEMO_RECORDS.filter((r) => r.scale === 'BPS');
  const avgCpot = cpotRecords.length > 0 ? cpotRecords.reduce((a, r) => a + r.value, 0) / cpotRecords.length : null;
  const avgBps = bpsRecords.length > 0 ? bpsRecords.reduce((a, r) => a + r.value, 0) / bpsRecords.length : null;
  const lastRecord = DEMO_RECORDS[DEMO_RECORDS.length - 1];

  const concordance = (() => {
    if (!lastRecord || !view.pain) return null;
    const scalePct = lastRecord.value / lastRecord.max;
    return (view.pain.score >= 4) === (scalePct >= 0.5) ? 'concordant' : 'discordant';
  })();

  const recommendedScale =
    profile?.communication === 'Can self-report'
      ? 'NRS (self-report)'
      : profile?.airway?.startsWith('Intubated')
        ? 'BPS (intubated non-verbal)'
        : 'CPOT (non-verbal)';

  return (
    <div className={cn('themed-page flex min-h-dvh flex-col overflow-y-auto', compact && 'compact')}>
      <Header />
      <ContextBar />
      <div className="mt-2"><AlertSlotView /></div>

      <main
        ref={mainRef}
        className="mt-[17px] grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-5 px-8 pb-4 compact:mt-3 compact:grid-cols-1 compact:overflow-y-auto compact:px-4"
      >
        {/* Left: record list */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Toolbar */}
          <div className="flex shrink-0 items-center justify-between">
            <Segmented<Scale>
              options={[
                { value: 'All', label: 'All' },
                { value: 'CPOT', label: 'CPOT' },
                { value: 'BPS', label: 'BPS' },
                { value: 'NRS', label: 'NRS' },
              ]}
              value={filterScale}
              onChange={setFilterScale}
            />
            <Button
              variant="primary"
              size="md"
              className="gap-2"
              onClick={() => setDialog('assessment')}
            >
              <Plus aria-hidden size={16} strokeWidth={2} />
              New assessment
            </Button>
          </div>

          {/* Records */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 compact:grid-cols-1">
              {records.map((r) => {
                const tone = scoreTone(r.value, r.max);
                return (
                  <Card key={r.id} padding="none" className="overflow-hidden">
                    <div className="flex items-stretch">
                      {/* Score badge */}
                      <div
                        className="flex w-20 shrink-0 flex-col items-center justify-center"
                        style={{ background: `rgb(var(--${tone}) / 0.12)` }}
                      >
                        <p className="text-3xl font-bold tabular" style={{ color: `rgb(var(--${tone}))` }}>{r.value}</p>
                        <p className="text-xs text-muted">/ {r.max}</p>
                      </div>
                      {/* Details */}
                      <div className="flex-1 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ background: `rgb(var(--accent) / 0.12)`, color: `rgb(var(--accent))` }}
                          >
                            {r.scale}
                          </span>
                          <span className="text-xs text-muted tabular">{fmtTime(r.t)}</span>
                        </div>
                        {r.note && <p className="mt-1.5 text-sm text-muted">{r.note}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-track">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(r.value / r.max) * 100}%`, background: `rgb(var(--${tone}))` }}
                            />
                          </div>
                          <span className="text-xs text-muted">{r.clinician}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: stats + context */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Stats */}
          <Card padding="md" className="shrink-0">
            <CardTitle>Summary</CardTitle>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Total assessments', value: DEMO_RECORDS.length, token: 'ink' },
                { label: 'Avg CPOT', value: avgCpot != null ? `${avgCpot.toFixed(1)} / 8` : '—', token: avgCpot != null ? scoreTone(avgCpot, 8) : 'muted' },
                { label: 'Avg BPS', value: avgBps != null ? `${avgBps.toFixed(1)} / 12` : '—', token: avgBps != null ? scoreTone(avgBps, 12) : 'muted' },
              ].map(({ label, value, token }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="text-base font-bold tabular" style={{ color: `rgb(var(--${token}))` }}>{value}</span>
                </div>
              ))}

              {/* Concordance */}
              <div className="flex items-center justify-between border-t border-card-border pt-3">
                <span className="text-sm text-muted">Concordance vs ALGOS-Δ</span>
                <div className="flex items-center gap-1.5">
                  {concordance === 'concordant'
                    ? <CheckCircle2 className="h-4 w-4" style={{ color: `rgb(var(--pain-mild))` }} />
                    : concordance === 'discordant'
                      ? <AlertCircle className="h-4 w-4" style={{ color: `rgb(var(--pain-moderate))` }} />
                      : null}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: `rgb(var(--${concordance === 'concordant' ? 'pain-mild' : concordance === 'discordant' ? 'pain-moderate' : 'muted'}))` }}
                  >
                    {concordance
                      ? concordance.charAt(0).toUpperCase() + concordance.slice(1)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Patient context */}
          {profile && (
            <Card padding="md" className="flex-1">
              <CardTitle subtitle="Scale selection logic">Patient context</CardTitle>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Communication', value: profile.communication ?? '—' },
                  { label: 'Airway', value: profile.airway ?? '—' },
                  { label: 'RASS', value: profile.rass != null ? String(profile.rass) : '—' },
                  { label: 'CAM-ICU', value: profile.camIcu ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted">{label}</p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
                  </div>
                ))}
                <div className="border-t border-card-border pt-3">
                  <p className="text-xs text-muted">Recommended scale</p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: `rgb(var(--accent))` }}>
                    {recommendedScale}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer className="h-[41px] shrink-0 compact:h-8" />
      <AssessmentDialog prefill={false} />
      <AuditDrawer top={mainTop} />
    </div>
  );
}
