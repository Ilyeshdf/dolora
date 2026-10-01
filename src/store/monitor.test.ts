import { useMonitor } from './monitor';
import { FIXTURES, FIXTURE_IDS } from '@/fixtures/monitorFixtures';

const S = () => useMonitor.getState();

describe('monitor store actions', () => {
  beforeEach(() => S().load('pain'));

  it('acknowledge collapses the alert into the acknowledged strip and audits it (§7.2)', () => {
    const before = S().audit.length;
    S().acknowledge();
    expect(S().view.alert).toMatchObject({ kind: 'acknowledged', by: 'DR', at: '14:32' });
    expect(S().view.timeline.alerts.every((a) => a.acknowledged)).toBe(true);
    expect(S().audit).toHaveLength(before + 1);
    expect(S().audit[0]).toMatchObject({ actor: 'clinician', who: 'DR', kind: 'alert' });
    expect(S().audit[0]?.action.en).toBe('Alert acknowledged');
  });

  it('acknowledge is a no-op when there is no active alert', () => {
    S().load('stress');
    const before = S().audit.length;
    S().acknowledge();
    expect(S().view.alert.kind).toBe('none');
    expect(S().audit).toHaveLength(before);
  });

  it('saving an assessment adds a timeline reference, updates the last reference and audits (§7.6)', () => {
    S().setDialog('assessment');
    S().saveAssessment({ scale: 'CPOT', total: 4, items: [1, 1, 1, 1], note: '' });
    const v = S().view;
    expect(S().dialog).toBeNull();
    expect(v.timeline.references.at(-1)).toMatchObject({ scale: 'CPOT', value: 4, t: v.timeline.now });
    expect(v.lastReference).toEqual({ scale: 'CPOT', value: 4, ageMin: 0 });
    expect(S().audit[0]?.detail?.en).toBe('Total 4 / 8');
  });

  it('records BPS totals out of 12', () => {
    S().saveAssessment({ scale: 'BPS', total: 7, items: null, note: 'post suction' });
    expect(S().audit[0]?.detail?.en).toBe('Total 7 / 12 · “post suction”');
  });

  it('mode change is audited with old → new (§12 "Mode change: audited")', () => {
    S().confirmMode('WARD');
    expect(S().view.mode).toBe('WARD');
    expect(S().audit[0]?.detail?.en).toBe('ICU → Ward (confirmed)');
    S().confirmMode('WARD');
    expect(S().audit[0]?.detail?.en).toBe('ICU → Ward (confirmed)'); // no duplicate entry
  });

  it('audit is append-only across actions', () => {
    const ids = S().audit.map((e) => e.id);
    S().acknowledge();
    S().saveAssessment({ scale: 'CPOT', total: 2, items: null, note: '' });
    const after = S().audit.map((e) => e.id);
    expect(ids.every((id) => after.includes(id))).toBe(true);
  });
});

describe('design fixtures obey the spec invariants', () => {
  it.each(FIXTURE_IDS)('%s: attribution shares sum to 100 %%', (id) => {
    const a = FIXTURES[id]().attribution;
    if (!a) return;
    const sum = a.pain + a.stress + (a.agitation ?? 0) + a.rest + a.unexplained;
    expect(sum).toBeCloseTo(1, 2);
  });

  it.each(FIXTURE_IDS)('%s: no pain alert can show while REJECTED (§12)', (id) => {
    const v = FIXTURES[id]();
    if (v.status === 'REJECTED') {
      expect(v.alert.kind).not.toBe('alert');
      expect(v.pain).toBeNull();
      expect(v.attribution).toBeNull();
      expect(v.drivers).toHaveLength(0);
    }
  });

  it.each(FIXTURE_IDS)('%s: interval brackets the score', (id) => {
    const p = FIXTURES[id]().pain;
    if (p) {
      expect(p.lo).toBeLessThanOrEqual(p.score);
      expect(p.hi).toBeGreaterThanOrEqual(p.score);
    }
  });

  it.each(FIXTURE_IDS)('%s: clinical patient → coverage not validated (D-1)', (id) => {
    const p = FIXTURES[id]().pain;
    if (p) expect(p.coverageValidated).toBe(false);
  });

  it('masked channels come with a context reason (D-7)', () => {
    const v = FIXTURES.degraded();
    expect(v.channels.face?.state).toBe('masked');
    expect(v.channels.motion?.state).toBe('masked');
    expect(v.context.some((c) => c.flag === 'NMB')).toBe(true);
    expect(v.attribution?.agitation).toBeNull();
  });

  it('timeline history is deterministic (seeded PRNG, §15.1)', () => {
    expect(FIXTURES.pain().timeline.samples).toEqual(FIXTURES.pain().timeline.samples);
  });
});
