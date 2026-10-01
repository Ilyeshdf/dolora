import { cva } from 'class-variance-authority';

/**
 * Buttons — A8 sheet 3 (§08 Buttons): dark primary pill, round yellow action, outline pill,
 * ghost, round icon button. Plus the two banner variants seen on the alert slot (A1/A7) and
 * the advisory action (A3). Focus ring comes from the global :focus-visible rule.
 */
export const buttonClass = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none ' +
    'transition-colors duration-150 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'rounded-full bg-pill-active text-pill-active-fg hover:bg-pill-active/85 ' +
          'disabled:bg-track disabled:text-muted hc:disabled:border-theme hc:disabled:border-muted',
        outline:
          'rounded-full border-[1.5px] border-ink bg-card text-ink hover:bg-subtle ' +
          'disabled:border-card-border disabled:text-muted',
        ghost:
          'rounded-full border border-card-border bg-card text-ink hover:bg-subtle hc:border-theme hc:border-ink ' +
          'disabled:text-muted',
        icon:
          'rounded-full border border-card-border bg-card text-ink hover:bg-subtle hc:border-theme hc:border-ink ' +
          'disabled:text-muted',
        action:
          'rounded-full bg-action text-action-fg hover:brightness-95 disabled:bg-track disabled:text-muted',
        onAlert:
          'rounded-full border-[1.5px] border-alert-fg bg-transparent text-alert-fg hover:bg-alert-fg/10',
        onAlertSolid: 'rounded-full bg-alert-fg text-alert-solid-fg hover:bg-alert-fg/90',
        advisory: 'rounded-full bg-advisory-action text-advisory-fill hover:bg-advisory-action/90',
        link: 'text-accent underline underline-offset-4 hover:no-underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-10 px-5 text-base',
        lg: 'h-13 px-6 text-md',
        xl: 'h-14 px-8 text-md',
        icon: 'h-11 w-11 shrink-0 p-0 text-base',
        iconSm: 'h-10 w-10 p-0 text-sm',
        none: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

