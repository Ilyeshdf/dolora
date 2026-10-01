/**
 * Design fixtures — the four monitor states drawn in A1–A4 (*demo values*, not clinical data).
 * The CPOT/BPS dialog (A5), audit drawer (A6) and high-contrast theme (A7) are overlays / themes
 * on top of A1. Times are local wall-clock on 2 Oct 2026 (the demo day).
 * Reconciliations with the artboards are listed in DECISIONS.md D-44.
 */
import type { L10n, MonitorView, TimelineSample } from '@/contracts/monitor';
import { mulberry32 } from '@/lib/prng';

export type FixtureId = 'pain' | 'stress' | 'abstain' | 'degraded';
export const FIXTURE_IDS: FixtureId[] = ['pain', 'stress', 'abstain', 'degraded'];

const L = (en: string, fr: string): L10n => ({ en, fr });
const DAY = Date.UTC(2026, 9, 2); // reference midnight; rendered with UTC formatting for determinism
export const at = (hh: number, mm: number, ss = 0) => DAY + ((hh * 60 + mm) * 60 + ss) * 1000;

/** Deterministic 5 s history from a shape function (pain, half-width, z) + small noise. */
function history(
  from: number,
  to: number,
  seed: number,
  shape: (t: number) => { pain: number; half: number; z: number } | null,
): TimelineSample[] {
  const rnd = mulberry32(seed);
  const out: TimelineSample[] = [];
  for (let t = from; t <= to; t += 5000) {
    const s = shape(t);
    if (!s) {
      out.push({ t, pain: null, lo: null, hi: null, z: null });
      continue;
    }
    const n = (rnd() - 0.5) * 0.35;
    const pain = Math.max(0, Math.min(10, s.pain + n));
    const half = s.half + (rnd() - 0.5) * 0.1;
    out.push({
      t,
      pain: +pain.toFixed(2),
      lo: +Math.max(0, pain - half).toFixed(2),
      hi: +Math.min(10, pain + half).toFixed(2),
      z: +(s.z + (rnd() - 0.5) * 0.25).toFixed(2),
    });
  }
  return out;
}

/** Smooth step between a and b over [t0, t1]. */
function ramp(t: number, t0: number, t1: number, a: number, b: number) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const x = (t - t0) / (t1 - t0);
  return a + (b - a) * (x * x * (3 - 2 * x));
}

const PATIENT = { ref: 'P-7F3A', bed: 4, setting: L('ICU', 'Réa'), day: L('Post-op day 1', 'J1 post-op') };
const VENTILATION = {
  flag: 'CONTROLLED_VENTILATION',
  label: L('Controlled ventilation', 'Ventilation contrôlée'),
  route: 'measurement' as const,
  kind: 'persistent' as const,
  effect: L('Respiration features and HF-HRV disabled; upper face only.', 'Respiration et VFC-HF désactivées ; haut du visage uniquement.'),
};
const SUCTIONING = (remainingS: number) => ({
  flag: 'SUCTIONING',
  label: L('Suctioning', 'Aspiration'),
  route: 'prior' as const,
  kind: 'timed' as const,
  remainingS,
  totalS: 120,
  effect: L('Pain prior ×2.5 for 2 min.', 'A priori douleur ×2,5 pendant 2 min.'),
});

const T = {
  ppg: (hr: string) => L(`HR ${hr} bpm`, `FC ${hr} bpm`),
  eda: (v: string, vfr: string) => L(`${v} µS`, `${vfr} µS`),
  temp: (v: string, vfr: string) => L(`${v} °C`, `${vfr} °C`),
  motion: (v: string, vfr: string) => L(`${v} g`, `${vfr} g`),
};

const RULE_ICU = L('upper 80% bound ≥ 4 for 30 s', 'borne haute 80 % ≥ 4 pendant 30 s');

/* ------------------------------------------------------------------ A1 — pain episode + alert */

