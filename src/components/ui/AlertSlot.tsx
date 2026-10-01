import type { ReactNode } from 'react';
import { CircleCheck, ClipboardList, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertSlotVariant = 'empty' | 'info' | 'alert' | 'acknowledged' | 'advisory';

interface AlertSlotProps {
  variant: AlertSlotVariant;
  /** Primary text (bold in alert). */
  title?: ReactNode;
  /** Secondary text after a divider (alert rule) or inline. */
  detail?: ReactNode;
  /** Right-aligned content: remaining time, actions. */
  right?: ReactNode;
  /** Icon override (advisory with action uses a clipboard). */
  icon?: 'info' | 'clipboard' | 'none';
  className?: string;
}

/**
 * Alert slot — A8 sheet 2 §07. Always 60 px high so the layout never jumps (§6.4, §18-1).
 * Red is used only by the `alert` variant (D-6). In HC the alert is yellow via tokens.
 * Live-region semantics are owned by the screen (Phase 2): assertive only for alert/abstention.
 */
export function AlertSlot({ variant, title, detail, right, icon, className }: AlertSlotProps) {
  const base = 'flex h-15 w-full items-center gap-3 rounded-slot px-5';
  const styles: Record<AlertSlotVariant, string> = {
    empty: 'border border-dashed border-card-border text-muted hc:border-ink/60',
    info: 'bg-sky text-ink hc:border-theme hc:border-ink',
    alert: 'bg-alert text-alert-fg',
    acknowledged: 'border border-ink/30 text-ink hc:border-theme hc:border-ink',
    advisory: 'border border-advisory-border/40 bg-advisory-fill text-advisory-text hc:border-theme hc:border-advisory-border',
  };
  const Icon =
    variant === 'alert'
      ? TriangleAlert
      : variant === 'acknowledged'
        ? CircleCheck
        : icon === 'clipboard'
          ? ClipboardList
          : Info;
  const showIcon = variant !== 'empty' && icon !== 'none';

  return (
    <div className={cn(base, styles[variant], className)}>
      {showIcon && <Icon aria-hidden size={variant === 'alert' ? 26 : 22} strokeWidth={1.75} className="shrink-0" />}
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
        {title ? (
          <span
            className={cn(
              'nowrap',
              variant === 'alert' ? 'text-xl font-bold' : variant === 'empty' ? 'text-sm' : 'text-md font-semibold',
            )}
          >
            {title}
          </span>
        ) : null}
        {detail ? (
          <>
            {variant === 'alert' && <span aria-hidden className="h-7 w-px shrink-0 bg-alert-fg/50" />}
            <span className={cn('nowrap truncate', variant === 'alert' ? 'text-md font-medium' : 'text-md')}>{detail}</span>
          </>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-3">{right}</div> : null}
    </div>
  );
}
