/**
 * composeView — applies the clinical-context effect set to the raw engine output (spec §3.8,
 * task §3.4). Every clinician input therefore visibly changes: reliability rings, masked
 * hotspots, interval width, driver weight badges, attribution, advisories and status.
 * Pure; shared by the fixture source (Phase 2–3) and the simulator (Phase 4).
 */
import { FLAGS, flagLabel, type Feature, type FlagId } from '@/clinical/clinicalEffects';
import type { RefScale } from '@/clinical/profile';
import type { Mode } from '@/components/clinical/HeaderPills';
import type { AttributionShares } from '@/components/clinical/AttributionBar';
import type { RawState, Likelihood } from '@/contracts/engine';
import type {
  AlertView,
  ChannelView,
  ContextItem,
  DriverView,
  L10n,
  MonitorView,
  SensorId,
  TelemetryView,
  TimelineSample,
  TimelineView,
} from '@/contracts/monitor';
import { mulberry32 } from '@/lib/prng';
import { fmtTime } from '@/lib/time';
import type { ContextEntry, EffectSet, EventEntry, Removal } from './effects';

export interface ReferenceEntry {
  id: string;
  scale: RefScale;
  value: number;
  items: number[] | null;
  /** When the assessment was made (may be earlier than entry). */
  t: number;
  enteredAt: number;
  by: string;
  note: string;
  removed?: Removal;
}

export interface BaselineMark {
  at: number;
  quality: 'good' | 'provisional';
}

export interface ClinicalSnapshot {
  context: ContextEntry[];
  events: EventEntry[];
  references: ReferenceEntry[];
  baselineMark: BaselineMark | null;
  mode: Mode;
}

const L = (en: string, fr: string): L10n => ({ en, fr });
const MIN = 60_000;

export const SENSOR_FEATURES: Record<SensorId, Feature[]> = {
  face: ['face'],
  ppg: ['hr', 'hrv', 'pulse'],
  eda: ['eda'],
  temp: ['temp'],
  motion: ['motion'],
  breathing: ['resp'],
};
/** Feature that carries a sensor's displayed reliability (A4: PPG reliability = HR weight × SQI). */
const PRIMARY: Record<SensorId, Feature> = { face: 'face', ppg: 'hr', eda: 'eda', temp: 'temp', motion: 'motion', breathing: 'resp' };

export const FEATURE_LABEL: Record<Feature, L10n> = {
  hr: L('HR', 'FC'),
  hrv: L('HRV', 'VFC'),
  pulse: L('pulse amplitude', 'amplitude du pouls'),
  eda: L('skin conductance', 'conductance cutanée'),
  temp: L('temperature', 'température'),
  motion: L('motion', 'mouvement'),
  face: L('face', 'visage'),
  resp: L('breathing', 'respiration'),
};
const SENSOR_NAME: Record<SensorId, L10n> = {
  face: L('face', 'visage'),
  ppg: L('PPG', 'PPG'),
  eda: L('EDA', 'EDA'),
  temp: L('temperature', 'température'),
  motion: L('motion', 'mouvement'),
  breathing: L('breathing', 'respiration'),
};

/** Abbreviated flag names for compact notes (A4 "Masked (NMB)", "· beta-blocker"). */
const NOTE_NAME: Partial<Record<FlagId, L10n>> = {
  NMB: L('NMB', 'curare'),
  BETA_BLOCKER: L('beta-blocker', 'bêtabloquant'),
  VASOPRESSOR: L('norepinephrine', 'noradrénaline'),
  ATRIAL_FIBRILLATION: L('AF', 'FA'),
  PACED_RHYTHM: L('paced', 'stimulé'),
  ANTICHOLINERGIC: L('anticholinergic', 'anticholinergique'),
  CONTROLLED_VENTILATION: L('ventilation', 'ventilation'),
  VASOPRESSOR_DOSE_CHANGE: L('washout', 'washout'),
};
const noteName = (f: FlagId): L10n => NOTE_NAME[f] ?? { en: flagLabel(f).en.toLowerCase(), fr: flagLabel(f).fr.toLowerCase() };
const joinL = (xs: L10n[], sep = ', '): L10n => ({ en: xs.map((x) => x.en).join(sep), fr: xs.map((x) => x.fr).join(sep) });
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Events drawn as shaded regions (prior windows) vs. single context-event lines (A1, A2, A4). */
const REGION_EVENTS: FlagId[] = ['SUCTIONING', 'TURNING', 'WOUND_CARE', 'GENTLE_TOUCH', 'FAMILY_VISIT', 'AWAKENING_TRIAL'];
const TIMELINE_LABEL: Partial<Record<FlagId, L10n>> = { NMB: L('NMB bolus', 'Bolus curare') };

