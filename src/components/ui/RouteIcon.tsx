import { Anchor, Gauge, Scale } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export type Route = 'prior' | 'measurement' | 'baseline';

const ICONS = { prior: Scale, measurement: Gauge, baseline: Anchor } as const;

/** Route icons (§4.1): balance scale = prior, gauge = measurement, anchor = baseline. 1.75 px stroke. */
export function RouteIcon({ route, className, size = 18 }: { route: Route; className?: string; size?: number }) {
  const Icon = ICONS[route];
  return <Icon aria-hidden size={size} strokeWidth={1.75} className={cn('shrink-0', className)} />;
}

/** "Adjusts prior · Adjusts measurement · Adjusts baseline" legend (context bar, right side). */
export function RouteLegend({ className }: { className?: string }) {
  const t = useT();
  const items: { route: Route; label: string }[] = [
    { route: 'prior', label: t.routes.adjustsPrior },
    { route: 'measurement', label: t.routes.adjustsMeasurement },
    { route: 'baseline', label: t.routes.adjustsBaseline },
  ];
  return (
    <ul className={cn('flex items-center gap-5 text-sm text-muted', className)}>
      {items.map((i) => (
        <li key={i.route} className="nowrap flex items-center gap-1.5">
          <RouteIcon route={i.route} size={16} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
