import { useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  MessageSquare, RefreshCw, Tag, ZoomIn, ZoomOut, MapPin, X, Crosshair,
  Plus, RotateCcw, Activity, Layers, Move,
} from 'lucide-react';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import type { ChannelView, DriverView, SensorId } from '@/contracts/monitor';
import { SensorHotspot, SensorLegend, type HotspotState } from '@/components/clinical/SensorHotspot';
import { Tooltip } from '@/components/ui/Tooltip';
import { SignalCheck } from '@/features/monitor/Calibration';
import { useCompact } from '@/features/monitor/useCompact';
import { MuscleHighlighterBody, type PainPinRef } from './MuscleHighlighterBody';

/* ---------------------------------------------------------------------------
 * Layout constants
 * BODY_SVG_BASE_* = native size at scale=1 from react-muscle-highlighter
 * --------------------------------------------------------------------------- */
const DESIGN_W = 928;
const BODY_SVG_BASE_W = 200;
const BODY_SVG_BASE_H = 400;
const BODY_TOP = 52;       // px reserved for the Doctor Control Bar
const BODY_BOTTOM_PAD = 12;

/**
 * Anatomically accurate hotspot positions in the 724×1448 viewBox
 * used by react-muscle-highlighter.
 */
export const SENSOR_DEFAULT_POS_FRONT: Record<SensorId, { x: number; y: number }> = {
  face:      { x: 362, y: 190 }, // Forehead / Facial Action Unit
  breathing: { x: 362, y: 440 }, // Sternum / Mid-chest respiratory band
  motion:    { x: 575, y: 690 }, // Left wrist / forearm IMU
  temp:      { x: 520, y: 560 }, // Left upper arm / axillary temp probe
  eda:       { x: 638, y: 790 }, // Left palm / distal phalanges EDA
  ppg:       { x: 595, y: 830 }, // Left index fingertip SpO2/PPG
};

export const SENSOR_DEFAULT_POS_BACK: Record<SensorId, { x: number; y: number }> = {
  face:      { x: 362, y: 190 }, // Occipital area / posterior cervical
  breathing: { x: 362, y: 440 }, // Thoracic spine / interscapular region
  motion:    { x: 724 - 575, y: 690 }, // Patient's left wrist mirrored to screen-left (149)
  temp:      { x: 724 - 520, y: 560 }, // Patient's left upper arm (204)
  eda:       { x: 724 - 638, y: 790 }, // Patient's left palm/fingers (86)
  ppg:       { x: 724 - 595, y: 830 }, // Patient's left index fingertip (129)
};

const LABEL_SIDE_FRONT: Record<SensorId, 'left' | 'right' | 'upright'> = {
  face: 'right', breathing: 'right', motion: 'left',
  temp: 'right', eda: 'right', ppg: 'left',
};

const LABEL_SIDE_BACK: Record<SensorId, 'left' | 'right' | 'upright'> = {
  face: 'right', breathing: 'right', motion: 'right',
  temp: 'left', eda: 'left', ppg: 'right',
};

const CALLOUT_SIDE_FRONT: Record<SensorId, 'left' | 'right'> = {
  face: 'left', breathing: 'left', motion: 'right',
  temp: 'right', eda: 'right', ppg: 'right',
};

const CALLOUT_SIDE_BACK: Record<SensorId, 'left' | 'right'> = {
  face: 'right', breathing: 'right', motion: 'left',
  temp: 'left', eda: 'left', ppg: 'left',
};

const CALLOUT_W = 327;
const CALLOUT_H = 63;
const CALLOUT_GAP = 20;

/* ---------------------------------------------------------------------------
 * Internal organ options (for internal pain)
 * --------------------------------------------------------------------------- */
export const ORGAN_OPTIONS = [
  { value: 'heart',       label: '❤️ Heart' },
  { value: 'lungs',       label: '🫁 Lungs' },
  { value: 'stomach',     label: '🫃 Stomach' },
  { value: 'liver',       label: '🟤 Liver' },
  { value: 'kidney_l',    label: '🫘 Left Kidney' },
  { value: 'kidney_r',    label: '🫘 Right Kidney' },
  { value: 'intestines',  label: '🌀 Intestines' },
  { value: 'bladder',     label: '💧 Bladder' },
  { value: 'spine',       label: '🦴 Spine' },
  { value: 'appendix',    label: '📍 Appendix' },
  { value: 'gallbladder', label: '💛 Gallbladder' },
  { value: 'pancreas',    label: '🟣 Pancreas' },
  { value: 'spleen',      label: '🔴 Spleen' },
  { value: 'aorta',       label: '🔀 Aorta' },
  { value: 'other',       label: '⚕️ Other / Unknown' },
] as const;