/* --------------------------------------------------------------- attribution & score */

export function shiftAttribution(lik: Likelihood, e: EffectSet): AttributionShares {
  const agitationMasked = e.weights.motion === 0;
  const raw = {
    pain: lik.pain * e.priors.pain,
    stress: lik.stress * e.priors.stress,
    agitation: agitationMasked ? 0 : lik.agitation * e.priors.agitation,
    rest: lik.rest * e.priors.rest,
    unexplained: lik.unexplained,
  };
  let sum = raw.pain + raw.stress + raw.agitation + raw.rest + raw.unexplained;
  const n = (v: number) => v / sum;
  let s = { pain: n(raw.pain), stress: n(raw.stress), agitation: n(raw.agitation), rest: n(raw.rest), unexplained: n(raw.unexplained) };
  if (e.attributionUncertainty > 0) {
    // Widen uncertainty (hyperactive delirium): move mass into "unexplained", proportionally.
    const u = Math.min(0.5, e.attributionUncertainty);
    s = { pain: s.pain * (1 - u), stress: s.stress * (1 - u), agitation: s.agitation * (1 - u), rest: s.rest * (1 - u), unexplained: s.unexplained * (1 - u) + u };
    sum = 1;
  }
  return { ...s, agitation: agitationMasked ? null : s.agitation };
}

function normLik(lik: Likelihood): number {
  return lik.pain / (lik.pain + lik.stress + lik.agitation + lik.rest + lik.unexplained);
}

/**
 * Displayed score responds to prior shifts through the pain share, damped (√, D-52):
 * score = head × √(p_pain / p_pain_without_context).
 */
export function scoreFactor(lik: Likelihood, shares: AttributionShares): number {
  return Math.sqrt(shares.pain / Math.max(1e-6, normLik(lik)));
}

/** Interval widening from masked / down-weighted channels (D-52). */
export function intervalWiden(e: EffectSet): number {
  const fullyMasked = (['face', 'motion', 'eda', 'temp'] as Feature[]).filter((f) => e.weights[f] === 0).length + (e.weights.hr === 0 && e.weights.pulse === 0 ? 1 : 0);
  const reduced = (['hr', 'pulse', 'eda', 'temp'] as Feature[]).reduce((acc, f) => acc + (e.weights[f] > 0 ? (1 - e.weights[f]) * 0.25 : 0), 0);
  return Math.min(2.2, 1 + 0.3 * fullyMasked + reduced);
}

/* ------------------------------------------------------------------------ channels */

