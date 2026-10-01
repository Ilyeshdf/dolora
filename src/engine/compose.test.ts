import { FIXTURES } from '@/fixtures/monitorFixtures';
import { buildView } from '@/features/monitor/useView';
import type { ContextEntry, EventEntry } from './effects';
import type { BedClinical } from '@/store/clinical';

const MIN = 60_000;
function bedFrom(id: keyof typeof FIXTURES) {
  const fx = FIXTURES[id]();
  const bed: BedClinical = { ...fx.seed, calibration: null, audit: [] };
  return { fx, bed };
}
const cx = (flag: ContextEntry['flag'], startedAt: number): ContextEntry => ({ id: `t-${flag}`, flag, startedAt, enteredAt: startedAt, by: 'DR' });
const ev = (event: EventEntry['event'], t: number): EventEntry => ({ id: `t-${event}-${t}`, event, t, enteredAt: t, by: 'DR' });

describe('fixtures compose back to the artboards (design → raw → composeView)', () => {
  it('A1: 6.4 (4.3 – 8.1), pain 68 %, no driver weight badges', () => {
    const { fx, bed } = bedFrom('pain');
    const v = buildView(fx.raw, bed, fx.now);
    expect(v.pain).toMatchObject({ score: 6.4, lo: 4.3, hi: 8.1 });
    expect(v.attribution?.pain).toBeCloseTo(0.68, 2);
    expect(v.drivers.map((d) => d.weight)).toEqual([undefined, undefined, undefined]);
    expect(v.context.map((c) => c.flag)).toEqual(['CONTROLLED_VENTILATION', 'SUCTIONING']);
    expect(v.context[1]?.remainingS).toBe(84); // "1:24 left"
    expect(v.status).toBe('OK');
  });
  it('A4: 5.2 (2.9 – 7.8), agitation n/a, face + motion masked, HR weight badge', () => {
    const { fx, bed } = bedFrom('degraded');
    const v = buildView(fx.raw, bed, fx.now);
    expect(v.pain).toMatchObject({ score: 5.2, lo: 2.9, hi: 7.8 });
    expect(v.attribution?.agitation).toBeNull();
    expect(v.attribution?.pain).toBeCloseTo(0.58, 2);
    expect(v.channels.face?.state).toBe('masked');
    expect(v.channels.motion?.state).toBe('masked');
    expect(v.drivers.find((d) => d.id === 'hr')?.weight).toBeLessThanOrEqual(0.3);
    expect(v.status).toBe('DEGRADED');
    expect(v.alert).toEqual({ kind: 'advisory', advisory: 'NMB' });
  });
});

