import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const tokenNames = [
  'card', 'card-border', 'ink', 'text-2', 'muted', 'pill-active', 'pill-active-fg',
  'butter', 'sky', 'action', 'action-fg', 'accent',
  'pain-mild', 'pain-moderate', 'pain-severe', 'severity-fg', 'band', 'track',
  'alert', 'alert-fg', 'advisory-fill', 'advisory-border', 'advisory-text', 'advisory-action',
  'sensor-ok', 'sensor-degraded', 'sensor-rejected',
  'monitor', 'monitor-fg', 'monitor-muted', 'monitor-line',
  'trace-ppg', 'trace-eda', 'trace-temp', 'trace-motion', 'arousal',
  'attr-pain', 'attr-stress', 'attr-agitation', 'attr-rest', 'attr-unexplained',
  'body-fill', 'body-stroke', 'card-outline', 'alert-solid-fg', 'chip-icon-fg', 'chip-timed-border', 'event-region', 'subtle', 'chip-icon', 'tooltip', 'tooltip-fg', 'focus', 'scrim',
] as const;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(tokenNames.map((n) => [n, v(n)])),
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Spec §10.2 — minimum 13 px.
        'xs': ['13px', '18px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'md': ['17px', '24px'],
        'lg': ['18px', '24px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '30px'],
        '3xl': ['30px', '36px'],
        '4xl': ['40px', '44px'],
        'gauge': ['38px', '40px'],
        'hero-unit': ['32px', '36px'],
        'hero': ['144px', '120px'],
        'hero-sm': ['112px', '96px'],
      },
      borderRadius: {
        card: '24px',
        dialog: '28px',
        slot: '16px',
        tip: '12px',
      },
      borderWidth: {
        theme: 'var(--border-w)',
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      spacing: {
        4.5: '18px',
        13: '52px',
        15: '60px',
        18: '72px',
        22: '88px',
        110: '440px',
        130: '520px',
      },
      transitionDuration: {
        150: '150ms',
        300: '300ms',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('hc', ":is([data-theme='hc'] &)");
      addVariant('night', ":is([data-theme='night'] &)");
      // Compact density (1366×768 and other small viewports) — set on the screen root (D-43).
      addVariant('compact', ':is(.compact &)');
    }),
  ],
} satisfies Config;
