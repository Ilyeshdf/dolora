import { useT } from '@/i18n';
import { useView } from '@/features/monitor/useView';
import { RouteLegend } from '@/components/ui/RouteIcon';
import { AddContextPopover } from './AddContextPopover';
import { BaselinePopover } from './BaselinePopover';
import { ChipWithMenu } from './ChipMenu';
import { LogEventPopover } from './LogEventPopover';

/**
 * Context bar (§6.3 + task §3.2-C/D/F): chips (hover = route + effect; click = details and
 * one-tap removal reason), "+ Add context" command popover, "Log event", route legend,
 * "Mark as baseline" checklist.
 */
export function ContextBar() {
  const t = useT();
  const context = useView().context;
  const crowded = context.length >= 3;

  return (
    <section aria-label={t.context.label} className="flex h-13 items-center gap-3 px-8 compact:h-12 compact:px-4">
      <h2 className="nowrap mr-2 text-sm font-medium text-text-2 compact:hidden">{t.context.label}</h2>
      <ul className="-my-1.5 flex min-w-0 items-center gap-3 overflow-x-auto overflow-y-hidden py-1.5 pl-1 compact:gap-2 [scrollbar-width:none]">
        {context.map((c) => (
          <li key={`${c.source}-${c.flag}`} className="shrink-0">
            <ChipWithMenu item={c} hideSuffix={crowded} />
          </li>
        ))}
      </ul>
      {/* entry controls never scroll out of view */}
      <div className="flex shrink-0 items-center gap-3 compact:gap-2">
        <AddContextPopover />
        <LogEventPopover />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-6">
        <RouteLegend className={crowded ? 'hidden' : 'compact:hidden'} />
        <BaselinePopover />
      </div>
    </section>
  );
}
