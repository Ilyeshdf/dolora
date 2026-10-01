import { useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { FLAGS } from '@/clinical/clinicalEffects';
import { REMOVAL } from '@/clinical/options';
import type { ContextItem } from '@/contracts/monitor';
import type { RemovalReason } from '@/engine/effects';
import { useL10n, useT } from '@/i18n';
import { fmtCountdown, fmtTime } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { Button } from '@/components/ui/Button';
import { ContextChip } from '@/components/ui/Chip';
import { RouteIcon } from '@/components/ui/RouteIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { FlagEffect } from '@/features/entry/common';
import { useBedActions } from '@/features/entry/useBedActions';

const REASONS: RemovalReason[] = ['stopped', 'error', 'other'];

/**
 * A context chip with hover tooltip (route + effect + time left) and a click menu: effect,
 * start time, and a one-tap removal reason (task §3.2-C). Profile-derived chips point to the
 * profile instead (they are edited there, e.g. airway → controlled ventilation).
 */
export function ChipWithMenu({ item, hideSuffix }: { item: ContextItem; hideSuffix: boolean }) {
  const t = useT();
  const l = useL10n();
  const actions = useBedActions();
  const setPanel = useMonitor((s) => s.setPanel);
  const [open, setOpen] = useState(false);
  const remaining = item.remainingS !== undefined ? fmtCountdown(item.remainingS) : undefined;
  const fraction = item.remainingS !== undefined && item.totalS ? item.remainingS / item.totalS : 1;
  const label = l(item.label);

  const remove = (reason: RemovalReason) => {
    if (!item.entryId) return;
    if (item.source === 'event') actions.removeEvent(item.entryId, item.flag, reason);
    else actions.removeContext(item.entryId, item.flag, reason);
    setOpen(false);
  };

  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <Tooltip
        side="bottom"
        align="start"
        content={
          <div className="max-w-[360px]">
            <p className="flex items-center gap-1.5 text-xs opacity-80">
              <RouteIcon route={item.route} size={14} />
              {t.routes[item.route]}
              {remaining ? ` · ${t.context.tooltipDuration(remaining)}` : ` · ${t.chips.persistent}`}
            </p>
            <p className="mt-1">{l(item.effect)}</p>
          </div>
        }
      >
        <RP.Trigger asChild>
          <ContextChip kind={item.kind} route={item.route} label={label} remaining={remaining} fraction={fraction} hideSuffix={hideSuffix} aria-haspopup="dialog" />
        </RP.Trigger>
      </Tooltip>
      <RP.Portal>
        <RP.Content side="bottom" align="start" sideOffset={10} collisionPadding={16} className="z-50 w-[380px] rounded-card border-theme border-card-outline bg-card p-5 shadow-card hc:border-ink" aria-label={label}>
          <p className="text-lg font-semibold">{l(FLAGS[item.flag].label)}</p>
          {item.startedAt ? <p className="mt-0.5 text-sm text-muted">{t.entry.remove.started(fmtTime(item.startedAt, false))}{remaining ? ` · ${t.context.tooltipDuration(remaining)}` : ''}</p> : null}
          <FlagEffect flag={item.flag} className="mt-3" />
          {item.source === 'profile' ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-card-border pt-4 hc:border-ink">
              <p className="text-sm text-text-2">{t.entry.remove.fromProfile}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setPanel('profile', 'identity');
                }}
              >
                {t.entry.remove.editProfile}
              </Button>
            </div>
          ) : (
            <div className="mt-4 border-t border-card-border pt-4 hc:border-ink">
              <p id={`rm-${item.flag}`} className="mb-2 text-sm font-medium">
                {item.kind === 'timed' ? t.entry.remove.endEarly(label) : t.entry.remove.title(label)}
              </p>
              <div role="group" aria-labelledby={`rm-${item.flag}`} className="flex gap-2">
                {REASONS.map((r) => (
                  <Button key={r} variant="ghost" size="sm" onClick={() => remove(r)}>
                    {l(REMOVAL[r])}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
