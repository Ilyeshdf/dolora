/**
 * Clinical store (task §3.4): per bed — patientProfile, activeContext[], events[], references[],
 * baseline mark, mode, calibration and the append-only audit trail. Every write:
 *   1. records an audit entry (who, event time, entry time, old → new);
 *   2. emits the typed outbound message the engine / simulator consumes;
 *   3. returns an undo token where an Undo toast is offered (10 s).
 * Nothing is hard-deleted: removals keep the record with a reason (task §3.1-5).
 */
import { create } from 'zustand';
import { FLAGS, flagLabel, type FlagId } from '@/clinical/clinicalEffects';
import { describeField, FIELD_LABEL, REMOVAL } from '@/clinical/options';
import type { PatientProfile, RefScale } from '@/clinical/profile';
import type { Mode } from '@/components/clinical/HeaderPills';
import type { L10n } from '@/contracts/monitor';
import { iso, profileToWire } from '@/contracts/messages';
import { sendOutbound } from '@/data/outbound';
import type { BaselineMark, ReferenceEntry } from '@/engine/compose';
import type { ContextEntry, EventEntry, RemovalReason } from '@/engine/effects';
import type { Seed } from '@/fixtures/monitorFixtures';
import type { AuditEntry, AuditSeed } from './auditTypes';

export interface BedClinical {
  profile: PatientProfile | null;
  context: ContextEntry[];
  events: EventEntry[];
  references: ReferenceEntry[];
  baselineMark: BaselineMark | null;
  mode: Mode;
  calibration: { startedAt: number; durationS: number; completed: boolean } | null;
  audit: AuditEntry[];
}

export const emptyBed = (): BedClinical => ({
  profile: null,
  context: [],
  events: [],
  references: [],
  baselineMark: null,
  mode: 'ICU',
  calibration: null,
  audit: [],
});

const L = (en: string, fr: string): L10n => ({ en, fr });
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

type Undo = () => void;
const undos = new Map<string, Undo>();

interface ClinicalState {
  beds: Record<string, BedClinical>;
  clinician: string;

  seedBed: (bed: string, seed: Seed) => void;
  bed: (bed: string) => BedClinical;
  audit: (bed: string, e: AuditSeed & { enteredAt?: number }) => void;

  admit: (bed: string, profile: PatientProfile, extras: { context: { flag: FlagId; startedAt: number }[]; reference: Omit<ReferenceEntry, 'id' | 'by' | 'enteredAt'> | null }, now: number, calibrationS: number) => void;
  updateProfile: (bed: string, patch: Partial<PatientProfile>, now: number) => string | null;
  addContext: (bed: string, flag: FlagId, startedAt: number, now: number) => string;
  removeContext: (bed: string, entryId: string, reason: RemovalReason, now: number) => void;
  logEvent: (bed: string, event: FlagId, t: number, now: number) => string;
  removeEvent: (bed: string, id: string, reason: RemovalReason, now: number) => void;
  addReference: (bed: string, r: Omit<ReferenceEntry, 'id' | 'by' | 'enteredAt'>, now: number) => string;
  markBaseline: (bed: string, quality: 'good' | 'provisional', now: number) => void;
  setMode: (bed: string, mode: Mode, now: number) => void;
  completeCalibration: (bed: string, at: number) => void;
  undo: (token: string) => boolean;
}

const MODE_RULE: Record<Mode, L10n> = {
  ICU: L('ICU (upper 80% bound ≥ 4 for 30 s)', 'Réa (borne haute 80 % ≥ 4 pendant 30 s)'),
  WARD: L('Ward (lower 80% bound ≥ 4 for 60 s and pain ≥ 60%)', 'Service (borne basse 80 % ≥ 4 pendant 60 s et douleur ≥ 60 %)'),
};

function effectDetail(flag: FlagId): L10n {
  const d = FLAGS[flag];
  return { en: `${d.label.en} — ${d.effect.en}`, fr: `${d.label.fr} — ${d.effect.fr}` };
}

