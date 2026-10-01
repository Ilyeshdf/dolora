import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/** Floating card — radius 24, soft shadow (§10.4). Pastel variants are neutral info only (§10.5-4). */
const cardVariants = cva('rounded-card border-theme shadow-card', {
  variants: {
    tone: {
      default: 'bg-card border-card-outline',
      sky: 'bg-sky border-sky hc:border-card-outline',
      butter: 'bg-butter border-butter hc:border-card-outline',
      monitor: 'bg-monitor text-monitor-fg border-monitor night:border-card-border hc:border-card-outline',
    },
    padding: {
      none: '',
      md: 'p-6',
      lg: 'px-8 py-7',
    },
  },
  defaultVariants: { tone: 'default', padding: 'lg' },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, tone, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ tone, padding }), className)} {...props} />
));
Card.displayName = 'Card';

/** Card title — 18 px semibold (§10.2), never wraps (D-0). */
export function CardTitle({
  children,
  subtitle,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <Tag className="nowrap text-xl font-semibold leading-7">{children}</Tag>
      {subtitle ? <p className="nowrap mt-0.5 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
