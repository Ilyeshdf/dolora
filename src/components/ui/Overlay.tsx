import * as RD from '@radix-ui/react-dialog';
import * as RP from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/* ---------- Dialog (A5: radius 28, 40% scrim) ---------- */

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;

export function DialogContent({
  title,
  description,
  meta,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned meta line, e.g. "P-7F3A · Bed 4 · 14:33". */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-40 bg-scrim/40" />
      <RD.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-64px)] w-[880px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
          'rounded-dialog border-theme border-card-outline bg-card px-10 py-9 shadow-card',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <RD.Title className="nowrap text-[34px] font-bold leading-[42px]">{title}</RD.Title>
            {description ? <RD.Description className="mt-2 max-w-[520px] text-md text-text-2">{description}</RD.Description> : null}
          </div>
          <div className="flex shrink-0 items-start gap-4">
            {meta ? <p className="nowrap pt-3 text-sm text-muted">{meta}</p> : null}
            <RD.Close asChild>
              <Button variant="icon" size="icon" aria-label={t.common.close}>
                <X aria-hidden size={20} strokeWidth={1.75} />
              </Button>
            </RD.Close>
          </div>
        </div>
        {children}
      </RD.Content>
    </RD.Portal>
  );
}

/* ---------- Sheet (right drawer) ---------- */

/**
 * Right drawer — 520 px (task brief), starts below the alert slot so the alert slot and hero stay
 * visible and actionable (D-27). `top` is the pixel offset of the main grid, supplied by the layout.
 */
export function SheetContent({
  title,
  subtitle,
  actions,
  children,
  footer,
  top = 0,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  top?: number;
  className?: string;
}) {
  const t = useT();
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-x-0 bottom-0 z-30 bg-scrim/25" style={{ top }} />
      <RD.Content
        style={{ top }}
        className={cn(
          'fixed bottom-0 right-0 z-40 flex w-130 max-w-full flex-col rounded-tl-card border-l-theme border-t-theme border-card-outline bg-card shadow-card',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-8 pb-4 pt-7">
          <div className="min-w-0">
            <RD.Title className="nowrap text-[34px] font-bold leading-[42px]">{title}</RD.Title>
            {subtitle ? <RD.Description className="nowrap mt-1 text-base text-text-2">{subtitle}</RD.Description> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <RD.Close asChild>
              <Button variant="icon" size="icon" aria-label={t.common.close}>
                <X aria-hidden size={20} strokeWidth={1.75} />
              </Button>
            </RD.Close>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6">{children}</div>
        {footer ? <div className="border-t-theme border-card-border px-8 py-4">{footer}</div> : null}
      </RD.Content>
    </RD.Portal>
  );
}

/* ---------- Popover (A10 mode confirm) ---------- */

export const Popover = RP.Root;
export const PopoverTrigger = RP.Trigger;
export const PopoverAnchor = RP.Anchor;

export function PopoverContent({
  children,
  className,
  side = 'bottom',
  align = 'center',
}: {
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <RP.Portal>
      <RP.Content
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={16}
        className={cn(
          'z-50 w-[400px] rounded-card border-theme border-card-outline bg-card p-6 shadow-card hc:border-ink',
          className,
        )}
      >
        {children}
      </RP.Content>
    </RP.Portal>
  );
}

/** Same visual as PopoverContent, rendered inline (component sheet). */
export function PopoverPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border-theme border-card-outline bg-card p-6 shadow-card hc:border-ink', className)}>
      {children}
    </div>
  );
}

/* ---------- Right drawer, non-modal (audit trail, patient profile) ---------- */

/**
 * D-27: 520 px, anchored at `top` (the main grid's top) so header, context bar, alert slot and
 * hero remain visible AND interactive — the drawer is non-modal. A scrim over the rest of the
 * page closes it on click; Escape and the close button close it too. Focus moves into the drawer
 * on open and returns to the trigger on close (Radix).
 */
export function RightDrawer({
  open,
  onOpenChange,
  top,
  title,
  subtitle,
  actions,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  top: number;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  return (
    <RD.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <RD.Portal>
        {open ? <div aria-hidden className="fixed inset-x-0 bottom-0 z-30 bg-scrim/25" style={{ top }} onClick={() => onOpenChange(false)} /> : null}
        <RD.Content
          style={{ top }}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed bottom-0 right-0 z-40 flex w-130 max-w-full flex-col rounded-tl-card border-l-theme border-t-theme border-card-outline bg-card shadow-card hc:border-ink"
        >
          <div className="flex items-start justify-between gap-4 px-8 pb-3 pt-7 compact:px-6 compact:pt-5">
            <div className="min-w-0">
              <RD.Title className="nowrap text-[34px] font-bold leading-[42px]">{title}</RD.Title>
              {subtitle ? <RD.Description className="nowrap mt-1 text-base text-text-2">{subtitle}</RD.Description> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <RD.Close asChild>
                <Button variant="icon" size="icon" aria-label={t.common.close}>
                  <X aria-hidden size={20} strokeWidth={1.75} />
                </Button>
              </RD.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 compact:px-6">{children}</div>
          {footer ? <div className="border-t-theme border-card-border px-8 py-4">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
