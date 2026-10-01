/**
 * Raw engine output BEFORE the clinical-context layer (spec §3.8 stages 4–6 inputs).
 * Fixtures (Phase 2–3) and the simulator (Phase 4) produce this; `composeView` applies the
 * context effects (priors, masks, weights, widening, advisories) to obtain the MonitorView.
 */
import type { Feature } from '@/clinical/clinicalEffects';
import type { AlertView, L10n, PainView, SensorId, Status, TelemetryView, TimelineView } from './monitor';

export interface Likelihood {
  pain: number;
  stress: number;
  agitation: number;
  rest: number;
  unexplained: number;
}

export interface RawDriver {
  id: string;
  sensor: SensorId;
  feature: Feature;
  title: L10n;
  subline: L10n;
  direction: 'up' | 'down';
  /** Contribution before context weighting. */
  contribution: number;
  raw: { value: number; digits: number; unit: string };
  baseline: number;
  z: number;
  /** Signal quality of the source channel (r_c before clinical modifiers). */
  sqi: number;
  callout: { title: L10n; detail: L10n };
}

export interface RawSensor {
  state: 'ok' | 'degraded' | 'rejected' | 'derived';
  sqi: number;
  note?: L10n;
}

export interface RawState {
  patient: { ref: string; bed: number; setting: L10n; day: L10n };
  connection: 'live' | 'simulator' | 'reconnecting' | 'offline' | 'paused';
  /** Signal-quality status (OK / DEGRADED / REJECTED) before context. */
  status: Status;
  abstainReasons: { kind: 'rejected' | 'degraded'; text: L10n }[];
  lastValid: { score: number; ageS: number } | null;
  /** Head A estimate and interval gaps before context adjustments. */
  pain: (Pick<PainView, 'trend' | 'episode'> & { head: number; gapLo: number; gapHi: number }) | null;
  arousalZ: number | null;
  likelihood: Likelihood | null;
  drivers: RawDriver[];
  sensors: Partial<Record<SensorId, RawSensor>>;
  telemetry: TelemetryView[];
  /** Series + engine markers (alerts, ghosts, annotation, off-window reference). */
  timeline: Omit<TimelineView, 'regions' | 'references' | 'contextEvents'> & {
    regions: TimelineView['regions'];
  };
  alert: AlertView;
  /** Tonic EDA rising (sweating) — input to the glucose prompt rule. */
  edaRising: boolean;
  calibrating: { remainingS: number; totalS: number } | null;
}
