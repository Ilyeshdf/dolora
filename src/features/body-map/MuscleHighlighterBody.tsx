import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter';
import { useView } from '@/features/monitor/useView';
import { useMonitor } from '@/store/monitor';
import { cn } from '@/lib/cn';
import type { SensorId } from '@/contracts/monitor';

export interface PainPinRef {
  id: string;
  rx: number;
  ry: number;
  side: 'front' | 'back';
  region: string;
  intensity: number;
  type: 'external' | 'internal';
}

interface MuscleHighlighterBodyProps {
  className?: string;
  /** Dynamic scale computed by parent so the body fills available height */
  scale?: number;
  gender: 'male' | 'female';
  highlightedSensor?: SensorId | null;
  painPins?: PainPinRef[];
}

export function MuscleHighlighterBody({
  className,
  scale = 1.4,
  gender,
  highlightedSensor,
  painPins = [],
}: MuscleHighlighterBodyProps) {
  const view = useView();
  const rail = useMonitor((s) => s.rail);
  const isBack = !!rail.back;

  // Live clinical distress / pain score
  const painScore = view?.pain?.score ?? 5.3;
  const isHighPain = painScore >= 6.0;
  const painColor = isHighPain ? '#ef4444' : painScore >= 3.5 ? '#f59e0b' : '#3b82f6';

  // Map sensor to muscle slugs for visual callout on both front and back
  const sensorToMusclesFront: Record<SensorId, Slug[]> = {
    face:      ['head', 'neck'],
    breathing: ['chest'],
    motion:    ['forearm', 'quadriceps'],
    temp:      ['biceps', 'forearm'],
    eda:       ['forearm', 'hands'],
    ppg:       ['forearm', 'hands'],
  };

  const sensorToMusclesBack: Record<SensorId, Slug[]> = {
    face:      ['head', 'neck'],
    breathing: ['upper-back', 'trapezius'],
    motion:    ['forearm', 'hamstring'],
    temp:      ['triceps', 'forearm'],
    eda:       ['forearm', 'hands'],
    ppg:       ['forearm', 'hands'],
  };

  const activeSensorMuscles = highlightedSensor
    ? (isBack ? sensorToMusclesBack[highlightedSensor] : sensorToMusclesFront[highlightedSensor]) || []
    : [];

  // Check if any doctor pain pins on the current side correspond to muscle groups
  const visiblePins = painPins.filter((p) => p.side === (isBack ? 'back' : 'front'));
  const hasPinIn = (labels: string[]) =>
    visiblePins.some((p) => labels.some((l) => p.region.toLowerCase().includes(l.toLowerCase())));

  // Front vs Back body part highlight definitions
  const bodyData: readonly ExtendedBodyPart[] = isBack
    ? [
        {
          slug: 'head',
          color: activeSensorMuscles.includes('head') ? '#f43f5e' : hasPinIn(['head']) ? '#ef4444' : '#6366f1',
          intensity: hasPinIn(['head']) || isHighPain ? 2 : 1,
        },
        {
          slug: 'trapezius',
          color: activeSensorMuscles.includes('trapezius') ? '#f43f5e' : hasPinIn(['neck', 'shoulder']) ? '#f97316' : '#ec4899',
          intensity: 1,
        },
        {
          slug: 'upper-back',
          color: activeSensorMuscles.includes('upper-back') ? '#f43f5e' : hasPinIn(['chest', 'back']) ? '#ef4444' : '#f59e0b',
          intensity: 2,
        },
        {
          slug: 'lower-back',
          color: hasPinIn(['abdomen', 'hip', 'spine']) ? '#ef4444' : '#eab308',
          intensity: hasPinIn(['abdomen', 'hip', 'spine']) ? 2 : 1,
        },
        {
          slug: 'triceps',
          color: activeSensorMuscles.includes('triceps') ? '#f43f5e' : '#06b6d4',
          intensity: 1,
        },
        {
          slug: 'forearm',
          color: activeSensorMuscles.includes('forearm') ? '#f43f5e' : hasPinIn(['arm', 'hand']) ? '#f97316' : '#10b981',
          intensity: activeSensorMuscles.includes('forearm') ? 2 : 1,
        },
        {
          slug: 'gluteal',
          color: hasPinIn(['hip']) ? '#ef4444' : '#8b5cf6',
          intensity: 1,
        },
        {
          slug: 'hamstring',
          color: activeSensorMuscles.includes('hamstring') ? '#f43f5e' : hasPinIn(['thigh']) ? '#ef4444' : '#6366f1',
          intensity: 1,
        },
        {
          slug: 'calves',
          color: hasPinIn(['shin', 'knee', 'foot']) ? '#ef4444' : '#06b6d4',
          intensity: 1,
        },
      ]
    : [
        {
          slug: 'chest',
          color: activeSensorMuscles.includes('chest') ? '#f43f5e' : hasPinIn(['chest']) ? '#ef4444' : painColor,
          intensity: hasPinIn(['chest']) || isHighPain ? 2 : 1,
        },
        {
          slug: 'abs',
          color: activeSensorMuscles.includes('abs') ? '#f43f5e' : hasPinIn(['abdomen']) ? '#ef4444' : '#f59e0b',
          intensity: hasPinIn(['abdomen']) ? 2 : 1,
        },
        {
          slug: 'head',
          color: activeSensorMuscles.includes('head') ? '#f43f5e' : hasPinIn(['head']) ? '#ef4444' : isHighPain ? '#ef4444' : '#6366f1',
          intensity: hasPinIn(['head']) || isHighPain ? 2 : 1,
        },
        {
          slug: 'forearm',
          color: activeSensorMuscles.includes('forearm') ? '#f43f5e' : hasPinIn(['arm', 'hand']) ? '#ef4444' : '#10b981',
          intensity: activeSensorMuscles.includes('forearm') ? 2 : 1,
        },
        {
          slug: 'biceps',
          color: activeSensorMuscles.includes('biceps') ? '#f43f5e' : '#06b6d4',
          intensity: 1,
        },
        {
          slug: 'trapezius',
          color: activeSensorMuscles.includes('trapezius') ? '#f43f5e' : hasPinIn(['neck', 'shoulder']) ? '#f97316' : '#ec4899',
          intensity: 1,
        },
        {
          slug: 'quadriceps',
          color: activeSensorMuscles.includes('quadriceps') ? '#f43f5e' : hasPinIn(['thigh', 'knee']) ? '#ef4444' : '#8b5cf6',
          intensity: 1,
        },
        {
          slug: 'calves',
          color: hasPinIn(['shin', 'foot']) ? '#ef4444' : '#06b6d4',
          intensity: 1,
        },
      ];

  return (
    <div className={cn('pointer-events-none select-none', className)}>
      <Body
        data={bodyData}
        side={isBack ? 'back' : 'front'}
        gender={gender}
        scale={scale}
        defaultFill="#1e293b"
        defaultStroke="#334155"
        defaultStrokeWidth={1.5}
      />
    </div>
  );
}
