import { create } from 'zustand';

export interface PatientProfile {
  id: string;
  bedId: string;
  age: number | null;
  sex: 'Female' | 'Male' | 'Other' | 'Not recorded' | null;
  careSetting: 'ICU' | 'Post-op ward' | null;
  communication: 'Can self-report' | 'Intermittent' | 'Cannot self-report' | null;
  airway: 'Not intubated' | 'Intubated – controlled' | 'Intubated – spontaneous' | null;
  
  // Recommended
  surgeryReason?: string | null;
  timeSinceSurgery?: number | null;
  rass?: number | null;
  camIcu?: 'Negative' | 'Positive-hypoactive' | 'Positive-hyperactive' | 'Unable to assess' | null;
}

export interface ContextFlagState {
  id: string;
  flagId: string;
  active: boolean;
  startedAt: number;
}

export interface ClinicalEventState {
  id: string;
  event: string;
  t: number;
  enteredAt: number;
}

interface ProfileStore {
  profile: PatientProfile | null;
  flags: ContextFlagState[];
  events: ClinicalEventState[];

  setProfile: (profile: PatientProfile) => void;
  updateProfile: (updates: Partial<PatientProfile>) => void;
  addFlag: (flagId: string, startedAt?: number) => void;
  removeFlag: (id: string, reason?: string) => void;
  logEvent: (event: string, t?: number) => void;
}

let seq = 0;
const nextId = () => `ctx-${++seq}`;

/** Demo patient matching the fixture patient P-7F3A, Bed 4, ICU, Post-op day 1. */
const DEMO_PROFILE: PatientProfile = {
  id: 'P-7F3A',
  bedId: '4',
  age: 62,
  sex: 'Male',
  careSetting: 'ICU',
  communication: 'Cannot self-report',
  airway: 'Intubated – controlled',
  surgeryReason: 'CABG × 3',
  timeSinceSurgery: 18,
  rass: -3,
  camIcu: 'Unable to assess',
};

const DEMO_FLAGS: ContextFlagState[] = [
  { id: 'ctx-demo-1', flagId: 'CONTROLLED_VENTILATION', active: true, startedAt: Date.now() - 18 * 3600_000 },
  { id: 'ctx-demo-2', flagId: 'BETA_BLOCKER', active: true, startedAt: Date.now() - 6 * 3600_000 },
  { id: 'ctx-demo-3', flagId: 'OPIOID_BOLUS', active: true, startedAt: Date.now() - 12 * 60_000 },
];

export const useProfile = create<ProfileStore>((set) => ({
  profile: DEMO_PROFILE,
  flags: DEMO_FLAGS,
  events: [],

  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) => set((s) => ({ profile: s.profile ? { ...s.profile, ...updates } : null })),
  addFlag: (flagId, startedAt = Date.now()) => set((s) => ({
    flags: [...s.flags, { id: nextId(), flagId, active: true, startedAt }]
  })),
  removeFlag: (id) => set((s) => ({
    flags: s.flags.filter((f) => f.id !== id)
  })),
  logEvent: (event, t = Date.now()) => set((s) => ({
    events: [...s.events, { id: nextId(), event, t, enteredAt: Date.now() }]
  })),
}));
