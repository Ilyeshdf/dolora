import { useMemo } from 'react';
import type { RawState } from '@/contracts/engine';
import type { MonitorView } from '@/contracts/monitor';
import { composeView } from '@/engine/compose';
import { deriveEffects } from '@/engine/effects';
import { useClinical, emptyBed, type BedClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';

const DAY = 24 * 3_600_000;

/** raw + clinical context + now → what the monitor shows (pure; used by the hook and tests). */
export function buildView(raw: RawState, bed: BedClinical, now: number): MonitorView {
  let r = raw;
  const p = bed.profile;
  if (p) {
    const surgeryAt = p.admission?.surgeryAt ?? null;
    r = {
      ...r,
      patient: {
        ref: p.patientRef,
        bed: Number(p.bedId) || r.patient.bed,
        setting: p.careSetting === 'ICU' ? { en: 'ICU', fr: 'Réa' } : { en: 'Ward', fr: 'Service' },
        day:
          surgeryAt !== null && now >= surgeryAt
            ? { en: `Post-op day ${Math.floor((now - surgeryAt) / DAY)}`, fr: `J${Math.floor((now - surgeryAt) / DAY)} post-op` }
            : { en: 'Medical admission', fr: 'Admission médicale' },
      },
    };
  }
  const c = bed.calibration;
  if (c && !c.completed && now < c.startedAt + c.durationS * 1000) {
    r = { ...r, calibrating: { remainingS: Math.ceil((c.startedAt + c.durationS * 1000 - now) / 1000), totalS: c.durationS } };
  }
  const effects = deriveEffects({ profile: p, context: bed.context, events: bed.events, now, lastBaselineAt: bed.baselineMark?.at ?? null });
  return composeView(r, effects, bed, now);
}

// One composition per (raw, bed, now) shared by every component of the screen.
let cache: { raw: RawState; bed: BedClinical; now: number; view: MonitorView } | null = null;
function cachedView(raw: RawState, bed: BedClinical, now: number): MonitorView {
  if (cache && cache.raw === raw && cache.bed === bed && cache.now === now) return cache.view;
  const view = buildView(raw, bed, now);
  cache = { raw, bed, now, view };
  return view;
}

export function useView(): MonitorView {
  const raw = useMonitor((s) => s.raw);
  const now = useMonitor((s) => s.now);
  const bedId = useMonitor((s) => s.bedId);
  const bed = useClinical((s) => s.beds[bedId]) ?? EMPTY;
  return useMemo(() => cachedView(raw, bed, now), [raw, bed, now]);
}

const EMPTY = emptyBed();
