import type { L10n } from '@/contracts/monitor';

export type AuditKind = 'alert' | 'context' | 'assessment' | 'mode' | 'system' | 'baseline' | 'profile';

/** Append-only audit record (task §3.1-5): who, when (event time + entry time), old → new. */
export interface AuditEntry {
  id: string;
  /** When it happened (may be retroactive). */
  t: number;
  /** When it was entered. Differs from `t` for retroactive entries. */
  enteredAt: number;
  actor: 'clinician' | 'system';
  who?: string;
  kind: AuditKind;
  action: L10n;
  detail?: L10n;
  old?: L10n;
  new?: L10n;
  /** Removal reason, shown struck-through in histories. */
  removedReason?: L10n;
}

export type AuditSeed = Omit<AuditEntry, 'id' | 'enteredAt'> & { enteredAt?: number };
