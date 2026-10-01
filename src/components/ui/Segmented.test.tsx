import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Segmented } from './Segmented';

type V = 'icu' | 'ward' | 'x';

function Harness({ onChange }: { onChange?: (v: V) => void }) {
  const [v, setV] = useState<V>('icu');
  return (
    <Segmented<V>
      aria-label="Mode"
      value={v}
      onChange={(n) => {
        setV(n);
        onChange?.(n);
      }}
      options={[
        { value: 'icu', label: 'ICU' },
        { value: 'ward', label: 'Ward' },
        { value: 'x', label: 'Disabled', disabled: true },
      ]}
    />
  );
}

describe('Segmented (radio-group pattern)', () => {
  it('exposes a labelled radiogroup with the checked option', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'ICU' })).toHaveAttribute('aria-checked', 'true');
  });

  it('has a single tab stop on the selected option', () => {
    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'ICU' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Ward' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves and selects with arrow keys, skipping disabled options and wrapping', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'ICU' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Ward' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Ward' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'ICU' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('icu');
  });

  it('selects on click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'Ward' }));
    expect(screen.getByRole('radio', { name: 'Ward' })).toHaveAttribute('aria-checked', 'true');
  });
});
