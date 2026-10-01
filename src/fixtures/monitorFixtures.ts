/**
 * Design fixtures — A1–A4 (*demo values*, not clinical data) expressed as RAW engine output plus
 * the clinical context that was active. `designToRaw` inverts the context layer so that
 * composeView(raw, deriveEffects(seed)) reproduces the artboard numbers exactly; changing the
 * context afterwards (remove NMB, add an opioid bolus…) visibly changes the view (task §3.4).
 * Reconciliations with the artboards: DECISIONS.md D-44 / D-53.
 */
import type { Feature } from "@/clinical/clinicalEffects";
import type { PatientProfile } from "@/clinical/profile";
import type { AttributionShares } from "@/components/clinical/AttributionBar";
import type {
  Likelihood,
  RawDriver,
  RawSensor,
  RawState,
} from "@/contracts/engine";
import type {
  AlertView,
  L10n,
  PainView,
  SensorId,
  TelemetryView,
  TimelineSample,
} from "@/contracts/monitor";
import {
  deriveEffects,
  type ContextEntry,
  type EffectSet,
  type EventEntry,
} from "@/engine/effects";
import {
  intervalWiden,
  type BaselineMark,
  type ReferenceEntry,
} from "@/engine/compose";
import { mulberry32 } from "@/lib/prng";
import type { AuditSeed } from "@/store/auditTypes";

export type FixtureId = "pain" | "stress" | "abstain" | "degraded";
export const FIXTURE_IDS: FixtureId[] = [
  "pain",
  "stress",
  "abstain",
  "degraded",
];

const L = (en: string, fr: string): L10n => ({ en, fr });
const DAY = Date.UTC(2026, 9, 2);
export const at = (hh: number, mm: number, ss = 0) =>
  DAY + ((hh * 60 + mm) * 60 + ss) * 1000;
const H = 3_600_000;

export interface Seed {
  profile: PatientProfile | null;
  context: ContextEntry[];
  events: EventEntry[];
  references: ReferenceEntry[];
  baselineMark: BaselineMark | null;
  mode: "ICU" | "WARD";
  audit: AuditSeed[];
}

export interface Fixture {
  raw: RawState;
  seed: Seed;
  now: number;
}

/* ------------------------------------------------------------------ history helpers */

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

function ramp(t: number, t0: number, t1: number, a: number, b: number) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const x = (t - t0) / (t1 - t0);
  return a + (b - a) * (x * x * (3 - 2 * x));
}

/* ------------------------------------------------------------- design → raw inversion */

interface DesignDriver extends Omit<RawDriver, "contribution" | "sqi"> {
  contribution: number;
  reliability: number;
}

interface Design {
  pain: {
    score: number;
    lo: number;
    hi: number;
    trend: PainView["trend"];
    episode: PainView["episode"];
  } | null;
  shares: AttributionShares | null;
  /** Raw agitation share when the design shows it as n/a (motion masked). */
  agitationIfMasked?: number;
  drivers: DesignDriver[];
}