function painFixture(): MonitorView {
  const now = at(14, 32, 52);
  const from = now - 30 * 60_000;
  const onset = at(14, 30, 5);
  return {
    patient: PATIENT,
    mode: 'ICU',
    connection: 'simulator',
    baseline: 'adaptive',
    status: 'OK',
    context: [VENTILATION, SUCTIONING(84)],
    alert: { kind: 'alert', id: 'al-1431', rule: RULE_ICU, since: '14:31:40', elapsed: '1 min 12 s' },
    pain: {
      score: 6.4,
      lo: 4.3,
      hi: 8.1,
      trend: { direction: 'rising', slopePerMin: 0.9 },
      episode: { since: '14:30:21', elapsed: '2 min 31 s' },
      coverageValidated: false,
    },
    lastValid: null,
    abstainReasons: [],
    reducedSensors: null,
    arousalZ: 2.6,
    attribution: { pain: 0.68, stress: 0.14, agitation: 0.08, rest: 0.03, unexplained: 0.07 },
    drivers: [
      {
        id: 'eda_scr_rate',
        sensor: 'eda',
        title: L('Frequent skin-conductance responses', 'Réponses électrodermales fréquentes'),
        subline: L('9.0 /min · baseline 2.1', '9,0 /min · référence 2,1'),
        direction: 'up',
        contribution: 0.41,
        raw: { value: 9, digits: 1, unit: '/min' },
        baseline: 2.1,
        z: 2.8,
        reliability: 0.95,
        callout: {
          title: L('Frequent skin-conductance responses', 'Réponses électrodermales fréquentes'),
          detail: L('9 /min (baseline 2) · z 2.8', '9 /min (référence 2) · z 2,8'),
        },
      },
      {
        id: 'ppg_amp',
        sensor: 'ppg',
        title: L('Pulse amplitude reduced (vasoconstriction)', 'Amplitude du pouls réduite (vasoconstriction)'),
        subline: L('−38% vs baseline', '−38 % vs référence'),
        direction: 'down',
        contribution: 0.29,
        raw: { value: 0.62, digits: 2, unit: 'a.u.' },
        baseline: 1,
        z: -2.3,
        reliability: 0.97,
        callout: {
          title: L('Pulse amplitude −38% vs baseline', 'Amplitude du pouls −38 % vs référence'),
          detail: L('Vasoconstriction · z −2.3', 'Vasoconstriction · z −2,3'),
        },
      },
      {
        id: 'face_brow',
        sensor: 'face',
        title: L('Brow lowering & eye tightening', 'Froncement des sourcils et plissement des yeux'),
        subline: L('z 1.9 above baseline', 'z 1,9 au-dessus de la référence'),
        direction: 'up',
        contribution: 0.18,
        raw: { value: 1.4, digits: 1, unit: 'PSPI' },
        baseline: 0.3,
        z: 1.9,
        reliability: 0.9,
        callout: {
          title: L('Brow lowering & eye tightening', 'Froncement des sourcils et plissement des yeux'),
          detail: L('Facial expression · z 1.9', 'Expression faciale · z 1,9'),
        },
      },
    ],
    channels: {
      face: { state: 'ok', sqi: 0.9, reliability: 0.9 },
      ppg: { state: 'ok', sqi: 0.97, reliability: 0.97 },
      eda: { state: 'ok', sqi: 0.95, reliability: 0.95 },
      temp: { state: 'ok', sqi: 0.99, reliability: 0.99 },
      motion: { state: 'ok', sqi: 0.98, reliability: 0.98 },
    },
    telemetry: [
      { channel: 'ppg', value: T.ppg('104'), state: 'ok' },
      { channel: 'eda', value: T.eda('7.8', '7,8'), state: 'ok' },
      { channel: 'temp', value: T.temp('32.1', '32,1'), state: 'ok' },
      { channel: 'motion', value: T.motion('0.02', '0,02'), state: 'ok' },
    ],
    timeline: {
      now,
      samples: history(from, now, 42, (t) => ({
        pain: ramp(t, at(14, 30, 0), at(14, 32, 10), 1.3, 6.3),
        half: ramp(t, at(14, 30, 0), at(14, 32, 10), 0.4, 1.0),
        z: ramp(t, at(14, 30, 0), at(14, 31, 20), 0.9, 2.6),
      })),
      regions: [{ from: onset, to: now, label: L('Suctioning', 'Aspiration'), kind: 'event' }],
      alerts: [{ t: at(14, 31, 40), acknowledged: false, label: L('Alert 14:31:40', 'Alerte 14:31:40') }],
      ghosts: [],
      references: [],
      contextEvents: [],
      beforeWindow: { scale: 'CPOT', value: 1, time: '13:58', agoMin: 35 },
    },
    lastReference: { scale: 'CPOT', value: 1, ageMin: 35 },
  };
}

