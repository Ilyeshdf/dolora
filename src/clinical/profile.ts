/**
 * Patient profile — data model, validation and clinical rules (task §3.1–3.3).
 * Data minimisation: pseudonymised ID, age in years, sex. No names, dates of birth, doses or
 * free-text identifiers. Medications and conditions are stored as context entries (not here)
 * so the context bar and the profile edit the same records.
 */
import { z } from 'zod';
import { ADMISSION, type AdmissionCategory, type FlagId } from './clinicalEffects';

export type Sex = 'female' | 'male' | 'other' | 'unknown';
export type CareSetting = 'ICU' | 'WARD';
export type Communication = 'self' | 'intermittent' | 'none';
export type Airway = 'none' | 'controlled' | 'spontaneous';
export type CamResult = 'negative' | 'hypoactive' | 'hyperactive' | 'unable';
export type SkinSite = 'eda' | 'ppg' | 'temp';
export type SkinCondition = 'oedema' | 'burn' | 'broken';
export type TempSource = 'bladder' | 'oesophageal' | 'rectal' | 'tympanic' | 'axillary';

export interface PatientProfile {
  patientRef: string;
  bedId: string;
  ageYears: number;
  sex: Sex;
  careSetting: CareSetting;
  communication: Communication;
  airway: Airway;
  // recommended
  admission: { category: AdmissionCategory; surgeryAt: number | null } | null;
  rass: { value: number; at: number } | null;
  cam: { result: CamResult; at: number } | null;
  medsReviewed: boolean;
  conditionsReviewed: boolean;
  // optional
  coreTemp: { source: TempSource; valueC: number; at: number } | null;
  skin: { site: SkinSite; condition: SkinCondition }[];
  note: string;
}

export const PATIENT_REF = /^P-[0-9A-F]{4}$/;
export const AGE_MIN = 18;
export const AGE_MAX = 110;

/** Required fields — the only ones that block monitoring (task §3.1-1). Messages are i18n keys. */
export const requiredSchema = z.object({
  patientRef: z.string().regex(PATIENT_REF, { message: 'patientRef' }),
  bedId: z.string().min(1, { message: 'bed' }),
  ageYears: z
    .number({ message: 'age' })
    .int({ message: 'age' })
    .superRefine((v, ctx) => {
      if (v < AGE_MIN) ctx.addIssue({ code: 'custom', message: 'paediatric' });
      else if (v > AGE_MAX) ctx.addIssue({ code: 'custom', message: 'ageMax' });
    }),
  sex: z.enum(['female', 'male', 'other', 'unknown'], { message: 'required' }),
  careSetting: z.enum(['ICU', 'WARD'], { message: 'required' }),
  communication: z.enum(['self', 'intermittent', 'none'], { message: 'required' }),
  airway: z.enum(['none', 'controlled', 'spontaneous'], { message: 'required' }),
});
export type RequiredProfile = z.infer<typeof requiredSchema>;

export const RASS_MIN = -5;
export const RASS_MAX = 4;
export const rassSchema = z.number().int().min(RASS_MIN, { message: 'rass' }).max(RASS_MAX, { message: 'rass' });
export const coreTempSchema = z.number().min(30, { message: 'temp' }).max(43, { message: 'temp' });
export const noteSchema = z.string().max(500, { message: 'noteTooLong' });

/** Pseudonymised ID generator (P-XXXX, hex). Never derived from identity. */
export function generatePatientRef(rnd: () => number = Math.random): string {
  return `P-${Math.floor(rnd() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')}`;
}

export function emptyProfile(bedId: string, patientRef: string): PatientProfile {
  return {
    patientRef,
    bedId,
    ageYears: NaN,
    sex: 'unknown',
    careSetting: 'ICU',
    communication: 'none',
    airway: 'none',
    admission: null,
    rass: null,
    cam: null,
    medsReviewed: false,
    conditionsReviewed: false,
    coreTemp: null,
    skin: [],
    note: '',
  };
}

/* ------------------------------------------------------------------- completeness */

export type RecommendedField = 'admission' | 'rass' | 'cam' | 'reference' | 'medications' | 'conditions';

/** Recommended fields still missing (drive the amber "Profile incomplete" badge, never blocking). */
export function missingRecommended(p: PatientProfile, hasReference: boolean): RecommendedField[] {
  const out: RecommendedField[] = [];
  if (!p.admission) out.push('admission');
  if (!p.rass) out.push('rass');
  if (!p.cam) out.push('cam');
  if (!hasReference) out.push('reference');
  if (!p.medsReviewed) out.push('medications');
  if (!p.conditionsReviewed) out.push('conditions');
  return out;
}

export function requiredComplete(p: Partial<PatientProfile> | null | undefined): boolean {
  return !!p && requiredSchema.safeParse(p).success;
}

/* ------------------------------------------------------------------- contradictions */