export type OrganValue = (typeof ORGAN_OPTIONS)[number]['value'];

/* ---------------------------------------------------------------------------
 * PainPin — the core clinical input record from the doctor
 * --------------------------------------------------------------------------- */
export interface PainPin {
  id: string;
  /** Fractional position 0-1 relative to the body SVG bounding box */
  rx: number;
  ry: number;
  /** Which body side was showing when the pin was placed */
  side: 'front' | 'back';
  /** Auto-detected surface region label */
  region: string;
  /** 1-10 pain intensity */
  intensity: number;
  /** Surface (skin/muscle) or internal (organ) */
  type: 'external' | 'internal';
  /** Organ name — only when type === 'internal' */
  organ?: OrganValue;
  /** Free-text clinical note */
  note?: string;
}

/* ---------------------------------------------------------------------------
 * Region detection
 * --------------------------------------------------------------------------- */
const REGION_MAP: { label: string; xMin: number; xMax: number; yMin: number; yMax: number }[] = [
  { label: 'Head',           xMin: 0.35, xMax: 0.65, yMin: 0.00, yMax: 0.12 },
  { label: 'Neck',           xMin: 0.38, xMax: 0.62, yMin: 0.12, yMax: 0.17 },
  { label: 'Left Shoulder',  xMin: 0.10, xMax: 0.35, yMin: 0.15, yMax: 0.24 },
  { label: 'Right Shoulder', xMin: 0.65, xMax: 0.90, yMin: 0.15, yMax: 0.24 },
  { label: 'Chest',          xMin: 0.30, xMax: 0.70, yMin: 0.17, yMax: 0.30 },
  { label: 'Left Arm',       xMin: 0.00, xMax: 0.25, yMin: 0.24, yMax: 0.50 },
  { label: 'Right Arm',      xMin: 0.75, xMax: 1.00, yMin: 0.24, yMax: 0.50 },
  { label: 'Abdomen',        xMin: 0.30, xMax: 0.70, yMin: 0.30, yMax: 0.42 },
  { label: 'Left Hip',       xMin: 0.25, xMax: 0.48, yMin: 0.42, yMax: 0.50 },
  { label: 'Right Hip',      xMin: 0.52, xMax: 0.75, yMin: 0.42, yMax: 0.50 },
  { label: 'Left Hand',      xMin: 0.00, xMax: 0.20, yMin: 0.50, yMax: 0.60 },
  { label: 'Right Hand',     xMin: 0.80, xMax: 1.00, yMin: 0.50, yMax: 0.60 },
  { label: 'Left Thigh',     xMin: 0.25, xMax: 0.48, yMin: 0.50, yMax: 0.68 },
  { label: 'Right Thigh',    xMin: 0.52, xMax: 0.75, yMin: 0.50, yMax: 0.68 },
  { label: 'Left Knee',      xMin: 0.25, xMax: 0.48, yMin: 0.68, yMax: 0.74 },
  { label: 'Right Knee',     xMin: 0.52, xMax: 0.75, yMin: 0.68, yMax: 0.74 },
  { label: 'Left Shin',      xMin: 0.25, xMax: 0.48, yMin: 0.74, yMax: 0.88 },
  { label: 'Right Shin',     xMin: 0.52, xMax: 0.75, yMin: 0.74, yMax: 0.88 },
  { label: 'Left Foot',      xMin: 0.22, xMax: 0.48, yMin: 0.88, yMax: 1.00 },
  { label: 'Right Foot',     xMin: 0.52, xMax: 0.78, yMin: 0.88, yMax: 1.00 },
];

function detectRegion(rx: number, ry: number): string {
  for (const r of REGION_MAP) {
    if (rx >= r.xMin && rx <= r.xMax && ry >= r.yMin && ry <= r.yMax) return r.label;
  }
  return 'Body';
}

function intensityColor(intensity: number): string {
  if (intensity >= 8) return '#ef4444';
  if (intensity >= 6) return '#f97316';
  if (intensity >= 4) return '#eab308';
  if (intensity >= 2) return '#22c55e';
  return '#3b82f6';
}

let _pinId = 0;

/* ===========================================================================
 * BodyStage
 * =========================================================================== */
