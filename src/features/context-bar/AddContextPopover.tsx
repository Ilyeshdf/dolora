import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { ArrowLeft, Check } from 'lucide-react';
import { CONDITIONS, EVENTS, FLAGS, MEDICATIONS, flagLabel, needsStartTime, type FlagId } from '@/clinical/clinicalEffects';
import type { Contradiction } from '@/clinical/profile';
import { useL10n, useT } from '@/i18n';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import { AddChip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverAnchor } from '@/components/ui/Overlay';
import { RouteIcon } from '@/components/ui/RouteIcon';
import * as RP from '@radix-ui/react-popover';
import { FlagEffect, RuleWarnings, TimePick } from '@/features/entry/common';
import { checkFlagAdd, useBedActions } from '@/features/entry/useBedActions';

type Step = { kind: 'list' } | { kind: 'time'; flag: FlagId } | { kind: 'confirm'; flag: FlagId; rules: Contradiction[]; then: 'time' | 'add' };


/**
 * "+ Add context" — command-style popover (task §3.2-C): search, grouped results
 * (Medications · Conditions · Procedures/Events), effect preview of the highlighted item,
 * Enter to add. Rule warnings appear before anything is saved (task §3.3).
 */
export function AddContextPopover() {
  const t = useT();
  const l = useL10n();
  const open = useMonitor((s) => s.addContextOpen);
  const setOpen = useMonitor((s) => s.setAddContextOpen);
  const view = useView();
  const actions = useBedActions();
  const [step, setStep] = useState<Step>({ kind: 'list' });
  const [highlight, setHighlight] = useState<string>('');
  const [at, setAt] = useState(() => view.now);

  const active = useMemo(() => new Set(view.context.map((c) => c.flag)), [view.context]);
  const close = () => {
    setOpen(false);
    setStep({ kind: 'list' });
  };

  const commit = (flag: FlagId, when: number) => {
    if (FLAGS[flag].kind === 'event') actions.logEvent(flag, when);
    else actions.addContext(flag, when);
    close();
  };

  const choose = (flag: FlagId) => {
    const bed = useClinical.getState().bed(actions.bedId);
    const rules = checkFlagAdd(bed, actions.now(), flag);
    const then = needsStartTime(flag) ? 'time' : 'add';
    setAt(actions.now());
    if (rules.length) setStep({ kind: 'confirm', flag, rules, then });
    else if (then === 'time') setStep({ kind: 'time', flag });
    else commit(flag, actions.now());
  };

  const groups: { key: 'medication' | 'condition' | 'event'; ids: FlagId[] }[] = [
    { key: 'medication', ids: MEDICATIONS },
    { key: 'condition', ids: CONDITIONS },
    { key: 'event', ids: EVENTS },
  ];
  const previewFlag = (step.kind === 'list' ? highlight : step.flag) as FlagId;

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverAnchor asChild>
        <span>
          <RP.Trigger asChild>
            <AddChip aria-haspopup="dialog" aria-expanded={open} />
          </RP.Trigger>
        </span>
      </PopoverAnchor>
      <RP.Portal>
        <RP.Content
          align="start"
          sideOffset={10}
          collisionPadding={16}
          aria-label={t.entry.addContext.title}
          className="z-50 flex w-[700px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card border-theme border-card-outline bg-card shadow-card hc:border-ink"
        >
          {step.kind === 'list' ? (
            <Command label={t.entry.addContext.title} value={highlight} onValueChange={setHighlight} loop className="flex w-[380px] shrink-0 flex-col border-r border-card-border hc:border-ink">
              <Command.Input
                autoFocus
                placeholder={t.entry.addContext.search}
                className="h-13 border-b border-card-border bg-transparent px-5 text-md outline-none placeholder:text-muted hc:border-ink"
              />
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t.entry.addContext.noResults}</Command.Empty>
                {groups.map((g) => (
                  <Command.Group
                    key={g.key}
                    heading={t.entry.addContext.groups[g.key]}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted"
                  >
                    {g.ids.map((id) => {
                      const def = FLAGS[id];
                      const isActive = active.has(id) && def.kind !== 'event';
                      return (
                        <Command.Item
                          key={id}
                          value={id}
                          keywords={[def.label.en, def.label.fr, def.examples?.en ?? '', def.examples?.fr ?? '', def.short?.en ?? '', def.short?.fr ?? '']}
                          disabled={isActive}
                          onSelect={() => choose(id)}
                          className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 data-[disabled=true]:cursor-default data-[selected=true]:bg-subtle data-[disabled=true]:opacity-60"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-chip-icon text-chip-icon-fg">
                            <RouteIcon route={def.routes[0] ?? 'measurement'} size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-medium">{l(def.label)}</span>
                            <span className="block truncate text-xs text-muted">
                              {def.examples ? `${l(def.examples)} · ` : ''}
                              {def.durationMin ? t.entry.addContext.timed(def.durationMin) : t.entry.addContext.persistent}
                            </span>
                          </span>
                          {isActive ? (
                            <span className="nowrap flex items-center gap-1 text-xs font-medium text-text-2">
                              <Check aria-hidden size={14} /> {t.entry.addContext.active}
                            </span>
                          ) : null}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
              <p className="border-t border-card-border px-5 py-2.5 text-xs text-muted hc:border-ink">{t.entry.addContext.hint}</p>
            </Command>
          ) : (
            <div className="flex w-[380px] shrink-0 flex-col gap-4 border-r border-card-border p-5 hc:border-ink">
              <button type="button" onClick={() => setStep({ kind: 'list' })} className="nowrap flex items-center gap-1.5 self-start rounded-full text-sm font-medium text-text-2 hover:text-ink">
                <ArrowLeft aria-hidden size={16} /> {t.entry.back}
              </button>
              <h3 className="text-xl font-semibold">{l(flagLabel(step.flag, false))}</h3>
              {step.kind === 'confirm' ? (
                <RuleWarnings
                  items={step.rules}
                  confirmLabel={t.entry.saveAnyway}
                  onCancel={() => setStep({ kind: 'list' })}
                  onConfirm={() => (step.then === 'time' ? setStep({ kind: 'time', flag: step.flag }) : commit(step.flag, actions.now()))}
                />
              ) : (
                <>
                  <div>
                    <p id="add-started" className="mb-2 text-sm font-medium">
                      {t.entry.addContext.started}
                    </p>
                    <TimePick now={actions.now()} value={at} onChange={setAt} label={t.entry.addContext.started} />
                  </div>
                  <Button size="lg" className="self-start" onClick={() => commit(step.flag, at)} autoFocus>
                    {t.entry.addContext.add}
                  </Button>
                </>
              )}
            </div>
          )}
          <aside aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-3 bg-subtle/60 p-5 hc:bg-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.entry.addContext.preview}</p>
            {previewFlag && FLAGS[previewFlag] ? (
              <>
                <p className="text-lg font-semibold">{l(FLAGS[previewFlag].label)}</p>
                <FlagEffect flag={previewFlag} />
                <p className="text-xs text-muted">{FLAGS[previewFlag].routes.map((r) => t.routes[r]).join(' · ')}</p>
              </>
            ) : null}
          </aside>
        </RP.Content>
      </RP.Portal>
    </Popover>
  );
}

