import * as THREE from 'three';

/**
 * Procedurally generates realistic striated muscle fiber textures with
 * tendon gradient transitions and normal map contours.
 */
export function createMuscleFiberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base muscle background: deep organic crimson/burgundy
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#751e22');
  bgGrad.addColorStop(0.3, '#94252a');
  bgGrad.addColorStop(0.7, '#882226');
  bgGrad.addColorStop(1, '#66191d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Longitudinal striated muscle fibers (fascicles)
  ctx.lineWidth = 1.2;
  for (let x = 0; x < 512; x += 3.5) {
    const fiberGrad = ctx.createLinearGradient(0, 0, 0, 512);
    const alpha = 0.25 + Math.random() * 0.45;
    const isBright = Math.random() > 0.6;
    const color = isBright ? `rgba(215, 80, 85, ${alpha})` : `rgba(75, 12, 16, ${alpha})`;
    fiberGrad.addColorStop(0, 'rgba(230, 220, 215, 0.4)'); // Tendon connection top
    fiberGrad.addColorStop(0.12, color);
    fiberGrad.addColorStop(0.88, color);
    fiberGrad.addColorStop(1, 'rgba(230, 220, 215, 0.4)'); // Tendon connection bottom

    ctx.strokeStyle = fiberGrad;
    ctx.beginPath();
    let currentX = x;
    ctx.moveTo(currentX, 0);
    for (let y = 10; y <= 512; y += 20) {
      currentX += (Math.random() - 0.5) * 2;
      ctx.lineTo(currentX, y);
    }
    ctx.stroke();
  }

  // Cross-striations (sarcomere bands)
  ctx.lineWidth = 0.8;
  for (let y = 0; y < 512; y += 6) {
    ctx.strokeStyle = `rgba(240, 160, 165, ${0.08 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // White glistening aponeurosis/fascia sheen
  const fasciaGrad = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
  fasciaGrad.addColorStop(0, 'rgba(255, 235, 235, 0.15)');
  fasciaGrad.addColorStop(0.7, 'rgba(255, 220, 220, 0.04)');
  fasciaGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = fasciaGrad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  return texture;
}

/**
 * Creates normal/bump map for striated muscle depth
 */
export function createMuscleBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 4) {
    const val = Math.floor(100 + Math.random() * 80);
    ctx.strokeStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 6);
  return texture;
}

/**
 * Medical biometric holographic texture (cyber clinical theme)
 */
export function createBiometricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Sleek dark carbon medical blue
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Micro grid lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Diagonal data telemetry dashes
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.5;
  for (let y = 20; y < 512; y += 48) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(120, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}
