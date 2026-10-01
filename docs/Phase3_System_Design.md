# Phase 3: Clinical Data Entry UX - System Design

## 1. State Management (Zustand)
We will introduce a new store `src/store/profile.ts` to manage the patient's clinical context independently of the UI state (which lives in `monitor.ts`).

### Schema:
```typescript
export interface PatientProfile {
  id: string;
  bedId: string;
  age: number;
  sex: 'Female' | 'Male' | 'Other' | 'Not recorded';
  careSetting: 'ICU' | 'Post-op ward';
  communication: 'Can self-report' | 'Intermittent' | 'Cannot self-report';
  airway: 'Not intubated' | 'Intubated – controlled' | 'Intubated – spontaneous';
  // Recommended fields
  surgeryReason?: string;
  timeSinceSurgery?: number;
  rass?: number;
  camIcu?: 'Negative' | 'Positive-hypoactive' | 'Positive-hyperactive' | 'Unable to assess';
}

export interface ContextFlag {
  id: string;
  flag: string; // references clinicalEffects.ts
  active: boolean;
  startedAt: number; // timestamp
}

export interface ClinicalEvent {
  id: string;
  event: string;
  t: number; // event time
  enteredAt: number; // logging time
}
```

## 2. Clinical Effects (`src/lib/clinicalEffects.ts`)
A typed configuration file shared with the simulator to map context flags to their effects.

```typescript
export type ContextRoute = 'prior' | 'measurement' | 'baseline';

export interface ClinicalEffect {
  id: string;
  type: 'persistent' | 'timed';
  durationMin?: number;
  route: ContextRoute[];
  effectEn: string;
  effectFr: string;
}
```

## 3. Routers & App Structure (`src/app/App.tsx`)
The router will be expanded to support the Admission Wizard and Patient Profile routing.
- `/bed/:bedId/admission` -> Wizard Step 1, 2, 3
- `/bed/:bedId/monitor` -> Main dashboard (redirects to `/admission` if profile is missing)
- `/bed/:bedId/profile` -> Patient Profile Drawer (overlay)

## 4. Components to Build
1. **AdmissionWizard**: 3-step form using `react-hook-form` and `zod` for validation. Blocks monitoring start if required fields (Step 1) are missing.
2. **PatientProfileDrawer**: Right-side drawer (520px) showing all fields with freshness indicators. Uses `Toaster` for undo functionality on edits.
3. **ContextBar Upgrades**: Add a `Command` palette (Ctrl+K) for "+ Add context". Implement one-tap event logging buttons.
4. **AssessmentDialog**: Refactor existing CPOT dialog to conditionally show NRS or BPS based on `profile.communication` and `profile.airway`.
5. **MarkBaseline Popover**: A checklist popover before committing the baseline.

## 5. Interactions & Safety Rules
- Unit tests will enforce the contradiction blocks (e.g. "Can self-report" + RASS ≤ -4).
- Stale data indicators (amber warnings) computed dynamically using `t - startedAt`.
- All writes will automatically dispatch an action to `store/monitor.ts` to create an `AuditEntry`.
