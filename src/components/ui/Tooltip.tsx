import * as RT from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const TooltipProvider = RT.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Force open (used by /dev/components to show the hover state statically). */
  open?: boolean;
  className?: string;
  delay?: number;
}

/** Dark tooltip, radius 12 (A4 beta-blocker chip, A1 driver hover). Reachable by keyboard focus. */
export function Tooltip({ content, children, side = 'bottom', align = 'center', open, className, delay = 200 }: TooltipProps) {
  return (
    <RT.Root open={open} delayDuration={delay}>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          align={align}
          sideOffset={10}
          collisionPadding={16}
          className={cn(
            'z-50 max-w-[400px] rounded-tip bg-tooltip px-4 py-3 text-sm leading-5 text-tooltip-fg shadow-card',
            'hc:border-2 hc:border-card',
            className,
          )}
        >
          {content}
          <RT.Arrow className="fill-tooltip" width={16} height={8} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}

/** Static (non-portal) tooltip bubble for documentation layouts. */
export function TooltipBubble({ children, className, arrow = 'top' }: { children: ReactNode; className?: string; arrow?: 'top' | 'right' | 'none' }) {
  return (
    <div className={cn('relative rounded-tip bg-tooltip px-4 py-3 text-sm leading-5 text-tooltip-fg shadow-card', className)}>
      {arrow === 'top' && (
        <span aria-hidden className="absolute -top-2 left-9 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-tooltip" />
      )}
      {arrow === 'right' && (
        <span aria-hidden className="absolute -right-2 top-1/2 h-0 w-0 -translate-y-1/2 border-y-8 border-l-8 border-y-transparent border-l-tooltip" />
      )}
      {children}
    </div>
  );
}
