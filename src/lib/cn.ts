import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge v2 (Tailwind v3 semantics). Custom theme classes must be registered, otherwise
 * e.g. `border-theme` (a width) is mistaken for a colour and silently dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'gauge', 'hero-unit', 'hero', 'hero-sm'] }],
      'border-w': [{ border: ['theme'] }],
      'border-w-x': [{ 'border-x': ['theme'] }],
      'border-w-y': [{ 'border-y': ['theme'] }],
      'border-w-t': [{ 'border-t': ['theme'] }],
      'border-w-r': [{ 'border-r': ['theme'] }],
      'border-w-b': [{ 'border-b': ['theme'] }],
      'border-w-l': [{ 'border-l': ['theme'] }],
      rounded: [{ rounded: ['card', 'dialog', 'slot', 'tip'] }],
      shadow: [{ shadow: ['card'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
