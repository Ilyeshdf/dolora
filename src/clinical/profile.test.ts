import {
  contradictions,
  emptyProfile,
  generatePatientRef,
  isStale,
  missingRecommended,
  preferredScale,
  rassSchema,
  referenceAllowsBaseline,
  requiredComplete,
  requiredSchema,
  coreTempSchema,
  noteSchema,
  type PatientProfile,
} from './profile';

const H = 3_600_000;
const base = { patientRef: 'P-7F3A', bedId: '4', ageYears: 64, sex: 'male', careSetting: 'ICU', communication: 'none', airway: 'controlled' } as const;
const issue = (v: unknown) => {
  const r = requiredSchema.safeParse(v);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('required profile schema (task §3.2-A step 1)', () => {
  it('accepts a complete adult profile', () => expect(issue(base)).toBeNull());
  it('requires the P-XXXX pseudonymised format', () => {
    expect(issue({ ...base, patientRef: 'John Smith' })).toBe('patientRef');
    expect(issue({ ...base, patientRef: 'P-7F3' })).toBe('patientRef');
    expect(issue({ ...base, patientRef: 'P-7f3a' })).toBe('patientRef');
  });
  it('blocks paediatric patients with the dedicated message', () => {
    expect(issue({ ...base, ageYears: 17 })).toBe('paediatric');
    expect(issue({ ...base, ageYears: 18 })).toBeNull();
  });
  it('rejects ages above 110 and non-integers', () => {
    expect(issue({ ...base, ageYears: 110 })).toBeNull();
    expect(issue({ ...base, ageYears: 111 })).toBe('ageMax');
    expect(issue({ ...base, ageYears: 40.5 })).toBe('age');
  });
  it('requires every segmented field', () => {
    expect(issue({ ...base, airway: undefined })).toBe('required');
    expect(issue({ ...base, communication: 'maybe' })).toBe('required');
  });
  it('generates pseudonymised IDs only', () => {
    for (let i = 0; i < 50; i++) expect(generatePatientRef()).toMatch(/^P-[0-9A-F]{4}$/);
  });
  it('requiredComplete is false for an empty profile', () => {
    expect(requiredComplete(emptyProfile('9', 'P-0001'))).toBe(false);
    expect(requiredComplete({ ...emptyProfile('9', 'P-0001'), ...base })).toBe(true);
  });
});

describe('ranges', () => {
  it('RASS −5…+4', () => {
    expect(rassSchema.safeParse(-5).success).toBe(true);
    expect(rassSchema.safeParse(4).success).toBe(true);
    expect(rassSchema.safeParse(-6).success).toBe(false);
    expect(rassSchema.safeParse(5).success).toBe(false);
  });
  it('core temperature 30–43 °C', () => {
    expect(coreTempSchema.safeParse(29.9).success).toBe(false);
    expect(coreTempSchema.safeParse(38.4).success).toBe(true);
  });
  it('note ≤ 500 characters', () => expect(noteSchema.safeParse('x'.repeat(501)).success).toBe(false));
});

describe('contradictions (task §3.3)', () => {
  const ids = (s: Parameters<typeof contradictions>[0]) => contradictions(s).map((c) => `${c.id}:${c.severity}`);
  it('"Can self-report" + RASS ≤ −4 → confirm', () => {
    expect(ids({ communication: 'self', rass: -4, flags: [] })).toEqual(['SELF_REPORT_DEEP_SEDATION:confirm']);
    expect(ids({ communication: 'self', rass: -5, flags: [] })).toEqual(['SELF_REPORT_DEEP_SEDATION:confirm']);
    expect(ids({ communication: 'self', rass: -3, flags: [] })).toEqual([]);
  });
  it('"Not intubated" + controlled ventilation → blocked', () => {
    expect(ids({ airway: 'none', flags: ['CONTROLLED_VENTILATION'] })).toContain('VENTILATION_NOT_INTUBATED:block');
  });
  it('NMB requires controlled ventilation and excludes self-report', () => {
    expect(ids({ airway: 'none', flags: ['NMB'] })).toContain('NMB_NOT_VENTILATED:block');
    expect(ids({ airway: 'spontaneous', flags: ['NMB'] })).toContain('NMB_NOT_VENTILATED:block');
    expect(ids({ airway: 'controlled', flags: ['NMB'] })).toEqual([]);
    expect(ids({ airway: 'controlled', communication: 'self', flags: ['NMB'] })).toContain('NMB_SELF_REPORT:block');
  });
  it('fever and hypothermia cannot coexist', () => expect(ids({ flags: ['FEVER', 'HYPOTHERMIA'] })).toContain('FEVER_AND_HYPOTHERMIA:block'));
  it('ward + controlled ventilation needs confirmation', () => expect(ids({ careSetting: 'WARD', airway: 'controlled', flags: [] })).toEqual(['WARD_CONTROLLED_VENTILATION:confirm']));
  it('dose change without a vasopressor needs confirmation', () => {
    expect(ids({ flags: ['VASOPRESSOR_DOSE_CHANGE'] })).toEqual(['DOSE_CHANGE_WITHOUT_VASOPRESSOR:confirm']);
    expect(ids({ flags: ['VASOPRESSOR', 'VASOPRESSOR_DOSE_CHANGE'] })).toEqual([]);
  });
});

describe('freshness (task §3.1-6)', () => {
  const now = 100 * H;
  it('RASS and CAM-ICU are stale after 4 h', () => {
    expect(isStale('rass', now - 4 * H + 1, now, 'ICU')).toBe(false);
    expect(isStale('rass', now - 4 * H - 1, now, 'ICU')).toBe(true);
    expect(isStale('cam', now - 5 * H, now, 'WARD')).toBe(true);
  });
  it('CPOT/BPS reminder after 4 h only in ICU mode', () => {
    expect(isStale('reference', now - 5 * H, now, 'ICU')).toBe(true);
    expect(isStale('reference', now - 5 * H, now, 'WARD')).toBe(false);
  });
  it('thresholds are configurable', () => {
    expect(isStale('rass', now - 2 * H, now, 'ICU', { rassStaleH: 1, camStaleH: 4, referenceReminderH: 4 })).toBe(true);
  });
});

describe('scale offered first (task §3.2-E, D-14)', () => {
  it.each([
    [{ communication: 'self', airway: 'none' }, 'NRS'],
    [{ communication: 'self', airway: 'controlled' }, 'NRS'],
    [{ communication: 'none', airway: 'controlled' }, 'BPS'],
    [{ communication: 'none', airway: 'spontaneous' }, 'BPS'],
    [{ communication: 'none', airway: 'none' }, 'CPOT'],
    [{ communication: 'intermittent', airway: 'none' }, 'NRS'],
  ] as const)('%o → %s', (p, scale) => expect(preferredScale(p)).toBe(scale));
});

describe('baseline eligibility (task §3.2-F, D-13)', () => {
  it('CPOT ≤ 2, BPS ≤ 4 (≈ CPOT 0–2), NRS ≤ 3', () => {
    expect(referenceAllowsBaseline('CPOT', 2)).toBe(true);
    expect(referenceAllowsBaseline('CPOT', 3)).toBe(false);
    expect(referenceAllowsBaseline('BPS', 4)).toBe(true);
    expect(referenceAllowsBaseline('BPS', 5)).toBe(false);
    expect(referenceAllowsBaseline('NRS', 3)).toBe(true);
    expect(referenceAllowsBaseline('NRS', 4)).toBe(false);
  });
});

describe('recommended fields never block (task §3.3)', () => {
  it('lists what is missing for the "Profile incomplete" badge', () => {
    const p: PatientProfile = { ...emptyProfile('9', 'P-0001'), ...base };
    expect(missingRecommended(p, false)).toEqual(['admission', 'rass', 'cam', 'reference', 'medications', 'conditions']);
    expect(missingRecommended({ ...p, medsReviewed: true, conditionsReviewed: true, rass: { value: -2, at: 0 }, cam: { result: 'negative', at: 0 }, admission: { category: 'medical', surgeryAt: null } }, true)).toEqual([]);
    expect(requiredComplete(p)).toBe(true);
  });
});
