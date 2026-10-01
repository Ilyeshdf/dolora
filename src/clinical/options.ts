/**
 * Bilingual option labels for clinical fields — one source for the forms AND for audit
 * old → new values, so what the clinician tapped is exactly what the trail records.
 */
import type { L10n } from '@/contracts/monitor';
import { ADMISSION, FLAGS, type AdmissionCategory, type FlagId } from './clinicalEffects';
import type { Airway, CamResult, CareSetting, Communication, PatientProfile, Sex, SkinCondition, SkinSite, TempSource } from './profile';
import type { RemovalReason } from '@/engine/effects';

const L = (en: string, fr: string): L10n => ({ en, fr });

export const SEX: Record<Sex, L10n> = {
  female: L('Female', 'Femme'),
  male: L('Male', 'Homme'),
  other: L('Other', 'Autre'),
  unknown: L('Not recorded', 'Non renseigné'),
};
export const CARE: Record<CareSetting, L10n> = { ICU: L('ICU', 'Réa'), WARD: L('Post-op ward', 'Service post-op') };
export const CARE_MODE: Record<CareSetting, L10n> = {
  ICU: L('ICU · high sensitivity', 'Réa · haute sensibilité'),
  WARD: L('Ward · high specificity', 'Service · haute spécificité'),
};
export const COMMUNICATION: Record<Communication, L10n> = {
  self: L('Can self-report', 'Peut s’auto-évaluer'),
  intermittent: L('Intermittent', 'Intermittent'),
  none: L('Cannot self-report', 'Ne peut pas s’auto-évaluer'),
};
export const AIRWAY: Record<Airway, L10n> = {
  none: L('Not intubated', 'Non intubé'),
  controlled: L('Intubated – controlled ventilation', 'Intubé – ventilation contrôlée'),
  spontaneous: L('Intubated – spontaneous mode', 'Intubé – mode spontané'),
};
export const CAM: Record<CamResult, L10n> = {
  negative: L('Negative', 'Négatif'),
  hypoactive: L('Positive – hypoactive', 'Positif – hypoactif'),
  hyperactive: L('Positive – hyperactive', 'Positif – hyperactif'),
  unable: L('Unable to assess', 'Non évaluable'),
};
/** RASS descriptors (Sessler 2002). */
export const RASS: Record<number, L10n> = {
  4: L('Combative', 'Combatif'),
  3: L('Very agitated', 'Très agité'),
  2: L('Agitated', 'Agité'),
  1: L('Restless', 'Nerveux'),
  0: L('Alert and calm', 'Éveillé et calme'),
  [-1]: L('Drowsy', 'Somnolent'),
  [-2]: L('Light sedation', 'Sédation légère'),
  [-3]: L('Moderate sedation', 'Sédation modérée'),
  [-4]: L('Deep sedation', 'Sédation profonde'),
  [-5]: L('Unarousable', 'Non réveillable'),
};
export const TEMP_SOURCE: Record<TempSource, L10n> = {
  bladder: L('Bladder', 'Vésicale'),
  oesophageal: L('Oesophageal', 'Œsophagienne'),
  rectal: L('Rectal', 'Rectale'),
  tympanic: L('Tympanic', 'Tympanique'),
  axillary: L('Axillary', 'Axillaire'),
};
export const SKIN_SITE: Record<SkinSite, L10n> = {
  eda: L('EDA electrodes (fingers)', 'Électrodes EDA (doigts)'),
  ppg: L('PPG sensor (finger / wrist)', 'Capteur PPG (doigt / poignet)'),
  temp: L('Skin temperature probe', 'Sonde de température cutanée'),
};
export const SKIN_CONDITION: Record<SkinCondition, L10n> = {
  oedema: L('Oedema', 'Œdème'),
  burn: L('Burns / grafts', 'Brûlures / greffes'),
  broken: L('Broken skin', 'Peau lésée'),
};
export const REMOVAL: Record<RemovalReason, L10n> = {
  stopped: L('Stopped', 'Arrêté'),
  error: L('Entered in error', 'Saisi par erreur'),
  other: L('Other', 'Autre'),
};

export const admissionLabel = (c: AdmissionCategory) => ADMISSION[c].label;
export const flagName = (f: FlagId) => FLAGS[f].label;

const sign = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

/** Audit/readable value of a profile field. */
export function describeField<K extends keyof PatientProfile>(field: K, value: PatientProfile[K]): L10n {
  const v = value as unknown;
  if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) return L('—', '—');
  switch (field) {
    case 'sex':
      return SEX[v as Sex];
    case 'careSetting':
      return CARE[v as CareSetting];
    case 'communication':
      return COMMUNICATION[v as Communication];
    case 'airway':
      return AIRWAY[v as Airway];
    case 'ageYears':
      return L(`${v} years`, `${v} ans`);
    case 'rass': {
      const r = v as NonNullable<PatientProfile['rass']>;
      return { en: `RASS ${sign(r.value)} (${RASS[r.value]?.en ?? ''})`, fr: `RASS ${sign(r.value)} (${RASS[r.value]?.fr ?? ''})` };
    }
    case 'cam':
      return CAM[(v as NonNullable<PatientProfile['cam']>).result];
    case 'admission': {
      const a = v as NonNullable<PatientProfile['admission']>;
      return admissionLabel(a.category);
    }
    case 'coreTemp': {
      const c = v as NonNullable<PatientProfile['coreTemp']>;
      return { en: `${c.valueC.toFixed(1)} °C (${TEMP_SOURCE[c.source].en})`, fr: `${c.valueC.toFixed(1).replace('.', ',')} °C (${TEMP_SOURCE[c.source].fr})` };
    }
    case 'skin': {
      const s = v as PatientProfile['skin'];
      if (!s.length) return L('None', 'Aucune');
      return {
        en: s.map((x) => `${SKIN_CONDITION[x.condition].en} · ${SKIN_SITE[x.site].en}`).join('; '),
        fr: s.map((x) => `${SKIN_CONDITION[x.condition].fr} · ${SKIN_SITE[x.site].fr}`).join(' ; '),
      };
    }
    case 'medsReviewed':
    case 'conditionsReviewed':
      return v ? L('Reviewed', 'Vérifié') : L('Not reviewed', 'Non vérifié');
    case 'note':
      return (v as string).trim() ? L('(note edited)', '(note modifiée)') : L('(no note)', '(aucune note)');
    default:
      return { en: String(v), fr: String(v) };
  }
}

export const FIELD_LABEL: Record<keyof PatientProfile, L10n> = {
  patientRef: L('Patient ID', 'Identifiant patient'),
  bedId: L('Bed', 'Lit'),
  ageYears: L('Age', 'Âge'),
  sex: L('Sex', 'Sexe'),
  careSetting: L('Care setting', 'Lieu de soins'),
  communication: L('Communication', 'Communication'),
  airway: L('Airway / ventilation', 'Voies aériennes / ventilation'),
  admission: L('Surgery / admission reason', 'Chirurgie / motif d’admission'),
  rass: L('RASS', 'RASS'),
  cam: L('CAM-ICU', 'CAM-ICU'),
  medsReviewed: L('Medications', 'Médicaments'),
  conditionsReviewed: L('Conditions', 'Antécédents'),
  coreTemp: L('Core temperature', 'Température centrale'),
  skin: L('Skin at sensor sites', 'Peau aux sites des capteurs'),
  note: L('Note', 'Note'),
};
