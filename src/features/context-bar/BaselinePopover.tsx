import * as RP from '@radix-ui/react-popover';
import { Anchor, CircleCheck, CircleDashed } from 'lucide-react';
import { preferredScale } from '@/clinical/profile';
import { baselineChecklist } from '@/clinical/baseline';
import { useFormat, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import { Button } from '@/components/ui/Button';
import { useBedActions } from '@/features/entry/useBedActions';

/**
 * "Mark as baseline" confirm popover with checklist. Missing / > 30 min old assessment →
 * offer "Assess now" first, or "Mark as provisional baseline". Quality shows in the header pill.
 */
export function BaselinePopover() {
  const t = useT();
  const f = useFormat();
  const view = useView();
  const actions = useBedActions();
  const setDialog = useMonitor((s) => s.setDialog);
  const profile = useClinical((s) => s.beds[actions.bedId]?.profile ?? null);
  const open = useMonitor((s) => s.baselineOpen);
  const setOpen = useMonitor((s) => s.setBaselineOpen);
  const c = baselineChecklist({ arousalZ: view.arousalZ, rass: profile?.rass?.value ?? null, lastRef: view.lastReference, status: view.status });
  const washout = view.alert.kind === 'advisory' && view.alert.advisory === 'WASHOUT';
  const items = [
    { ok: c.calm, label: t.entry.baseline.calm, detail: view.arousalZ !== null ? t.entry.baseline.calmDetail(f.num(view.arousalZ)) : '' },
    {
      ok: c.lowRef,
      label: t.entry.baseline.lowRef,
      detail: !view.lastReference ? t.entry.baseline.missingRef : !c.refFresh ? t.entry.baseline.staleRef(view.lastReference.ageMin) : `${view.lastReference.scale} ${view.lastReference.value}`,
    },
    { ok: c.signals, label: t.entry.baseline.signals, detail: '' },
  ];
  const mark = (q: 'good' | 'provisional') => {
    actions.markBaseline(q);
    setOpen(false);
  };

  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <RP.Trigger asChild>
        <Button variant="ghost" size="md" className="h-10 gap-2 px-4 text-md" aria-haspopup="dialog">
          <Anchor aria-hidden size={18} strokeWidth={1.75} />
          {t.baseline.markAsBaseline}
        </Button>
      </RP.Trigger>
      <RP.Portal>
        <RP.Content align="end" sideOffset={10} collisionPadding={16} aria-label={t.entry.baseline.title} className="z-50 w-[400px] rounded-card border-theme border-card-outline bg-card p-6 shadow-card hc:border-ink">
          <h3 className="text-2xl font-bold">{t.entry.baseline.title}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((i) => (
              <li key={i.label} className="flex items-start gap-3">
                {i.ok ? (
                  <CircleCheck aria-hidden size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sensor-ok" />
                ) : (
                  <CircleDashed aria-hidden size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sensor-degraded" />
                )}
                <div>
                  <p className={cn('text-md font-medium', !i.ok && 'text-advisory-text hc:text-ink')}>
                    {i.label}
                    <span className="sr-only">{i.ok ? ' ✓' : ' ✗'}</span>
                  </p>
                  {i.detail ? <p className="text-sm text-text-2">{i.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
          {washout ? <p className="mt-4 text-sm font-medium text-advisory-text hc:text-ink">{t.entry.baseline.duringWashout}</p> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {c.good ? (
              <Button size="lg" onClick={() => mark('good')} disabled={washout}>
                {t.entry.baseline.confirm}
              </Button>
            ) : (
              <>
                {!c.refFresh || !c.lowRef ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      setOpen(false);
                      setDialog('assessment', preferredScale(profile));
                    }}
                  >
                    {t.entry.baseline.assessNow}
                  </Button>
                ) : null}
                <Button variant="ghost" size="lg" onClick={() => mark('provisional')} disabled={washout}>
                  {t.entry.baseline.provisional}
                </Button>
              </>
            )}
          </div>
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
