import { assessmentSchema, emptyAssessment, itemsTotal } from './assessment';
import { painLikely } from '@/clinical/scales';

const issue = (v: unknown) => {
  const r = assessmentSchema.safeParse(v);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('CPOT / BPS schema (§7.6, D-21)', () => {
  it('accepts a CPOT quick total in 0–8', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), total: 4 })).toBeNull();
    expect(issue({ ...emptyAssessment('CPOT', true), total: 0 })).toBeNull();
    expect(issue({ ...emptyAssessment('CPOT', true), total: 8 })).toBeNull();
  });

  it('rejects CPOT totals outside 0–8', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), total: 9 })).toBe('totalRange');
    expect(issue({ ...emptyAssessment('CPOT', true), total: -1 })).toBe('totalRange');
  });

  it('enforces BPS 3–12 (minimum is 3, not 0)', () => {
    expect(issue({ ...emptyAssessment('BPS', true), total: 3 })).toBeNull();
    expect(issue({ ...emptyAssessment('BPS', true), total: 12 })).toBeNull();
    expect(issue({ ...emptyAssessment('BPS', true), total: 2 })).toBe('totalRange');
    expect(issue({ ...emptyAssessment('BPS', true), total: 13 })).toBe('totalRange');
  });

  it('requires a total or complete items', () => {
    expect(issue(emptyAssessment('CPOT', true))).toBe('required');
    expect(issue({ ...emptyAssessment('CPOT', true), items: [1, null, null, null] })).toBe('incomplete');
  });

  it('accepts complete items whose sum is the total', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), items: [1, 1, 1, 1], total: 4 })).toBeNull();
  });

  it('rejects items that do not add up to the total', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), items: [1, 1, 1, 1], total: 5 })).toBe('sumMismatch');
  });

  it('rejects item scores outside the item range', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), items: [3, 0, 0, 0], total: 3 })).toBe('itemRange');
    expect(issue({ ...emptyAssessment('BPS', true), items: [0, 1, 1], total: 2 })).toBeTruthy();
  });

  it('limits the note to 280 characters', () => {
    expect(issue({ ...emptyAssessment('CPOT', true), total: 2, note: 'x'.repeat(281) })).toBe('noteTooLong');
  });

  it('computes the item total only when complete', () => {
    expect(itemsTotal([1, 2, 0, 1])).toBe(4);
    expect(itemsTotal([1, null, 0, 1])).toBeNull();
  });
});

describe('pain-likely thresholds (§12)', () => {
  it('CPOT > 2', () => {
    expect(painLikely('CPOT', 2)).toBe(false);
    expect(painLikely('CPOT', 3)).toBe(true);
  });
  it('BPS > 5', () => {
    expect(painLikely('BPS', 5)).toBe(false);
    expect(painLikely('BPS', 6)).toBe(true);
  });
});
