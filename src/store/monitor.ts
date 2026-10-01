import { create } from 'zustand';
import type { L10n, MonitorView, SensorId } from '@/contracts/monitor';
import type { Mode } from '@/components/clinical/HeaderPills';
import { A6_AUDIT, FIXTURES, type FixtureId } from '@/fixtures/monitorFixtures';
import { fmtTime } from '@/lib/time';

export type AuditKind = 'alert' | 'context' | 'assessment' | 'mode' | 'system' | 'baseline';

export interface AuditEntry {
  id: string;
  t: number;
  actor: 'clinician' | 'system';
  who?: string;
  kind: AuditKind;
  action: L10n;
  detail?: L10n;
}

export interface AssessmentInput {
  scale: 'CPOT' | 'BPS';
  total: number;
  items: number[] | null;
  note: string;
}

type Panel = 'audit' | null;
type Dialog = 'assessment' | null;

interface MonitorState {
  fixture: FixtureId;
  view: MonitorView;
  audit: AuditEntry[];
  panel: Panel;
  dialog: Dialog;
  /** Driver id highlighted by hover/focus — links driver row ↔ body hotspot (§11.1). */
  highlight: string | null;
  sensorHighlight: SensorId | null;
  windowMin: 5 | 10 | 30;
  compareModes: boolean;
  rail: { labels: boolean; drivers: boolean; back: boolean; zoom: boolean };
  clinician: string;

  load: (f: FixtureId) => void;
  setPanel: (p: Panel) => void;
  setDialog: (d: Dialog) => void;
  setHighlight: (id: string | null, sensor?: SensorId | null) => void;
  setWindow: (m: 5 | 10 | 30) => void;
  setCompare: (on: boolean) => void;
  toggleRail: (k: keyof MonitorState['rail']) => void;
  acknowledge: () => void;
  saveAssessment: (a: AssessmentInput) => void;
  confirmMode: (m: Mode) => void;
}

const L = (en: string, fr: string): L10n => ({ en, fr });
let seq = 0;
const nextId = () => `au-${++seq}`;

function initialAudit(): AuditEntry[] {
  // A6 shows the trail for the A1 session; every fixture starts from it (audit is append-only).
  return A6_AUDIT.filter((e) => !(e.kind === 'alert' && e.actor === 'clinician')).map((e) => ({
    id: nextId(),
    t: e.t,
    actor: e.actor,
    who: 'who' in e ? e.who : undefined,
    kind: e.kind,
    action: e.action,
    detail: e.detail,
  }));
}

export const useMonitor = create<MonitorState>((set, get) => ({
  fixture: 'pain',
  view: FIXTURES.pain(),
  audit: initialAudit(),
  panel: null,
  dialog: null,
  highlight: null,
  sensorHighlight: null,
  windowMin: 10,
  compareModes: false,
  rail: { labels: true, drivers: true, back: false, zoom: false },
  clinician: 'DR',

  load: (fixture) => set({ fixture, view: FIXTURES[fixture](), audit: initialAudit(), highlight: null, sensorHighlight: null }),
  setPanel: (panel) => set({ panel }),
  setDialog: (dialog) => set({ dialog }),
  setHighlight: (highlight, sensor = null) => set({ highlight, sensorHighlight: sensor }),
  setWindow: (windowMin) => set({ windowMin }),
  setCompare: (compareModes) => set({ compareModes }),
  toggleRail: (k) => set((s) => ({ rail: { ...s.rail, [k]: !s.rail[k] } })),

  acknowledge: () => {
    const { view, clinician } = get();
    if (view.alert.kind !== 'alert') return;
    const t = view.timeline.now;
    const at = fmtTime(t, false);
    set({
      view: {
        ...view,
        alert: { kind: 'acknowledged', id: view.alert.id, by: clinician, at },
        timeline: { ...view.timeline, alerts: view.timeline.alerts.map((a) => ({ ...a, acknowledged: true })) },
      },
      audit: [
        { id: nextId(), t, actor: 'clinician', who: clinician, kind: 'alert', action: L('Alert acknowledged', 'Alerte prise en compte'), detail: L('“Possible unmanaged pain”', '« Douleur possiblement non traitée »') },
        ...get().audit,
      ],
    });
  },

  saveAssessment: ({ scale, total, note }) => {
    const { view, clinician } = get();
    const t = view.timeline.now;
    const max = scale === 'CPOT' ? 8 : 12;
    set({
      dialog: null,
      view: {
        ...view,
        lastReference: { scale, value: total, ageMin: 0 },
        timeline: { ...view.timeline, references: [...view.timeline.references, { t, scale, value: total }] },
      },
      audit: [
        {
          id: nextId(),
          t,
          actor: 'clinician',
          who: clinician,
          kind: 'assessment',
          action: L(`${scale} recorded`, `${scale} enregistré`),
          detail: L(`Total ${total} / ${max}${note ? ` · “${note}”` : ''}`, `Total ${total} / ${max}${note ? ` · « ${note} »` : ''}`),
        },
        ...get().audit,
      ],
    });
  },

  confirmMode: (mode) => {
    const { view, clinician } = get();
    if (mode === view.mode) return;
    const name = (m: Mode) => (m === 'ICU' ? L('ICU', 'Réa') : L('Ward', 'Service'));
    const from = name(view.mode);
    const to = name(mode);
    set({
      view: { ...view, mode },
      audit: [
        {
          id: nextId(),
          t: view.timeline.now,
          actor: 'clinician',
          who: clinician,
          kind: 'mode',
          action: L('Mode changed', 'Mode modifié'),
          detail: L(`${from.en} → ${to.en} (confirmed)`, `${from.fr} → ${to.fr} (confirmé)`),
        },
        ...get().audit,
      ],
    });
  },
}));
