import { useMonitor } from './monitor';
import { useClinical } from './clinical';
import { FIXTURES, FIXTURE_IDS } from '@/fixtures/monitorFixtures';
import { buildView } from '@/features/monitor/useView';

const S = () => useMonitor.getState();
const audit = () => useClinical.getState().bed('4').audit;

describe('monitor store', () => {
  beforeEach(() => S().loadFixture('pain'));

  it('loading a fixture seeds the bed clinical record', () => {
    expect(useClinical.getState().bed('4').profile?.patientRef).toBe('P-7F3A');
    expect(S().now).toBe(FIXTURES.pain().now);
  });

  it('acknowledge collapses the alert and audits it (§7.2)', () => {
    const before = audit().length;
    S().acknowledge();
    expect(S().raw.alert).toMatchObject({ kind: 'acknowledged', by: 'DR', at: '14:32' });
    expect(S().raw.timeline.alerts.every((a) => a.acknowledged)).toBe(true);
    expect(audit()).toHaveLength(before + 1);
    expect(audit().at(-1)?.action.en).toBe('Alert acknowledged');
  });

  it('acknowledge is a no-op without an active alert', () => {
    S().loadFixture('stress');
    const before = audit().length;
    S().acknowledge();
    expect(audit()).toHaveLength(before);
  });

  it('the clock ticks unless frozen', () => {
    const t0 = S().now;
    S().tick(1000);
    expect(S().now).toBe(t0 + 1000);
    S().setFrozen(true);
    S().tick(1000);
    expect(S().now).toBe(t0 + 1000);
    S().setFrozen(false);
  });

  it('mode confirmation goes through the audited clinical store', () => {
    S().confirmMode('WARD');
    expect(useClinical.getState().bed('4').mode).toBe('WARD');
    expect(audit().at(-1)?.kind).toBe('mode');
  });
});

describe('design fixtures obey the spec invariants', () => {
  const views = FIXTURE_IDS.map((id) => {
    const fx = FIXTURES[id]();
    return [id, buildView(fx.raw, { ...fx.seed, calibration: null, audit: [] }, fx.now)] as const;
  });
  it.each(views)('%s: attribution shares sum to 100 %%', (_, v) => {
    const a = v.attribution;
    if (!a) return;
    expect(a.pain + a.stress + (a.agitation ?? 0) + a.rest + a.unexplained).toBeCloseTo(1, 6);
  });
  it.each(views)('%s: no pain alert can show while REJECTED (§12)', (_, v) => {
    if (v.status !== 'REJECTED') return;
    expect(v.alert.kind).not.toBe('alert');
    expect(v.pain).toBeNull();
    expect(v.attribution).toBeNull();
    expect(v.drivers).toHaveLength(0);
  });
  it.each(views)('%s: interval brackets the score', (_, v) => {
    if (!v.pain) return;
    expect(v.pain.lo).toBeLessThanOrEqual(v.pain.score);
    expect(v.pain.hi).toBeGreaterThanOrEqual(v.pain.score);
  });
  it.each(views)('%s: clinical patient → coverage not validated (D-1)', (_, v) => {
    if (v.pain) expect(v.pain.coverageValidated).toBe(false);
  });
  it('timeline history is deterministic (seeded PRNG, §15.1)', () => {
    expect(FIXTURES.pain().raw.timeline.samples).toEqual(FIXTURES.pain().raw.timeline.samples);
  });
});
