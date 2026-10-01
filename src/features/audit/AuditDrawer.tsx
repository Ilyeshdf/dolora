import { useState } from 'react';
import { Anchor, ArrowLeftRight, Bell, CircleCheck, ClipboardList, Download, Plug, Scale, UserRound } from 'lucide-react';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import type { AuditEntry, AuditKind } from '@/store/auditTypes';
import { useView } from '@/features/monitor/useView';
import { Button } from '@/components/ui/Button';
import { RightDrawer } from '@/components/ui/Overlay';

type Filter = 'all' | 'alert' | 'context' | 'assessment' | 'mode' | 'system';
const FILTERS: Filter[] = ['all', 'alert', 'context', 'assessment', 'mode', 'system'];
/** Baseline → Assessments (D-46); profile edits → Context (clinical context of interpretation, D-54). */
const FILTER_OF: Record<AuditKind, Filter> = { alert: 'alert', context: 'context', profile: 'context', assessment: 'assessment', baseline: 'assessment', mode: 'mode', system: 'system' };

function iconFor(e: AuditEntry) {
  if (e.kind === 'alert') return e.actor === 'system' ? Bell : CircleCheck;
  if (e.kind === 'context') return Scale;
  if (e.kind === 'profile') return UserRound;
  if (e.kind === 'mode') return ArrowLeftRight;
  if (e.kind === 'assessment') return ClipboardList;
  if (e.kind === 'baseline') return Anchor;
  return Plug;
}

/** Audit trail drawer — A6. Append-only; old → new; retroactive entries show both times. */
export function AuditDrawer({ top }: { top: number }) {
  const t = useT();
  const l = useL10n();
  const open = useMonitor((s) => s.panel === 'audit');
  const setPanel = useMonitor((s) => s.setPanel);
  const bedId = useMonitor((s) => s.bedId);
  const audit = useClinical((s) => s.beds[bedId]?.audit) ?? NONE;
  const patient = useView().patient;
  const [filter, setFilter] = useState<Filter>('all');
  const entries = [...audit].sort((a, b) => b.enteredAt - a.enteredAt || b.t - a.t).filter((e) => filter === 'all' || FILTER_OF[e.kind] === filter);

  const exportJson = () => {
    const payload = {
      patient_ref: patient.ref,
      bed: patient.bed,
      exported_at: new Date().toISOString(),
      entries: entries.map((e) => ({
        time: new Date(e.t).toISOString(),
        entered_at: new Date(e.enteredAt).toISOString(),
        actor: e.actor === 'clinician' ? `clinician:${e.who ?? ''}` : 'system',
        kind: e.kind,
        action: e.action.en,
        detail: e.detail?.en ?? null,
        old: e.old?.en ?? null,
        new: e.new?.en ?? null,
        removed_reason: e.removedReason?.en ?? null,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${patient.ref}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RightDrawer
      open={open}
      onOpenChange={(o) => setPanel(o ? 'audit' : null)}
      top={top}
      title={t.audit.title}
      subtitle={t.audit.subtitle(patient.ref, patient.bed)}
      actions={
        <Button variant="ghost" size="none" className="h-11 gap-2 px-4 text-md" onClick={exportJson}>
          <Download aria-hidden size={18} strokeWidth={1.75} />
          {t.audit.export}
        </Button>
      }
    >
      <div role="radiogroup" aria-label={t.audit.filterLabel} className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'nowrap h-9 rounded-full border-theme px-3 text-sm font-medium transition-colors duration-150',
              filter === f ? 'border-pill-active bg-pill-active font-semibold text-pill-active-fg' : 'border-card-border bg-card hover:bg-subtle hc:border-ink',
            )}
          >
            {t.audit.filters[f]}
          </button>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-medium text-text-2">{t.audit.today}</h3>
      {entries.length === 0 ? <p className="mt-4 text-md text-muted">{t.audit.empty}</p> : null}
      <ol className="mt-3">
        {entries.map((e, i) => {
          const Icon = iconFor(e);
          const retro = e.enteredAt - e.t > 30_000;
          return (
            <li key={e.id} className="relative flex gap-4 pb-5">
              {i < entries.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[21px] top-12 w-px bg-card-border hc:bg-ink" /> : null}
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-theme border-card-border bg-card hc:border-ink">
                <Icon aria-hidden size={19} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time dateTime={new Date(e.t).toISOString()} className="text-md font-bold">
                    {fmtTime(e.t)}
                  </time>
                  <span className={cn('nowrap rounded-full px-2 py-0.5 text-xs font-medium', e.actor === 'clinician' ? 'bg-sky text-ink' : 'bg-track text-text-2', 'hc:border hc:border-ink')}>
                    {e.actor === 'clinician' ? t.audit.clinician(e.who ?? '') : t.audit.system}
                  </span>
                  {retro ? <span className="nowrap text-xs text-muted">{t.audit.entered(fmtTime(e.enteredAt))}</span> : null}
                </p>
                <p className="mt-1 text-lg font-semibold leading-6">{l(e.action)}</p>
                {e.detail ? <p className={cn('mt-0.5 text-sm text-text-2', e.removedReason && 'line-through decoration-1')}>{l(e.detail)}</p> : null}
                {e.old || e.new ? (
                  <p className="mt-0.5 text-sm text-text-2">
                    <span className="line-through decoration-1">{e.old ? l(e.old) : '—'}</span>
                    <span aria-hidden> → </span>
                    <span className="sr-only"> {t.audit.changedTo} </span>
                    <span className="font-medium text-ink">{e.new ? l(e.new) : '—'}</span>
                  </p>
                ) : null}
                {e.removedReason ? <p className="mt-0.5 text-sm font-medium text-text-2">{t.audit.reason(l(e.removedReason))}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted">{t.audit.appendOnly}</p>
    </RightDrawer>
  );
}

const NONE: AuditEntry[] = [];
