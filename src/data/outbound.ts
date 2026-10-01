import { create } from 'zustand';
import type { OutboundMessage } from '@/contracts/messages';

type Listener = (m: OutboundMessage) => void;

interface Outbox {
  /** Recent messages (bounded) — inspected by tests and the demo director. */
  sent: OutboundMessage[];
  listeners: Set<Listener>;
}

/**
 * Outbound bus. Phase 4 subscribes the WebSocket adapter (live) or the simulator (demo);
 * until then messages are only recorded. Never throws on the clinical path.
 */
export const useOutbox = create<Outbox>(() => ({ sent: [], listeners: new Set() }));

export function sendOutbound(m: OutboundMessage) {
  useOutbox.setState((s) => ({ sent: [...s.sent.slice(-199), m] }));
  for (const l of useOutbox.getState().listeners) {
    try {
      l(m);
    } catch {
      /* a failing consumer must not block data entry */
    }
  }
}

export function subscribeOutbound(l: Listener): () => void {
  useOutbox.getState().listeners.add(l);
  return () => useOutbox.getState().listeners.delete(l);
}