export function BodyStage({ reserveBottom = 238 }: { reserveBottom?: number }) {
  const t = useT();
  const view = useView();
  const rail = useMonitor((s) => s.rail);
  const highlight = useMonitor((s) => s.highlight);
  const sensorHighlight = useMonitor((s) => s.sensorHighlight);
  const compact = useCompact();
  const ref = useRef<HTMLDivElement>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  /** Tight wrapper around only the SVG — coordinate origin for all pins & hotspots */
  const bodySvgRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: DESIGN_W, h: 830 });

  /* ---- Doctor-level inputs ---- */
  const [gender, setGender] = useState<'male' | 'female'>('male');

  /* ---- Zoom state ---- */
  const [zoom, setZoom] = useState(1.0);
  const ZOOM_MIN = 0.7;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.2;

  /* ---- Current body side ---- */
  const currentSide: 'front' | 'back' = rail.back ? 'back' : 'front';

  /* ---- Pain pin state — the doctor's clinical input ---- */
  const [painPins, setPainPins] = useState<PainPin[]>([]);
  const [pinMode, setPinMode] = useState(false);

  // Edit state for the open pin popover
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [editIntensity, setEditIntensity] = useState(5);
  const [editType, setEditType] = useState<'external' | 'internal'>('external');
  const [editOrgan, setEditOrgan] = useState<OrganValue | ''>('');
  const [editNote, setEditNote] = useState('');

  /* ---- Custom sensor positions (allows doctor adjustment) ---- */
  const [customPositions, setCustomPositions] = useState<Partial<Record<SensorId, { fx: number; fy: number }>>>({});

  /* ---- Dynamic body scale — fills available height ---- */
  const bodyScale = useMemo(() => {
    const availH = size.h - BODY_TOP - reserveBottom - BODY_BOTTOM_PAD;
    const availW = Math.min(size.w * 0.38, 320);
    const scaleByH = availH / BODY_SVG_BASE_H;
    const scaleByW = availW / BODY_SVG_BASE_W;
    return Math.max(0.7, Math.min(scaleByH, scaleByW, 3.0));
  }, [size.h, size.w, reserveBottom]);

  const BODY_W = BODY_SVG_BASE_W * bodyScale;
  const BODY_H = BODY_SVG_BASE_H * bodyScale;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bodyLeft = size.w / 2 - BODY_W / 2;

  /**
   * Returns the exact fractional position (0-1) of each sensor
   * on the body for the currently displayed side (front vs back).
   * Follows custom positions if set by doctor, otherwise default anatomical positions.
   */
  const getSensorFrac = useCallback((k: SensorId) => {
    const custom = customPositions[k];
    if (custom) return custom;
    const defaultPos = rail.back ? SENSOR_DEFAULT_POS_BACK[k] : SENSOR_DEFAULT_POS_FRONT[k];
    return {
      fx: defaultPos.x / 724,
      fy: defaultPos.y / 1448,
    };
  }, [rail.back, customPositions]);

  /**
   * Returns exact subpixel stage coordinates of a sensor hotspot
   * regardless of zoom factor, screen size, or front/back view.
   */
  const getSensorStagePos = useCallback((sensor: SensorId) => {
    const { fx, fy } = getSensorFrac(sensor);
    const svgEl = bodySvgRef.current;
    const stageEl = ref.current;
    if (!svgEl || !stageEl) {
      // Fallback calculation
      const bodyCx = size.w / 2;
      const bodyCy = BODY_TOP + BODY_H / 2;
      return {
        x: bodyCx + (fx * BODY_W - BODY_W / 2) * zoom,
        y: bodyCy + (fy * BODY_H - BODY_H / 2) * zoom,
      };
    }
    const svgRect = svgEl.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    return {
      x: (svgRect.left - stageRect.left) + fx * svgRect.width,
      y: (svgRect.top - stageRect.top) + fy * svgRect.height,
    };
  }, [getSensorFrac, size.w, BODY_W, BODY_H, zoom]);

  // Unzoomed position for card column layout
  const toStage = (p: { fx: number; fy: number }) => ({
    x: bodyLeft + p.fx * BODY_W,
    y: BODY_TOP + p.fy * BODY_H,
  });

  const sensors = (Object.keys(view.channels) as SensorId[]).filter((k) => view.channels[k]);
  const highlightedSensor: SensorId | null =
    sensorHighlight ?? view.drivers.find((d) => d.id === highlight)?.sensor ?? null;

  const legendStates: HotspotState[] = ['ok', 'degraded', 'rejected'];
  if (sensors.some((k) => view.channels[k]?.state === 'derived')) legendStates.push('derived');
  if (sensors.some((k) => view.channels[k]?.state === 'masked')) legendStates.push('masked');

  // Callouts are shown in both front and back views!
  const showCallouts = !compact && rail.drivers && view.drivers.length > 0;
  const currentCalloutSide = rail.back ? CALLOUT_SIDE_BACK : CALLOUT_SIDE_FRONT;
  const callouts = showCallouts
    ? layoutCallouts(
        view.drivers,
        (k) => toStage(getSensorFrac(k)),
        size.w,
        currentCalloutSide,
      )
    : [];

  /* ---- Open edit popover helpers ---- */
  const openEdit = useCallback((pin: PainPin) => {
    setEditingPin(pin.id);
    setEditIntensity(pin.intensity);
    setEditType(pin.type);
    setEditOrgan(pin.organ ?? '');
    setEditNote(pin.note ?? '');
  }, []);

  /* ---- Pin click handler ---- */
  const handleBodyClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pinMode) return;
      const svgEl = bodySvgRef.current;
      if (!svgEl) return;

      const rect = svgEl.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;

      if (rx < 0.02 || rx > 0.98 || ry < 0.01 || ry > 0.99) return;

      const pin: PainPin = {
        id: `pin-${++_pinId}`,
        rx,
        ry,
        side: currentSide,
        region: detectRegion(rx, ry),
        intensity: 5,
        type: 'external',
      };
      setPainPins((prev) => [...prev, pin]);
      openEdit(pin);
      setPinMode(false);
    },
    [pinMode, currentSide, openEdit],
  );

  const updatePin = useCallback((id: string, patch: Partial<PainPin>) => {
    setPainPins((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePin = useCallback((id: string) => {
    setPainPins((prev) => prev.filter((p) => p.id !== id));
    if (editingPin === id) setEditingPin(null);
  }, [editingPin]);

  const confirmEdit = useCallback(() => {
    if (!editingPin) return;
    updatePin(editingPin, {
      intensity: editIntensity,
      type: editType,
      organ: editType === 'internal' ? (editOrgan as OrganValue) || undefined : undefined,
      note: editNote || undefined,
    });
    setEditingPin(null);
  }, [editingPin, editIntensity, editType, editOrgan, editNote, updatePin]);

  /* ---- Pins visible on the current body side ---- */
  const visiblePins = painPins.filter((p) => p.side === currentSide);

  /* ---- Popover position computation ---- */
  const editingPinData = editingPin ? painPins.find((p) => p.id === editingPin) : null;
  const popoverPos = useMemo(() => {
    if (!editingPinData) return null;
    const svgEl = bodySvgRef.current;
    const stageEl = ref.current;
    if (!svgEl || !stageEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    const px = (rect.left - stageRect.left) + editingPinData.rx * rect.width;
    const py = (rect.top - stageRect.top) + editingPinData.ry * rect.height;
    return { px, py, onRight: px < size.w / 2 };
  }, [editingPinData, size.w]);

  const hasCustomSensors = Object.keys(customPositions).length > 0;

  return (
    <div ref={ref} role="group" aria-label={t.body.stage} className="relative h-full w-full overflow-hidden">
      <FloorGrid />

      {/* ── Doctor Control Bar ──────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-center gap-2 px-4 pt-2">

        {/* Gender selector */}
        <div className="flex items-center gap-0.5 rounded-full border border-card-outline bg-card/90 p-0.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setGender('male')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150',
              gender === 'male' ? 'bg-blue-500 text-white shadow' : 'text-text-2 hover:text-text-1',
            )}
          >
            ♂ Male
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150',
              gender === 'female' ? 'bg-pink-500 text-white shadow' : 'text-text-2 hover:text-text-1',
            )}
          >
            ♀ Female
          </button>
        </div>

        {/* Add Pain Location */}
        <button
          type="button"
          onClick={() => { setPinMode((v) => !v); setEditingPin(null); }}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-all duration-150',
            pinMode
              ? 'border-accent bg-accent text-white'
              : 'border-card-outline bg-card/90 text-text-1 hover:border-accent/60 hover:text-accent',
          )}
        >
          {pinMode
            ? <><Crosshair size={11} className="animate-spin" /><span>Click body to place pain pin…</span></>
            : <><Plus size={11} /><span>Add Pain Location</span>{painPins.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 text-accent">{painPins.length}</span>}</>
          }
        </button>

        {/* Front / Back view toggle */}
        <button
          type="button"
          onClick={() => useMonitor.getState().toggleRail('back')}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-all duration-150',
            rail.back
              ? 'border-accent/60 bg-accent/10 text-accent'
              : 'border-card-outline bg-card/90 text-text-2 hover:text-text-1',
          )}
        >
          <RefreshCw size={11} className={cn('transition-transform duration-300', rail.back ? 'rotate-180' : '')} />
          <span>{rail.back ? 'Back View' : 'Front View'}</span>
        </button>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 rounded-full border border-card-outline bg-card/90 p-0.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)))}
            disabled={zoom <= ZOOM_MIN}
            className="rounded-full p-1.5 text-text-2 transition hover:bg-subtle hover:text-text-1 disabled:opacity-40"
            title="Zoom out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="min-w-[32px] text-center text-[10px] font-mono font-semibold text-text-2">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)))}
            disabled={zoom >= ZOOM_MAX}
            className="rounded-full p-1.5 text-text-2 transition hover:bg-subtle hover:text-text-1 disabled:opacity-40"
            title="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
          {zoom !== 1.0 && (
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              className="rounded-full p-1.5 text-text-2 transition hover:bg-subtle hover:text-text-1"
              title="Reset zoom"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>

        {/* Reset Sensor positions if customized */}
        {hasCustomSensors && (
          <button
            type="button"
            onClick={() => setCustomPositions({})}
            className="flex items-center gap-1 rounded-full border border-card-outline bg-card/90 px-2.5 py-1.5 text-[10px] font-semibold text-text-2 shadow-sm backdrop-blur-md hover:text-accent"
            title="Reset sensor attachments to anatomical defaults"
          >
            <Move size={10} />
            <span>Reset Sensors</span>
          </button>
        )}
      </div>

      {/* ── Body + Pins + Sensors ─────────────────────────────────────────── */}
      <div
        ref={bodyContainerRef}
        className="absolute inset-x-0 flex items-center justify-center overflow-hidden"
        style={{ top: BODY_TOP, bottom: reserveBottom - 20 }}
      >
        <div
          ref={bodySvgRef}
          onClick={handleBodyClick}
          className={cn('relative inline-block origin-center transition-transform duration-200', pinMode && 'cursor-crosshair')}
          style={{ transform: `scale(${zoom})` }}
        >
          <MuscleHighlighterBody
            scale={bodyScale}
            gender={gender}
            highlightedSensor={highlightedSensor}
            painPins={painPins as PainPinRef[]}
          />

          {/* Pain Pins — only those matching current body side are rendered */}
          {visiblePins.map((pin) => (
            <PainPinMarker
              key={pin.id}
              pin={pin}
              isEditing={editingPin === pin.id}
              onSelect={() => openEdit(pin)}
              onRemove={() => removePin(pin.id)}
            />
          ))}

          {/*
            Sensor hotspots live INSIDE bodySvgRef so they automatically
            follow the body when zoomed or rotated front/back.
            Positions track their own anatomical sites on front vs back.
          */}
          {sensors.map((k) => {
            const ch = view.channels[k] as ChannelView;
            const { fx, fy } = getSensorFrac(k);
            const side = rail.back ? LABEL_SIDE_BACK[k] : LABEL_SIDE_FRONT[k];
            return (
              <HotspotBodyRelative
                key={k}
                sensor={k}
                channel={ch}
                fx={fx}
                fy={fy}
                side={side}
                highlighted={highlightedSensor === k}
                showLabel={rail.labels}
                farLabel={k === 'ppg' && !!ch.note && ch.state !== 'rejected'}
                onPositionChange={(newFx, newFy) => {
                  setCustomPositions((prev) => ({
                    ...prev,
                    [k]: { fx: newFx, fy: newFy },
                  }));
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Pin Edit Popover ────────────────────────────────────────────────── */}
      {editingPinData && popoverPos && (
        <div
          className="absolute z-40 w-[300px] rounded-2xl border border-card-outline bg-card shadow-2xl backdrop-blur-xl"
          style={{
            left: popoverPos.onRight ? popoverPos.px + 24 : popoverPos.px - 324,
            top: Math.max(60, Math.min(popoverPos.py - 60, size.h - 460)),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-card-outline px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-accent" />
              <span className="text-sm font-bold text-text-1">{editingPinData.region}</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                editingPinData.side === 'front' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400',
              )}>
                {editingPinData.side}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditingPin(null)}
              className="rounded-full p-1 text-text-2 hover:bg-subtle hover:text-text-1"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            {/* 1 — Pain type: External vs Internal */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-text-2 uppercase tracking-wide">
                Pain Location Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setEditType('external'); setEditOrgan(''); }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    editType === 'external'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-card-outline text-text-2 hover:border-accent/40',
                  )}
                >
                  <Layers size={16} />
                  <span>External</span>
                  <span className="text-[9px] font-normal text-text-2 text-center">Surface / Muscle / Skin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('internal')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    editType === 'internal'
                      ? 'border-red-400 bg-red-500/10 text-red-400'
                      : 'border-card-outline text-text-2 hover:border-red-400/40',
                  )}
                >
                  <Activity size={16} />
                  <span>Internal</span>
                  <span className="text-[9px] font-normal text-text-2 text-center">Organ / Visceral</span>
                </button>
              </div>
            </div>

            {/* 2 — Organ selector (only for internal) */}
            {editType === 'internal' && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-text-2 uppercase tracking-wide">
                  Organ / Structure
                </label>
                <div className="grid grid-cols-2 gap-1 max-h-[130px] overflow-y-auto pr-1">
                  {ORGAN_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setEditOrgan(o.value)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-all',
                        editOrgan === o.value
                          ? 'border-red-400 bg-red-500/15 text-red-300'
                          : 'border-card-outline text-text-2 hover:border-red-400/40 hover:text-text-1',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3 — Intensity slider */}
            <div>
              <label className="mb-1 flex justify-between text-xs font-semibold text-text-2 uppercase tracking-wide">
                <span>Pain Intensity</span>
                <span
                  className="font-black"
                  style={{ color: intensityColor(editIntensity) }}
                >
                  {editIntensity}/10
                </span>
              </label>
              <input
                type="range" min={1} max={10}
                value={editIntensity}
                onChange={(e) => setEditIntensity(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-text-2">
                <span>Mild</span><span>Moderate</span><span>Severe</span>
              </div>
            </div>

            {/* 4 — Clinical note */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-2 uppercase tracking-wide">
                Clinical Note
              </label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                placeholder="Describe onset, character, radiation…"
                className="w-full resize-none rounded-lg border border-card-outline bg-subtle px-2.5 py-1.5 text-xs text-text-1 placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmEdit}
                disabled={editType === 'internal' && !editOrgan}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-accent/90 disabled:opacity-40"
              >
                Confirm Pain Entry
              </button>
              <button
                type="button"
                onClick={() => removePin(editingPin!)}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pain Pin Summary Chips ────────────────────────────────────────── */}
      {painPins.length > 0 && !editingPin && (
        <div className="absolute bottom-[268px] left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 compact:bottom-[218px]">
          {painPins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => {
                if (pin.side !== currentSide) {
                  useMonitor.getState().toggleRail('back');
                }
                openEdit(pin);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full border bg-card/95 px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm transition hover:shadow-md',
                pin.side === currentSide
                  ? 'border-card-outline hover:border-accent/50'
                  : 'border-dashed border-text-2/40 opacity-60',
              )}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: intensityColor(pin.intensity) }} />
              <span className="text-text-1">{pin.region}</span>
              {pin.type === 'internal' && <span className="text-red-400">⚕</span>}
              <span className="text-text-2">{pin.intensity}/10</span>
              {pin.side !== currentSide && <span className="text-[9px] text-muted">[{pin.side}]</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Driver Callouts & Dynamic Tracking Leader Lines ───────────────── */}
      {callouts.length > 0 ? (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {callouts.map((c) => {
            const hotspotStage = getSensorStagePos(c.driver.sensor);
            const cardEdge = c.leader[c.leader.length - 1];
            const midPt = c.leader.length >= 3 ? c.leader[1] : null;
            const rawPoints = midPt
              ? [hotspotStage, { x: midPt.x, y: hotspotStage.y }, cardEdge]
              : [hotspotStage, cardEdge];
            const points = rawPoints.filter((p): p is { x: number; y: number } => Boolean(p && !isNaN(p.x) && !isNaN(p.y)));
            return (
              <polyline
                key={c.driver.id}
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                className="stroke-muted hc:stroke-ink"
                strokeWidth="1.25"
              />
            );
          })}
          {callouts.map((c) => {
            const hotspotStage = getSensorStagePos(c.driver.sensor);
            return (
              <circle
                key={`${c.driver.id}-dot`}
                cx={hotspotStage.x}
                cy={hotspotStage.y}
                r="3"
                className="fill-accent hc:fill-ink"
              />
            );
          })}
        </svg>
      ) : null}

      {callouts.map((c) => (
        <Callout
          key={c.driver.id}
          driver={c.driver}
          x={c.x}
          y={c.y}
          w={c.w}
          highlighted={highlight === c.driver.id || highlightedSensor === c.driver.sensor}
        />
      ))}

      {view.calibrating ? <SignalCheck channels={view.channels} /> : null}
      <ToolRail hasDrivers={view.drivers.length > 0} />
      <SensorLegend states={legendStates} withShapes={false} className="absolute bottom-[262px] left-6 compact:hidden" />
    </div>
  );
}

/* ===========================================================================
 * Sub-components
 * =========================================================================== */

/* ---- PainPinMarker ---- */
function PainPinMarker({
  pin, isEditing, onSelect, onRemove: _onRemove,
}: {
  pin: PainPin;
  isEditing: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const color = intensityColor(pin.intensity);
  return (
    <div
      className={cn(
        'absolute z-10 -translate-x-1/2 -translate-y-full cursor-pointer transition-transform duration-200',
        isEditing && 'scale-125',
      )}
      style={{ left: `${pin.rx * 100}%`, top: `${pin.ry * 100}%` }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="relative flex flex-col items-center">
        {/* Badge */}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"
          style={{ background: color }}
        >
          {pin.type === 'internal'
            ? <span className="text-[8px] font-black text-white leading-none">⚕</span>
            : <span className="text-[9px] font-black text-white leading-none">{pin.intensity}</span>
          }
        </div>
        {/* Stem */}
        <div className="h-2 w-0.5" style={{ background: color }} />
        {/* Pulse ring for severe pain */}
        {pin.intensity >= 7 && (
          <div className="absolute -inset-1 animate-ping rounded-full opacity-30" style={{ background: color }} />
        )}
      </div>
    </div>
  );
}

/* ---- ToolRail ---- */
function ToolRail({ hasDrivers }: { hasDrivers: boolean }) {
  const t = useT();
  const rail = useMonitor((s) => s.rail);
  const toggle = useMonitor((s) => s.toggleRail);
  const items = [
    { key: 'labels'  as const, label: t.body.sensorLabels, Icon: Tag },
    { key: 'drivers' as const, label: hasDrivers ? t.body.drivers : t.body.driversNone, Icon: MessageSquare, muted: !hasDrivers },
    { key: 'zoom'    as const, label: t.body.zoom, Icon: ZoomIn },
  ];
  return (
    <div className="absolute right-0 top-12 flex items-start gap-3">
      <ul className="flex flex-col items-end pt-1">
        {items.map((i) => (
          <li key={i.key} className={cn('nowrap flex h-[52px] items-center text-sm compact:hidden', i.muted ? 'text-muted' : 'text-text-2')} aria-hidden>
            {i.label}
          </li>
        ))}
      </ul>
      <div className="flex flex-col rounded-full bg-card p-1 shadow-card hc:border-2 hc:border-ink">
        {items.map((i) => {
          const on = rail[i.key] && !(i.key === 'drivers' && !hasDrivers);
          return (
            <button
              key={i.key}
              type="button"
              aria-label={i.label}
              aria-pressed={on}
              disabled={i.key === 'drivers' && !hasDrivers}
              onClick={() => toggle(i.key)}
              className={cn(
                'my-1 grid h-11 w-11 place-items-center rounded-full transition-colors duration-150',
                on ? 'bg-pill-active text-pill-active-fg' : 'text-ink hover:bg-subtle disabled:text-muted',
              )}
            >
              <i.Icon aria-hidden size={20} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Hotspot ---- */
const SENSOR_LABEL: Record<SensorId, string> = {
  face: 'Face', breathing: 'Breathing', motion: 'Motion',
  temp: 'Temp', eda: 'EDA', ppg: 'PPG',
};

/**
 * Body-relative hotspot — positioned as fractions (0-1) of the body SVG wrapper.
 * Lives inside bodySvgRef so it automatically follows zoom and front/back views.
 * Supports tactile dragging to customize placement.
 */
function HotspotBodyRelative({
  sensor, channel, fx, fy, side, highlighted, showLabel, farLabel, onPositionChange,
}: {
  sensor: SensorId;
  channel: ChannelView;
  fx: number;
  fy: number;
  side: 'left' | 'right' | 'upright';
  highlighted: boolean;
  showLabel: boolean;
  farLabel?: boolean;
  onPositionChange?: (newFx: number, newFy: number) => void;
}) {
  const l = useL10n();
  const label = SENSOR_LABEL[sensor];
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startFx: number; startFy: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startFx: fx,
      startFy: fy,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current || !onPositionChange) return;
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const newFx = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const newFy = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    onPositionChange(newFx, newFy);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
    }
  };

  return (
    <div
      style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-grab active:cursor-grabbing transition-transform duration-100',
        isDragging && 'scale-125 z-30',
      )}
      aria-label={`${label}: ${channel.state}`}
    >
      <Tooltip content={
        <div className="space-y-0.5 text-xs select-none">
          <p className="font-semibold">{label}</p>
          <p className="text-text-2">Status: <span className="font-medium text-text-1 capitalize">{channel.state}</span></p>
          {channel.sqi != null && <p className="text-text-2">SQI: <span className="font-mono text-text-1">{(channel.sqi * 100).toFixed(0)}%</span></p>}
          {channel.note && <p className="text-[11px] text-accent">{l(channel.note)}</p>}
          <p className="pt-1 text-[10px] text-muted italic">Drag to reposition sensor</p>
        </div>
      }>
        <div className="p-1">
          <SensorHotspot state={channel.state as HotspotState} highlighted={highlighted} size={18} />
        </div>
      </Tooltip>
      {showLabel && (
        <span className={cn(
          'pointer-events-none absolute whitespace-nowrap text-xs font-semibold tracking-tight shadow-xs backdrop-blur-xs',
          side === 'left' && 'right-full mr-2.5 top-1/2 -translate-y-1/2',
          side === 'right' && 'left-full ml-2.5 top-1/2 -translate-y-1/2',
          side === 'upright' && 'left-full ml-2.5 bottom-1/2',
          farLabel && 'mr-7',
          highlighted ? 'text-accent font-bold' : 'text-text-1',
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ---- Callout ---- */
function Callout({ driver, x, y, w, highlighted }: {
  driver: DriverView; x: number; y: number; w: number; highlighted: boolean;
}) {
  const l = useL10n();
  const Arrow = driver.direction === 'up' ? '↑' : '↓';
  return (
    <div
      aria-hidden
      style={{ left: x, top: y, width: w, height: CALLOUT_H }}
      className={cn(
        'absolute flex flex-col justify-center rounded-[16px] border bg-card px-3.5 shadow-card compact:hidden transition-colors',
        highlighted ? 'border-accent/70 hc:border-2 hc:border-action bg-card/95' : 'border-card-outline hc:border-ink',
      )}
    >
      <p className="nowrap truncate text-base font-semibold leading-6 tracking-[-0.01em]">{Arrow} {l(driver.callout.title)}</p>
      <p className="nowrap truncate text-sm text-text-2">{l(driver.callout.detail)}</p>
    </div>
  );
}

/* ---- FloorGrid ---- */
function FloorGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}
    />
  );
}

/* ---- layoutCallouts ---- */
interface PlacedCallout {
  driver: DriverView;
  w: number; x: number; y: number;
  leader: { x: number; y: number }[];
}

function layoutCallouts(
  drivers: DriverView[],
  at: (k: SensorId) => { x: number; y: number },
  stageW: number,
  sideMap: Record<SensorId, 'left' | 'right'> = CALLOUT_SIDE_FRONT,
): PlacedCallout[] {
  const out: PlacedCallout[] = [];
  const nextFree = { left: -Infinity, right: -Infinity };
  const ordered = [...drivers].sort((a, b) => at(a.sensor).y - at(b.sensor).y);
  for (const d of ordered) {
    const side = sideMap[d.sensor] || 'right';
    const h = at(d.sensor);
    let y = Math.max(h.y - CALLOUT_H / 2, nextFree[side]);
    nextFree[side] = y + CALLOUT_H + CALLOUT_GAP;
    const w = side === 'left' ? 309 : CALLOUT_W;
    const x = side === 'left' ? 25 : stageW - 9 - CALLOUT_W;
    const edgeX = side === 'left' ? x + w : x;
    const midY = y + CALLOUT_H / 2;
    const leader =
      Math.abs(midY - h.y) < 6
        ? [h, { x: edgeX, y: h.y }]
        : [h, { x: side === 'left' ? edgeX + 45 : edgeX - 45, y: midY }, { x: edgeX, y: midY }];
    y = Math.round(y);
    out.push({ driver: d, x, y, w, leader });
  }
  return out;
}
