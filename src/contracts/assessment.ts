import { z } from 'zod';
import { SCALES, type ScaleId } from '@/clinical/scales';

/**
 * CPOT / BPS entry (spec §7.6). Either a quick total or a complete item breakdown; when items
 * are complete their sum IS the total (no disagreement possible). Ranges per SCALES.
 * Messages are keys resolved by the UI so they can be shown in EN/FR, always in amber.
 */
export const assessmentSchema = z
  .object({
    scale: z.enum(['CPOT', 'BPS', 'NRS']),
    intubated: z.boolean(),
    total: z.number().int().nullable(),
    items: z.array(z.number().int().nullable()),
    note: z.string().max(280, { message: 'noteTooLong' }),
  })
  .superRefine((v, ctx) => {
    const s = SCALES[v.scale as ScaleId];
    const itemCount = v.scale === 'CPOT' ? 4 : v.scale === 'BPS' ? 3 : 0;
    const filled = v.items.filter((i) => i !== null) as number[];
    if (v.items.length !== itemCount) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'itemCount' });
      return;
    }
    if (filled.some((i) => i < s.itemMin || i > s.itemMax)) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'itemRange' });
    }
    if (v.total === null) {
      ctx.addIssue({ code: 'custom', path: ['total'], message: filled.length > 0 ? 'incomplete' : 'required' });
      return;
    }
    if (v.total < s.min || v.total > s.max) {
      ctx.addIssue({ code: 'custom', path: ['total'], message: 'totalRange' });
    }
    if (itemCount > 0 && filled.length === itemCount && filled.reduce((a, b) => a + b, 0) !== v.total) {
      ctx.addIssue({ code: 'custom', path: ['total'], message: 'sumMismatch' });
    }
  });

export type AssessmentForm = z.infer<typeof assessmentSchema>;

export function emptyAssessment(scale: ScaleId, intubated: boolean): AssessmentForm {
  return { scale, intubated, total: null, items: Array(scale === 'CPOT' ? 4 : scale === 'BPS' ? 3 : 0).fill(null), note: '' };
}

/** Total implied by the items, or null while incomplete. */
export function itemsTotal(items: (number | null)[]): number | null {
  return items.every((i) => i !== null) ? (items as number[]).reduce((a, b) => a + b, 0) : null;
}