/* ------------------------------------------------------------- A2 — night, stress ≠ pain */

function stressFixture(): MonitorView {
  const now = at(20, 41, 40);
  const from = now - 30 * 60_000;
  const visit = at(20, 34, 20);
  return {
    patient: PATIENT,
    mode: 'ICU',
    connection: 'simulator',
    baseline: 'adaptive',
    status: 'OK',
    context: [
      {
        flag: 'FAMILY_VISIT',
        label: L('Family visit', 'Visite familiale'),
        route: 'prior',
        kind: 'timed',
        remainingS: 14 * 60,
        totalS: 20 * 60,
        effect: L('Stress prior ×1.5 for 20 min.', 'A priori stress ×1,5 pendant 20 min.'),
      },
    ],
    alert: { kind: 'none' },
    pain: {
      score: 1.8,
      lo: 0.6,
      hi: 3.2,
      trend: { direction: 'stable', slopePerMin: 0 },
      episode: null,
      coverageValidated: false,
      notAttributed: true,
    },
    lastValid: null,
    abstainReasons: [],
    reducedSensors: null,
    arousalZ: 2.5,
    attribution: { pain: 0.12, stress: 0.64, agitation: 0.09, rest: 0.08, unexplained: 0.07 },
    drivers: [
      {
        id: 'eda_scl',
        sensor: 'eda',
        title: L('Tonic skin conductance rising +1.9 µS', 'Conductance cutanée tonique en hausse +1,9 µS'),
        subline: L('9.6 µS · baseline 7.7', '9,6 µS · référence 7,7'),
        direction: 'up',
        contribution: 0.05,
        raw: { value: 9.6, digits: 1, unit: 'µS' },
        baseline: 7.7,
        z: 1.8,
        reliability: 0.95,
        callout: {
          title: L('Tonic skin conductance rising +1.9 µS', 'Conductance tonique en hausse +1,9 µS'),
          detail: L('EDA · 9.6 µS (baseline 7.7)', 'EDA · 9,6 µS (référence 7,7)'),
        },
      },
      {
        id: 'hr',
        sensor: 'ppg',
        title: L('Heart rate +14 bpm above baseline', 'Fréquence cardiaque +14 bpm'),
        subline: L('92 bpm · baseline 78', '92 bpm · référence 78'),
        direction: 'up',
        contribution: 0.04,
        raw: { value: 92, digits: 0, unit: 'bpm' },
        baseline: 78,
        z: 1.7,
        reliability: 0.96,
        callout: {
          title: L('Heart rate +14 bpm above baseline', 'Fréquence cardiaque +14 bpm'),
          detail: L('PPG · 92 bpm (baseline 78)', 'PPG · 92 bpm (référence 78)'),
        },
      },
      {
        id: 'resp_irregular',
        sensor: 'breathing',
        title: L('Irregular breathing pattern · z 1.6', 'Respiration irrégulière · z 1,6'),
        subline: L('Derived from PPG', 'Dérivé du PPG'),
        direction: 'up',
        contribution: -0.03,
        raw: { value: 0.31, digits: 2, unit: 'CV' },
        baseline: 0.12,
        z: 1.6,
        reliability: 0.8,
        callout: {
          title: L('Irregular breathing pattern · z 1.6', 'Respiration irrégulière · z 1,6'),
          detail: L('Derived from PPG', 'Dérivé du PPG'),
        },
      },
    ],
    channels: {
      face: { state: 'ok' },
      ppg: { state: 'ok' },
      eda: { state: 'ok' },
      temp: { state: 'ok' },
      motion: { state: 'ok' },
      breathing: { state: 'derived', note: L('PPG-derived', 'dérivé du PPG') },
    },
    telemetry: [
      { channel: 'ppg', value: T.ppg('92'), state: 'ok' },
      { channel: 'eda', value: T.eda('9.6', '9,6'), state: 'ok' },
      { channel: 'temp', value: T.temp('32.6', '32,6'), state: 'ok' },
      { channel: 'motion', value: T.motion('0.03', '0,03'), state: 'ok' },
    ],
    timeline: {
      now,
      samples: history(from, now, 7, (t) => ({
        pain: 1.6,
        half: 0.6,
        z: ramp(t, visit, at(20, 37, 0), 0.8, 2.5),
      })),
      regions: [{ from: visit, to: now, label: L('Family visit', 'Visite familiale'), kind: 'event' }],
      alerts: [],
      ghosts: [],
      references: [],
      contextEvents: [],
      annotation: { from: at(20, 39, 30), to: now, text: L('Arousal ≠ Pain', 'Activation ≠ Douleur') },
    },
    lastReference: { scale: 'CPOT', value: 0, ageMin: 52 },
  };
}

