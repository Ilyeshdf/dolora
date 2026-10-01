import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toast';
import { MonitorPage } from '@/features/monitor/MonitorPage';
import { AdmissionPage } from '@/features/admission/AdmissionPage';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { useOutbox } from '@/data/outbound';

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <Routes>
          <Route path="/bed/:bedId/monitor" element={<MonitorPage />} />
          <Route path="/bed/:bedId/admit" element={<AdmissionPage />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </MemoryRouter>,
  );
}
const bed4 = () => useClinical.getState().bed('4');

describe('Add context (task §3.2-C)', () => {
  it('search + Enter adds a persistent medication immediately, audited, with its effect visible', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=stress');
    await user.click(screen.getByRole('button', { name: 'Add context' }));
    await user.keyboard('beta-bl');
    expect(screen.getByText(/Heart-rate weight 0.3, HRV 0.6/)).toBeInTheDocument(); // preview on highlight
    await user.keyboard('{Enter}');
    expect(bed4().context.some((c) => c.flag === 'BETA_BLOCKER' && !c.removed)).toBe(true);
    expect(bed4().audit.at(-1)?.action.en).toBe('Context added');
    expect(useOutbox.getState().sent.at(-1)).toMatchObject({ type: 'context_flag', flag: 'BETA_BLOCKER', active: true });
    expect(await screen.findByText(/weight ×0\.30/)).toBeInTheDocument(); // driver weight badge
  });

  it('timed items ask when they started', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=stress');
    await user.click(screen.getByRole('button', { name: 'Add context' }));
    await user.keyboard('anticholin{Enter}');
    expect(screen.getByRole('radiogroup', { name: 'Started' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '5 min ago' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const entry = bed4().context.find((c) => c.flag === 'ANTICHOLINERGIC')!;
    expect(useMonitor.getState().now - entry.startedAt).toBe(5 * 60_000);
  });

  it('removing a chip asks for a one-tap reason and keeps the record', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=degraded');
    await user.click(screen.getByRole('button', { name: /^Beta-blocker/ }));
    await user.click(screen.getByRole('button', { name: 'Stopped' }));
    const bb = bed4().context.find((c) => c.flag === 'BETA_BLOCKER')!;
    expect(bb.removed?.reason).toBe('stopped');
    expect(bed4().audit.at(-1)?.removedReason?.en).toBe('Stopped');
  });
});

describe('One-tap event logging (task §3.2-D)', () => {
  it('logs now by default, or retroactively; the audit keeps both times', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=stress');
    const now = useMonitor.getState().now;
    await user.click(screen.getByRole('button', { name: /Log event/ }));
    await user.click(screen.getByRole('radio', { name: '15 min ago' }));
    await user.click(screen.getByRole('button', { name: /^Turning \/ repositioning/ }));
    const e = bed4().events.at(-1)!;
    expect(e.event).toBe('TURNING');
    expect(e.t).toBe(now - 15 * 60_000);
    expect(e.enteredAt).toBe(now);
    expect(bed4().audit.at(-1)?.action.en).toBe('Event logged (retroactive)');
  });
});

describe('Profile drawer (task §3.2-B, §3.3)', () => {
  it('blocks a clinically impossible combination with an explanation (NMB + self-report)', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=degraded');
    await user.click(screen.getByRole('button', { name: /Patient P-7F3A/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Patient profile' });
    await user.click(within(drawer).getByRole('radio', { name: 'Can self-report' }));
    expect(within(drawer).getByText('A patient under neuromuscular blockade cannot self-report.')).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Confirm anyway' })).not.toBeInTheDocument();
    expect(bed4().profile?.communication).toBe('none');
  });

  it('applies edits immediately with an Undo toast and an old → new audit entry', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=pain');
    await user.click(screen.getByRole('button', { name: /Patient P-7F3A/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Patient profile' });
    await user.click(within(drawer).getByRole('radio', { name: /^Intermittent/ }));
    expect(bed4().profile?.communication).toBe('intermittent');
    expect(bed4().audit.at(-1)).toMatchObject({ old: { en: 'Cannot self-report' }, new: { en: 'Intermittent' } });
    await user.click((await screen.findAllByRole('button', { name: 'Undo' })).at(-1)!);
    expect(bed4().profile?.communication).toBe('none');
  });

  it('changing the care setting requires confirmation of the new alert rule', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=pain');
    await user.click(screen.getByRole('button', { name: /Patient P-7F3A/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Patient profile' });
    await user.click(within(drawer).getByRole('radio', { name: 'Post-op ward' }));
    expect(within(drawer).getByText('Switch to Ward mode?')).toBeInTheDocument();
    expect(bed4().profile?.careSetting).toBe('ICU');
    await user.click(within(drawer).getByRole('button', { name: 'Switch mode' }));
    // ventilated patient on a ward → explicit confirmation before anything changes
    expect(within(drawer).getByText('Controlled ventilation is unusual on a post-op ward. Confirm?')).toBeInTheDocument();
    expect(bed4().mode).toBe('ICU');
    await user.click(within(drawer).getByRole('button', { name: 'Confirm anyway' }));
    expect(bed4().profile?.careSetting).toBe('WARD');
    expect(bed4().mode).toBe('WARD');
  });
});

describe('Admission wizard (task §3.2-A)', () => {
  it('blocks paediatric patients, then starts calibration with only the required fields', async () => {
    const user = userEvent.setup();
    renderAt('/bed/11/admit');
    const age = screen.getByRole('spinbutton');
    await user.type(age, '16');
    await user.tab();
    expect(await screen.findByText(/Paediatric patients are not supported by this prototype/)).toBeInTheDocument();
    await user.clear(age);
    await user.type(age, '72');
    await user.click(screen.getByRole('radio', { name: 'Male' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await user.click(await screen.findByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByText('Interpretation summary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start calibration' }));
    await waitFor(() => expect(useClinical.getState().bed('11').calibration?.durationS).toBe(90));
    expect(useClinical.getState().bed('11').profile).toMatchObject({ ageYears: 72, sex: 'male' });
  });

  it('a bed without a profile cannot start monitoring', () => {
    renderAt('/bed/12/monitor');
    expect(screen.getByText('Profile required')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start admission' })).toHaveAttribute('href', '/bed/12/admit');
  });
});

describe('Command palette (task §3.1-8)', () => {
  it('Ctrl+K opens it; a command logs an event', async () => {
    const user = userEvent.setup();
    renderAt('/bed/4/monitor?freeze=1&state=stress');
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    await user.keyboard('gentle');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(bed4().events.at(-1)?.event).toBe('GENTLE_TOUCH'));
  });
});
