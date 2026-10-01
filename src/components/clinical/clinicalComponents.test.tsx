import { render, screen } from '@testing-library/react';
import { LangScope } from '@/i18n';
import { AlertSlot } from '@/components/ui/AlertSlot';
import { AttributionBar } from './AttributionBar';
import { PainHeroCard } from './PainHeroCard';
import { ScaleBar } from './ScaleBar';

describe('ScaleBar', () => {
  it('announces score and 80% interval', () => {
    render(<ScaleBar score={6.4} lo={4.3} hi={8.1} />);
    expect(screen.getByRole('img', { name: 'Pain 6.4 out of 10, 80% interval 4.3 to 8.1' })).toBeInTheDocument();
  });

  it('bolds only the active severity band label', () => {
    render(<ScaleBar score={6.4} lo={4.3} hi={8.1} />);
    expect(screen.getByText('Moderate 4–6')).toHaveClass('font-bold');
    expect(screen.getByText('Mild 0–3')).not.toHaveClass('font-bold');
  });

  it('uses FR labels and a decimal comma', () => {
    render(
      <LangScope lang="fr">
        <ScaleBar score={6.4} lo={4.3} hi={8.1} />
      </LangScope>,
    );
    expect(screen.getByRole('img', { name: /Douleur 6,4 sur 10/ })).toBeInTheDocument();
  });
});

describe('AttributionBar', () => {
  it('omits zero shares from the legend', () => {
    render(<AttributionBar shares={{ pain: 0.72, stress: 0.16, agitation: 0.08, rest: 0.04, unexplained: 0 }} />);
    expect(screen.queryByText('Unexplained')).not.toBeInTheDocument();
  });

  it('shows agitation as n/a when motion is masked (A4)', () => {
    render(<AttributionBar shares={{ pain: 0.58, stress: 0.17, agitation: null, rest: 0.1, unexplained: 0.15 }} />);
    expect(screen.getByText('n/a')).toBeInTheDocument();
    expect(screen.getByText(/motion masked/)).toBeInTheDocument();
  });

  it('labels the class Activity in Ward mode (D-20)', () => {
    render(<AttributionBar agitationLabel="activity" shares={{ pain: 0.5, stress: 0.2, agitation: 0.2, rest: 0.1, unexplained: 0 }} />);
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.queryByText('Agitation')).not.toBeInTheDocument();
  });

  it('shows the empty state while signals are rejected', () => {
    render(<AttributionBar shares={null} />);
    expect(screen.getByText('No attribution while signals are rejected.')).toBeInTheDocument();
  });
});

describe('PainHeroCard', () => {
  it('pairs the severity colour with a text label', () => {
    render(<PainHeroCard state="ok" score={6.4} lo={4.3} hi={8.1} trend={{ direction: 'rising', slopePerMin: 0.9 }} episode={null} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('6.4')).toBeInTheDocument();
  });

  it('shows coverage and reduced-sensor badges in the degraded state', () => {
    render(
      <PainHeroCard
        state="ok"
        score={5.2}
        lo={2.9}
        hi={7.8}
        trend={{ direction: 'stable', slopePerMin: 0 }}
        episode={null}
        degraded={{ reducedSensors: 'face, motion' }}
        coverageNotValidated
      />,
    );
    expect(screen.getByText('Reduced sensors: face, motion')).toBeInTheDocument();
    expect(screen.getByText('Coverage not validated for this context')).toBeInTheDocument();
  });

  it('abstention card recommends an assessment, never a treatment', () => {
    render(<PainHeroCard state="abstain" lastValid={{ score: 5.9, age: '45 s ago' }} reasons={[{ kind: 'rejected', text: 'Movement artifact' }]} />);
    expect(screen.getByRole('button', { name: 'Perform CPOT / BPS' })).toBeInTheDocument();
    expect(screen.getByText('Last valid 5.9 · 45 s ago')).toBeInTheDocument();
  });
});

describe('AlertSlot', () => {
  it('keeps the reserved 60 px height in every variant', () => {
    const { container, rerender } = render(<AlertSlot variant="empty" title="No active alerts" />);
    expect(container.firstChild).toHaveClass('h-15');
    for (const v of ['info', 'alert', 'acknowledged', 'advisory'] as const) {
      rerender(<AlertSlot variant={v} title="x" />);
      expect(container.firstChild).toHaveClass('h-15');
    }
  });
});