function designToRaw(
  d: Design,
  e: EffectSet,
): Pick<RawState, "pain" | "likelihood" | "drivers"> {
  let likelihood: Likelihood | null = null;
  if (d.shares) {
    const s = d.shares;
    const ag = s.agitation ?? d.agitationIfMasked ?? 0.05;
    const scale = s.agitation === null ? 1 - ag : 1;
    const shares = {
      pain: s.pain * scale,
      stress: s.stress * scale,
      agitation: ag,
      rest: s.rest * scale,
      unexplained: s.unexplained * scale,
    };
    const lk = {
      pain: shares.pain / e.priors.pain,
      stress: shares.stress / e.priors.stress,
      agitation: shares.agitation / e.priors.agitation,
      rest: shares.rest / e.priors.rest,
      unexplained: shares.unexplained,
    };
    const sum = lk.pain + lk.stress + lk.agitation + lk.rest + lk.unexplained;
    likelihood = {
      pain: lk.pain / sum,
      stress: lk.stress / sum,
      agitation: lk.agitation / sum,
      rest: lk.rest / sum,
      unexplained: lk.unexplained / sum,
    };
  }
  let pain: RawState["pain"] = null;
  if (d.pain && likelihood && d.shares) {
    const factor = Math.sqrt(d.shares.pain / likelihood.pain);
    const widen = intervalWiden(e);
    pain = {
      head: d.pain.score / factor,
      gapLo: (d.pain.score - d.pain.lo) / widen,
      gapHi: (d.pain.hi - d.pain.score) / widen,
      trend: d.pain.trend,
      episode: d.pain.episode,
    };
  }
  const drivers: RawDriver[] = d.drivers.map(
    ({ reliability, contribution, ...rest }) => {
      const w = e.weights[rest.feature] || 1;
      return {
        ...rest,
        contribution: contribution / w,
        sqi: Math.min(1, Math.max(0.5, reliability / w)),
      };
    },
  );
  return { pain, likelihood, drivers };
}

/* ------------------------------------------------------------------- shared pieces */

const PATIENT_4 = {
  ref: "P-7F3A",
  bed: 4,
  setting: L("ICU", "Réa"),
  day: L("Post-op day 1", "J1 post-op"),
};

function profile4(
  now: number,
  airway: PatientProfile["airway"],
): PatientProfile {
  return {
    patientRef: "P-7F3A",
    bedId: "4",
    ageYears: 64,
    sex: "male",
    careSetting: "ICU",
    communication: "none",
    airway,
    admission: { category: "thoracic", surgeryAt: now - 26 * H },
    rass: { value: -2, at: now - (3 * H + 40 * 60_000) },
    cam: { result: "negative", at: now - (3 * H + 40 * 60_000) },
    medsReviewed: true,
    conditionsReviewed: true,
    coreTemp: null,
    skin: [],
    note: "",
  };
}

const ok = (sqi: number): RawSensor => ({ state: "ok", sqi });
const T = {
  ppg: (hr: string) => L(`HR ${hr} bpm`, `FC ${hr} bpm`),
  eda: (v: string, vfr: string) => L(`${v} µS`, `${vfr} µS`),
  temp: (v: string, vfr: string) => L(`${v} °C`, `${vfr} °C`),
  motion: (v: string, vfr: string) => L(`${v} g`, `${vfr} g`),
};
const tele = (
  ppg: string,
  eda: [string, string],
  temp: [string, string],
  motion: [string, string],
): TelemetryView[] => [
  { channel: "ppg", value: T.ppg(ppg), state: "ok" },
  { channel: "eda", value: T.eda(...eda), state: "ok" },
  { channel: "temp", value: T.temp(...temp), state: "ok" },
  { channel: "motion", value: T.motion(...motion), state: "ok" },
];
const RULE_ICU = L(
  "upper 80% bound ≥ 4 for 30 s",
  "borne haute 80 % ≥ 4 pendant 30 s",
);

let idSeq = 0;
const id = (p: string) => `${p}-fx${++idSeq}`;
const ev = (event: EventEntry["event"], t: number, by = "DR"): EventEntry => ({
  id: id("ev"),
  event,
  t,
  enteredAt: t,
  by,
});
const cx = (
  flag: ContextEntry["flag"],
  startedAt: number,
  by = "DR",
): ContextEntry => ({
  id: id("cx"),
  flag,
  startedAt,
  enteredAt: startedAt,
  by,
});
const ref = (
  scale: ReferenceEntry["scale"],
  value: number,
  t: number,
): ReferenceEntry => ({
  id: id("ref"),
  scale,
  value,
  items: null,
  t,
  enteredAt: t,
  by: "DR",
  note: "",
});

