import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Badges.
 * - advisory: amber outline (A4 "Reduced sensors", "Coverage not validated") — caution, never red.
 * - weight:   grey "weight ×0.3" pill on driver rows.
 * - neutral / info: plain and sky.
 * - alert:    red, only for the Unit overview alert badge (D-6).
 * - outline:  monochrome outline (e.g. "Clinician · DR" in the audit trail is info).
 */
const badgeVariants = cva('nowrap inline-flex items-center gap-1.5 rounded-full font-medium', {
  variants: {
    tone: {
      advisory: 'border border-advisory-border/60 bg-advisory-fill text-advisory-text hc:border-2 hc:border-advisory-border',
      weight: 'bg-track text-text-2 hc:border hc:border-ink hc:text-ink',
      neutral: 'border-theme border-card-border bg-card text-ink hc:border-ink',
      info: 'bg-sky text-ink hc:border hc:border-ink',
      alert: 'bg-alert font-semibold text-alert-fg',
      muted: 'bg-track text-text-2',
    },
    size: {
      sm: 'h-7 px-2.5 text-sm',
      md: 'h-8 px-3 text-sm',
      lg: 'h-9 px-3.5 text-base',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

export function Badge({ tone, size, icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}