/* ---------------------------------------------------------- A3 — abstention, motion artifact */

function abstainFixture(): MonitorView {
  const now = at(14, 36, 55);
  const from = now - 30 * 60_000;
  const abst = at(14, 36, 10);
  return {
    patient: PATIENT,
    mode: 'ICU',
    connection: 'simulator',
    baseline: 'adaptive',
    status: 'REJECTED',
    context: [VENTILATION],
    alert: { kind: 'advisory', advisory: 'UNAVAILABLE' },
    pain: null,
    lastValid: { score: 5.9, ageS: 45 },
    abstainReasons: [
      { kind: 'rejected', text: L('Movement artifact — pulse waveform irregular', 'Artefact de mouvement — onde de pouls irrégulière') },
      { kind: 'degraded', text: L('High motion on wrist sensor', 'Mouvement important sur le capteur du poignet') },
    ],
    reducedSensors: null,
    arousalZ: null,
    attribution: null,
    drivers: [],
    channels: {
      face: { state: 'ok' },
      ppg: { state: 'rejected', note: L('rejected', 'rejeté') },
      eda: { state: 'degraded', note: L('degraded', 'dégradé') },
      temp: { state: 'ok' },
      motion: { state: 'degraded', note: L('degraded', 'dégradé') },
    },
    telemetry: [
      { channel: 'ppg', value: L('HR —', 'FC —'), state: 'rejected', rejectedReason: L('Signal rejected: motion', 'Signal rejeté : mouvement') },
      { channel: 'eda', value: T.eda('7.1', '7,1'), state: 'degraded' },
      { channel: 'temp', value: T.temp('32.0', '32,0'), state: 'ok' },
      { channel: 'motion', value: T.motion('0.84', '0,84'), state: 'degraded' },
    ],
    timeline: {
      now,
      samples: history(from, now, 11, (t) =>
        t >= abst
          ? null
          : {
              pain: ramp(t, at(14, 29, 50), at(14, 32, 30), 1.2, 5.9),
              half: ramp(t, at(14, 29, 50), at(14, 32, 30), 0.4, 1.0),
              z: ramp(t, at(14, 29, 50), at(14, 31, 0), 0.9, 2.4),
            },
      ),
      regions: [
        { from: at(14, 29, 50), to: at(14, 33, 50), label: L('Suctioning', 'Aspiration'), kind: 'event' },
        { from: abst, to: now, label: L('Abstention · 14:36:10 – now', 'Abstention · 14:36:10 – maint.'), kind: 'abstention' },
      ],
      alerts: [{ t: at(14, 31, 40), acknowledged: false, label: L('Alert 14:31:40', 'Alerte 14:31:40') }],
      ghosts: [],
      references: [{ t: at(14, 33, 40), scale: 'CPOT', value: 4 }],
      contextEvents: [],
    },
    lastReference: { scale: 'CPOT', value: 4, ageMin: 3 },
  };
}