describe('every input visibly changes the view (task §3.4)', () => {
  it('removing NMB restores face + motion, agitation and narrows the interval', () => {
    const { fx, bed } = bedFrom('degraded');
    const before = buildView(fx.raw, bed, fx.now);
    const nmb = bed.context.find((c) => c.flag === 'NMB')!;
    const after = buildView(fx.raw, { ...bed, context: bed.context.map((c) => (c === nmb ? { ...c, removed: { at: fx.now, by: 'DR', reason: 'stopped' } } : c)) }, fx.now);
    expect(after.channels.face?.state).toBe('ok');
    expect(after.attribution?.agitation).not.toBeNull();
    expect(after.pain!.hi - after.pain!.lo).toBeLessThan(before.pain!.hi - before.pain!.lo);
    expect(after.drivers.some((d) => d.sensor === 'face')).toBe(true);
    expect(after.alert.kind).toBe('none');
  });

  it('an opioid bolus lowers the pain share and the score (prior route)', () => {
    const { fx, bed } = bedFrom('pain');
    const before = buildView(fx.raw, bed, fx.now);
    const after = buildView(fx.raw, { ...bed, events: [...bed.events, ev('OPIOID_BOLUS', fx.now - MIN)] }, fx.now);
    expect(after.attribution!.pain).toBeLessThan(before.attribution!.pain);
    expect(after.pain!.score).toBeLessThan(before.pain!.score);
    expect(after.context.find((c) => c.flag === 'OPIOID_BOLUS')?.kind).toBe('timed');
  });

  it('a beta-blocker adds the HR weight badge and degrades PPG reliability (measurement route)', () => {
    const { fx, bed } = bedFrom('stress');
    const v = buildView(fx.raw, { ...bed, context: [cx('BETA_BLOCKER', fx.now - MIN)] }, fx.now);
    expect(v.drivers.find((d) => d.id === 'hr')?.weight).toBeCloseTo(0.3);
    expect(v.channels.ppg?.state).toBe('degraded');
    expect(v.channels.ppg?.note?.en).toMatch(/Reliability 0\.29 · beta-blocker/);
  });

  it('paced rhythm shows PPG as MASKED (distinct from REJECTED) with the masked features', () => {
    const { fx, bed } = bedFrom('pain');
    const v = buildView(fx.raw, { ...bed, context: [cx('PACED_RHYTHM', fx.now - MIN)] }, fx.now);
    expect(v.channels.ppg?.state).toBe('masked');
    expect(v.channels.ppg?.note?.en).toBe('HR, HRV masked (paced)');
    const rejected = buildView(FIXTURES.abstain().raw, bedFrom('abstain').bed, FIXTURES.abstain().now);
    expect(rejected.channels.ppg?.state).toBe('rejected');
  });

  it('context unassessable → REJECTED, abstention, no pain alert even while the engine alert is active', () => {
    const { fx, bed } = bedFrom('pain');
    const v = buildView(fx.raw, { ...bed, context: [cx('NMB', fx.now - 2 * MIN), cx('ANTICHOLINERGIC', fx.now - MIN)] }, fx.now);
    expect(v.status).toBe('REJECTED');
    expect(v.contextUnassessable).toBe(true);
    expect(v.pain).toBeNull();
    expect(v.alert).toEqual({ kind: 'advisory', advisory: 'UNASSESSABLE' });
    expect(v.lastValid?.ageS).toBe(60);
  });

  it('vasopressor dose change: washout advisory with countdown and "recalibration needed"', () => {
    const { fx, bed } = bedFrom('stress');
    const v = buildView(fx.raw, { ...bed, context: [cx('VASOPRESSOR', fx.now - 60 * MIN)], events: [...bed.events, ev('VASOPRESSOR_DOSE_CHANGE', fx.now - 5 * MIN)] }, fx.now);
    expect(v.alert).toEqual({ kind: 'advisory', advisory: 'WASHOUT', remainingS: 600 });
    expect(v.baseline).toBe('recalibration');
    expect(v.channels.temp?.state).toBe('masked');
  });

  it('glucose prompt: insulin-treated diabetes + unexplained arousal + sweating only', () => {
    const { fx, bed } = bedFrom('stress');
    const raw = { ...fx.raw, likelihood: { ...fx.raw.likelihood!, unexplained: 0.5 } };
    expect(buildView(raw, { ...bed, events: [], context: [cx('INSULIN_DIABETES', fx.now - 60 * MIN)] }, fx.now).alert).toEqual({ kind: 'advisory', advisory: 'GLUCOSE' });
    expect(buildView(raw, { ...bed, events: [] }, fx.now).alert.kind).toBe('none');
    expect(buildView({ ...raw, edaRising: false }, { ...bed, events: [], context: [cx('INSULIN_DIABETES', fx.now - 60 * MIN)] }, fx.now).alert.kind).toBe('none');
  });

  it('logged events appear at their (retroactive) time on the timeline', () => {
    const { fx, bed } = bedFrom('stress');
    const t = fx.now - 15 * MIN;
    const v = buildView(fx.raw, { ...bed, events: [...bed.events, ev('OPIOID_BOLUS', t), ev('TURNING', t)] }, fx.now);
    expect(v.timeline.contextEvents.some((e) => e.t === t && e.label.en.startsWith('Opioid bolus'))).toBe(true);
    expect(v.timeline.regions.some((r) => r.from === t && r.label.en === 'Turning')).toBe(true);
  });

  it('references become timeline diamonds and the latest drives "last reference"', () => {
    const { fx, bed } = bedFrom('pain');
    const v = buildView(fx.raw, { ...bed, references: [...bed.references, { id: 'r', scale: 'NRS', value: 6, items: null, t: fx.now - 2 * MIN, enteredAt: fx.now, by: 'DR', note: '' }] }, fx.now);
    expect(v.lastReference).toEqual({ scale: 'NRS', value: 6, ageMin: 2 });
    expect(v.timeline.references.some((r) => r.scale === 'NRS')).toBe(true);
  });

  it('calibration: no scores until the baseline is learned; info strip countdown', () => {
    const { fx, bed } = bedFrom('stress');
    const v = buildView(fx.raw, { ...bed, calibration: { startedAt: fx.now - 30_000, durationS: 90, completed: false } }, fx.now);
    expect(v.pain).toBeNull();
    expect(v.attribution).toBeNull();
    expect(v.alert).toEqual({ kind: 'calibrating', remainingS: 60 });
    expect(v.baseline).toBe('calibrating');
  });
});