function build(
  seed: Seed,
  now: number,
  d: Design,
  rest: Omit<RawState, "pain" | "likelihood" | "drivers">,
): Fixture {
  const e = deriveEffects({
    profile: seed.profile,
    context: seed.context,
    events: seed.events,
    now,
    lastBaselineAt: seed.baselineMark?.at,
  });
  return { raw: { ...rest, ...designToRaw(d, e) }, seed, now };
}

function drv(
  idName: string,
  sensor: SensorId,
  feature: Feature,
  title: L10n,
  subline: L10n,
  direction: "up" | "down",
  contribution: number,
  raw: RawDriver["raw"],
  baseline: number,
  z: number,
  reliability: number,
  callout: RawDriver["callout"],
): DesignDriver {
  return {
    id: idName,
    sensor,
    feature,
    title,
    subline,
    direction,
    contribution,
    raw,
    baseline,
    z,
    reliability,
    callout,
  };
}

const AUDIT_A6: AuditSeed[] = [
  {
    t: at(13, 40, 0),
    actor: "system",
    kind: "system",
    action: L("Connection", "Connexion"),
    detail: L("Simulator mode", "Mode simulateur"),
  },
  {
    t: at(13, 58, 10),
    actor: "clinician",
    who: "DR",
    kind: "assessment",
    action: L("CPOT recorded", "CPOT enregistré"),
    detail: L("Total 1 / 8", "Total 1 / 8"),
  },
  {
    t: at(13, 58, 30),
    actor: "clinician",
    who: "DR",
    kind: "baseline",
    action: L("Baseline marked", "Référence définie"),
    detail: L("Quality: good", "Qualité : bonne"),
  },
  {
    t: at(14, 12, 0),
    actor: "clinician",
    who: "DR",
    kind: "mode",
    action: L("Mode changed", "Mode modifié"),
    detail: L("Ward → ICU (confirmed)", "Service → Réa (confirmé)"),
  },
];
const SUCTION_AUDIT = (t: number): AuditSeed => ({
  t,
  actor: "clinician",
  who: "DR",
  kind: "context",
  action: L("Event logged", "Événement enregistré"),
  detail: L(
    "Suctioning (prior ×2.5, 2 min)",
    "Aspiration (a priori ×2,5, 2 min)",
  ),
});
const ALERT_AUDIT: AuditSeed = {
  t: at(14, 31, 40),
  actor: "system",
  kind: "alert",
  action: L("Alert fired", "Alerte déclenchée"),
  detail: L(
    "Rule upper 80% bound ≥ 4 for 30 s · pain 6.1 (4.0 – 7.9)",
    "Règle borne haute 80 % ≥ 4 pendant 30 s · douleur 6,1 (4,0 – 7,9)",
  ),
};

/* ------------------------------------------------------------------ A1 — pain + alert */

