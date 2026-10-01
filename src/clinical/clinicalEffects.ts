/**
 * ALGOS‑Δ clinical-context effects — the single typed source shared by the UI ("Effect on
 * ALGOS‑Δ" lines, chips, summaries) and the engine/simulator (`deriveEffects`, `composeView`).
 *
 * Values come from spec §4.2 (flag table) and §4.3 (reliability matrix m(flag, channel)).
 * Entries marked `assumption: true` are not in the spec; they are documented expert priors
 * (DECISIONS.md D-51) — "All modifier values are expert priors to be documented and validated".
 */
import type { L10n } from '@/contracts/monitor';

export type Route = 'prior' | 'measurement' | 'baseline';
/** Engine features (spec §4.3 columns, plus respiration from PPG). */
export type Feature = 'hr' | 'hrv' | 'pulse' | 'eda' | 'temp' | 'motion' | 'face' | 'resp';
export const FEATURES: Feature[] = ['hr', 'hrv', 'pulse', 'eda', 'temp', 'motion', 'face', 'resp'];

export type FlagKind = 'medication' | 'condition' | 'event' | 'profile';
export type AdvisoryId = 'NMB' | 'SCI' | 'GLUCOSE' | 'WASHOUT';

export type FlagId =
  // medication classes (task §3.2-A step 2)
  | 'BETA_BLOCKER'
  | 'ALPHA2_AGONIST'
  | 'ANTICHOLINERGIC'
  | 'NMB'
  | 'VASOPRESSOR'
  | 'INOTROPE_BETA_AGONIST'
  | 'SEDATIVE'
  | 'OPIOID_INFUSION'
  | 'VASODILATOR'
  // conditions
  | 'ATRIAL_FIBRILLATION'
  | 'PACED_RHYTHM'
  | 'AUTONOMIC_NEUROPATHY'
  | 'SCI_T6_OR_ABOVE'
  | 'PAD_RAYNAUD'
  | 'SEPSIS'
  | 'FEVER'
  | 'HYPOTHERMIA'
  | 'INSULIN_DIABETES'
  // events (task §3.2-D)
  | 'SUCTIONING'
  | 'TURNING'
  | 'OPIOID_BOLUS'
  | 'VASOPRESSOR_DOSE_CHANGE'
  | 'WOUND_CARE'
  | 'GENTLE_TOUCH'
  | 'FAMILY_VISIT'
  | 'AWAKENING_TRIAL'
  // derived from the profile
  | 'CONTROLLED_VENTILATION'
  | 'CAM_HYPERACTIVE'
  | 'SURGICAL_PRIOR'
  | 'SKIN_EDA_SITE'
  | 'SKIN_PPG_SITE'
  | 'SKIN_TEMP_SITE';

export interface FlagDef {
  id: FlagId;
  kind: FlagKind;
  label: L10n;
  /** Short chip label (falls back to label). */
  short?: L10n;
  /** Examples shown under the class name (no doses — data minimisation, task §3.1-4). */
  examples?: L10n;
  routes: Route[];
  /** Timed flags: active for this many minutes from their start (spec §4.2 "timed"). */
  durationMin?: number;
  /** Medications whose class requires a start time in the picker. */
  asksStartTime?: boolean;
  /** m(flag, feature) — 1 when absent; 0 = masked by context (D-7). */
  reliability?: Partial<Record<Feature, number>>;
  /** Prior multipliers on attribution classes (Saerens shift, spec §3.8-3). */
  prior?: Partial<Record<'pain' | 'stress' | 'agitation' | 'rest', number>>;
  /** Extra uncertainty on attribution (adds to "unexplained"), e.g. hyperactive delirium. */
  attributionUncertainty?: number;
  advisory?: AdvisoryId;
  /** Baseline route effects. */
  baseline?: { recalibrateAfter?: boolean; hrCorrection?: L10n; expectedHr?: 'rise' };
  /** Plain-language effect for "Effect on ALGOS‑Δ" lines and chip tooltips. */
  effect: L10n;
  assumption?: boolean;
}