function composeChannels(raw: RawState, e: EffectSet): Partial<Record<SensorId, ChannelView>> {
  const out: Partial<Record<SensorId, ChannelView>> = {};
  for (const [k, s] of Object.entries(raw.sensors) as [SensorId, NonNullable<RawState['sensors'][SensorId]>][]) {
    const feats = SENSOR_FEATURES[k];
    const masked = feats.filter((f) => e.weights[f] === 0);
    const w = e.weights[PRIMARY[k]];
    const reliability = r2(s.sqi * w);
    if (s.state === 'rejected') {
      out[k] = { state: 'rejected', sqi: s.sqi, reliability, note: s.note };
      continue;
    }
    if (masked.length > 0) {
      const flags = [...new Set(masked.flatMap((f) => e.maskedBy[f] ?? []))].map(noteName);
      const all = masked.length === feats.length;
      out[k] = {
        state: 'masked',
        sqi: s.sqi,
        reliability,
        note: all
          ? { en: `Masked (${joinL(flags).en})`, fr: `Masqué (${joinL(flags).fr})` }
          : { en: `${joinL(masked.map((f) => FEATURE_LABEL[f])).en} masked (${joinL(flags).en})`, fr: `${joinL(masked.map((f) => FEATURE_LABEL[f])).fr} masqué (${joinL(flags).fr})` },
      };
      continue;
    }
    if (w < 1 && reliability < 0.6) {
      const reducers = (e.reducedBy[PRIMARY[k]] ?? []).sort((a, b) => (FLAGS[a].reliability?.[PRIMARY[k]] ?? 1) - (FLAGS[b].reliability?.[PRIMARY[k]] ?? 1));
      const main = reducers[0];
      const rel = reliability.toFixed(2);
      out[k] = {
        state: 'degraded',
        sqi: s.sqi,
        reliability,
        note: main
          ? { en: `Reliability ${rel} · ${noteName(main).en}`, fr: `Fiabilité ${rel.replace('.', ',')} · ${noteName(main).fr}` }
          : { en: `Reliability ${rel}`, fr: `Fiabilité ${rel.replace('.', ',')}` },
      };
      continue;
    }
    out[k] = { state: s.state, sqi: s.sqi, reliability, note: s.note };
  }
  return out;
}

function composeTelemetry(raw: RawState, ch: Partial<Record<SensorId, ChannelView>>): TelemetryView[] {
  return raw.telemetry.map((row) => {
    const c = ch[row.channel];
    if (!c || row.state === 'rejected') return row;
    if (c.state === 'masked') {
      const allMasked = row.channel !== 'ppg' || (c.note?.en.startsWith('Masked') ?? false);
      return allMasked
        ? { ...row, state: 'masked', value: L('Masked', 'Masqué'), sub: undefined }
        : { ...row, state: 'degraded', sub: c.note };
    }
    if (c.state === 'degraded' && row.state === 'ok') {
      const rel = (c.reliability ?? 0).toFixed(2);
      return { ...row, state: 'degraded', sub: { en: `reliability ${rel}`, fr: `fiabilité ${rel.replace('.', ',')}` } };
    }
    return row;
  });
}

/* ------------------------------------------------------------------------ timeline */

function extendSamples(samples: TimelineSample[], now: number, pain: { score: number; lo: number; hi: number } | null, z: number | null): TimelineSample[] {
  const last = samples[samples.length - 1];
  if (!last || now - last.t < 5000) return samples;
  const out = samples.slice();
  const rnd = mulberry32(Math.floor(last.t / 1000));
  for (let t = last.t + 5000; t <= now; t += 5000) {
    const n = (rnd() - 0.5) * 0.3;
    out.push(
      pain
        ? { t, pain: +(pain.score + n).toFixed(2), lo: +(pain.lo + n).toFixed(2), hi: +(pain.hi + n).toFixed(2), z: z === null ? null : +(z + (rnd() - 0.5) * 0.2).toFixed(2) }
        : { t, pain: null, lo: null, hi: null, z: null },
    );
  }
  return out;
}

function composeTimeline(raw: RawState, c: ClinicalSnapshot, now: number, samples: TimelineSample[]): TimelineView {
  const regions: TimelineView['regions'] = [...raw.timeline.regions];
  const contextEvents: TimelineView['contextEvents'] = [];
  for (const ev of c.events) {
    if (ev.removed || ev.t > now) continue;
    const def = FLAGS[ev.event];
    if (REGION_EVENTS.includes(ev.event)) {
      regions.push({ from: ev.t, to: Math.min(now, ev.t + (def.durationMin ?? 2) * MIN), label: flagLabel(ev.event), kind: 'event' });
    } else {
      contextEvents.push({ t: ev.t, label: withTime(flagLabel(ev.event), ev.t) });
    }
  }
  for (const cx of c.context) {
    if (cx.removed || cx.startedAt > now) continue;
    contextEvents.push({ t: cx.startedAt, label: withTime(TIMELINE_LABEL[cx.flag] ?? flagLabel(cx.flag), cx.startedAt) });
  }
  // merge touching regions with the same label (repeated suctioning passes read as one band)
  regions.sort((a, b) => a.from - b.from);
  const merged: TimelineView['regions'] = [];
  for (const r of regions) {
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === r.kind && prev.label.en === r.label.en && r.from <= prev.to + 15_000) prev.to = Math.max(prev.to, r.to);
    else merged.push({ ...r });
  }
  return {
    ...raw.timeline,
    now,
    samples,
    regions: merged,
    contextEvents,
    references: c.references.filter((r) => !r.removed && r.t <= now).map((r) => ({ t: r.t, scale: r.scale, value: r.value })),
  };
}

