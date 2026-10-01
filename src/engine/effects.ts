/**
 * Clinical-context layer (spec §3.8 stages 1–3, task §3.4). Pure and deterministic: the UI uses
 * it to show "effects active now" and the engine / simulator uses it to adjust the output.
 */
import { FEATURES, FLAGS, type AdvisoryId, type Feature, type FlagId } from '@/clinical/clinicalEffects';
import { surgicalPrior, type PatientProfile } from '@/clinical/profile';

export type RemovalReason = 'stopped' | 'error' | 'other';

export interface Removal {
  at: number;
  by: string;
  reason: RemovalReason;
}

/** Medication / condition (persistent or timed class) recorded on the context bar. */
export interface ContextEntry {
  id: string;
  flag: FlagId;
  startedAt: number;
  enteredAt: number;
  by: string;
  removed?: Removal;
}

/** One-tap event (task §3.2-D). `t` = when it happened; `enteredAt` = when it was logged. */
export interface EventEntry {
  id: string;
  event: FlagId;
  t: number;
  enteredAt: number;
  by: string;
  removed?: Removal;
}

export interface ActiveEffect {
  flag: FlagId;
  source: 'context' | 'event' | 'profile';
  /** Context entry / event id (for removal from the context bar). */
  entryId?: string;
  startedAt?: number;
  endsAt?: number;
  /** Profile-derived surgical prior factor etc. */
  factor?: number;
}

export type Priors = { pain: number; stress: number; agitation: number; rest: number };

export interface EffectSet {
  active: ActiveEffect[];
  /** Π m(flag, feature) over active flags (1 = full weight, 0 = masked). */
  weights: Record<Feature, number>;
  maskedBy: Partial<Record<Feature, FlagId[]>>;
  reducedBy: Partial<Record<Feature, FlagId[]>>;
  priors: Priors;
  attributionUncertainty: number;
  advisories: AdvisoryId[];
  /** No reliable channel left: EDA masked and behavioural channels masked, or EDA and HR masked. */
  unassessable: boolean;
  /** A vasoactive dose change happened after the last baseline mark (spec §3.5). */
  recalibrationNeeded: boolean;
}

export interface EffectInput {
  profile: PatientProfile | null;
  context: ContextEntry[];
  events: EventEntry[];
  now: number;
  lastBaselineAt?: number | null;
}

const MIN = 60_000;

function isActiveTimed(start: number, durationMin: number | undefined, now: number) {
  if (start > now) return false;
  return durationMin === undefined || now < start + durationMin * MIN;
}

/** Flags derived from profile fields (airway, CAM-ICU, admission, core temperature, skin). */
function profileEffects(p: PatientProfile | null, now: number): ActiveEffect[] {
  if (!p) return [];
  const out: ActiveEffect[] = [];
  if (p.airway === 'controlled') out.push({ flag: 'CONTROLLED_VENTILATION', source: 'profile' });
  if (p.cam?.result === 'hyperactive') out.push({ flag: 'CAM_HYPERACTIVE', source: 'profile', startedAt: p.cam.at });
  const sp = surgicalPrior(p.admission, now);
  if (sp !== 1) out.push({ flag: 'SURGICAL_PRIOR', source: 'profile', factor: sp, startedAt: p.admission?.surgeryAt ?? undefined });
  if (p.coreTemp && p.coreTemp.valueC >= 38) out.push({ flag: 'FEVER', source: 'profile', startedAt: p.coreTemp.at });
  if (p.coreTemp && p.coreTemp.valueC < 35.5) out.push({ flag: 'HYPOTHERMIA', source: 'profile', startedAt: p.coreTemp.at });
  for (const s of p.skin) {
    const flag: FlagId = s.site === 'eda' ? 'SKIN_EDA_SITE' : s.site === 'ppg' ? 'SKIN_PPG_SITE' : 'SKIN_TEMP_SITE';
    if (!out.some((e) => e.flag === flag)) out.push({ flag, source: 'profile' });
  }
  return out;
}

export function activeEffects({ profile, context, events, now }: EffectInput): ActiveEffect[] {
  const out: ActiveEffect[] = [];
  for (const c of context) {
    if (c.removed) continue;
    const d = FLAGS[c.flag].durationMin;
    if (isActiveTimed(c.startedAt, d, now))
      out.push({ flag: c.flag, source: 'context', entryId: c.id, startedAt: c.startedAt, endsAt: d ? c.startedAt + d * MIN : undefined });
  }
  for (const e of events) {
    if (e.removed) continue;
    const d = FLAGS[e.event].durationMin;
    if (isActiveTimed(e.t, d, now))
      out.push({ flag: e.event, source: 'event', entryId: e.id, startedAt: e.t, endsAt: d ? e.t + d * MIN : undefined });
  }
  for (const p of profileEffects(profile, now)) {
    // a condition chip (e.g. FEVER) takes precedence over the same profile-derived flag
    if (!out.some((o) => o.flag === p.flag)) out.push(p);
  }
  // Several timed events of the same kind: keep the one ending last (one chip, one countdown).
  const byFlag = new Map<FlagId, ActiveEffect>();
  for (const e of out) {
    const prev = byFlag.get(e.flag);
    if (!prev || (e.endsAt ?? Infinity) > (prev.endsAt ?? Infinity)) byFlag.set(e.flag, e);
  }
  return [...byFlag.values()];
}

export function deriveEffects(input: EffectInput): EffectSet {
  const active = activeEffects(input);
  const weights = Object.fromEntries(FEATURES.map((f) => [f, 1])) as Record<Feature, number>;
  const maskedBy: EffectSet['maskedBy'] = {};
  const reducedBy: EffectSet['reducedBy'] = {};
  const priors: Priors = { pain: 1, stress: 1, agitation: 1, rest: 1 };
  let attributionUncertainty = 0;
  const advisories = new Set<EffectSet['advisories'][number]>();

  for (const a of active) {
    const def = FLAGS[a.flag];
    for (const [feat, m] of Object.entries(def.reliability ?? {}) as [Feature, number][]) {
      weights[feat] *= m;
      if (m === 0) (maskedBy[feat] ??= []).push(a.flag);
      else if (m < 1) (reducedBy[feat] ??= []).push(a.flag);
    }
    for (const [cls, m] of Object.entries(def.prior ?? {}) as [keyof Priors, number][]) priors[cls] *= m;
    if (a.flag === 'SURGICAL_PRIOR' && a.factor) priors.pain *= a.factor;
    attributionUncertainty += def.attributionUncertainty ?? 0;
    if (def.advisory) advisories.add(def.advisory);
  }

  const unassessable = (weights.eda === 0 && weights.face === 0 && weights.motion === 0) || (weights.eda === 0 && weights.hr === 0);
  const lastMark = input.lastBaselineAt ?? -Infinity;
  const recalibrationNeeded = input.events.some((e) => !e.removed && e.event === 'VASOPRESSOR_DOSE_CHANGE' && e.t <= input.now && e.t > lastMark);

  return {
    active,
    weights,
    maskedBy,
    reducedBy,
    priors,
    attributionUncertainty,
    advisories: [...advisories],
    unassessable,
    recalibrationNeeded,
  };
}

/** Flags in effect if `candidate` were added — used to warn before saving (task §3.3). */
export function wouldBeUnassessable(input: EffectInput, candidate: FlagId): boolean {
  if (deriveEffects(input).unassessable) return false;
  const probe: ContextEntry = { id: '__probe', flag: candidate, startedAt: input.now, enteredAt: input.now, by: '' };
  return deriveEffects({ ...input, context: [...input.context, probe] }).unassessable;
}