function painFixture(): Fixture {
  const now = at(14, 32, 52);
  const seed: Seed = {
    profile: profile4(now, "controlled"),
    context: [],
    // two suctioning passes (D-53): the chip counts down the second, the band spans both
    events: [ev("SUCTIONING", at(14, 30, 5)), ev("SUCTIONING", at(14, 32, 16))],
    references: [ref("CPOT", 1, at(13, 58, 10))],
    baselineMark: { at: at(13, 58, 30), quality: "good" },
    mode: "ICU",
    audit: [
      ...AUDIT_A6,
      SUCTION_AUDIT(at(14, 30, 5)),
      ALERT_AUDIT,
      SUCTION_AUDIT(at(14, 32, 16)),
    ],
  };
  const alert: AlertView = {
    kind: "alert",
    id: "al-1431",
    rule: RULE_ICU,
    since: "14:31:40",
    elapsed: "1 min 12 s",
  };
  return build(
    seed,
    now,
    {
      pain: {
        score: 6.4,
        lo: 4.3,
        hi: 8.1,
        trend: { direction: "rising", slopePerMin: 0.9 },
        episode: { since: "14:30:21", elapsed: "2 min 31 s" },
      },
      shares: {
        pain: 0.68,
        stress: 0.14,
        agitation: 0.08,
        rest: 0.03,
        unexplained: 0.07,
      },
      drivers: [
        drv(
          "eda_scr_rate",
          "eda",
          "eda",
          L(
            "Frequent skin-conductance responses",
            "Réponses électrodermales fréquentes",
          ),
          L("9.0 /min · baseline 2.1", "9,0 /min · référence 2,1"),
          "up",
          0.41,
          { value: 9, digits: 1, unit: "/min" },
          2.1,
          2.8,
          0.95,
          {
            title: L(
              "Frequent skin-conductance responses",
              "Réponses électrodermales fréquentes",
            ),
            detail: L(
              "9 /min (baseline 2) · z 2.8",
              "9 /min (référence 2) · z 2,8",
            ),
          },
        ),
        drv(
          "ppg_amp",
          "ppg",
          "pulse",
          L(
            "Pulse amplitude reduced (vasoconstriction)",
            "Amplitude du pouls réduite (vasoconstriction)",
          ),
          L("−38% vs baseline", "−38 % vs référence"),
          "down",
          0.29,
          { value: 0.62, digits: 2, unit: "a.u." },
          1,
          -2.3,
          0.97,
          {
            title: L(
              "Pulse amplitude −38% vs baseline",
              "Amplitude du pouls −38 % vs référence",
            ),
            detail: L("Vasoconstriction · z −2.3", "Vasoconstriction · z −2,3"),
          },
        ),
        drv(
          "face_brow",
          "face",
          "face",
          L(
            "Brow lowering & eye tightening",
            "Froncement des sourcils et plissement des yeux",
          ),
          L("z 1.9 above baseline", "z 1,9 au-dessus de la référence"),
          "up",
          0.18,
          { value: 1.4, digits: 1, unit: "PSPI" },
          0.3,
          1.9,
          0.9,
          {
            title: L(
              "Brow lowering & eye tightening",
              "Froncement des sourcils et plissement des yeux",
            ),
            detail: L(
              "Facial expression · z 1.9",
              "Expression faciale · z 1,9",
            ),
          },
        ),
      ],
    },
    {
      patient: PATIENT_4,
      connection: "simulator",
      status: "OK",
      abstainReasons: [],
      lastValid: null,
      arousalZ: 2.6,
      sensors: {
        face: ok(0.9),
        ppg: ok(0.97),
        eda: ok(0.95),
        temp: ok(0.99),
        motion: ok(0.98),
      },
      telemetry: tele(
        "104",
        ["7.8", "7,8"],
        ["32.1", "32,1"],
        ["0.02", "0,02"],
      ),
      timeline: {
        now,
        samples: history(now - 30 * 60_000, now, 42, (t) => ({
          pain: ramp(t, at(14, 30, 0), at(14, 32, 10), 1.3, 6.3),
          half: ramp(t, at(14, 30, 0), at(14, 32, 10), 0.4, 1.0),
          z: ramp(t, at(14, 30, 0), at(14, 31, 20), 0.9, 2.6),
        })),
        regions: [],
        alerts: [
          {
            t: at(14, 31, 40),
            acknowledged: false,
            label: L("Alert 14:31:40", "Alerte 14:31:40"),
          },
        ],
        ghosts: [],
      },
      alert,
      edaRising: true,
      calibrating: null,
    },
  );
}

/* --------------------------------------------------------- A2 — night, stress ≠ pain */

