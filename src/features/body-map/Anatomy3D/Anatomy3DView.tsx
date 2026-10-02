import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Sparkles,
  Maximize2,
  Activity,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { buildMuscledAnatomyModel, type MuscleInfo } from './muscleModel';
import { createMuscleFiberTexture, createMuscleBumpMap, createBiometricTexture } from './textureGenerator';
import type { SensorId, ChannelView } from '@/contracts/monitor';
import { useView } from '@/features/monitor/useView';
import { useMonitor } from '@/store/monitor';
import { cn } from '@/lib/cn';

export type ShadingMode = 'anatomy' | 'biometric' | 'xray';

interface Anatomy3DViewProps {
  className?: string;
  onOpenStudio?: () => void;
  interactive?: boolean;
  compact?: boolean;
}

interface SensorMarkerData {
  id: SensorId;
  label: string;
  position: [number, number, number];
  color: string;
}

const SENSOR_MARKERS: SensorMarkerData[] = [
  { id: 'face', label: 'Face AU4 (PSPI)', position: [0, 2.12, 0.32], color: '#10b981' },
  { id: 'breathing', label: 'Thoracic Impedance', position: [0, 1.36, 0.31], color: '#10b981' },
  { id: 'motion', label: 'Motion Accel', position: [-0.86, 0.42, 0.08], color: '#10b981' },
  { id: 'temp', label: 'Skin Temp', position: [-0.88, 0.35, 0.08], color: '#10b981' },
  { id: 'eda', label: 'EDA (SCR)', position: [-0.92, 0.22, 0.06], color: '#10b981' },
  { id: 'ppg', label: 'PPG Pulse Amp', position: [-0.84, 0.25, -0.04], color: '#10b981' },
];

