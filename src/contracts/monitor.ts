/**
 * Monitor view model — what the Monitor screen renders. It mirrors the spec §5.1 `state` message
 * (extended per D-7: MASKED / DERIVED channel states, alert id + ack, advisories) plus the
 * history the timeline needs. Phase 2 fills it from fixtures (A1–A4); Phase 4 builds it from the
 * WebSocket / simulator stream through the same type.
 */
import type { AttributionShares } from '@/components/clinical/AttributionBar';
import type { Route } from '@/components/ui/RouteIcon';
import type { Mode, ConnectionKind, BaselineState } from '@/components/clinical/HeaderPills';
import type { HotspotState } from '@/components/clinical/SensorHotspot';

/** Engine-supplied text arrives in both languages (spec §5.1 `text_en` / `text_fr`). */
export interface L10n {
  en: string;
  fr: string;
}

export type Status = 'OK' | 'DEGRADED' | 'REJECTED';
export type SensorId = 'face' | 'ppg' | 'eda' | 'temp' | 'motion' | 'breathing';

export interface ContextItem {
  flag: string;
  label: L10n;
  route: Route;
  kind: 'persistent' | 'timed';
  /** Timed: seconds remaining / total. */
  remainingS?: number;
  totalS?: number;
  effect: L10n;
}

export type AlertView =
  | { kind: 'none' }
  | { kind: 'alert'; id: string; rule: L10n; since: string; elapsed: string }
  | { kind: 'acknowledged'; id: string; by: string; at: string }
  | { kind: 'advisory'; advisory: 'NMB' | 'UNAVAILABLE' };

export interface PainView {
  score: number;
  lo: number;
  hi: number;
  trend: { direction: 'rising' | 'falling' | 'stable'; slopePerMin: number };
  episode: { since: string; elapsed: string } | null;
  coverageValidated: boolean;
  notAttributed?: boolean;
}

export interface DriverView {
  id: string;
  sensor: SensorId;
  title: L10n;
  subline: L10n;
  direction: 'up' | 'down';
  contribution: number;
  weight?: number;
  /** Raw value + unit and the patient's baseline, formatted per locale by the UI. */
  raw: { value: number; digits: number; unit: string };
  baseline: number;
  z: number;
  reliability: number;
  /** Body-map callout (A1): heading + detail. */
  callout: { title: L10n; detail: L10n };
}

export interface ChannelView {
  state: HotspotState;
  /** Label suffix shown on the body map, e.g. "Masked (NMB)", "Reliability 0.28 · beta-blocker". */
  note?: L10n;
  sqi?: number;
  reliability?: number;
}

export interface TelemetryView {
  channel: 'ppg' | 'eda' | 'temp' | 'motion';
  value: L10n;
  state: 'ok' | 'degraded' | 'rejected' | 'masked';
  sub?: L10n;
  rejectedReason?: L10n;
}

/** Timeline sample (5 s resolution in fixtures). t = epoch ms. */
export interface TimelineSample {
  t: number;
  pain: number | null;
  lo: number | null;
  hi: number | null;
  z: number | null;
}

export interface TimelineView {
  /** Window end ("Now"). */
  now: number;
  samples: TimelineSample[];
  regions: { from: number; to: number; label: L10n; kind: 'event' | 'abstention' }[];
  alerts: { t: number; acknowledged: boolean; label: L10n }[];
  /** Mode-compare ghosts: where the other mode would alert (A10). */
  ghosts: { t: number; label: L10n }[];
  references: { t: number; scale: 'CPOT' | 'BPS' | 'NRS'; value: number }[];
  contextEvents: { t: number; label: L10n }[];
  /** Off-window reference marker at the left edge (A1 "CPOT 1 · 13:58 (35 min ago, before window)"). */
  beforeWindow?: { scale: 'CPOT' | 'BPS' | 'NRS'; value: number; time: string; agoMin: number };
  annotation?: { from: number; to: number; text: L10n };
}

export interface MonitorView {
  patient: { ref: string; bed: number; setting: L10n; day: L10n };
  mode: Mode;
  connection: ConnectionKind;
  baseline: BaselineState;
  status: Status;
  context: ContextItem[];
  alert: AlertView;
  pain: PainView | null;
  lastValid: { score: number; ageS: number } | null;
  abstainReasons: { kind: 'rejected' | 'degraded'; text: L10n }[];
  reducedSensors: L10n | null;
  arousalZ: number | null;
  attribution: AttributionShares | null;
  drivers: DriverView[];
  channels: Partial<Record<SensorId, ChannelView>>;
  telemetry: TelemetryView[];
  timeline: TimelineView;
  lastReference: { scale: 'CPOT' | 'BPS' | 'NRS'; value: number; ageMin: number } | null;
}