export const useClinical = create<ClinicalState>((set, get) => {
  const patch = (bed: string, fn: (b: BedClinical) => Partial<BedClinical>) =>
    set((s) => {
      const b = s.beds[bed] ?? emptyBed();
      return { beds: { ...s.beds, [bed]: { ...b, ...fn(b) } } };
    });
  const pushAudit = (bed: string, e: AuditSeed & { enteredAt?: number }) =>
    patch(bed, (b) => ({ audit: [...b.audit, { ...e, id: uid('au'), enteredAt: e.enteredAt ?? e.t }] }));
  const who = () => get().clinician;
  const offerUndo = (fn: Undo) => {
    const token = uid('undo');
    undos.set(token, fn);
    setTimeout(() => undos.delete(token), 10_500);
    return token;
  };

  return {
    beds: {},
    clinician: 'DR',

    seedBed: (bed, seed) =>
      set((s) => ({
        beds: {
          ...s.beds,
          [bed]: {
            profile: seed.profile,
            context: seed.context,
            events: seed.events,
            references: seed.references,
            baselineMark: seed.baselineMark,
            mode: seed.mode,
            calibration: null,
            audit: seed.audit.map((a) => ({ ...a, id: uid('au'), enteredAt: a.enteredAt ?? a.t })),
          },
        },
      })),

    bed: (bed) => get().beds[bed] ?? emptyBed(),
    audit: (bed, e) => pushAudit(bed, e),

    admit: (bed, profile, extras, now, calibrationS) => {
      const context: ContextEntry[] = extras.context.map((c) => ({ id: uid('cx'), flag: c.flag, startedAt: c.startedAt, enteredAt: now, by: who() }));
      const references: ReferenceEntry[] = extras.reference ? [{ ...extras.reference, id: uid('ref'), by: who(), enteredAt: now }] : [];
      patch(bed, () => ({
        profile,
        context,
        events: [],
        references,
        baselineMark: null,
        mode: profile.careSetting,
        calibration: { startedAt: now, durationS: calibrationS, completed: false },
      }));
      pushAudit(bed, {
        t: now,
        actor: 'clinician',
        who: who(),
        kind: 'profile',
        action: L('Patient admitted', 'Patient admis'),
        detail: { en: `${profile.patientRef} · Bed ${bed} · ${describeField('careSetting', profile.careSetting).en}`, fr: `${profile.patientRef} · Lit ${bed} · ${describeField('careSetting', profile.careSetting).fr}` },
      });
      sendOutbound({ type: 'patient_profile', bed, profile: profileToWire(profile) });
      for (const c of context) {
        pushAudit(bed, { t: c.startedAt, enteredAt: now, actor: 'clinician', who: who(), kind: 'context', action: L('Context added', 'Contexte ajouté'), detail: effectDetail(c.flag) });
        sendOutbound({ type: 'context_flag', bed, flag: c.flag, active: true, started_at: iso(c.startedAt) });
      }
      for (const r of references) emitReference(bed, r);
      pushAudit(bed, { t: now, actor: 'system', kind: 'baseline', action: L('Calibration started', 'Calibration démarrée'), detail: L(`${calibrationS} s at rest`, `${calibrationS} s au repos`) });
    },

    updateProfile: (bed, changes, now) => {
      const b = get().bed(bed);
      if (!b.profile) return null;
      const prev = b.profile;
      const next = { ...prev, ...changes };
      const changed = (Object.keys(changes) as (keyof PatientProfile)[]).filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]));
      if (!changed.length) return null;
      patch(bed, () => ({ profile: next }));
      for (const k of changed) {
        pushAudit(bed, {
          t: now,
          actor: 'clinician',
          who: who(),
          kind: 'profile',
          action: { en: `${FIELD_LABEL[k].en} updated`, fr: `${FIELD_LABEL[k].fr} modifié` },
          old: describeField(k, prev[k]),
          new: describeField(k, next[k]),
        });
      }
      sendOutbound({ type: 'patient_profile', bed, profile: profileToWire(next) });
      return offerUndo(() => {
        const cur = get().bed(bed).profile;
        if (!cur) return;
        const restore = Object.fromEntries(changed.map((k) => [k, prev[k]])) as Partial<PatientProfile>;
        patch(bed, () => ({ profile: { ...cur, ...restore } }));
        pushAudit(bed, { t: Date.now(), actor: 'clinician', who: who(), kind: 'profile', action: L('Edit undone', 'Modification annulée'), detail: joinLabels(changed.map((k) => FIELD_LABEL[k])) });
        sendOutbound({ type: 'patient_profile', bed, profile: profileToWire({ ...cur, ...restore }) });
      });
    },

    addContext: (bed, flag, startedAt, now) => {
      const entry: ContextEntry = { id: uid('cx'), flag, startedAt, enteredAt: now, by: who() };
      patch(bed, (b) => ({ context: [...b.context, entry] }));
      pushAudit(bed, { t: startedAt, enteredAt: now, actor: 'clinician', who: who(), kind: 'context', action: L('Context added', 'Contexte ajouté'), detail: effectDetail(flag) });
      sendOutbound({ type: 'context_flag', bed, flag, active: true, started_at: iso(startedAt) });
      return offerUndo(() => get().removeContext(bed, entry.id, 'error', Date.now()));
    },

    removeContext: (bed, entryId, reason, now) => {
      const entry = get().bed(bed).context.find((c) => c.id === entryId);
      if (!entry || entry.removed) return;
      patch(bed, (b) => ({ context: b.context.map((c) => (c.id === entryId ? { ...c, removed: { at: now, by: who(), reason } } : c)) }));
      pushAudit(bed, {
        t: now,
        actor: 'clinician',
        who: who(),
        kind: 'context',
        action: L('Context removed', 'Contexte retiré'),
        detail: flagLabel(entry.flag),
        removedReason: REMOVAL[reason],
      });
      sendOutbound({ type: 'context_flag', bed, flag: entry.flag, active: false, started_at: iso(entry.startedAt), reason });
    },

    logEvent: (bed, event, t, now) => {
      const entry: EventEntry = { id: uid('ev'), event, t, enteredAt: now, by: who() };
      patch(bed, (b) => ({ events: [...b.events, entry] }));
      const retro = now - t > 30_000;
      pushAudit(bed, {
        t,
        enteredAt: now,
        actor: 'clinician',
        who: who(),
        kind: 'context',
        action: retro ? L('Event logged (retroactive)', 'Événement enregistré (rétroactif)') : L('Event logged', 'Événement enregistré'),
        detail: effectDetail(event),
      });
      sendOutbound({ type: 'event', bed, event, t: iso(t), entered_at: iso(now) });
      if (FLAGS[event].baseline?.recalibrateAfter)
        pushAudit(bed, { t, enteredAt: now, actor: 'system', kind: 'baseline', action: L('Recalibration needed', 'Recalibration requise'), detail: L('Vasoactive dose change — 15-min washout', 'Modification vasoactive — washout 15 min') });
      return offerUndo(() => get().removeEvent(bed, entry.id, 'error', Date.now()));
    },

    removeEvent: (bed, id, reason, now) => {
      const entry = get().bed(bed).events.find((e) => e.id === id);
      if (!entry || entry.removed) return;
      patch(bed, (b) => ({ events: b.events.map((e) => (e.id === id ? { ...e, removed: { at: now, by: who(), reason } } : e)) }));
      pushAudit(bed, { t: now, actor: 'clinician', who: who(), kind: 'context', action: L('Event removed', 'Événement retiré'), detail: flagLabel(entry.event), removedReason: REMOVAL[reason] });
      sendOutbound({ type: 'event', bed, event: entry.event, t: iso(entry.t), entered_at: iso(now), removed: true });
    },

    addReference: (bed, r, now) => {
      const entry: ReferenceEntry = { ...r, id: uid('ref'), by: who(), enteredAt: now };
      patch(bed, (b) => ({ references: [...b.references, entry] }));
      emitReference(bed, entry);
      return offerUndo(() => {
        patch(bed, (b) => ({ references: b.references.map((x) => (x.id === entry.id ? { ...x, removed: { at: Date.now(), by: who(), reason: 'error' } } : x)) }));
        pushAudit(bed, { t: Date.now(), actor: 'clinician', who: who(), kind: 'assessment', action: L('Assessment removed', 'Évaluation retirée'), detail: refLabel(entry.scale, entry.value), removedReason: REMOVAL.error });
      });
    },

    markBaseline: (bed, quality, now) => {
      patch(bed, () => ({ baselineMark: { at: now, quality } }));
      pushAudit(bed, {
        t: now,
        actor: 'clinician',
        who: who(),
        kind: 'baseline',
        action: L('Baseline marked', 'Référence définie'),
        detail: quality === 'good' ? L('Quality: good', 'Qualité : bonne') : L('Quality: provisional', 'Qualité : provisoire'),
      });
      sendOutbound({ type: 'mark_baseline', bed, quality, t: iso(now) });
    },

    setMode: (bed, mode, now) => {
      const prev = get().bed(bed).mode;
      if (prev === mode) return;
      patch(bed, () => ({ mode }));
      pushAudit(bed, { t: now, actor: 'clinician', who: who(), kind: 'mode', action: L('Mode changed', 'Mode modifié'), old: MODE_RULE[prev], new: MODE_RULE[mode], detail: L('(confirmed)', '(confirmé)') });
      sendOutbound({ type: 'mode_change', bed, mode: mode === 'ICU' ? 'ICU_HIGH_SENSITIVITY' : 'WARD_HIGH_SPECIFICITY' });
    },

    completeCalibration: (bed, at) => {
      const c = get().bed(bed).calibration;
      if (!c || c.completed) return;
      patch(bed, () => ({ calibration: { ...c, completed: true }, baselineMark: { at, quality: 'good' } }));
      pushAudit(bed, { t: at, actor: 'system', kind: 'baseline', action: L('Calibration complete', 'Calibration terminée'), detail: L('Personal baseline learned', 'Référence personnelle apprise') });
    },

    undo: (token) => {
      const fn = undos.get(token);
      if (!fn) return false;
      undos.delete(token);
      fn();
      return true;
    },
  };

  function emitReference(bed: string, r: ReferenceEntry) {
    const max = r.scale === 'CPOT' ? 8 : r.scale === 'BPS' ? 12 : 10;
    pushAudit(bed, {
      t: r.t,
      enteredAt: r.enteredAt,
      actor: 'clinician',
      who: r.by,
      kind: 'assessment',
      action: L(`${r.scale} recorded`, `${r.scale} enregistré`),
      detail: { en: `Total ${r.value} / ${max}${r.note ? ` · “${r.note}”` : ''}`, fr: `Total ${r.value} / ${max}${r.note ? ` · « ${r.note} »` : ''}` },
    });
    const base = { bed, t: iso(r.t), entered_at: iso(r.enteredAt), note: r.note || undefined };
    if (r.scale === 'NRS') sendOutbound({ type: 'nrs_entry', ...base, value: r.value });
    else sendOutbound({ type: r.scale === 'CPOT' ? 'cpot_entry' : 'bps_entry', ...base, items: r.items, total: r.value });
  }
});

function joinLabels(xs: L10n[]): L10n {
  return { en: xs.map((x) => x.en).join(', '), fr: xs.map((x) => x.fr).join(', ') };
}

export function refLabel(scale: RefScale, value: number): L10n {
  const max = scale === 'CPOT' ? 8 : scale === 'BPS' ? 12 : 10;
  return { en: `${scale} ${value} / ${max}`, fr: `${scale} ${value} / ${max}` };
}
