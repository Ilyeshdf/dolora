import { FLAGS, type Route } from '@/clinical/clinicalEffects';
import type { ActiveEffect } from '@/engine/effects';

/** Group active effects by route (an effect acting through two routes appears under both). */
export function groupByRoute(active: ActiveEffect[]): Record<Route, ActiveEffect[]> {
  const out: Record<Route, ActiveEffect[]> = { prior: [], measurement: [], baseline: [] };
  for (const a of active) for (const r of FLAGS[a.flag].routes) out[r].push(a);
  return out;
}

