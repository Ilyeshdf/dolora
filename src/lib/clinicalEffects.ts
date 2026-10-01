export type ContextRoute = 'prior' | 'measurement' | 'baseline';

export interface ClinicalEffect {
  id: string;
  type: 'persistent' | 'timed';
  durationMin?: number;
  route: ContextRoute[];
  effectEn: string;
  effectFr: string;
}

export const CLINICAL_EFFECTS: Record<string, ClinicalEffect> = {
  BETA_BLOCKER: {
    id: 'BETA_BLOCKER',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'HR weight 0.3, HRV 0.6; EDA unaffected',
    effectFr: 'Poids FC 0.3, VFC 0.6 ; EDA non affecté',
  },
  ALPHA2_AGONIST: {
    id: 'ALPHA2_AGONIST',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'HR 0.4, EDA 0.5, pulse amplitude 0.6',
    effectFr: 'FC 0.4, EDA 0.5, amplitude du pouls 0.6',
  },
  ANTICHOLINERGIC: {
    id: 'ANTICHOLINERGIC',
    type: 'timed',
    durationMin: 60,
    route: ['measurement', 'baseline'],
    effectEn: 'EDA masked; expected HR rise',
    effectFr: 'EDA masqué ; hausse FC attendue',
  },
  NMB: {
    id: 'NMB',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'Face + motion masked; behavioural assessment impossible',
    effectFr: 'Visage + mouvement masqués ; évaluation comportementale impossible',
  },
  NOREPINEPHRINE: {
    id: 'NOREPINEPHRINE',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'Pulse amplitude 0.3, temperature 0.5',
    effectFr: 'Amplitude du pouls 0.3, température 0.5',
  },
  VASOPRESSOR_DOSE_CHANGE: {
    id: 'VASOPRESSOR_DOSE_CHANGE',
    type: 'timed',
    durationMin: 15,
    route: ['baseline'],
    effectEn: 'Pulse amplitude/temp masked during washout; re-baseline',
    effectFr: 'Amplitude du pouls/temp masqués pendant le washout ; re-baseline',
  },
  OPIOID_BOLUS: {
    id: 'OPIOID_BOLUS',
    type: 'timed',
    durationMin: 30,
    route: ['prior'],
    effectEn: 'Pain prior ×0.5',
    effectFr: 'A priori de douleur ×0.5',
  },
  FEVER: {
    id: 'FEVER',
    type: 'persistent',
    route: ['baseline', 'measurement'],
    effectEn: 'HR corrected for core temp; shivering = thermoregulatory',
    effectFr: 'FC corrigée pour temp. centrale ; frissons = thermorégulateur',
  },
  HYPOTHERMIA: {
    id: 'HYPOTHERMIA',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'Shivering and vasoconstriction expected',
    effectFr: 'Frissons et vasoconstriction attendus',
  },
  AUTONOMIC_NEUROPATHY: {
    id: 'AUTONOMIC_NEUROPATHY',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'EDA 0.3, HRV 0.4',
    effectFr: 'EDA 0.3, VFC 0.4',
  },
  ATRIAL_FIBRILLATION: {
    id: 'ATRIAL_FIBRILLATION',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'HRV disabled',
    effectFr: 'VFC désactivé',
  },
  PACED_RHYTHM: {
    id: 'PACED_RHYTHM',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'HR + HRV disabled',
    effectFr: 'FC + VFC désactivés',
  },
  CONTROLLED_VENTILATION: {
    id: 'CONTROLLED_VENTILATION',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'Respiration + HF-HRV disabled',
    effectFr: 'Respiration + VFC-HF désactivés',
  },
  SCI_T6_OR_ABOVE: {
    id: 'SCI_T6_OR_ABOVE',
    type: 'persistent',
    route: ['measurement'],
    effectEn: 'Bradycardia + sweating may signal autonomic dysreflexia',
    effectFr: 'Bradycardie + sueurs peuvent signaler dysréflexie autonomique',
  },
  SUCTIONING: {
    id: 'SUCTIONING',
    type: 'timed',
    durationMin: 2,
    route: ['prior'],
    effectEn: 'Pain prior ×2.5',
    effectFr: 'A priori de douleur ×2.5',
  },
  TURNING: {
    id: 'TURNING',
    type: 'timed',
    durationMin: 3,
    route: ['prior'],
    effectEn: 'Pain prior ×2',
    effectFr: 'A priori de douleur ×2',
  },
  GENTLE_TOUCH: {
    id: 'GENTLE_TOUCH',
    type: 'timed',
    durationMin: 2,
    route: ['prior'],
    effectEn: 'Non-nociceptive arousal expected',
    effectFr: 'Éveil non nociceptif attendu',
  },
  FAMILY_VISIT: {
    id: 'FAMILY_VISIT',
    type: 'timed',
    durationMin: 20,
    route: ['prior'],
    effectEn: 'Stress prior ×1.5',
    effectFr: 'A priori de stress ×1.5',
  },
};
