/**
 * Outbound messages dashboard → engine (spec §5.2 extended by task §3.4). Typed so the WebSocket
 * adapter and the simulator (Phase 4) consume exactly the same shapes. Times are ISO strings.
 */
import type { FlagId } from '@/clinical/clinicalEffects';
import type { PatientProfile } from '@/clinical/profile';

export type OutboundMessage =
  | { type: 'patient_profile'; bed: string; profile: PatientProfileWire }
  | { type: 'context_flag'; bed: string; flag: FlagId; active: boolean; started_at: string; reason?: 'stopped' | 'error' | 'other' }
  | { type: 'event'; bed: string; event: FlagId; t: string; entered_at: string; removed?: boolean }
  | { type: 'cpot_entry'; bed: string; items: number[] | null; total: number; t: string; entered_at: string; note?: string }
  | { type: 'bps_entry'; bed: string; items: number[] | null; total: number; t: string; entered_at: string; note?: string }
  | { type: 'nrs_entry'; bed: string; value: number; t: string; entered_at: string; note?: string }
  | { type: 'mark_baseline'; bed: string; quality: 'good' | 'provisional'; t: string }
  | { type: 'mode_change'; bed: string; mode: 'ICU_HIGH_SENSITIVITY' | 'WARD_HIGH_SPECIFICITY' }
  | { type: 'ack_alert'; bed: string; alert_id: string };

/** Profile as sent to the engine: identifiers are already pseudonymised; no free-text note. */
export type PatientProfileWire = Omit<PatientProfile, 'note' | 'rass' | 'cam' | 'coreTemp' | 'admission'> & {
  rass: { value: number; at: string } | null;
  cam: { result: string; at: string } | null;
  core_temp: { source: string; value_c: number; at: string } | null;
  admission: { category: string; surgery_at: string | null } | null;
};

export const iso = (t: number) => new Date(t).toISOString();

export function profileToWire(p: PatientProfile): PatientProfileWire {
  // The free-text note never leaves the dashboard (data minimisation, task §3.1-4).
  const { note: _note, rass, cam, coreTemp, admission, ...rest } = p;
  void _note;
  return {
    ...rest,
    rass: rass ? { value: rass.value, at: iso(rass.at) } : null,
    cam: cam ? { result: cam.result, at: iso(cam.at) } : null,
    core_temp: coreTemp ? { source: coreTemp.source, value_c: coreTemp.valueC, at: iso(coreTemp.at) } : null,
    admission: admission ? { category: admission.category, surgery_at: admission.surgeryAt === null ? null : iso(admission.surgeryAt) } : null,
  };
}
