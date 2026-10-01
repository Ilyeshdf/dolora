import { referenceAllowsBaseline } from './profile';

/** Pure checklist (task §3.2-F) — exported for tests. */
export function baselineChecklist(input: {
  arousalZ: number | null;
  rass: number | null;
  lastRef: { scale: 'CPOT' | 'BPS' | 'NRS'; value: number; ageMin: number } | null;
  status: 'OK' | 'DEGRADED' | 'REJECTED';
}) {
  const calm = input.arousalZ !== null && input.arousalZ < 1 && (input.rass === null || (input.rass >= -2 && input.rass <= 1));
  const refFresh = !!input.lastRef && input.lastRef.ageMin <= 30;
  const lowRef = !!input.lastRef && refFresh && referenceAllowsBaseline(input.lastRef.scale, input.lastRef.value);
  const signals = input.status === 'OK';
  return { calm, refFresh, lowRef, signals, good: calm && lowRef && signals };
}

