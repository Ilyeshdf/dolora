import { cn } from './cn';

describe('cn (tailwind-merge config)', () => {
  it('keeps the theme border width alongside a border colour', () => {
    expect(cn('border-theme border-card-border')).toBe('border-theme border-card-border');
  });
  it('keeps outline style with an arbitrary outline width', () => {
    const out = cn('outline outline-[length:var(--focus-w)] outline-focus');
    expect(out).toContain('outline ');
    expect(out).toContain('outline-[length:var(--focus-w)]');
  });
  it('treats custom font sizes and text colours as different groups', () => {
    expect(cn('text-hero text-ink')).toBe('text-hero text-ink');
  });
  it('still resolves real conflicts', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });
});