const L = (en: string, fr: string): L10n => ({ en, fr });

export const FLAGS: Record<FlagId, FlagDef> = {
  /* ------------------------------------------------------------------ medications */
  BETA_BLOCKER: {
    id: 'BETA_BLOCKER',
    kind: 'medication',
    label: L('Beta-blocker', 'Bêtabloquant'),
    routes: ['measurement'],
    reliability: { hr: 0.3, hrv: 0.6 },
    effect: L(
      'Heart-rate weight 0.3, HRV 0.6; skin conductance unaffected (sweat glands are cholinergic).',
      'Poids FC 0,3, VFC 0,6 ; conductance cutanée non affectée (glandes sudoripares cholinergiques).',
    ),
  },
  ALPHA2_AGONIST: {
    id: 'ALPHA2_AGONIST',
    kind: 'medication',
    label: L('α2-agonist', 'Agoniste α2'),
    examples: L('dexmedetomidine, clonidine', 'dexmédétomidine, clonidine'),
    routes: ['measurement'],
    reliability: { hr: 0.4, hrv: 0.5, pulse: 0.6, eda: 0.5, face: 0.8 },
    effect: L('HR 0.4, HRV 0.5, pulse amplitude 0.6, skin conductance 0.5, face 0.8.', 'FC 0,4, VFC 0,5, amplitude du pouls 0,6, conductance 0,5, visage 0,8.'),
  },
  ANTICHOLINERGIC: {
    id: 'ANTICHOLINERGIC',
    kind: 'medication',
    label: L('Anticholinergic', 'Anticholinergique'),
    examples: L('atropine, glycopyrrolate', 'atropine, glycopyrrolate'),
    routes: ['measurement', 'baseline'],
    durationMin: 60,
    asksStartTime: true,
    reliability: { hr: 0.2, hrv: 0.5, eda: 0 },
    baseline: { expectedHr: 'rise' },
    effect: L('Skin conductance masked for 60 min; heart-rate rise expected (HR 0.2).', 'Conductance cutanée masquée 60 min ; hausse de FC attendue (FC 0,2).'),
  },
  NMB: {
    id: 'NMB',
    kind: 'medication',
    label: L('Neuromuscular blocker', 'Curare (bloqueur neuromusculaire)'),
    short: L('Neuromuscular blockade', 'Curarisation'),
    routes: ['measurement'],
    reliability: { face: 0, motion: 0 },
    advisory: 'NMB',
    effect: L('Face and motion masked — behavioural assessment impossible; autonomic signals only.', 'Visage et mouvement masqués — évaluation comportementale impossible ; signaux autonomes uniquement.'),
  },
  VASOPRESSOR: {
    id: 'VASOPRESSOR',
    kind: 'medication',
    label: L('Vasopressor', 'Vasopresseur'),
    short: L('Norepinephrine', 'Noradrénaline'),
    examples: L('norepinephrine, phenylephrine', 'noradrénaline, phényléphrine'),
    routes: ['measurement'],
    reliability: { hr: 0.8, hrv: 0.8, pulse: 0.3, temp: 0.5 },
    effect: L('Pulse amplitude 0.3, skin temperature 0.5 (vasoconstriction floor), HR 0.8.', 'Amplitude du pouls 0,3, température cutanée 0,5 (vasoconstriction), FC 0,8.'),
  },
  INOTROPE_BETA_AGONIST: {
    id: 'INOTROPE_BETA_AGONIST',
    kind: 'medication',
    label: L('Inotrope / β-agonist', 'Inotrope / β-agoniste'),
    examples: L('dobutamine, epinephrine', 'dobutamine, adrénaline'),
    routes: ['measurement', 'baseline'],
    reliability: { hr: 0.4, hrv: 0.6 },
    baseline: { expectedHr: 'rise' },
    effect: L('Heart-rate rise expected; HR weight 0.4, HRV 0.6.', 'Hausse de FC attendue ; poids FC 0,4, VFC 0,6.'),
    assumption: true,
  },
  SEDATIVE: {
    id: 'SEDATIVE',
    kind: 'medication',
    label: L('Propofol / benzodiazepine', 'Propofol / benzodiazépine'),
    routes: ['measurement'],
    reliability: { face: 0.7, motion: 0.8 },
    effect: L('Behavioural signals damped: face 0.7, motion 0.8.', 'Signaux comportementaux atténués : visage 0,7, mouvement 0,8.'),
    assumption: true,
  },
  OPIOID_INFUSION: {
    id: 'OPIOID_INFUSION',
    kind: 'medication',
    label: L('Opioid infusion', 'Opioïde en perfusion'),
    routes: ['prior'],
    prior: { pain: 0.7 },
    effect: L('Continuous analgesia: pain prior ×0.7.', 'Analgésie continue : a priori douleur ×0,7.'),
    assumption: true,
  },
  VASODILATOR: {
    id: 'VASODILATOR',
    kind: 'medication',
    label: L('Vasodilator', 'Vasodilatateur'),
    routes: ['measurement'],
    reliability: { pulse: 0.6, temp: 0.6 },
    effect: L('Pulse amplitude 0.6, skin temperature 0.6.', 'Amplitude du pouls 0,6, température cutanée 0,6.'),
    assumption: true,
  },

  /* ------------------------------------------------------------------- conditions */
  ATRIAL_FIBRILLATION: {
    id: 'ATRIAL_FIBRILLATION',
    kind: 'condition',
    label: L('Atrial fibrillation', 'Fibrillation atriale'),
    routes: ['measurement'],
    reliability: { hrv: 0, pulse: 0.8 },
    effect: L('HRV disabled (irregular rhythm); pulse amplitude 0.8.', 'VFC désactivée (rythme irrégulier) ; amplitude du pouls 0,8.'),
  },
  PACED_RHYTHM: {
    id: 'PACED_RHYTHM',
    kind: 'condition',
    label: L('Paced rhythm', 'Rythme électro-entraîné'),
    routes: ['measurement'],
    reliability: { hr: 0, hrv: 0 },
    effect: L('Heart rate and HRV disabled (set by the pacemaker).', 'FC et VFC désactivées (fixées par le stimulateur).'),
  },
  AUTONOMIC_NEUROPATHY: {
    id: 'AUTONOMIC_NEUROPATHY',
    kind: 'condition',
    label: L('Autonomic / diabetic neuropathy', 'Neuropathie autonome / diabétique'),
    routes: ['measurement'],
    reliability: { hr: 0.6, hrv: 0.4, pulse: 0.8, eda: 0.3, temp: 0.8 },
    effect: L('Skin conductance 0.3, HRV 0.4, HR 0.6 — blunted autonomic responses.', 'Conductance 0,3, VFC 0,4, FC 0,6 — réponses autonomes émoussées.'),
  },
  SCI_T6_OR_ABOVE: {
    id: 'SCI_T6_OR_ABOVE',
    kind: 'condition',
    label: L('Spinal cord injury ≥ T6', 'Lésion médullaire ≥ T6'),
    routes: ['measurement'],
    advisory: 'SCI',
    effect: L(
      'Inverted response possible: bradycardia and sweating above the lesion may signal pain below it.',
      'Réponse inversée possible : bradycardie et sudation au-dessus de la lésion peuvent signaler une douleur en dessous.',
    ),
  },
  PAD_RAYNAUD: {
    id: 'PAD_RAYNAUD',
    kind: 'condition',
    label: L("Peripheral arterial disease / Raynaud's", 'Artériopathie périphérique / Raynaud'),
    routes: ['measurement'],
    reliability: { pulse: 0.5, temp: 0.5 },
    effect: L('Pulse amplitude 0.5, skin temperature 0.5 (poor distal perfusion).', 'Amplitude du pouls 0,5, température cutanée 0,5 (perfusion distale faible).'),
    assumption: true,
  },
  SEPSIS: {
    id: 'SEPSIS',
    kind: 'condition',
    label: L('Sepsis', 'Sepsis'),
    routes: ['measurement'],
    reliability: { hr: 0.6, hrv: 0.4, pulse: 0.5, eda: 0.7, temp: 0.3, motion: 0.7 },
    effect: L('HR 0.6, HRV 0.4, pulse amplitude 0.5, temperature 0.3, skin conductance 0.7.', 'FC 0,6, VFC 0,4, amplitude 0,5, température 0,3, conductance 0,7.'),
  },
  FEVER: {
    id: 'FEVER',
    kind: 'condition',
    label: L('Fever', 'Fièvre'),
    routes: ['baseline', 'measurement'],
    reliability: { hr: 0.6, hrv: 0.4, pulse: 0.5, eda: 0.7, temp: 0.3, motion: 0.7 },
    baseline: { hrCorrection: L('HR corrected ≈ 9 bpm per °C', 'FC corrigée ≈ 9 bpm par °C') },
    effect: L('Heart rate corrected for core temperature (≈ 9 bpm/°C); shivering read as thermoregulation.', 'FC corrigée selon la température centrale (≈ 9 bpm/°C) ; frissons = thermorégulation.'),
  },
  HYPOTHERMIA: {
    id: 'HYPOTHERMIA',
    kind: 'condition',
    label: L('Hypothermia', 'Hypothermie'),
    routes: ['measurement'],
    reliability: { motion: 0.5, pulse: 0.6, temp: 0.5 },
    effect: L('Shivering and vasoconstriction expected: motion 0.5, pulse amplitude 0.6.', 'Frissons et vasoconstriction attendus : mouvement 0,5, amplitude 0,6.'),
    assumption: true,
  },
  INSULIN_DIABETES: {
    id: 'INSULIN_DIABETES',
    kind: 'condition',
    label: L('Insulin-treated diabetes', 'Diabète insulino-traité'),
    short: L('Insulin-treated diabetes', 'Diabète sous insuline'),
    routes: ['prior'],
    advisory: 'GLUCOSE',
    effect: L('Hypoglycaemia risk: unexplained arousal with sweating prompts a glucose check.', 'Risque d’hypoglycémie : une activation inexpliquée avec sudation propose un contrôle glycémique.'),
  },

  /* ----------------------------------------------------------------------- events */
  SUCTIONING: {
    id: 'SUCTIONING',
    kind: 'event',
    label: L('Suctioning', 'Aspiration'),
    routes: ['prior'],
    durationMin: 2,
    prior: { pain: 2.5 },
    effect: L('Pain prior ×2.5 for 2 min.', 'A priori douleur ×2,5 pendant 2 min.'),
  },
  TURNING: {
    id: 'TURNING',
    kind: 'event',
    label: L('Turning / repositioning', 'Retournement / mobilisation'),
    short: L('Turning', 'Mobilisation'),
    routes: ['prior'],
    durationMin: 3,
    prior: { pain: 2 },
    effect: L('Pain prior ×2 for 3 min.', 'A priori douleur ×2 pendant 3 min.'),
  },
  OPIOID_BOLUS: {
    id: 'OPIOID_BOLUS',
    kind: 'event',
    label: L('Opioid bolus', "Bolus d'opioïde"),
    routes: ['prior'],
    durationMin: 30,
    prior: { pain: 0.5 },
    effect: L('Pain prior ×0.5 for 30 min (true analgesia).', 'A priori douleur ×0,5 pendant 30 min (analgésie réelle).'),
  },
  VASOPRESSOR_DOSE_CHANGE: {
    id: 'VASOPRESSOR_DOSE_CHANGE',
    kind: 'event',
    label: L('Vasopressor dose changed', 'Dose de vasopresseur modifiée'),
    short: L('Vasopressor washout', 'Washout vasopresseur'),
    routes: ['baseline', 'measurement'],
    durationMin: 15,
    reliability: { hr: 0.5, hrv: 0.5, pulse: 0, temp: 0 },
    advisory: 'WASHOUT',
    baseline: { recalibrateAfter: true },
    effect: L('15-min washout: pulse amplitude and temperature masked; recalibration needed afterwards.', 'Washout 15 min : amplitude du pouls et température masquées ; recalibration ensuite.'),
  },
  WOUND_CARE: {
    id: 'WOUND_CARE',
    kind: 'event',
    label: L('Wound care / drain removal', 'Soin de plaie / ablation de drain'),
    short: L('Wound care', 'Soin de plaie'),
    routes: ['prior'],
    durationMin: 5,
    prior: { pain: 2 },
    effect: L('Pain prior ×2 for 5 min.', 'A priori douleur ×2 pendant 5 min.'),
    assumption: true,
  },
  GENTLE_TOUCH: {
    id: 'GENTLE_TOUCH',
    kind: 'event',
    label: L('Gentle touch (non-painful care)', 'Toucher doux (soin non douloureux)'),
    short: L('Gentle touch', 'Toucher doux'),
    routes: ['prior'],
    durationMin: 2,
    prior: { pain: 0.7, rest: 1.3 },
    effect: L('Non-nociceptive arousal expected for 2 min: pain prior ×0.7.', 'Activation non nociceptive attendue 2 min : a priori douleur ×0,7.'),
  },
  FAMILY_VISIT: {
    id: 'FAMILY_VISIT',
    kind: 'event',
    label: L('Family visit', 'Visite familiale'),
    routes: ['prior'],
    durationMin: 20,
    prior: { stress: 1.5 },
    effect: L('Stress prior ×1.5 for 20 min.', 'A priori stress ×1,5 pendant 20 min.'),
  },
  AWAKENING_TRIAL: {
    id: 'AWAKENING_TRIAL',
    kind: 'event',
    label: L('Awakening trial', "Fenêtre d'éveil"),
    routes: ['prior'],
    durationMin: 20,
    prior: { stress: 1.5, agitation: 1.5 },
    effect: L('Stress and agitation priors ×1.5 for 20 min.', 'A priori stress et agitation ×1,5 pendant 20 min.'),
    assumption: true,
  },

  /* ---------------------------------------------------------------- profile-derived */
  CONTROLLED_VENTILATION: {
    id: 'CONTROLLED_VENTILATION',
    kind: 'profile',
    label: L('Controlled ventilation', 'Ventilation contrôlée'),
    routes: ['measurement'],
    reliability: { hrv: 0.5, pulse: 0.7, resp: 0 },
    effect: L('Respiration features and HF-HRV disabled; upper face only.', 'Respiration et VFC-HF désactivées ; haut du visage uniquement.'),
  },
  CAM_HYPERACTIVE: {
    id: 'CAM_HYPERACTIVE',
    kind: 'profile',
    label: L('Hyperactive delirium', 'Délire hyperactif'),
    routes: ['prior'],
    attributionUncertainty: 0.1,
    effect: L('Agitation is ambiguous: attribution uncertainty widened (+10 % unexplained).', "Agitation ambiguë : incertitude d'attribution élargie (+10 % inexpliqué)."),
  },
  SURGICAL_PRIOR: {
    id: 'SURGICAL_PRIOR',
    kind: 'profile',
    label: L('Recent surgery', 'Chirurgie récente'),
    routes: ['prior'],
    effect: L('Expected post-operative pain trajectory adjusts the pain prior.', 'La trajectoire douloureuse post-opératoire attendue ajuste l’a priori douleur.'),
  },
  SKIN_EDA_SITE: {
    id: 'SKIN_EDA_SITE',
    kind: 'profile',
    label: L('Skin problem at EDA site', 'Peau altérée au site EDA'),
    routes: ['measurement'],
    reliability: { eda: 0.6 },
    effect: L('Skin conductance 0.6 — consider another electrode site.', 'Conductance 0,6 — envisager un autre site d’électrode.'),
    assumption: true,
  },
  SKIN_PPG_SITE: {
    id: 'SKIN_PPG_SITE',
    kind: 'profile',
    label: L('Skin problem at PPG site', 'Peau altérée au site PPG'),
    routes: ['measurement'],
    reliability: { pulse: 0.6, hr: 0.8 },
    effect: L('Pulse amplitude 0.6, HR 0.8.', 'Amplitude du pouls 0,6, FC 0,8.'),
    assumption: true,
  },
  SKIN_TEMP_SITE: {
    id: 'SKIN_TEMP_SITE',
    kind: 'profile',
    label: L('Skin problem at temperature site', 'Peau altérée au site de température'),
    routes: ['measurement'],
    reliability: { temp: 0.7 },
    effect: L('Skin temperature 0.7.', 'Température cutanée 0,7.'),
    assumption: true,
  },
};

