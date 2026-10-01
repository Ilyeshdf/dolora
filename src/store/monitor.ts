/**
 * Monitor store — the active bed's RAW engine output, the clock, and screen UI state.
 * The displayed view is derived (raw + clinical context + now) by `useView()`; clinical data
 * lives in `useClinical`. Phase 4 replaces the fixture/rest raw source by the live adapter or
 * the simulator without touching this split.
 */
import { create } from 'zustand';
import type { Mode } from '@/components/clinical/HeaderPills';
import type { RawState } from '@/contracts/engine';
import type { L10n, SensorId } from '@/contracts/monitor';
import { FIXTURES, restRaw, type FixtureId } from '@/fixtures/monitorFixtures';
import { useClinical } from './clinical';
import type { RefScale } from '@/clinical/profile';

type Panel = 'audit' | 'profile' | null;
type Dialog = 'assessment' | null;

interface MonitorState {
  bedId: string;
  fixture: FixtureId | null;
  raw: RawState;
  /** Wall-clock of the bed (fixture time + elapsed). */
  now: number;
  frozen: boolean;
  panel: Panel;
  /** Section to open in the profile drawer. */
  profileSection: string | null;
  dialog: Dialog;
  dialogScale: RefScale | null;
  highlight: string | null;
  sensorHighlight: SensorId | null;
  windowMin: 5 | 10 | 30;
  compareModes: boolean;
  rail: { labels: boolean; drivers: boolean; back: boolean; zoom: boolean };
  addContextOpen: boolean;
  baselineOpen: boolean;
  paletteOpen: boolean;

  loadFixture: (f: FixtureId) => void;
  openBed: (bed: string, now: number) => void;
  tick: (ms: number) => void;
  setFrozen: (f: boolean) => void;
  setPanel: (p: Panel, section?: string | null) => void;
  setDialog: (d: Dialog, scale?: RefScale | null) => void;
  setHighlight: (id: string | null, sensor?: SensorId | null) => void;
  setWindow: (m: 5 | 10 | 30) => void;
  setCompare: (on: boolean) => void;
  toggleRail: (k: keyof MonitorState['rail']) => void;
  setAddContextOpen: (o: boolean) => void;
  setBaselineOpen: (o: boolean) => void;
  setPaletteOpen: (o: boolean) => void;
  acknowledge: () => void;
  confirmMode: (m: Mode) => void;
}

const L = (en: string, fr: string): L10n => ({ en, fr });
const fmtHM = (t: number) => {
  const d = new Date(t);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

const first = FIXTURES.pain();

export const useMonitor = create<MonitorState>((set, get) => ({
  bedId: '4',
  fixture: 'pain',
  raw: first.raw,
  now: first.now,
  frozen: false,
  panel: null,
  profileSection: null,
  dialog: null,
  dialogScale: null,
  highlight: null,
  sensorHighlight: null,
  windowMin: 10,
  compareModes: false,
  rail: { labels: true, drivers: true, back: false, zoom: false },
  addContextOpen: false,
  baselineOpen: false,
  paletteOpen: false,

  loadFixture: (f) => {
    const fx = FIXTURES[f]();
    useClinical.getState().seedBed('4', fx.seed);
    set({ bedId: '4', fixture: f, raw: fx.raw, now: fx.now, highlight: null, sensorHighlight: null });
  },

  /** Beds without a design fixture (newly admitted) run on calm resting values (Phase 4: simulator). */
  openBed: (bed, now) => {
    const b = useClinical.getState().bed(bed);
    const p = b.profile;
    set({
      bedId: bed,
      fixture: null,
      now,
      // no history before admission: the series starts when calibration starts
      raw: restRaw({ ref: p?.patientRef ?? '—', bed: Number(bed), setting: L('ICU', 'Réa'), day: L('Just admitted', 'Juste admis') }, now, null, b.calibration?.startedAt ?? now),
      highlight: null,
      sensorHighlight: null,
    });
  },

  tick: (ms) => {
    if (get().frozen) return;
    const now = get().now + ms;
    set({ now });
    // calibration completes on its own (A9 → monitoring)
    const { bedId } = get();
    const c = useClinical.getState().bed(bedId).calibration;
    if (c && !c.completed && now >= c.startedAt + c.durationS * 1000) useClinical.getState().completeCalibration(bedId, c.startedAt + c.durationS * 1000);
  },
  setFrozen: (frozen) => set({ frozen }),
  setPanel: (panel, section = null) => set({ panel, profileSection: section }),
  setDialog: (dialog, scale = null) => set({ dialog, dialogScale: scale }),
  setHighlight: (highlight, sensor = null) => set({ highlight, sensorHighlight: sensor }),
  setWindow: (windowMin) => set({ windowMin }),
  setCompare: (compareModes) => set({ compareModes }),
  toggleRail: (k) => set((s) => ({ rail: { ...s.rail, [k]: !s.rail[k] } })),
  setAddContextOpen: (addContextOpen) => set({ addContextOpen }),
  setBaselineOpen: (baselineOpen) => set({ baselineOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  acknowledge: () => {
    const { raw, now, bedId } = get();
    if (raw.alert.kind !== 'alert') return;
    const clinician = useClinical.getState().clinician;
    set({
      raw: {
        ...raw,
        alert: { kind: 'acknowledged', id: raw.alert.id, by: clinician, at: fmtHM(now) },
        timeline: { ...raw.timeline, alerts: raw.timeline.alerts.map((a) => ({ ...a, acknowledged: true })) },
      },
    });
    useClinical.getState().audit(bedId, {
      t: now,
      actor: 'clinician',
      who: clinician,
      kind: 'alert',
      action: L('Alert acknowledged', 'Alerte prise en compte'),
      detail: L('“Possible unmanaged pain”', '« Douleur possiblement non traitée »'),
    });
  },

  confirmMode: (mode) => {
    const { bedId, now } = get();
    useClinical.getState().setMode(bedId, mode, now);
  },
}));
