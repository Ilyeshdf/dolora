import { emptyProfile, type PatientProfile } from '@/clinical/profile';
import { deriveEffects, wouldBeUnassessable, type ContextEntry, type EventEntry } from './effects';

const MIN = 60_000;
const H = 60 * MIN;
const NOW = 1000 * H;
const profile = (p: Partial<PatientProfile> = {}): PatientProfile => ({
  ...emptyProfile('4', 'P-7F3A'),
  ageYears: 64,
  sex: 'male',
  careSetting: 'ICU',
  communication: 'none',
  airway: 'controlled',
  ...p,
});
const cx = (flag: ContextEntry['flag'], startedAt = NOW - H, removed = false): ContextEntry => ({
  id: `${flag}-${startedAt}`,
  flag,
  startedAt,
  enteredAt: startedAt,
  by: 'DR',
  ...(removed ? { removed: { at: NOW, by: 'DR', reason: 'stopped' as const } } : {}),
});
const ev = (event: EventEntry['event'], t: number): EventEntry => ({ id: `${event}-${t}`, event, t, enteredAt: t, by: 'DR' });
const eff = (context: ContextEntry[] = [], events: EventEntry[] = [], p: Partial<PatientProfile> = {}, now = NOW, lastBaselineAt: number | null = null) =>
  deriveEffects({ profile: profile(p), context, events, now, lastBaselineAt });

describe('task §3.3 interaction rules', () => {
  it('NMB: face and motion masked; behavioural-assessment advisory', () => {
    const e = eff([cx('NMB')]);
    expect(e.weights.face).toBe(0);
    expect(e.weights.motion).toBe(0);
    expect(e.maskedBy.face).toEqual(['NMB']);
    expect(e.advisories).toContain('NMB');
    expect(e.unassessable).toBe(false); // EDA still informative
  });

  it('NMB + anticholinergic → no reliable channel (CONTEXT_UNASSESSABLE), warned before saving', () => {
    expect(eff([cx('NMB'), cx('ANTICHOLINERGIC', NOW - 5 * MIN)]).unassessable).toBe(true);
    expect(wouldBeUnassessable({ profile: profile(), context: [cx('NMB')], events: [], now: NOW }, 'ANTICHOLINERGIC')).toBe(true);
    expect(wouldBeUnassessable({ profile: profile(), context: [], events: [], now: NOW }, 'ANTICHOLINERGIC')).toBe(false);
  });

  it('anticholinergic is timed (60 min): EDA masked only while active', () => {
    expect(eff([cx('ANTICHOLINERGIC', NOW - 59 * MIN)]).weights.eda).toBe(0);
    expect(eff([cx('ANTICHOLINERGIC', NOW - 61 * MIN)]).weights.eda).toBe(1);
  });

  it('paced rhythm disables HR and HRV; AF disables HRV only', () => {
    const paced = eff([cx('PACED_RHYTHM')]);
    expect([paced.weights.hr, paced.weights.hrv]).toEqual([0, 0]);
    const af = eff([cx('ATRIAL_FIBRILLATION')]);
    expect(af.weights.hrv).toBe(0);
    expect(af.weights.hr).toBe(1);
    expect(af.maskedBy.hrv).toEqual(['ATRIAL_FIBRILLATION']);
  });

  it('vasopressor dose change: 15-min washout masks pulse amplitude + temperature, then recalibration needed', () => {
    const t0 = NOW - 14 * MIN;
    const during = eff([cx('VASOPRESSOR')], [ev('VASOPRESSOR_DOSE_CHANGE', t0)]);
    expect(during.weights.pulse).toBe(0);
    expect(during.weights.temp).toBe(0);
    expect(during.advisories).toContain('WASHOUT');
    expect(during.recalibrationNeeded).toBe(true);
    const after = eff([cx('VASOPRESSOR')], [ev('VASOPRESSOR_DOSE_CHANGE', NOW - 16 * MIN)]);
    expect(after.weights.pulse).toBeCloseTo(0.3 * 0.7); // stable vasopressor × controlled ventilation
    expect(after.advisories).not.toContain('WASHOUT');
    expect(after.recalibrationNeeded).toBe(true);
    // a baseline marked after the dose change clears it
    expect(eff([cx('VASOPRESSOR')], [ev('VASOPRESSOR_DOSE_CHANGE', NOW - 16 * MIN)], {}, NOW, NOW - MIN).recalibrationNeeded).toBe(false);
  });

  it('SCI ≥ T6 raises the profile info banner advisory', () => expect(eff([cx('SCI_T6_OR_ABOVE')]).advisories).toContain('SCI'));

  it('insulin-treated diabetes enables the glucose prompt rule', () => expect(eff([cx('INSULIN_DIABETES')]).advisories).toContain('GLUCOSE'));

  it('opioid bolus: pain prior ×0.5 for 30 min (timed)', () => {
    const e = eff([], [ev('OPIOID_BOLUS', NOW - 10 * MIN)], { admission: null });
    expect(e.priors.pain).toBeCloseTo(0.5);
    expect(e.active.find((a) => a.flag === 'OPIOID_BOLUS')?.endsAt).toBe(NOW + 20 * MIN);
    expect(eff([], [ev('OPIOID_BOLUS', NOW - 31 * MIN)], { admission: null }).priors.pain).toBe(1);
  });

  it('beta-blocker acts on measurement, not the prior (§4.1 critical principle)', () => {
    const e = eff([cx('BETA_BLOCKER')], [], { admission: null, airway: 'none' });
    expect(e.weights.hr).toBeCloseTo(0.3);
    expect(e.weights.hrv).toBeCloseTo(0.6);
    expect(e.weights.eda).toBe(1);
    expect(e.priors.pain).toBe(1);
  });
});