export const MEDICATIONS: FlagId[] = [
  'BETA_BLOCKER',
  'ALPHA2_AGONIST',
  'ANTICHOLINERGIC',
  'NMB',
  'VASOPRESSOR',
  'INOTROPE_BETA_AGONIST',
  'SEDATIVE',
  'OPIOID_INFUSION',
  'VASODILATOR',
];
export const CONDITIONS: FlagId[] = [
  'ATRIAL_FIBRILLATION',
  'PACED_RHYTHM',
  'AUTONOMIC_NEUROPATHY',
  'SCI_T6_OR_ABOVE',
  'PAD_RAYNAUD',
  'SEPSIS',
  'FEVER',
  'HYPOTHERMIA',
  'INSULIN_DIABETES',
];
export const EVENTS: FlagId[] = [
  'SUCTIONING',
  'TURNING',
  'OPIOID_BOLUS',
  'VASOPRESSOR_DOSE_CHANGE',
  'WOUND_CARE',
  'GENTLE_TOUCH',
  'FAMILY_VISIT',
  'AWAKENING_TRIAL',
];

/** Surgical / admission categories and their prior (expected pain trajectory, assumption D-51). */
export const ADMISSION = {
  thoracic: { label: L('Thoracic', 'Thoracique'), pain: 1.3 },
  upperAbdominal: { label: L('Upper abdominal', 'Abdominale haute'), pain: 1.3 },
  orthopaedic: { label: L('Orthopaedic', 'Orthopédique'), pain: 1.2 },
  cardiac: { label: L('Cardiac', 'Cardiaque'), pain: 1.2 },
  neuro: { label: L('Neuro', 'Neurochirurgie'), pain: 1.1 },
  trauma: { label: L('Trauma', 'Traumatologie'), pain: 1.3 },
  medical: { label: L('Medical / non-surgical', 'Médical / non chirurgical'), pain: 1.0 },
  other: { label: L('Other', 'Autre'), pain: 1.0 },
} as const;
export type AdmissionCategory = keyof typeof ADMISSION;
/** The surgical prior applies for the first 72 h after surgery and then fades out. */
export const SURGICAL_PRIOR_HOURS = 72;

export function flagLabel(id: FlagId, short = true): L10n {
  const f = FLAGS[id];
  return (short && f.short) || f.label;
}

/** Timed items (events, timed medication classes) ask when they started; persistent ones are added now. */
export function needsStartTime(flag: FlagId) {
  const d = FLAGS[flag];
  return d.kind === 'event' || !!d.asksStartTime;
}