/* ----------------------------------------------------- A4 — degraded, clinical context (NMB) */

function degradedFixture(): MonitorView {
  const now = at(14, 52, 50);
  const from = now - 30 * 60_000;
  return {
    patient: PATIENT,
    mode: 'ICU',
    connection: 'simulator',
    baseline: 'adaptive',
    status: 'DEGRADED',
    context: [
      {
        flag: 'NMB',
        label: L('Neuromuscular blockade', 'Curarisation'),
        route: 'measurement',
        kind: 'persistent',
        effect: L('Face and motion masked. Behavioural assessment impossible.', 'Visage et mouvement masqués. Évaluation comportementale impossible.'),
      },
      {
        flag: 'NOREPINEPHRINE',
        label: L('Norepinephrine', 'Noradrénaline'),
        route: 'measurement',
        kind: 'persistent',
        effect: L('Pulse-amplitude weight 0.3, temperature 0.5.', "Poids de l'amplitude du pouls 0,3, température 0,5."),
      },
      {
        flag: 'BETA_BLOCKER',
        label: L('Beta-blocker', 'Bêtabloquant'),
        route: 'measurement',
        kind: 'persistent',
        effect: L(
          'Heart-rate weight reduced to 0.3. Skin conductance unaffected (sweat glands are cholinergic).',
          'Poids de la fréquence cardiaque réduit à 0,3. Conductance cutanée non affectée (glandes sudoripares cholinergiques).',
        ),
      },
    ],
    alert: { kind: 'advisory', advisory: 'NMB' },
    pain: {
      score: 5.2,
      lo: 2.9,
      hi: 7.8,
      trend: { direction: 'stable', slopePerMin: 0 },
      episode: null,
      coverageValidated: false,
    },
    lastValid: null,
    abstainReasons: [],
    reducedSensors: L('face, motion', 'visage, mouvement'),
    arousalZ: 1.9,
    attribution: { pain: 0.58, stress: 0.17, agitation: null, rest: 0.1, unexplained: 0.15 },
    drivers: [
      {
        id: 'eda_scr_rate',
        sensor: 'eda',
        title: L('Frequent skin-conductance responses', 'Réponses électrodermales fréquentes'),
        subline: L('8.0 /min · baseline 2.1', '8,0 /min · référence 2,1'),
        direction: 'up',
        contribution: 0.38,
        raw: { value: 8, digits: 1, unit: '/min' },
        baseline: 2.1,
        z: 2.6,
        reliability: 0.95,
        callout: { title: L('Frequent skin-conductance responses', 'Réponses électrodermales fréquentes'), detail: L('8 /min (baseline 2) · z 2.6', '8 /min (référence 2) · z 2,6') },
      },
      {
        id: 'eda_scl',
        sensor: 'eda',
        title: L('Skin conductance level +2.4 µS', 'Niveau de conductance cutanée +2,4 µS'),
        subline: L('10.2 µS · baseline 7.8', '10,2 µS · référence 7,8'),
        direction: 'up',
        contribution: 0.22,
        raw: { value: 10.2, digits: 1, unit: 'µS' },
        baseline: 7.8,
        z: 2.1,
        reliability: 0.95,
        callout: { title: L('Skin conductance level +2.4 µS', 'Conductance cutanée +2,4 µS'), detail: L('10.2 µS (baseline 7.8)', '10,2 µS (référence 7,8)') },
      },
      {
        id: 'hr',
        sensor: 'ppg',
        title: L('Heart rate +6 bpm', 'Fréquence cardiaque +6 bpm'),
        subline: L('71 bpm · baseline 65', '71 bpm · référence 65'),
        direction: 'up',
        contribution: 0.03,
        weight: 0.3,
        raw: { value: 71, digits: 0, unit: 'bpm' },
        baseline: 65,
        z: 0.9,
        reliability: 0.28,
        callout: { title: L('Heart rate +6 bpm', 'Fréquence cardiaque +6 bpm'), detail: L('Weight ×0.3 · beta-blocker', 'Poids ×0,3 · bêtabloquant') },
      },
    ],
    channels: {
      face: { state: 'masked', note: L('Masked (NMB)', 'Masqué (curarisation)') },
      ppg: { state: 'degraded', note: L('Reliability 0.28 · beta-blocker', 'Fiabilité 0,28 · bêtabloquant'), reliability: 0.28 },
      eda: { state: 'ok' },
      temp: { state: 'ok' },
      motion: { state: 'masked', note: L('Masked (NMB)', 'Masqué (curarisation)') },
    },
    telemetry: [
      { channel: 'ppg', value: T.ppg('71'), state: 'degraded', sub: L('reliability 0.28', 'fiabilité 0,28') },
      { channel: 'eda', value: T.eda('10.2', '10,2'), state: 'ok' },
      { channel: 'temp', value: T.temp('31.8', '31,8'), state: 'ok' },
      { channel: 'motion', value: L('Masked', 'Masqué'), state: 'masked' },
    ],
    timeline: {
      now,
      samples: history(from, now, 23, () => ({ pain: 5.0, half: 2.3, z: 1.9 })),
      regions: [],
      alerts: [{ t: at(14, 47, 15), acknowledged: true, label: L('Alert (acknowledged)', 'Alerte (prise en compte)') }],
      ghosts: [],
      references: [],
      contextEvents: [{ t: at(14, 44, 0), label: L('NMB bolus 14:44:00', 'Bolus curare 14:44:00') }],
    },
    lastReference: { scale: 'BPS', value: 6, ageMin: 22 },
  };
}

