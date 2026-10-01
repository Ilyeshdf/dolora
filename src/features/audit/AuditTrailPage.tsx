import { useState, useLayoutEffect, useRef } from 'react';
import { useL10n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useClinical } from '@/store/clinical';
import { useView } from '@/features/monitor/useView';
import type { AuditEntry, AuditKind } from '@/store/auditTypes';
import { Footer } from '@/components/ui/Brand';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/features/header/Header';
import { ContextBar } from '@/features/context-bar/ContextBar';
import { AlertSlotView } from '@/features/monitor/AlertSlotView';
import { AssessmentDialog } from '@/features/cpot/AssessmentDialog';
import { AuditDrawer } from '@/features/audit/AuditDrawer';
import { useCompact } from '@/features/monitor/useCompact';
import {
  Anchor,
  ArrowLeftRight,
  Bell,
  CircleCheck,
  ClipboardList,
  Download,
  Plug,
  Scale,
  Search,
} from 'lucide-react';

type AuditFilter = 'all' | 'alert' | 'context' | 'assessment' | 'mode' | 'system';
const FILTERS: AuditFilter[] = ['all', 'alert', 'context', 'assessment', 'mode', 'system'];
const FILTER_OF: Record<AuditKind, AuditFilter> = {
  alert: 'alert', context: 'context', assessment: 'assessment',
  baseline: 'assessment', mode: 'mode', system: 'system',
};

function iconFor(e: AuditEntry) {
  if (e.kind === 'alert') return e.actor === 'system' ? Bell : CircleCheck;
  if (e.kind === 'context') return Scale;
  if (e.kind === 'mode') return ArrowLeftRight;
  if (e.kind === 'assessment') return ClipboardList;
  if (e.kind === 'baseline') return Anchor;
  return Plug;
}

function kindToken(kind: AuditKind) {
  if (kind === 'alert') return 'alert';
  if (kind === 'context') return 'accent';
  if (kind === 'assessment' || kind === 'baseline') return 'pain-mild';
  if (kind === 'mode') return 'pain-moderate';
  return 'muted';
}