function stressFixture(): Fixture {
  const now = at(20, 41, 40);
  const visit = at(20, 35, 40); // 20-min flag with 14 min left
  const seed: Seed = {
    profile: {
      ...profile4(now, "spontaneous"),
      rass: { value: -1, at: now - 2 * H },
    },
    context: [],
    events: [ev("FAMILY_VISIT", visit)],
    references: [ref("CPOT", 0, now - 52 * 60_000)],
    baselineMark: { at: at(13, 58, 30), quality: "good" },
    mode: "ICU",
    audit: [
      ...AUDIT_A6,
      {
        t: visit,
        actor: "clinician",
        who: "DR",
        kind: "context",
        action: L("Event logged", "Événement enregistré"),
        detail: L(
          "Family visit (stress prior ×1.5, 20 min)",
          "Visite familiale (a priori stress ×1,5, 20 min)",
        ),
      },
    ],
  };
  return build(
    seed,
    now,
    {
      pain: {
        score: 1.8,
        lo: 0.6,
        hi: 3.2,
        trend: { direction: "stable", slopePerMin: 0 },
        episode: null,
      },
      shares: {
        pain: 0.12,
        stress: 0.64,
        agitation: 0.09,
        rest: 0.08,
        unexplained: 0.07,
      },
      drivers: [
        drv(
          "eda_scl",
          "eda",
          "eda",
          L(
            "Tonic skin conductance rising +1.9 µS",
            "Conductance cutanée tonique en hausse +1,9 µS",
          ),
          L("9.6 µS · baseline 7.7", "9,6 µS · référence 7,7"),
          "up",
          0.05,
          { value: 9.6, digits: 1, unit: "µS" },
          7.7,
          1.8,
          0.95,
          {
            title: L(
              "Tonic skin conductance rising +1.9 µS",
              "Conductance tonique en hausse +1,9 µS",
            ),
            detail: L(
              "EDA · 9.6 µS (baseline 7.7)",
              "EDA · 9,6 µS (référence 7,7)",
            ),
          },
        ),
        drv(
          "hr",
          "ppg",
          "hr",
          L("Heart rate +14 bpm above baseline", "Fréquence cardiaque +14 bpm"),
          L("92 bpm · baseline 78", "92 bpm · référence 78"),
          "up",
          0.04,
          { value: 92, digits: 0, unit: "bpm" },
          78,
          1.7,
          0.96,
          {
            title: L(
              "Heart rate +14 bpm above baseline",
              "Fréquence cardiaque +14 bpm",
            ),
            detail: L(
              "PPG · 92 bpm (baseline 78)",
              "PPG · 92 bpm (référence 78)",
            ),
          },
        ),
        drv(
          "resp_irregular",
          "breathing",
          "resp",
          L(
            "Irregular breathing pattern · z 1.6",
            "Respiration irrégulière · z 1,6",
          ),
          L("Derived from PPG", "Dérivé du PPG"),
          "up",
          -0.03,
          { value: 0.31, digits: 2, unit: "CV" },
          0.12,
          1.6,
          0.8,
          {
            title: L(
              "Irregular breathing pattern · z 1.6",
              "Respiration irrégulière · z 1,6",
            ),
            detail: L("Derived from PPG", "Dérivé du PPG"),
          },
        ),
      ],
    },
    {
      patient: PATIENT_4,
      connection: "simulator",
      status: "OK",
      abstainReasons: [],
      lastValid: null,
      arousalZ: 2.5,
      sensors: {
        face: ok(0.92),
        ppg: ok(0.96),
        eda: ok(0.95),
        temp: ok(0.99),
        motion: ok(0.98),
        breathing: {
          state: "derived",
          sqi: 0.8,
          note: L("PPG-derived", "dérivé du PPG"),
        },
      },
      telemetry: tele("92", ["9.6", "9,6"], ["32.6", "32,6"], ["0.03", "0,03"]),
      timeline: {
        now,
        samples: history(now - 30 * 60_000, now, 7, (t) => ({
          pain: 1.6,
          half: 0.6,
          z: ramp(t, visit - 60_000, at(20, 38, 0), 0.8, 2.5),
        })),
        regions: [],
        alerts: [],
        ghosts: [],
        annotation: {
          from: at(20, 39, 30),
          to: now,
          text: L("Arousal ≠ Pain", "Activation ≠ Douleur"),
        },
      },
      alert: { kind: "none" },
      edaRising: true,
      calibrating: null,
    },
  );
}