export const FIXTURES: Record<FixtureId, () => MonitorView> = {
  pain: painFixture,
  stress: stressFixture,
  abstain: abstainFixture,
  degraded: degradedFixture,
};

/** Audit entries shown in A6 (newest first). */
export const A6_AUDIT = [
  { t: at(14, 32, 52), actor: 'clinician', who: 'DR', kind: 'alert', action: L('Alert acknowledged', 'Alerte prise en compte'), detail: L('“Possible unmanaged pain”', '« Douleur possiblement non traitée »') },
  { t: at(14, 31, 40), actor: 'system', kind: 'alert', action: L('Alert fired', 'Alerte déclenchée'), detail: L('Rule upper 80% bound ≥ 4 for 30 s · pain 6.1 (4.0 – 7.9)', 'Règle borne haute 80 % ≥ 4 pendant 30 s · douleur 6,1 (4,0 – 7,9)') },
  { t: at(14, 30, 5), actor: 'clinician', who: 'DR', kind: 'context', action: L('Context added', 'Contexte ajouté'), detail: L('Suctioning (prior ×2.5, 2 min)', 'Aspiration (a priori ×2,5, 2 min)') },
  { t: at(14, 12, 0), actor: 'clinician', who: 'DR', kind: 'mode', action: L('Mode changed', 'Mode modifié'), detail: L('Ward → ICU (confirmed)', 'Service → Réa (confirmé)') },
  { t: at(13, 58, 30), actor: 'clinician', who: 'DR', kind: 'baseline', action: L('Baseline marked', 'Référence définie'), detail: L('Quality: good', 'Qualité : bonne') },
  { t: at(13, 58, 10), actor: 'clinician', who: 'DR', kind: 'assessment', action: L('CPOT recorded', 'CPOT enregistré'), detail: L('Total 1 / 8', 'Total 1 / 8') },
  { t: at(13, 40, 0), actor: 'system', kind: 'system', action: L('Connection', 'Connexion'), detail: L('Simulator mode', 'Mode simulateur') },
] as const;
