import { emptyProfile, type PatientProfile } from '@/clinical/profile';
import { profileToWire } from '@/contracts/messages';
import { useOutbox } from '@/data/outbound';
import { useClinical } from './clinical';

const NOW = Date.UTC(2026, 9, 2, 14, 0);
const MIN = 60_000;
const C = () => useClinical.getState();
const sent = () => useOutbox.getState().sent;
const profile: PatientProfile = {
  ...emptyProfile('9', 'P-0B12'),
  ageYears: 58,
  sex: 'female',
  careSetting: 'ICU',
  communication: 'self',
  airway: 'none',
  note: 'free text stays local',
};

beforeEach(() => {
  useClinical.setState({ beds: {} });
  useOutbox.setState({ sent: [] });
  C().admit('9', profile, { context: [{ flag: 'BETA_BLOCKER', startedAt: NOW - 60 * MIN }], reference: { scale: 'NRS', value: 2, items: null, t: NOW - 5 * MIN, note: '' } }, NOW, 90);
});

describe('admission', () => {
  it('stores the profile, context and reference, starts calibration and emits typed messages', () => {
    const b = C().bed('9');
    expect(b.profile?.patientRef).toBe('P-0B12');
    expect(b.context.map((c) => c.flag)).toEqual(['BETA_BLOCKER']);
    expect(b.calibration).toMatchObject({ startedAt: NOW, durationS: 90, completed: false });
    expect(sent().map((m) => m.type)).toEqual(['patient_profile', 'context_flag', 'nrs_entry']);
    expect(sent()[1]).toMatchObject({ type: 'context_flag', flag: 'BETA_BLOCKER', active: true });
  });
  it('the free-text note never leaves the dashboard (data minimisation)', () => {
    expect(JSON.stringify(sent()[0])).not.toMatch(/free text/);
    expect('note' in profileToWire(profile)).toBe(false);
  });
  it('calibration completion marks a good baseline (system audit)', () => {
    C().completeCalibration('9', NOW + 90_000);
    expect(C().bed('9').baselineMark).toEqual({ at: NOW + 90_000, quality: 'good' });
    expect(C().bed('9').audit.at(-1)?.actor).toBe('system');
  });
});

describe('profile edits are audited old → new, with undo', () => {
  it('records each changed field and re-sends the profile', () => {
    C().updateProfile('9', { communication: 'intermittent', sex: 'female' }, NOW + MIN);
    const e = C().bed('9').audit.at(-1)!;
    expect(e.action.en).toBe('Communication updated');
    expect(e.old?.en).toBe('Can self-report');
    expect(e.new?.en).toBe('Intermittent');
    expect(e.who).toBe('DR');
    expect(sent().at(-1)?.type).toBe('patient_profile');
  });
  it('no-op edits write nothing', () => {
    const n = C().bed('9').audit.length;
    expect(C().updateProfile('9', { sex: 'female' }, NOW)).toBeNull();
    expect(C().bed('9').audit).toHaveLength(n);
  });
  it('undo restores the previous value and is itself audited', () => {
    const token = C().updateProfile('9', { rass: { value: -2, at: NOW } }, NOW)!;
    expect(C().undo(token)).toBe(true);
    expect(C().bed('9').profile?.rass).toBeNull();
    expect(C().bed('9').audit.at(-1)?.action.en).toBe('Edit undone');
    expect(C().undo(token)).toBe(false);
  });
});

describe('context, events, references', () => {
  it('removal keeps the record with a reason (never hard-deleted) and emits active:false', () => {
    const id = C().bed('9').context[0]!.id;
    C().removeContext('9', id, 'error', NOW + MIN);
    const entry = C().bed('9').context[0]!;
    expect(entry.removed).toMatchObject({ reason: 'error', by: 'DR' });
    expect(C().bed('9').audit.at(-1)?.removedReason?.en).toBe('Entered in error');
    expect(sent().at(-1)).toMatchObject({ type: 'context_flag', active: false, reason: 'error' });
  });
  it('undo of an added context marks it "entered in error" rather than deleting', () => {
    const token = C().addContext('9', 'ATRIAL_FIBRILLATION', NOW, NOW);
    C().undo(token);
    const af = C().bed('9').context.find((c) => c.flag === 'ATRIAL_FIBRILLATION')!;
    expect(af.removed?.reason).toBe('error');
  });
  it('retroactive events keep event time and entry time (audit + message)', () => {
    C().logEvent('9', 'TURNING', NOW - 15 * MIN, NOW);
    const e = C().bed('9').audit.at(-1)!;
    expect(e.t).toBe(NOW - 15 * MIN);
    expect(e.enteredAt).toBe(NOW);
    expect(e.action.en).toBe('Event logged (retroactive)');
    expect(sent().at(-1)).toMatchObject({ type: 'event', event: 'TURNING', t: new Date(NOW - 15 * MIN).toISOString(), entered_at: new Date(NOW).toISOString() });
  });
  it('vasopressor dose change is logged as an event without any amount', () => {
    C().logEvent('9', 'VASOPRESSOR_DOSE_CHANGE', NOW, NOW);
    const m = sent().at(-1)!;
    expect(Object.keys(m).sort()).toEqual(['bed', 'entered_at', 'event', 't', 'type']);
    expect(C().bed('9').audit.at(-1)?.action.en).toBe('Recalibration needed');
  });
  it('CPOT / BPS / NRS emit their own entry messages', () => {
    C().addReference('9', { scale: 'CPOT', value: 4, items: [1, 1, 1, 1], t: NOW, note: '' }, NOW);
    expect(sent().at(-1)).toMatchObject({ type: 'cpot_entry', total: 4, items: [1, 1, 1, 1] });
    C().addReference('9', { scale: 'BPS', value: 7, items: null, t: NOW, note: '' }, NOW);
    expect(sent().at(-1)).toMatchObject({ type: 'bps_entry', total: 7 });
  });
  it('baseline marking emits mark_baseline with its quality', () => {
    C().markBaseline('9', 'provisional', NOW);
    expect(C().bed('9').baselineMark?.quality).toBe('provisional');
    expect(sent().at(-1)).toMatchObject({ type: 'mark_baseline', quality: 'provisional' });
  });
  it('mode changes are audited with the old and new alert rules', () => {
    C().setMode('9', 'WARD', NOW);
    const e = C().bed('9').audit.at(-1)!;
    expect(e.old?.en).toMatch(/^ICU/);
    expect(e.new?.en).toMatch(/^Ward \(lower 80% bound/);
    expect(sent().at(-1)).toEqual({ type: 'mode_change', bed: '9', mode: 'WARD_HIGH_SPECIFICITY' });
  });
  it('the audit trail only grows', () => {
    const before = C().bed('9').audit.map((a) => a.id);
    C().logEvent('9', 'SUCTIONING', NOW, NOW);
    C().removeEvent('9', C().bed('9').events[0]!.id, 'stopped', NOW);
    const after = C().bed('9').audit.map((a) => a.id);
    expect(before.every((id) => after.includes(id))).toBe(true);
    expect(after.length).toBe(before.length + 2);
  });
});
