import { useState } from 'react';
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter';
import { useView } from '@/features/monitor/useView';
import { useMonitor } from '@/store/monitor';
import { toast } from '@/components/ui/toastStore';
import { Activity, RefreshCw, User } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MuscleHighlighterBodyProps {
  className?: string;
  scale?: number;
  interactive?: boolean;
}

export function MuscleHighlighterBody({
  className,
  scale = 1.35,
  interactive = true,
}: MuscleHighlighterBodyProps) {
  const view = useView();
  const rail = useMonitor((s) => s.rail);
  const toggleRail = useMonitor((s) => s.toggleRail);

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedPart, setSelectedPart] = useState<Slug | null>(null);

  // Derive muscle highlights from live clinical distress / pain score
  const painScore = view?.pain?.score ?? 5.3;
  const isHighPain = painScore >= 6.0;
  const painColor = isHighPain ? '#ef4444' : painScore >= 3.5 ? '#f59e0b' : '#3b82f6';

  // Base clinical muscle data
  const defaultBodyData: ExtendedBodyPart[] = [
    { slug: 'chest', color: painColor, intensity: isHighPain ? 2 : 1 },
    { slug: 'abs', color: '#f59e0b', intensity: 1 },
    { slug: 'head', color: isHighPain ? '#ef4444' : '#6366f1', intensity: isHighPain ? 2 : 1 },
    { slug: 'forearm', color: '#10b981', intensity: 1 },
    { slug: 'trapezius', color: '#ec4899', intensity: 1 },
    { slug: 'triceps', color: '#06b6d4', intensity: 1 },
    { slug: 'quadriceps', color: '#8b5cf6', intensity: 1 },
  ];

  // If a muscle was clicked, highlight it specifically
  const bodyData: readonly ExtendedBodyPart[] = selectedPart
    ? defaultBodyData.map((item) =>
        item.slug === selectedPart
          ? { ...item, color: '#f43f5e', intensity: 2 }
          : item,
      )
    : defaultBodyData;

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    setSelectedPart(part.slug);
    toast({
      title: `Muscle: ${part.slug.toUpperCase()}`,
      description: `Targeted anatomical zone mapped to patient telemetry.`,
    });
  };

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      {/* Top Controls Overlay */}
      <div className="absolute top-2 z-10 flex items-center gap-2 rounded-full border border-card-outline bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => toggleRail('back')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-text-1"
          title="Toggle Front/Back View"
        >
          <RefreshCw size={13} className={cn('transition-transform duration-300', rail.back ? 'rotate-180' : '')} />
          <span>{rail.back ? 'Back View' : 'Front View'}</span>
        </button>
        <div className="h-3 w-px bg-card-outline" />
        <button
          type="button"
          onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-text-1"
          title="Toggle Anatomy Model"
        >
          <User size={13} />
          <span className="capitalize">{gender}</span>
        </button>
      </div>

      {/* React Muscle Highlighter SVG */}
      <div className="relative mt-8 flex items-center justify-center p-4">
        <Body
          data={bodyData}
          side={rail.back ? 'back' : 'front'}
          gender={gender}
          scale={scale}
          onBodyPartPress={interactive ? handleBodyPartPress : undefined}
          defaultFill="#1e293b"
          defaultStroke="#334155"
          defaultStrokeWidth={1.5}
        />
      </div>

      {/* Selected Muscle Indicator */}
      {selectedPart && (
        <div className="absolute bottom-2 z-10 flex items-center gap-2 rounded-full border border-accent/40 bg-card/95 px-3 py-1 text-xs font-medium text-accent shadow-md backdrop-blur-sm animate-in fade-in">
          <Activity size={13} />
          <span>Selected Muscle: <strong className="uppercase">{selectedPart}</strong></span>
          <button
            type="button"
            onClick={() => setSelectedPart(null)}
            className="ml-1 text-text-2 hover:text-text-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