/* ---------------------------------------------------------------------------- view */

export function composeView(raw: RawState, e: EffectSet, c: ClinicalSnapshot, now: number): MonitorView {
  const channels = composeChannels(raw, e);
  const rejectedBySignal = raw.status === 'REJECTED';
  const contextUnassessable = !rejectedBySignal && e.unassessable;
  const rejected = rejectedBySignal || contextUnassessable;
  const anyContextLoss = Object.values(channels).some((ch) => ch?.state === 'masked' || (ch?.state === 'degraded' && raw.status === 'OK'));
  const status = rejected ? 'REJECTED' : raw.status === 'DEGRADED' || anyContextLoss ? 'DEGRADED' : 'OK';

  const shares = raw.likelihood ? shiftAttribution(raw.likelihood, e) : null;

  let pain: MonitorView['pain'] = null;
  let composedScore: { score: number; lo: number; hi: number } | null = null;
  if (raw.pain && raw.likelihood && shares) {
    const score = Math.min(10, Math.max(0, raw.pain.head * scoreFactor(raw.likelihood, shares)));
    const widen = intervalWiden(e);
    const lo = Math.max(0, score - raw.pain.gapLo * widen);
    const hi = Math.min(10, score + raw.pain.gapHi * widen);
    composedScore = { score, lo, hi };
    pain = {
      score: r1(score),
      lo: r1(lo),
      hi: r1(hi),
      trend: raw.pain.trend,
      episode: raw.pain.episode,
      coverageValidated: false, // every clinical patient is outside the validated population (D-1)
      notAttributed: (raw.arousalZ ?? 0) >= 2 && shares.pain < 0.3,
    };
  }

  const reducedSensors = (['face', 'motion', 'eda', 'temp', 'ppg'] as SensorId[]).filter((k) => channels[k]?.state === 'masked' && SENSOR_FEATURES[k].every((f) => e.weights[f] === 0));

  const drivers: DriverView[] = raw.drivers
    .map((d) => {
      const w = e.weights[d.feature];
      return {
        id: d.id,
        sensor: d.sensor,
        title: d.title,
        subline: d.subline,
        direction: d.direction,
        contribution: r2(d.contribution * w),
        weight: w < 1 && w <= 0.6 ? r2(w) : undefined,
        raw: d.raw,
        baseline: d.baseline,
        z: d.z,
        reliability: r2(d.sqi * w),
        callout: d.callout,
        _w: w,
      };
    })
    .filter((d) => d._w > 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map(({ _w, ...d }) => (void _w, d));

  // context chips
  const order = { profile: 0, context: 1, event: 2 } as const;
  const context: ContextItem[] = e.active
    .filter((a) => !['SURGICAL_PRIOR', 'SKIN_EDA_SITE', 'SKIN_PPG_SITE', 'SKIN_TEMP_SITE'].includes(a.flag))
    .sort((a, b) => order[a.source] - order[b.source] || (a.startedAt ?? 0) - (b.startedAt ?? 0))
    .map((a) => {
      const def = FLAGS[a.flag];
      return {
        flag: a.flag,
        source: a.source,
        entryId: a.entryId,
        startedAt: a.startedAt,
        label: flagLabel(a.flag),
        route: def.routes[0] ?? 'measurement',
        kind: a.endsAt ? 'timed' : 'persistent',
        remainingS: a.endsAt ? Math.max(0, Math.round((a.endsAt - now) / 1000)) : undefined,
        totalS: def.durationMin ? def.durationMin * 60 : undefined,
        effect: def.effect,
      };
    });

  // alert slot precedence
  const washout = e.active.find((a) => a.flag === 'VASOPRESSOR_DOSE_CHANGE');
  const glucose =
    e.advisories.includes('GLUCOSE') && !!shares && shares.unexplained >= 0.2 && (raw.arousalZ ?? 0) >= 1 && raw.edaRising && !rejected;
  let alert: AlertView;
  if (raw.calibrating) alert = { kind: 'calibrating', remainingS: raw.calibrating.remainingS };
  else if (raw.alert.kind === 'alert' && !rejected) alert = raw.alert;
  else if (raw.alert.kind === 'acknowledged' && !rejected) alert = raw.alert;
  else if (rejected) alert = { kind: 'advisory', advisory: contextUnassessable ? 'UNASSESSABLE' : 'UNAVAILABLE' };
  else if (e.advisories.includes('NMB')) alert = { kind: 'advisory', advisory: 'NMB' };
  else if (washout?.endsAt) alert = { kind: 'advisory', advisory: 'WASHOUT', remainingS: Math.max(0, Math.round((washout.endsAt - now) / 1000)) };
  else if (glucose) alert = { kind: 'advisory', advisory: 'GLUCOSE' };
  else alert = { kind: 'none' };

  // last valid score when context makes the patient unassessable
  let lastValid = raw.lastValid;
  if (contextUnassessable && composedScore) {
    // age counts from the entry that removed the last reliable channel (masks EDA, face, motion or HR)
    const masks = (f: FlagId) => (['eda', 'face', 'motion', 'hr'] as Feature[]).some((k) => FLAGS[f].reliability?.[k] === 0);
    const cause = e.active.filter((a) => masks(a.flag) && (a.startedAt ?? 0) <= now).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
    lastValid = { score: r1(composedScore.score), ageS: Math.max(0, Math.round((now - (cause?.startedAt ?? now)) / 1000)) };
  }

  const reasons = contextUnassessable
    ? [
        {
          kind: 'rejected' as const,
          text: L('No reliable channel in this clinical context (CONTEXT_UNASSESSABLE)', 'Aucun canal fiable dans ce contexte clinique (CONTEXT_UNASSESSABLE)'),
        },
      ]
    : raw.abstainReasons;

  const samples = extendSamples(raw.timeline.samples, now, rejected ? null : composedScore, rejected ? null : raw.arousalZ);
  const refs = c.references.filter((r) => !r.removed && r.t <= now).sort((a, b) => b.t - a.t);
  const last = refs[0];

  // Calibration (A9): no scores until the personal baseline is learned.
  const cal = raw.calibrating;
  return {
    patient: raw.patient,
    mode: c.mode,
    connection: raw.connection,
    baseline: raw.calibrating ? 'calibrating' : e.recalibrationNeeded ? 'recalibration' : 'adaptive',
    baselineQuality: c.baselineMark?.quality ?? null,
    status,
    context,
    alert,
    pain: rejected || cal ? null : pain,
    lastValid: rejected ? lastValid : null,
    abstainReasons: rejected ? reasons : [],
    reducedSensors: !rejected && reducedSensors.length ? joinL(reducedSensors.map((k) => SENSOR_NAME[k])) : null,
    arousalZ: rejected || cal ? null : raw.arousalZ,
    attribution: rejected || cal ? null : shares,
    drivers: rejected || cal ? [] : drivers,
    channels,
    telemetry: composeTelemetry(raw, channels),
    timeline: composeTimeline(raw, c, now, samples),
    lastReference: last ? { scale: last.scale, value: last.value, ageMin: Math.max(0, Math.round((now - last.t) / MIN)) } : null,
    effects: e,
    calibrating: raw.calibrating,
    contextUnassessable,
    now,
  };
}

function withTime(l: L10n, t: number): L10n {
  const s = fmtTime(t);
  return { en: `${l.en} ${s}`, fr: `${l.fr} ${s}` };
}

function r1(v: number) {
  return Math.round(v * 10) / 10;
}