/* ------------------------------------------------------ A3 — abstention, motion artifact */

function abstainFixture(): Fixture {
  const now = at(14, 36, 55);
  const abst = at(14, 36, 10);
  const seed: Seed = {
    profile: profile4(now, "controlled"),
    context: [],
    events: [
      ev("SUCTIONING", at(14, 29, 50)),
      ev("SUCTIONING", at(14, 31, 50)),
    ],
    references: [
      ref("CPOT", 1, at(13, 58, 10)),
      ref("CPOT", 4, at(14, 33, 40)),
    ],
    baselineMark: { at: at(13, 58, 30), quality: "good" },
    mode: "ICU",
    audit: [
      ...AUDIT_A6,
      SUCTION_AUDIT(at(14, 29, 50)),
      ALERT_AUDIT,
      SUCTION_AUDIT(at(14, 31, 50)),
      {
        t: at(14, 33, 40),
        actor: "clinician",
        who: "DR",
        kind: "assessment",
        action: L("CPOT recorded", "CPOT enregistré"),
        detail: L("Total 4 / 8", "Total 4 / 8"),
      },
      {
        t: abst,
        actor: "system",
        kind: "system",
        action: L("Assessment unavailable", "Évaluation indisponible"),
        detail: L(
          "MOTION_ARTIFACT, PPG_TEMPLATE_MISMATCH",
          "MOTION_ARTIFACT, PPG_TEMPLATE_MISMATCH",
        ),
      },
    ],
  };
  return build(
    seed,
    now,
    { pain: null, shares: null, drivers: [] },
    {
      patient: PATIENT_4,
      connection: "simulator",
      status: "REJECTED",
      abstainReasons: [
        {
          kind: "rejected",
          text: L(
            "Movement artifact — pulse waveform irregular",
            "Artefact de mouvement — onde de pouls irrégulière",
          ),
        },
        {
          kind: "degraded",
          text: L(
            "High motion on wrist sensor",
            "Mouvement important sur le capteur du poignet",
          ),
        },
      ],
      lastValid: { score: 5.9, ageS: 45 },
      arousalZ: null,
      sensors: {
        face: ok(0.9),
        ppg: { state: "rejected", sqi: 0.12, note: L("rejected", "rejeté") },
        eda: { state: "degraded", sqi: 0.55, note: L("degraded", "dégradé") },
        temp: ok(0.99),
        motion: { state: "degraded", sqi: 0.5, note: L("degraded", "dégradé") },
      },
      telemetry: [
        {
          channel: "ppg",
          value: L("HR —", "FC —"),
          state: "rejected",
          rejectedReason: L(
            "Signal rejected: motion",
            "Signal rejeté : mouvement",
          ),
        },
        { channel: "eda", value: T.eda("7.1", "7,1"), state: "degraded" },
        { channel: "temp", value: T.temp("32.0", "32,0"), state: "ok" },
        {
          channel: "motion",
          value: T.motion("0.84", "0,84"),
          state: "degraded",
        },
      ],
      timeline: {
        now,
        samples: history(now - 30 * 60_000, now, 11, (t) =>
          t >= abst
            ? null
            : {
                pain: ramp(t, at(14, 29, 50), at(14, 32, 30), 1.2, 5.9),
                half: ramp(t, at(14, 29, 50), at(14, 32, 30), 0.4, 1.0),
                z: ramp(t, at(14, 29, 50), at(14, 31, 0), 0.9, 2.4),
              },
        ),
        regions: [
          {
            from: abst,
            to: now,
            label: L(
              "Abstention · 14:36:10 – now",
              "Abstention · 14:36:10 – maint.",
            ),
            kind: "abstention",
          },
        ],
        alerts: [
          {
            t: at(14, 31, 40),
            acknowledged: false,
            label: L("Alert 14:31:40", "Alerte 14:31:40"),
          },
        ],
        ghosts: [],
      },
      alert: { kind: "none" },
      edaRising: false,
      calibrating: null,
    },
  );
}

