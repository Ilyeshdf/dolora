import { create } from 'zustand';

/**
 * Toast — not designed (spec §9 "PLANNED"). Assumption D-36: dark pill-coloured card, bottom
 * centre above the footer, 10 s duration when an Undo action is present (task §3.2-B), 5 s otherwise.
 */
export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  /** Undo / other single action. */
  action?: { label: string; onAction: () => void };
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
}

let seq = 0;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(t: Omit<ToastItem, 'id'>) {
  return useToasts.getState().push(t);
}