export function AuditTrailPage() {
  const l = useL10n();
  const compact = useCompact();
  const audit = useClinical((s) => s.audit);
  const view = useView();
  const patient = view.patient;
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [search, setSearch] = useState('');

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainTop, setMainTop] = useState(209);
  useLayoutEffect(() => {
    const measure = () => setMainTop(mainRef.current?.getBoundingClientRect().top ?? 209);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  const entries = [...audit]
    .sort((a, b) => b.t - a.t)
    .filter((e) => filter === 'all' || FILTER_OF[e.kind] === filter)
    .filter((e) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return l(e.action).toLowerCase().includes(q) || (e.detail && l(e.detail).toLowerCase().includes(q));
    });

  const alertCount = audit.filter((e) => e.kind === 'alert').length;
  const contextCount = audit.filter((e) => e.kind === 'context').length;
  const assessmentCount = audit.filter((e) => e.kind === 'assessment' || e.kind === 'baseline').length;
  const systemCount = audit.filter((e) => e.kind === 'system' || e.kind === 'mode').length;

  const exportJson = () => {
    const payload = {
      patient_ref: patient.ref, bed: patient.bed, exported_at: new Date().toISOString(),
      entries: [...audit].sort((a, b) => b.t - a.t).map((e) => ({
        time: new Date(e.t).toISOString(), actor: e.actor === 'clinician' ? `clinician:${e.who ?? ''}` : 'system',
        kind: e.kind, action: e.action.en, detail: e.detail?.en ?? null,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `audit-${patient.ref}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('themed-page flex min-h-dvh flex-col overflow-y-auto', compact && 'compact')}>
      <Header />
      <ContextBar />
      <div className="mt-2"><AlertSlotView /></div>

      <main
        ref={mainRef}
        className="mt-[17px] grid min-h-0 flex-1 grid-cols-[1fr_280px] gap-5 px-8 pb-4 compact:mt-3 compact:grid-cols-1 compact:overflow-y-auto compact:px-4"
      >
        {/* Left: event list */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Search + filters */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                className="block w-full rounded-full border border-card-border bg-card py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted"
                placeholder="Search actions, details…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="md" className="gap-2 shrink-0" onClick={exportJson}>
              <Download aria-hidden size={16} strokeWidth={1.75} />
              Export
            </Button>
          </div>

          {/* Filter chips */}
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'nowrap h-8 rounded-full border px-3 text-sm font-medium transition-colors duration-150',
                  filter === f
                    ? 'border-pill-active bg-pill-active font-semibold text-pill-active-fg'
                    : 'border-card-border bg-card text-text-2 hover:bg-subtle hover:text-ink',
                )}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Entries */}
          <Card padding="md" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardTitle subtitle={`${entries.length} of ${audit.length} entries · Newest first`}>Event log</CardTitle>
            <ol className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No entries match your filter</p>
              ) : entries.map((e, i) => {
                const Icon = iconFor(e);
                const token = kindToken(e.kind);
                return (
                  <li key={e.id} className="relative flex gap-4 border-b border-card-border/50 py-3.5 last:border-0">
                    {i < entries.length - 1 && (
                      <span aria-hidden className="absolute bottom-0 left-[21px] top-[56px] w-px bg-card-border" />
                    )}
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
                      style={{
                        color: `rgb(var(--${token}))`,
                        borderColor: `rgb(var(--${token}) / 0.3)`,
                        background: `rgb(var(--${token}) / 0.1)`,
                      }}
                    >
                      <Icon aria-hidden size={19} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <time className="text-sm font-bold text-ink tabular">{fmtTime(e.t)}</time>
                          <span
                            className="nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ color: `rgb(var(--${token}))`, background: `rgb(var(--${token}) / 0.1)` }}
                          >
                            {e.kind}
                          </span>
                        </div>
                        <span className={cn('nowrap rounded-full px-2 py-0.5 text-xs font-medium', e.actor === 'clinician' ? 'bg-sky text-ink' : 'bg-subtle text-muted')}>
                          {e.actor === 'clinician' ? (e.who ?? 'Clinician') : 'System'}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-semibold text-ink">{l(e.action)}</p>
                      {e.detail && <p className="mt-0.5 text-sm text-muted">{l(e.detail)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 shrink-0 border-t border-card-border pt-3 text-xs text-muted">
              Append-only · immutable · exported for regulatory compliance
            </p>
          </Card>
        </div>

        {/* Right: summary stats */}
        <div className="flex min-h-0 flex-col gap-4">
          <Card padding="md">
            <CardTitle>Summary</CardTitle>
            <div className="mt-4 space-y-4">
              {[
                { icon: Bell, label: 'Alerts', value: alertCount, token: 'alert' },
                { icon: Scale, label: 'Context changes', value: contextCount, token: 'accent' },
                { icon: ClipboardList, label: 'Assessments', value: assessmentCount, token: 'pain-mild' },
                { icon: Plug, label: 'System / Mode', value: systemCount, token: 'pain-moderate' },
                { icon: Anchor, label: 'Total entries', value: audit.length, token: 'ink' },
              ].map(({ icon: Icon, label, value, token }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{ background: `rgb(var(--${token}) / 0.12)` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: `rgb(var(--${token}))` }} />
                  </div>
                  <span className="flex-1 text-sm text-muted">{label}</span>
                  <span className="text-base font-bold text-ink tabular">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" className="flex-1">
            <CardTitle subtitle={`${patient.ref} · Bed ${patient.bed}`}>Patient</CardTitle>
            <p className="mt-3 text-sm text-muted">
              Audit trail is append-only. Every clinical decision and system event is time-stamped and actor-attributed for regulatory and medico-legal review.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">First entry</span>
                <span className="font-medium text-ink tabular">{audit.length > 0 ? fmtTime(Math.min(...audit.map(e => e.t))) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Last entry</span>
                <span className="font-medium text-ink tabular">{audit.length > 0 ? fmtTime(Math.max(...audit.map(e => e.t))) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Clinician entries</span>
                <span className="font-medium text-ink tabular">{audit.filter(e => e.actor === 'clinician').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">System entries</span>
                <span className="font-medium text-ink tabular">{audit.filter(e => e.actor === 'system').length}</span>
              </div>
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