/* --------------------------------------------------- A4 — degraded, clinical context (NMB) */

function degradedFixture(): Fixture {
  const now = at(14, 52, 50);
  const seed: Seed = {
    profile: profile4(now, "controlled"),
    context: [
      cx("BETA_BLOCKER", now - 30 * H),
      cx("VASOPRESSOR", now - 5 * H),
      cx("NMB", at(14, 44, 0)),
    ],
    events: [],
    references: [ref("BPS", 6, now - 22 * 60_000)],
    baselineMark: { at: at(13, 58, 30), quality: "good" },
    mode: "ICU",
    audit: [
      ...AUDIT_A6,
      {
        t: at(14, 44, 0),
        actor: "clinician",
        who: "DR",
        kind: "context",
        action: L("Context added", "Contexte ajouté"),
        detail: L(
          "Neuromuscular blocker (face and motion masked)",
          "Curare (visage et mouvement masqués)",
        ),
      },
      {
        t: at(14, 47, 15),
        actor: "system",
        kind: "alert",
        action: L("Alert fired", "Alerte déclenchée"),
        detail: L(
          "Rule upper 80% bound ≥ 4 for 30 s",
          "Règle borne haute 80 % ≥ 4 pendant 30 s",
        ),
      },
      {
        t: at(14, 48, 2),
        actor: "clinician",
        who: "DR",
        kind: "alert",
        action: L("Alert acknowledged", "Alerte prise en compte"),
        detail: L(
          "“Possible unmanaged pain”",
          "« Douleur possiblement non traitée »",
        ),
      },
    ],
  };
  return build(
    seed,
    now,
    {
      pain: {
        score: 5.2,
        lo: 2.9,
        hi: 7.8,
        trend: { direction: "stable", slopePerMin: 0 },
        episode: null,
      },
      shares: {
        pain: 0.58,
        stress: 0.17,
        agitation: null,
        rest: 0.1,
        unexplained: 0.15,
      },
      agitationIfMasked: 0.08,
      drivers: [
        drv(
          "eda_scr_rate",
          "eda",
          "eda",
          L(
            "Frequent skin-conductance responses",
            "Réponses électrodermales fréquentes",
          ),
          L("8.0 /min · baseline 2.1", "8,0 /min · référence 2,1"),
          "up",
          0.38,
          { value: 8, digits: 1, unit: "/min" },
          2.1,
          2.6,
          0.95,
          {
            title: L(
              "Frequent skin-conductance responses",
              "Réponses électrodermales fréquentes",
            ),
            detail: L(
              "8 /min (baseline 2) · z 2.6",
              "8 /min (référence 2) · z 2,6",
            ),
          },
        ),
        drv(
          "eda_scl",
          "eda",
          "eda",
          L(
            "Skin conductance level +2.4 µS",
            "Niveau de conductance cutanée +2,4 µS",
          ),
          L("10.2 µS · baseline 7.8", "10,2 µS · référence 7,8"),
          "up",
          0.22,
          { value: 10.2, digits: 1, unit: "µS" },
          7.8,
          2.1,
          0.95,
          {
            title: L(
              "Skin conductance level +2.4 µS",
              "Conductance cutanée +2,4 µS",
            ),
            detail: L("10.2 µS (baseline 7.8)", "10,2 µS (référence 7,8)"),
          },
        ),
        drv(
          "hr",
          "ppg",
          "hr",
          L("Heart rate +6 bpm", "Fréquence cardiaque +6 bpm"),
          L("71 bpm · baseline 65", "71 bpm · référence 65"),
          "up",
          0.03,
          { value: 71, digits: 0, unit: "bpm" },
          65,
          0.9,
          0.23,
          {
            title: L("Heart rate +6 bpm", "Fréquence cardiaque +6 bpm"),
            detail: L(
              "Weight reduced · beta-blocker",
              "Poids réduit · bêtabloquant",
            ),
          },
        ),
        // masked by NMB in A4; reappears if the blockade is removed
        drv(
          "face_brow",
          "face",
          "face",
          L(
            "Brow lowering & eye tightening",
            "Froncement des sourcils et plissement des yeux",
          ),
          L("z 1.2 above baseline", "z 1,2 au-dessus de la référence"),
          "up",
          0.12,
          { value: 0.8, digits: 1, unit: "PSPI" },
          0.3,
          1.2,
          0.9,
          {
            title: L(
              "Brow lowering & eye tightening",
              "Froncement des sourcils et plissement des yeux",
            ),
            detail: L(
              "Facial expression · z 1.2",
              "Expression faciale · z 1,2",
            ),
          },
        ),
      ],
    },
    {
      patient: PATIENT_4,
      connection: "simulator",
      status: "OK",
      abstainReasons: [],
      lastValid: null,
      arousalZ: 1.9,
      sensors: {
        face: ok(0.9),
        ppg: ok(0.95),
        eda: ok(0.95),
        temp: ok(0.98),
        motion: ok(0.98),
      },
      telemetry: [
        { channel: "ppg", value: T.ppg("71"), state: "ok" },
        { channel: "eda", value: T.eda("10.2", "10,2"), state: "ok" },
        { channel: "temp", value: T.temp("31.8", "31,8"), state: "ok" },
        { channel: "motion", value: T.motion("0.01", "0,01"), state: "ok" },
      ],
      timeline: {
        now,
        samples: history(now - 30 * 60_000, now, 23, () => ({
          pain: 5.0,
          half: 2.3,
          z: 1.9,
        })),
        regions: [],
        alerts: [
          {
            t: at(14, 47, 15),
            acknowledged: true,
            label: L("Alert (acknowledged)", "Alerte (prise en compte)"),
          },
        ],
        ghosts: [],
      },
      alert: { kind: "none" },
      edaRising: true,
      calibrating: null,
    },
  );
}