describe('profile-derived effects', () => {
  it('controlled ventilation disables respiration and halves HRV', () => {
    const e = eff([], [], { airway: 'controlled' });
    expect(e.weights.resp).toBe(0);
    expect(e.weights.hrv).toBeCloseTo(0.5);
    expect(eff([], [], { airway: 'spontaneous' }).weights.resp).toBe(1);
  });
  it('hyperactive delirium widens attribution uncertainty', () => {
    expect(eff([], [], { cam: { result: 'hyperactive', at: NOW } }).attributionUncertainty).toBeGreaterThan(0);
    expect(eff([], [], { cam: { result: 'hypoactive', at: NOW } }).attributionUncertainty).toBe(0);
  });
  it('surgical prior applies within 72 h and fades after', () => {
    expect(eff([], [], { admission: { category: 'thoracic', surgeryAt: NOW - 26 * H } }).priors.pain).toBeCloseTo(1.3);
    expect(eff([], [], { admission: { category: 'thoracic', surgeryAt: NOW - 80 * H } }).priors.pain).toBe(1);
    expect(eff([], [], { admission: { category: 'medical', surgeryAt: null } }).priors.pain).toBe(1);
  });
  it('core temperature ≥ 38 °C derives fever; < 35.5 °C hypothermia', () => {
    expect(eff([], [], { coreTemp: { source: 'bladder', valueC: 38.4, at: NOW } }).active.map((a) => a.flag)).toContain('FEVER');
    expect(eff([], [], { coreTemp: { source: 'bladder', valueC: 35.2, at: NOW } }).active.map((a) => a.flag)).toContain('HYPOTHERMIA');
  });
  it('skin problem at the EDA site down-weights EDA', () => expect(eff([], [], { skin: [{ site: 'eda', condition: 'oedema' }] }).weights.eda).toBeCloseTo(0.6));
});

describe('records', () => {
  it('removed entries have no effect but stay in the record (never hard-deleted)', () => {
    const entries = [cx('NMB', NOW - H, true)];
    expect(eff(entries).weights.face).toBe(1);
    expect(entries).toHaveLength(1);
  });
  it('repeated events of one kind show as a single effect ending last', () => {
    const e = eff([], [ev('SUCTIONING', NOW - 90_000), ev('SUCTIONING', NOW - 30_000)]);
    expect(e.active.filter((a) => a.flag === 'SUCTIONING')).toHaveLength(1);
    expect(e.active.find((a) => a.flag === 'SUCTIONING')?.endsAt).toBe(NOW + 90_000);
  });
  it('future-dated entries are not yet active', () => expect(eff([cx('NMB', NOW + MIN)]).weights.face).toBe(1));
});
