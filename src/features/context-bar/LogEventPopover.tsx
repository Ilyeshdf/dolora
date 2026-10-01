import { useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { ChevronDown, ClipboardPlus } from 'lucide-react';
import { EVENTS, FLAGS, flagLabel, type FlagId } from '@/clinical/clinicalEffects';
import type { Contradiction } from '@/clinical/profile';
import { useL10n, useT } from '@/i18n';
import { useClinical } from '@/store/clinical';
import { Button } from '@/components/ui/Button';
import { RouteIcon } from '@/components/ui/RouteIcon';
import { RuleWarnings, TimePick } from '@/features/entry/common';
import { checkFlagAdd, useBedActions } from '@/features/entry/useBedActions';

/**
 * One-tap event logging (task §3.2-D): compact "Log event" button that expands the 8 events.
 * Default time = now; "When" allows retroactive entry — the marker lands at that time on the
 * timeline and the audit keeps both event time and entry time.
 */
export function LogEventPopover() {
  const t = useT();
  const l = useL10n();
  const actions = useBedActions();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [pending, setPending] = useState<{ flag: FlagId; rules: Contradiction[] } | null>(null);

  const log = (flag: FlagId) => {
    const rules = checkFlagAdd(useClinical.getState().bed(actions.bedId), actions.now(), flag);
    if (rules.length && !pending) return setPending({ flag, rules });
    actions.logEvent(flag, at || actions.now());
    setPending(null);
    setOpen(false);
  };

  return (
    <RP.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setAt(actions.now());
          setPending(null);
        }
      }}
    >
      <RP.Trigger asChild>
        <Button variant="ghost" size="md" className="h-10 gap-2 px-4 text-md" aria-haspopup="dialog">
          <ClipboardPlus aria-hidden size={18} strokeWidth={1.75} />
          <span className="compact:sr-only">{t.entry.logEvent.button}</span>
          <ChevronDown aria-hidden size={16} strokeWidth={1.75} className="-mr-1 text-muted" />
        </Button>
      </RP.Trigger>
      <RP.Portal>
        <RP.Content align="start" sideOffset={10} collisionPadding={16} aria-label={t.entry.logEvent.title} className="z-50 w-[560px] rounded-card border-theme border-card-outline bg-card p-5 shadow-card hc:border-ink">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">{t.entry.logEvent.title}</h3>
          </div>
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium">{t.entry.logEvent.time}</p>
            <TimePick now={actions.now()} value={at || actions.now()} onChange={setAt} label={t.entry.logEvent.time} />
            <p className="mt-2 text-xs text-muted">{t.entry.logEvent.retroNote}</p>
          </div>
          {pending ? (
            <div className="mt-4">
              <RuleWarnings items={pending.rules} confirmLabel={t.entry.saveAnyway} onCancel={() => setPending(null)} onConfirm={() => log(pending.flag)} />
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {EVENTS.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => log(e)}
                    className="flex w-full items-center gap-3 rounded-[14px] border-theme border-card-border bg-card px-3 py-2.5 text-left hover:bg-subtle hc:border-ink"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-chip-icon text-chip-icon-fg">
                      <RouteIcon route={FLAGS[e].routes[0] ?? 'prior'} size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium">{l(flagLabel(e, false))}</span>
                      <span className="block truncate text-xs text-muted">{l(FLAGS[e].effect)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
