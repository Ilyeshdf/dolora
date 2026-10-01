import type { L10n } from '@/contracts/monitor';

/**
 * Reference pain scales (spec §4.2, §7.6, D-21). CPOT: 4 items × 0–2, total 0–8, pain likely > 2.
 * BPS: 3 items × 1–4, total 3–12, pain likely > 5. Item 3 depends on airway:
 * intubated → ventilator compliance; extubated → vocalization.
 */
export type ScaleId = 'CPOT' | 'BPS';

export interface ScaleItem {
  id: string;
  label: L10n;
  options: { score: number; label: L10n }[];
}

const L = (en: string, fr: string): L10n => ({ en, fr });

export const SCALES: Record<ScaleId, { min: number; max: number; threshold: number; itemMin: number; itemMax: number }> = {
  CPOT: { min: 0, max: 8, threshold: 2, itemMin: 0, itemMax: 2 },
  BPS: { min: 3, max: 12, threshold: 5, itemMin: 1, itemMax: 4 },
};

export function scaleItems(scale: ScaleId, intubated: boolean): ScaleItem[] {
  if (scale === 'CPOT') {
    return [
      {
        id: 'face',
        label: L('Facial expression', 'Expression du visage'),
        options: [
          { score: 0, label: L('Relaxed/neutral', 'Détendu/neutre') },
          { score: 1, label: L('Tense', 'Tendu') },
          { score: 2, label: L('Grimacing', 'Grimace') },
        ],
      },
      {
        id: 'body',
        label: L('Body movements', 'Mouvements du corps'),
        options: [
          { score: 0, label: L('No movement/ normal position', 'Aucun mouvement/ position normale') },
          { score: 1, label: L('Protection', 'Protection') },
          { score: 2, label: L('Restlessness/ agitation', 'Agitation') },
        ],
      },
      intubated
        ? {
            id: 'ventilator',
            label: L('Compliance with ventilator', 'Adaptation au ventilateur'),
            options: [
              { score: 0, label: L('Tolerating', 'Tolère') },
              { score: 1, label: L('Coughing but tolerating', 'Tousse mais tolère') },
              { score: 2, label: L('Fighting ventilator', 'Lutte contre le ventilateur') },
            ],
          }
        : {
            id: 'vocalization',
            label: L('Vocalization', 'Vocalisation'),
            options: [
              { score: 0, label: L('Normal tone or no sound', 'Ton normal ou aucun son') },
              { score: 1, label: L('Sighing, moaning', 'Soupirs, gémissements') },
              { score: 2, label: L('Crying out, sobbing', 'Cris, sanglots') },
            ],
          },
      {
        id: 'muscle',
        label: L('Muscle tension', 'Tension musculaire'),
        options: [
          { score: 0, label: L('Relaxed', 'Détendu') },
          { score: 1, label: L('Tense/rigid', 'Tendu/rigide') },
          { score: 2, label: L('Very tense/rigid', 'Très tendu/rigide') },
        ],
      },
    ];
  }
  return [
    {
      id: 'face',
      label: L('Facial expression', 'Expression du visage'),
      options: [
        { score: 1, label: L('Relaxed', 'Détendu') },
        { score: 2, label: L('Partially tightened', 'Partiellement tendu') },
        { score: 3, label: L('Fully tightened', 'Totalement tendu') },
        { score: 4, label: L('Grimacing', 'Grimace') },
      ],
    },
    {
      id: 'limbs',
      label: L('Upper limbs', 'Membres supérieurs'),
      options: [
        { score: 1, label: L('No movement', 'Aucun mouvement') },
        { score: 2, label: L('Partially bent', 'Partiellement fléchis') },
        { score: 3, label: L('Fully bent, fingers flexed', 'Totalement fléchis, doigts fléchis') },
        { score: 4, label: L('Permanently retracted', 'Rétraction permanente') },
      ],
    },
    intubated
      ? {
          id: 'ventilation',
          label: L('Compliance with ventilation', 'Adaptation à la ventilation'),
          options: [
            { score: 1, label: L('Tolerating movement', 'Tolère les mouvements') },
            { score: 2, label: L('Coughing, mostly tolerating', 'Tousse, tolère le plus souvent') },
            { score: 3, label: L('Fighting ventilator', 'Lutte contre le ventilateur') },
            { score: 4, label: L('Unable to control ventilation', 'Ventilation impossible à contrôler') },
          ],
        }
      : {
          id: 'vocalization',
          label: L('Vocalization', 'Vocalisation'),
          options: [
            { score: 1, label: L('No pain vocalization', 'Aucune vocalisation douloureuse') },
            { score: 2, label: L('Infrequent moaning', 'Gémissements rares') },
            { score: 3, label: L('Frequent or prolonged moaning', 'Gémissements fréquents ou prolongés') },
            { score: 4, label: L('Howling or verbal complaints', 'Hurlements ou plaintes verbales') },
          ],
        },
  ];
}

export function painLikely(scale: ScaleId, total: number): boolean {
  return total > SCALES[scale].threshold;
}