export function Anatomy3DView({
  className,
  onOpenStudio,
  interactive = true,
  compact: _compact = false,
}: Anatomy3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const view = useView();
  const rail = useMonitor((s) => s.rail);

  const [shadingMode, setShadingMode] = useState<ShadingMode>('anatomy');
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleInfo | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleInfo | null>(null);
  const [activeSensor, setActiveSensor] = useState<SensorMarkerData | null>(null);

  // References to Three.js elements
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const pulseRingsRef = useRef<THREE.Mesh[]>([]);

  // Update sensor colors based on live monitor channel states
  const sensorStatusColors = useMemo(() => {
    const colors: Record<SensorId, string> = {
      face: '#10b981',
      breathing: '#10b981',
      motion: '#10b981',
      temp: '#10b981',
      eda: '#10b981',
      ppg: '#10b981',
    };
    if (view?.channels) {
      Object.entries(view.channels).forEach(([sensor, ch]) => {
        const sKey = sensor as SensorId;
        const channel = ch as ChannelView | undefined;
        if (!channel) return;
        if (channel.state === 'rejected') colors[sKey] = '#ef4444';
        else if (channel.state === 'degraded') colors[sKey] = '#f59e0b';
        else colors[sKey] = '#10b981';
      });
    }
    return colors;
  }, [view]);

  // Sync back rotation with rail.back from header/tool rail
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    if (rail.back) {
      // Rotate camera to back view
      cameraRef.current.position.set(0, 0.8, -4.8);
      controlsRef.current.target.set(0, 0.7, 0);
      controlsRef.current.update();
    } else {
      // Front view
      cameraRef.current.position.set(0, 0.8, 4.8);
      controlsRef.current.target.set(0, 0.7, 0);
      controlsRef.current.update();
    }
  }, [rail.back]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 6.2);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.0;
    controls.maxDistance = 9.0;
    controls.target.set(0, 0.4, 0);
    controls.enablePan = interactive;
    controls.enableRotate = interactive;
    controls.enableZoom = interactive;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.4);
    keyLight.position.set(3, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // 6. Materials
    const muscleTex = createMuscleFiberTexture();
    const bumpTex = createMuscleBumpMap();
    const biometricTex = createBiometricTexture();

    const muscleMat = new THREE.MeshStandardMaterial({
      map: muscleTex,
      bumpMap: bumpTex,
      bumpScale: 0.035,
      roughness: 0.42,
      metalness: 0.12,
      color: 0xffffff,
    });

    const tendonMat = new THREE.MeshStandardMaterial({
      color: 0xdfd7cf,
      roughness: 0.28,
      metalness: 0.18,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.3,
    });

    // 7. Build Model
    const modelRoot = buildMuscledAnatomyModel(muscleMat, tendonMat, accentMat);
    modelRootRef.current = modelRoot;
    scene.add(modelRoot);

    // 8. 3D Sensor Beacons
    const pulseRings: THREE.Mesh[] = [];
    const sensorsGroup = new THREE.Group();
    sensorsGroup.name = 'Sensor_Beacons';

    SENSOR_MARKERS.forEach((s) => {
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(...s.position);

      // Core sphere
      const sphereGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(s.color),
        emissive: new THREE.Color(s.color),
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      beaconGroup.add(sphere);

      // Outer pulsing ring
      const ringGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(s.color),
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      pulseRings.push(ring);
      beaconGroup.add(ring);

      beaconGroup.userData = { isSensorBeacon: true, sensorData: s };
      sensorsGroup.add(beaconGroup);
    });

    scene.add(sensorsGroup);
    pulseRingsRef.current = pulseRings;

    // 9. Raycasting for hover / selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(modelRoot.children, true);

      if (intersects.length > 0 && intersects[0]?.object) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit.userData && hit.userData.muscleId) {
          setHoveredMuscle(hit.userData as MuscleInfo);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredMuscle(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const sensorHits = raycaster.intersectObjects(sensorsGroup.children, true);
      if (sensorHits.length > 0 && sensorHits[0]?.object) {
        let parent = sensorHits[0].object.parent;
        while (parent && !parent.userData.isSensorBeacon && parent !== scene) {
          parent = parent.parent;
        }
        if (parent && parent.userData.sensorData) {
          setActiveSensor(parent.userData.sensorData);
          return;
        }
      }

      const muscleHits = raycaster.intersectObjects(modelRoot.children, true);
      if (muscleHits.length > 0 && muscleHits[0]?.object) {
        const hit = muscleHits[0].object as THREE.Mesh;
        if (hit.userData && hit.userData.muscleId) {
          setSelectedMuscle(hit.userData as MuscleInfo);
          return;
        }
      }
    };

    if (interactive) {
      renderer.domElement.addEventListener('mousemove', handlePointerMove);
      renderer.domElement.addEventListener('click', handleClick);
    }

    // 10. Animation Loop
    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Pulse beacon rings
      pulseRings.forEach((r, idx) => {
        const scale = 1 + (Math.sin(elapsed * 4 + idx * 0.8) * 0.5 + 0.5) * 0.6;
        r.scale.set(scale, scale, scale);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.9 - (scale - 1) * 0.8;
      });

      // Shading mode live update
      if (modelRootRef.current) {
        modelRootRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (shadingMode === 'biometric') {
              if (mat.map !== biometricTex) {
                mat.map = biometricTex;
                mat.color.setHex(0x38bdf8);
                mat.roughness = 0.3;
                mat.wireframe = false;
                mat.needsUpdate = true;
              }
            } else if (shadingMode === 'xray') {
              mat.wireframe = true;
              mat.color.setHex(0x06b6d4);
              mat.needsUpdate = true;
            } else {
              if (mat.map !== muscleTex && !mesh.userData.isSensorSite) {
                mat.map = muscleTex;
                mat.color.setHex(0xffffff);
                mat.wireframe = false;
                mat.needsUpdate = true;
              }
            }
          }
        });
      }

      if (autoRotate) {
        modelRoot.rotation.y += delta * 0.5;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 11. Resize handling
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nw = entry.contentRect.width;
      const nh = entry.contentRect.height;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (interactive) {
        renderer.domElement.removeEventListener('mousemove', handlePointerMove);
        renderer.domElement.removeEventListener('click', handleClick);
      }
      renderer.dispose();
    };
  }, [interactive, autoRotate, shadingMode]);

  // Update beacon colors dynamically when sensorStatusColors change
  useEffect(() => {
    if (!sceneRef.current) return;
    const sensorsGroup = sceneRef.current.getObjectByName('Sensor_Beacons');
    if (!sensorsGroup) return;

    sensorsGroup.children.forEach((child) => {
      const s = child.userData.sensorData as SensorMarkerData;
      if (s && sensorStatusColors[s.id]) {
        const color = sensorStatusColors[s.id];
        child.children.forEach((meshChild) => {
          const m = meshChild as THREE.Mesh;
          if (m.material) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat.color) mat.color.set(color);
            if (mat.emissive) mat.emissive.set(color);
          }
        });
      }
    });
  }, [sensorStatusColors]);

  const setViewPreset = (viewName: 'front' | 'back' | 'iso' | 'face' | 'wrist') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (viewName) {
      case 'front':
        cam.position.set(0, 0.45, 6.2);
        ctrl.target.set(0, 0.4, 0);
        break;
      case 'back':
        cam.position.set(0, 0.45, -6.2);
        ctrl.target.set(0, 0.4, 0);
        break;
      case 'iso':
        cam.position.set(3.5, 1.6, 4.6);
        ctrl.target.set(0, 0.4, 0);
        break;
      case 'face':
        cam.position.set(0, 2.05, 1.8);
        ctrl.target.set(0, 2.05, 0);
        break;
      case 'wrist':
        cam.position.set(-0.9, 0.4, 1.4);
        ctrl.target.set(-0.88, 0.35, 0);
        break;
    }
    ctrl.update();
  };

  return (
    <div className={cn('relative h-full w-full select-none overflow-hidden rounded-2xl', className)}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating 3D Controls Badge */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-card-outline bg-card/90 px-3 py-1.5 text-xs font-medium text-text-1 shadow-sm backdrop-blur-md">
        <Sparkles size={14} className="text-accent" />
        <span>3D Muscled Anatomy</span>
        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent uppercase">
          Interactive
        </span>
      </div>

      {/* View Presets & Camera Action Bar */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-xl border border-card-outline bg-card/90 p-1 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => setViewPreset('front')}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-text-2 transition hover:bg-subtle hover:text-text-1"
          title="Front View"
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => setViewPreset('back')}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-text-2 transition hover:bg-subtle hover:text-text-1"
          title="Back View"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setViewPreset('iso')}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-text-2 transition hover:bg-subtle hover:text-text-1"
          title="3/4 Isometric"
        >
          3/4
        </button>
        <div className="mx-0.5 h-3.5 w-px bg-card-outline" />
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition',
            autoRotate ? 'bg-accent text-accent-contrast' : 'text-text-2 hover:bg-subtle',
          )}
          title="Toggle Auto Rotation"
        >
          {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          <span className="compact:hidden">Orbit</span>
        </button>
        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/20"
            title="Inspect 3D Anatomy Studio"
          >
            <Maximize2 size={13} />
            <span className="compact:hidden">Studio</span>
          </button>
        )}
      </div>

      {/* Shading Mode Switcher Bottom-Left */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-xl border border-card-outline bg-card/90 p-1 text-xs shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShadingMode('anatomy')}
          className={cn(
            'rounded-lg px-2 py-1 font-medium transition',
            shadingMode === 'anatomy' ? 'bg-accent text-accent-contrast' : 'text-text-2 hover:bg-subtle',
          )}
        >
          Anatomy
        </button>
        <button
          type="button"
          onClick={() => setShadingMode('biometric')}
          className={cn(
            'rounded-lg px-2 py-1 font-medium transition',
            shadingMode === 'biometric' ? 'bg-accent text-accent-contrast' : 'text-text-2 hover:bg-subtle',
          )}
        >
          Biometric
        </button>
        <button
          type="button"
          onClick={() => setShadingMode('xray')}
          className={cn(
            'rounded-lg px-2 py-1 font-medium transition',
            shadingMode === 'xray' ? 'bg-accent text-accent-contrast' : 'text-text-2 hover:bg-subtle',
          )}
        >
          X-Ray
        </button>
      </div>

      {/* Hover Muscle Floating Chip */}
      {hoveredMuscle && !selectedMuscle && (
        <div className="pointer-events-none absolute bottom-14 left-3 rounded-lg border border-accent/40 bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <p className="text-xs font-bold text-accent">{hoveredMuscle.name}</p>
          <p className="text-[11px] italic text-text-2">{hoveredMuscle.latinName}</p>
        </div>
      )}

      {/* Selected Muscle Detail Modal / Popover */}
      {selectedMuscle && (
        <div className="absolute bottom-3 right-3 max-w-sm rounded-xl border border-card-outline bg-card/95 p-4 shadow-xl backdrop-blur-md transition-all">
          <div className="flex items-start justify-between gap-2 border-b border-card-outline pb-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-text-1">{selectedMuscle.name}</h4>
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent uppercase">
                  {selectedMuscle.group}
                </span>
              </div>
              <p className="text-xs italic text-text-2">{selectedMuscle.latinName}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMuscle(null)}
              className="rounded-lg p-1 text-text-2 hover:bg-subtle hover:text-text-1"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-2.5 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-text-1">Physiological Action:</span>
              <p className="mt-0.5 text-text-2">{selectedMuscle.function}</p>
            </div>
            <div className="rounded-lg bg-subtle p-2">
              <span className="flex items-center gap-1 font-semibold text-accent">
                <Activity size={12} /> Pain & Clinical Correlate:
              </span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-text-1">
                {selectedMuscle.clinicalSignificance}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Sensor Marker Info */}
      {activeSensor && (
        <div className="absolute bottom-3 right-3 max-w-xs rounded-xl border border-card-outline bg-card/95 p-3.5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-card-outline pb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: sensorStatusColors[activeSensor.id] || activeSensor.color }}
              />
              <span className="text-xs font-bold text-text-1">{activeSensor.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSensor(null)}
              className="rounded p-0.5 text-text-2 hover:bg-subtle"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-2 text-xs text-text-2">
            Sensor telemetry node active on 3D anatomical surface. Signals correlate with autonomic nociceptive responses.
          </p>
        </div>
      )}
    </div>
  );
}
