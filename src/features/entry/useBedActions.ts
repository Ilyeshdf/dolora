import { flagLabel, type FlagId } from '@/clinical/clinicalEffects';
import { FIELD_LABEL } from '@/clinical/options';
import { contradictions, type Contradiction, type PatientProfile } from '@/clinical/profile';
import { deriveEffects, wouldBeUnassessable, type RemovalReason } from '@/engine/effects';
import type { ReferenceEntry } from '@/engine/compose';
import { useL10n, useT } from '@/i18n';
import { useClinical, type BedClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { toast } from '@/components/ui/toastStore';

/** Rules for adding a context flag or logging an event (task §3.3), evaluated before saving. */
export function checkFlagAdd(bed: BedClinical, now: number, flag: FlagId): Contradiction[] {
  const input = { profile: bed.profile, context: bed.context, events: bed.events, now };
  const flags = [...deriveEffects(input).active.map((a) => a.flag), flag];
  const out = contradictions({
    communication: bed.profile?.communication,
    airway: bed.profile?.airway,
    careSetting: bed.profile?.careSetting,
    rass: bed.profile?.rass?.value ?? null,
    flags,
  }).filter((c) => c.id !== 'WARD_CONTROLLED_VENTILATION' && c.id !== 'SELF_REPORT_DEEP_SEDATION');
  if (wouldBeUnassessable(input, flag)) out.push({ id: 'CONTEXT_UNASSESSABLE', severity: 'confirm' });
  return out;
}

/** Rules for a profile edit (task §3.3): evaluated on the profile as it would be saved. */
export function checkProfilePatch(bed: BedClinical, now: number, patch: Partial<PatientProfile>): Contradiction[] {
  if (!bed.profile) return [];
  const next = { ...bed.profile, ...patch };
  const flags = deriveEffects({ profile: next, context: bed.context, events: bed.events, now }).active.map((a) => a.flag);
  return contradictions({ communication: next.communication, airway: next.airway, careSetting: next.careSetting, rass: next.rass?.value ?? null, flags });
}

/** Bed-bound clinical actions with toasts + 10 s Undo (task §3.2-B). */
export function useBedActions() {
  const t = useT();
  const l = useL10n();
  const bedId = useMonitor((s) => s.bedId);
  const now = () => useMonitor.getState().now;
  const c = useClinical.getState;
  const undoable = (title: string, token: string | null) =>
    toast({ title, action: token ? { label: t.common.undo, onAction: () => void c().undo(token) } : undefined });

  return {
    bedId,
    bed: () => c().bed(bedId),
    now,
    addContext(flag: FlagId, startedAt: number) {
      undoable(t.entry.toasts.contextAdded(l(flagLabel(flag))), c().addContext(bedId, flag, startedAt, now()));
    },
    removeContext(entryId: string, flag: FlagId, reason: RemovalReason) {
      c().removeContext(bedId, entryId, reason, now());
      toast({ title: t.entry.toasts.removed(l(flagLabel(flag))) });
    },
    logEvent(event: FlagId, at: number) {
      undoable(t.entry.toasts.eventLogged(l(flagLabel(event))), c().logEvent(bedId, event, at, now()));
    },
    removeEvent(id: string, event: FlagId, reason: RemovalReason) {
      c().removeEvent(bedId, id, reason, now());
      toast({ title: t.entry.toasts.removed(l(flagLabel(event))) });
    },
    updateProfile(patch: Partial<PatientProfile>) {
      const keys = Object.keys(patch) as (keyof PatientProfile)[];
      const token = c().updateProfile(bedId, patch, now());
      if (token) undoable(t.entry.toasts.profileUpdated(keys.map((k) => l(FIELD_LABEL[k])).join(', ')), token);
    },
    addReference(r: Omit<ReferenceEntry, 'id' | 'by' | 'enteredAt'>) {
      const max = r.scale === 'CPOT' ? 8 : r.scale === 'BPS' ? 12 : 10;
      const token = c().addReference(bedId, r, now());
      toast({ title: t.toast.referenceRecorded, description: t.toast.recordedDetail(r.scale, r.value, max), action: { label: t.common.undo, onAction: () => void c().undo(token) } });
    },
    markBaseline(quality: 'good' | 'provisional') {
      c().markBaseline(bedId, quality, now());
      toast({ title: t.entry.toasts.baselineMarked(t.entry.baseline.quality[quality]) });
    },
  };
}
