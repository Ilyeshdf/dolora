import { Anchor } from 'lucide-react';
import { useL10n, useT } from '@/i18n';
import { fmtCountdown } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { Button } from '@/components/ui/Button';
import { AddChip, ContextChip } from '@/components/ui/Chip';
import { RouteIcon, RouteLegend } from '@/components/ui/RouteIcon';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * Context bar (§6.3). Chips show route + effect on hover/focus (§7.4-2). The add-context popover,
 * chip removal and baseline confirmation are Phase 3 (data entry); here the controls are present
 * and styled but only open their flows once those exist.
 */
export function ContextBar() {
  const t = useT();
  const l = useL10n();
  const context = useMonitor((s) => s.view.context);

  return (
    <section aria-label={t.context.label} className="flex h-13 items-center gap-3 px-8 compact:h-12 compact:px-4">
      <h2 className="nowrap mr-2 text-sm font-medium text-text-2 compact:hidden">{t.context.label}</h2>
      <ul className="flex min-w-0 items-center gap-3 overflow-hidden compact:gap-2">
        {context.map((c) => {
          const remaining = c.remainingS !== undefined ? fmtCountdown(c.remainingS) : undefined;
          const fraction = c.remainingS !== undefined && c.totalS ? c.remainingS / c.totalS : 1;
          return (
            <li key={c.flag} className="shrink-0">
              <Tooltip
                side="bottom"
                align="start"
                content={
                  <div className="max-w-[360px]">
                    <p className="flex items-center gap-1.5 text-xs opacity-80">
                      <RouteIcon route={c.route} size={14} />
                      {t.routes[c.route]}
                      {remaining ? ` · ${t.context.tooltipDuration(remaining)}` : ` · ${t.chips.persistent}`}
                    </p>
                    <p className="mt-1">{l(c.effect)}</p>
                  </div>
                }
              >
                <ContextChip kind={c.kind} route={c.route} label={l(c.label)} remaining={remaining} fraction={fraction} hideSuffix={context.length >= 3} />
              </Tooltip>
            </li>
          );
        })}
        <li className="shrink-0">
          <AddChip aria-haspopup="dialog" />
        </li>
      </ul>
      <div className="ml-auto flex shrink-0 items-center gap-6">
        <RouteLegend className="compact:hidden" />
        <Button variant="ghost" size="md" className="h-10 gap-2 px-4 text-md">
          <Anchor aria-hidden size={18} strokeWidth={1.75} />
          {t.baseline.markAsBaseline}
        </Button>
      </div>
    </section>
  );
}