/* ------------------------------------------------- rest / calibration — newly admitted bed */

/** Calm resting values for a newly admitted patient (A9 calibration → monitoring). */
export function restRaw(
  patient: RawState["patient"],
  now: number,
  calibrating: RawState["calibrating"],
  since: number = now - 10 * 60_000,
): RawState {
  const startedAt = calibrating
    ? now - (calibrating.totalS - calibrating.remainingS) * 1000
    : since;
  return {
    patient,
    connection: "simulator",
    status: "OK",
    abstainReasons: [],
    lastValid: null,
    pain: {
      head: 0.6,
      gapLo: 0.5,
      gapHi: 0.9,
      trend: { direction: "stable", slopePerMin: 0 },
      episode: null,
    },
    arousalZ: 0.2,
    likelihood: {
      pain: 0.08,
      stress: 0.12,
      agitation: 0.05,
      rest: 0.7,
      unexplained: 0.05,
    },
    drivers: [],
    sensors: {
      face: ok(0.92),
      ppg: ok(0.97),
      eda: ok(0.95),
      temp: ok(0.99),
      motion: ok(0.98),
    },
    telemetry: tele("78", ["7.7", "7,7"], ["32.4", "32,4"], ["0.01", "0,01"]),
    timeline: {
      now,
      samples: history(now - 30 * 60_000, now, 5, (t) =>
        t < startedAt ? null : { pain: 0.6, half: 0.6, z: 0.2 },
      ),
      regions: [],
      alerts: [],
      ghosts: [],
    },
    alert: { kind: "none" },
    edaRising: false,
    calibrating,
  };
}

export const FIXTURES: Record<FixtureId, () => Fixture> = {
  pain: painFixture,
  stress: stressFixture,
  abstain: abstainFixture,
  degraded: degradedFixture,
};
