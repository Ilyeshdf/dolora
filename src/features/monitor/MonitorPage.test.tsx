import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toast';
import { useMonitor } from '@/store/monitor';
import { MonitorPage } from './MonitorPage';

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <Routes>
          <Route path="/bed/:bedId/monitor" element={<MonitorPage />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('Monitor screen', () => {
  it('A1: shows the alert banner, hero, attribution, drivers and the permanent disclaimer', () => {
    renderAt('/bed/4/monitor?state=pain');
    expect(screen.getByText('Possible unmanaged pain', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getAllByText('6.4')).toHaveLength(2); // hero + pain gauge
    expect(screen.getByRole('region', { name: 'What is driving the arousal?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Top drivers' })).toBeInTheDocument();
    expect(screen.getByText(/not a medical device/)).toBeInTheDocument();
    expect(screen.getByText('Coverage not validated for this context')).toBeInTheDocument();
  });

  it('acknowledging the alert shows the acknowledged strip', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?state=pain');
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.getByText('Acknowledged by DR at 14:32 — monitoring')).toBeInTheDocument();
    expect(screen.queryByText('Possible unmanaged pain')).not.toBeInTheDocument();
  });

  it('A3: abstention card, header pill and no pain alert while REJECTED', () => {
    renderAt('/bed/4/monitor?state=abstain');
    expect(screen.getByText('Automated assessment unavailable')).toBeInTheDocument();
    expect(screen.getByText('Assessment unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Possible unmanaged pain')).not.toBeInTheDocument();
    expect(screen.getByText('No drivers to show')).toBeInTheDocument();
    expect(screen.getByText('Last CPOT 4 · 3 min ago')).toBeInTheDocument();
  });

  it('A4: NMB advisory and masked sensors on the body map', () => {
    renderAt('/bed/4/monitor?state=degraded');
    expect(screen.getByText('Neuromuscular blockade — behavioural assessment impossible.', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Face: Masked/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Motion: Masked/ })).toBeInTheDocument();
    expect(screen.getByText('Reduced sensors: face, motion')).toBeInTheDocument();
  });

  it('A2: arousal ≠ pain cue in the stress state', () => {
    renderAt('/bed/4/monitor?state=stress');
    expect(screen.getByText('High arousal — not attributed to pain')).toBeInTheDocument();
    expect(screen.getByLabelText('is not equal to')).toBeInTheDocument();
    expect(screen.getByText('No active alerts')).toBeInTheDocument();
  });
});

describe('CPOT / BPS dialog (A5)', () => {
  it('validates in amber, then saves a quick total with toast and audit entry', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?state=pain');
    await user.click(screen.getByRole('button', { name: 'Assess CPOT / BPS' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pain assessment' });

    await user.click(within(dialog).getByRole('button', { name: /Save assessment/ }));
    const msg = within(dialog).getByRole('alert');
    expect(msg).toHaveTextContent('Select a total or score every item.');
    expect(msg.className).not.toMatch(/alert(?![-\w])/); // amber, never the alert red

    await user.click(within(dialog).getByRole('radio', { name: '4' }));
    expect(within(dialog).getByText('Pain likely (> 2)')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Save assessment/ }));

    expect(screen.queryByRole('dialog', { name: 'Pain assessment' })).not.toBeInTheDocument();
    expect((await screen.findAllByText('Reference score recorded')).length).toBeGreaterThan(0);
    expect(useMonitor.getState().audit[0]?.detail?.en).toBe('Total 4 / 8');
  });

  it('full-scale items sum into the total', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?state=pain&dialog=assessment');
    const dialog = await screen.findByRole('dialog', { name: 'Pain assessment' });
    await user.click(within(dialog).getByRole('radio', { name: 'Grimacing (2)' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Protection (1)' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Tolerating (0)' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Relaxed (0)' }));
    expect(within(dialog).getByText('3', { selector: 'span' })).toBeInTheDocument();
    expect(within(dialog).getByText('Pain likely (> 2)')).toBeInTheDocument();
  });

  it('BPS tab uses the 3–12 range', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?state=pain&dialog=assessment');
    const dialog = await screen.findByRole('dialog', { name: 'Pain assessment' });
    await user.click(within(dialog).getByRole('radio', { name: 'BPS' }));
    expect(within(dialog).queryByRole('radio', { name: '0' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '12' })).toBeInTheDocument();
    expect(within(dialog).getByText('/ 12')).toBeInTheDocument();
  });

  it('shows the NMB note when neuromuscular blockade is active (task §3.3)', async () => {
    renderAt('/bed/4/monitor?state=degraded&dialog=assessment');
    const dialog = await screen.findByRole('dialog', { name: 'Pain assessment' });
    expect(within(dialog).getByText(/behavioural items cannot be scored validly/)).toBeInTheDocument();
  });
});

describe('Audit trail drawer (A6)', () => {
  it('opens from the nav, filters by kind and stays non-modal', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?state=pain');
    await user.click(screen.getByRole('button', { name: 'Audit trail' }));
    const drawer = await screen.findByRole('dialog', { name: 'Audit trail' });
    expect(within(drawer).getByText('Alert fired')).toBeInTheDocument();
    await user.click(within(drawer).getByRole('radio', { name: 'Mode' }));
    expect(within(drawer).getByText('Mode changed')).toBeInTheDocument();
    expect(within(drawer).queryByText('Alert fired')).not.toBeInTheDocument();
    // Non-modal: the alert actions remain operable while the drawer is open (D-27).
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.getByText(/Acknowledged by DR/)).toBeInTheDocument();
  });
});