export type ContradictionId =
  | 'SELF_REPORT_DEEP_SEDATION'
  | 'VENTILATION_NOT_INTUBATED'
  | 'NMB_NOT_VENTILATED'
  | 'NMB_SELF_REPORT'
  | 'FEVER_AND_HYPOTHERMIA'
  | 'WARD_CONTROLLED_VENTILATION'
  | 'DOSE_CHANGE_WITHOUT_VASOPRESSOR'
  | 'CONTEXT_UNASSESSABLE';

export interface Contradiction {
  id: ContradictionId;
  /** block = cannot be saved; confirm = needs an explicit confirmation (task §3.3). */
  severity: 'block' | 'confirm';
}

export interface RuleInput {
  communication?: Communication;
  airway?: Airway;
  careSetting?: CareSetting;
  rass?: number | null;
  flags: FlagId[];
}

/**
 * Clinically impossible or unusual combinations (task §3.1-7, §3.3). Evaluated on the state the
 * user is about to save, so warnings appear before anything is committed.
 */
export function contradictions(s: RuleInput): Contradiction[] {
  const has = (f: FlagId) => s.flags.includes(f);
  const out: Contradiction[] = [];
  if (s.communication === 'self' && s.rass !== null && s.rass !== undefined && s.rass <= -4)
    out.push({ id: 'SELF_REPORT_DEEP_SEDATION', severity: 'confirm' });
  if (s.airway === 'none' && has('CONTROLLED_VENTILATION')) out.push({ id: 'VENTILATION_NOT_INTUBATED', severity: 'block' });
  if (has('NMB') && s.airway && s.airway !== 'controlled') out.push({ id: 'NMB_NOT_VENTILATED', severity: 'block' });
  if (has('NMB') && s.communication === 'self') out.push({ id: 'NMB_SELF_REPORT', severity: 'block' });
  if (has('FEVER') && has('HYPOTHERMIA')) out.push({ id: 'FEVER_AND_HYPOTHERMIA', severity: 'block' });
  if (s.careSetting === 'WARD' && s.airway === 'controlled') out.push({ id: 'WARD_CONTROLLED_VENTILATION', severity: 'confirm' });
  if (has('VASOPRESSOR_DOSE_CHANGE') && !has('VASOPRESSOR')) out.push({ id: 'DOSE_CHANGE_WITHOUT_VASOPRESSOR', severity: 'confirm' });
  return out;
}

/* ------------------------------------------------------------------------ freshness */

export interface FreshnessConfig {
  rassStaleH: number;
  camStaleH: number;
  referenceReminderH: number;
}
export const DEFAULT_FRESHNESS: FreshnessConfig = { rassStaleH: 4, camStaleH: 4, referenceReminderH: 4 };

/** Stale = amber, never red (task §3.1-6). CPOT/BPS reminder applies in ICU mode only. */
export function isStale(kind: 'rass' | 'cam' | 'reference', at: number, now: number, mode: CareSetting, cfg = DEFAULT_FRESHNESS): boolean {
  const h = (now - at) / 3_600_000;
  if (kind === 'rass') return h > cfg.rassStaleH;
  if (kind === 'cam') return h > cfg.camStaleH;
  return mode === 'ICU' && h > cfg.referenceReminderH;
}

/* ---------------------------------------------------------------- reference scale */

export type RefScale = 'NRS' | 'CPOT' | 'BPS';

/**
 * Scale offered first (task §3.2-E, D-14): self-report → NRS; intubated → BPS (CPOT with the
 * ventilator item one tap away); not intubated and unable to self-report → CPOT (vocalization).
 */
export function preferredScale(p: Pick<PatientProfile, 'communication' | 'airway'> | null): RefScale {
  if (!p) return 'CPOT';
  if (p.communication === 'self') return 'NRS';
  if (p.airway !== 'none') return 'BPS';
  if (p.communication === 'intermittent') return 'NRS';
  return 'CPOT';
}

/** Normalised 0–10 value of a reference (D-12). */
export function referenceTo10(scale: RefScale, value: number): number {
  if (scale === 'CPOT') return (value * 10) / 8;
  if (scale === 'BPS') return ((value - 3) * 10) / 9;
  return value;
}

/** Baseline-eligible reference: CPOT/BPS ≤ 2 (D-13; BPS minimum 3 → ≤ 5 not used) or NRS ≤ 3. */
export function referenceAllowsBaseline(scale: RefScale, value: number): boolean {
  if (scale === 'NRS') return value <= 3;
  if (scale === 'CPOT') return value <= 2;
  return value <= 4; // BPS 3–12: 3–4 ≈ CPOT 0–2 (D-13)
}

export function surgicalPrior(admission: PatientProfile['admission'], now: number): number {
  if (!admission || admission.surgeryAt === null) return 1;
  const h = (now - admission.surgeryAt) / 3_600_000;
  if (h < 0 || h > 72) return 1;
  return ADMISSION[admission.category].pain;
}
