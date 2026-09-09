import * as THREE from 'three';

let cachedBallColorTexture = null;
let cachedBallBumpTexture = null;
let cachedTurfTexture = null;

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fillStyle) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i += 1) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function drawAdidasBars(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.38);

  const barW = size * 0.22;
  const gap = size * 0.14;

  const bars = [
    { height: size * 0.52, offset: -barW - gap },
    { height: size * 0.82, offset: 0 },
    { height: size * 1.15, offset: barW + gap },
  ];

  ctx.fillStyle = '#ffffff';
  bars.forEach((b) => {
    ctx.beginPath();
    ctx.roundRect(b.offset - barW / 2, -b.height / 2, barW, b.height, 4);
    ctx.fill();
  });

  ctx.restore();
}

function drawFifa26Emblem(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, size * 0.7);
  aura.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  aura.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = `900 ${Math.round(size * 0.65)}px "Montserrat", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('26', 0, -size * 0.12);

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, -size * 0.38, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.14, -size * 0.28);
  ctx.quadraticCurveTo(0, -size * 0.1, size * 0.14, -size * 0.28);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-size * 0.12, -size * 0.04, size * 0.24, size * 0.08);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(size * 0.2)}px "Montserrat", sans-serif`;
  ctx.fillText('FIFA', 0, size * 0.22);

  drawStar(ctx, -size * 0.42, -size * 0.32, 5, size * 0.08, size * 0.035, '#ffffff');
  drawStar(ctx, size * 0.42, -size * 0.32, 5, size * 0.08, size * 0.035, '#ffffff');
  drawStar(ctx, -size * 0.36, size * 0.1, 5, size * 0.06, size * 0.028, '#ffffff');
  drawStar(ctx, size * 0.36, size * 0.1, 5, size * 0.06, size * 0.028, '#ffffff');

  ctx.restore();
}

function drawTriondaBadge(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 24);
  const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  grad.addColorStop(0, '#047857');
  grad.addColorStop(0.4, '#10b981');
  grad.addColorStop(0.7, '#059669');
  grad.addColorStop(1, '#064e3b');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.5;
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-width * 0.45, i * 16);
    ctx.bezierCurveTo(
      -width * 0.15,
      i * 16 + 18,
      width * 0.15,
      i * 16 - 18,
      width * 0.45,
      i * 16,
    );
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(height * 0.28)}px "Montserrat", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 6;
  ctx.fillText('TRIONDA', 0, -height * 0.18);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f59e0b';
  ctx.font = `800 ${Math.round(height * 0.1)}px "Montserrat", sans-serif`;
  ctx.fillText('PRO', width * 0.36, -height * 0.24);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-width * 0.38, -height * 0.02);
  ctx.lineTo(width * 0.38, -height * 0.02);
  ctx.stroke();

  drawStar(ctx, -width * 0.32, 0.08 * height, 5, 6, 2.5, '#ffffff');
  drawStar(ctx, width * 0.32, 0.08 * height, 5, 6, 2.5, '#ffffff');

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(height * 0.11)}px "Montserrat", sans-serif`;
  ctx.fillText('BALÓN OFICIAL DEL PARTIDO', 0, height * 0.1);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `600 ${Math.round(height * 0.09)}px "Montserrat", sans-serif`;
  ctx.fillText('OFFICIAL MATCH BALL · 2026', 0, height * 0.28);

  ctx.restore();
}

function drawScarletPanel(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(-width * 0.45, height * 0.35);
  ctx.quadraticCurveTo(-width * 0.4, -height * 0.45, 0, -height * 0.45);
  ctx.quadraticCurveTo(width * 0.4, -height * 0.45, width * 0.45, height * 0.35);
  ctx.quadraticCurveTo(0, height * 0.52, -width * 0.45, height * 0.35);
  ctx.closePath();

  const redGrad = ctx.createLinearGradient(0, -height * 0.45, 0, height * 0.45);
  redGrad.addColorStop(0, '#ef4444');
  redGrad.addColorStop(0.5, '#dc2626');
  redGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = redGrad;
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 3;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-width * 0.35, i * 18);
    ctx.lineTo(width * 0.35, i * 18);
    ctx.stroke();
  }

  drawAdidasBars(ctx, 0, 0, width * 0.38);

  ctx.restore();
}

export function getTriondaBallTexture() {
  if (cachedBallColorTexture) return cachedBallColorTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const sheen = ctx.createLinearGradient(0, 0, 0, height);
  sheen.addColorStop(0, '#f1f5f9');
  sheen.addColorStop(0.5, '#ffffff');
  sheen.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.025)';
  for (let y = 8; y < height; y += 14) {
    const shift = (y / 14) % 2 === 0 ? 0 : 7;
    for (let x = shift; x < width; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const drawRibbon = (color, strokeW, pathFn) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pathFn();
    ctx.stroke();
    ctx.restore();
  };

  drawRibbon('#059669', 24, () => {
    ctx.moveTo(0, 520);
    ctx.bezierCurveTo(400, 420, 700, 680, 1100, 560);
    ctx.bezierCurveTo(1500, 440, 1800, 640, 2048, 520);
  });
  drawRibbon('#10b981', 10, () => {
    ctx.moveTo(0, 520);
    ctx.bezierCurveTo(400, 420, 700, 680, 1100, 560);
    ctx.bezierCurveTo(1500, 440, 1800, 640, 2048, 520);
  });

  drawRibbon('#dc2626', 22, () => {
    ctx.moveTo(0, 340);
    ctx.bezierCurveTo(350, 220, 850, 420, 1200, 300);
    ctx.bezierCurveTo(1550, 180, 1850, 400, 2048, 340);
  });
  drawRibbon('#f59e0b', 6, () => {
    ctx.moveTo(0, 340);
    ctx.bezierCurveTo(350, 220, 850, 420, 1200, 300);
    ctx.bezierCurveTo(1550, 180, 1850, 400, 2048, 340);
  });

  drawRibbon('#1d4ed8', 22, () => {
    ctx.moveTo(0, 680);
    ctx.bezierCurveTo(450, 780, 850, 600, 1300, 720);
    ctx.bezierCurveTo(1700, 820, 1900, 640, 2048, 680);
  });
  drawRibbon('#38bdf8', 6, () => {
    ctx.moveTo(0, 680);
    ctx.bezierCurveTo(450, 780, 850, 600, 1300, 720);
    ctx.bezierCurveTo(1700, 820, 1900, 640, 2048, 680);
  });

  drawTriondaBadge(ctx, 580, 520, 360, 210);
  drawScarletPanel(ctx, 1540, 490, 330, 230);

  ctx.save();
  ctx.beginPath();
  ctx.arc(1060, 370, 160, 0, Math.PI * 2);
  const blueGrad = ctx.createRadialGradient(1060, 370, 20, 1060, 370, 160);
  blueGrad.addColorStop(0, '#2563eb');
  blueGrad.addColorStop(0.7, '#1d4ed8');
  blueGrad.addColorStop(1, '#172554');
  ctx.fillStyle = blueGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  drawFifa26Emblem(ctx, 1060, 370, 180);
  ctx.restore();

  drawScarletPanel(ctx, 320, 210, 220, 150);
  drawTriondaBadge(ctx, 1780, 220, 240, 140);
  ctx.save();
  ctx.beginPath();
  ctx.arc(380, 790, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#1d4ed8';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  drawFifa26Emblem(ctx, 380, 790, 120);
  ctx.restore();

  const seamPaths = [
    () => {
      ctx.moveTo(120, 0);
      ctx.bezierCurveTo(240, 300, 220, 700, 120, 1024);
    },
    () => {
      ctx.moveTo(820, 0);
      ctx.bezierCurveTo(920, 350, 880, 680, 820, 1024);
    },
    () => {
      ctx.moveTo(1340, 0);
      ctx.bezierCurveTo(1440, 320, 1380, 720, 1340, 1024);
    },
    () => {
      ctx.moveTo(1880, 0);
      ctx.bezierCurveTo(1960, 320, 1920, 720, 1880, 1024);
    },
    () => {
      ctx.moveTo(0, 310);
      ctx.bezierCurveTo(450, 260, 750, 390, 1200, 290);
      ctx.bezierCurveTo(1650, 200, 1900, 360, 2048, 310);
    },
    () => {
      ctx.moveTo(0, 710);
      ctx.bezierCurveTo(450, 640, 850, 780, 1300, 670);
      ctx.bezierCurveTo(1750, 590, 1950, 730, 2048, 710);
    },
  ];

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  seamPaths.forEach((fn) => {
    ctx.beginPath();
    fn();
    ctx.stroke();
  });

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  seamPaths.forEach((fn) => {
    ctx.beginPath();
    fn();
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.5;
  seamPaths.forEach((fn) => {
    ctx.save();
    ctx.translate(1, -1);
    ctx.beginPath();
    fn();
    ctx.stroke();
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  cachedBallColorTexture = texture;
  return texture;
}

export function getTriondaBallBumpTexture() {
  if (cachedBallBumpTexture) return cachedBallBumpTexture;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#656565';
  for (let y = 4; y < height; y += 8) {
    const shift = (y / 8) % 2 === 0 ? 0 : 4;
    for (let x = shift; x < width; x += 8) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const scale = 0.5;
  ctx.strokeStyle = '#202020';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  const seams = [
    () => {
      ctx.moveTo(120 * scale, 0);
      ctx.bezierCurveTo(240 * scale, 300 * scale, 220 * scale, 700 * scale, 120 * scale, 1024 * scale);
    },
    () => {
      ctx.moveTo(820 * scale, 0);
      ctx.bezierCurveTo(920 * scale, 350 * scale, 880 * scale, 680 * scale, 820 * scale, 1024 * scale);
    },
    () => {
      ctx.moveTo(1340 * scale, 0);
      ctx.bezierCurveTo(1440 * scale, 320 * scale, 1380 * scale, 720 * scale, 1340 * scale, 1024 * scale);
    },
    () => {
      ctx.moveTo(1880 * scale, 0);
      ctx.bezierCurveTo(1960 * scale, 320 * scale, 1920 * scale, 720 * scale, 1880 * scale, 1024 * scale);
    },
    () => {
      ctx.moveTo(0, 310 * scale);
      ctx.bezierCurveTo(450 * scale, 260 * scale, 750 * scale, 390 * scale, 1200 * scale, 290 * scale);
      ctx.bezierCurveTo(1650 * scale, 200 * scale, 1900 * scale, 360 * scale, 2048 * scale, 310 * scale);
    },
    () => {
      ctx.moveTo(0, 710 * scale);
      ctx.bezierCurveTo(450 * scale, 640 * scale, 850 * scale, 780 * scale, 1300 * scale, 670 * scale);
      ctx.bezierCurveTo(1750 * scale, 590 * scale, 1950 * scale, 730 * scale, 2048 * scale, 710 * scale);
    },
  ];

  seams.forEach((fn) => {
    ctx.beginPath();
    fn();
    ctx.stroke();
  });

  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = 1.5;
  seams.forEach((fn) => {
    ctx.save();
    ctx.translate(1, -1);
    ctx.beginPath();
    fn();
    ctx.stroke();
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  cachedBallBumpTexture = texture;
  return texture;
}

export function getStadiumTurfTexture() {
  if (cachedTurfTexture) return cachedTurfTexture;

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const turfGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.5);
  turfGrad.addColorStop(0, '#134e2c');
  turfGrad.addColorStop(0.5, '#0a321c');
  turfGrad.addColorStop(0.85, '#062012');
  turfGrad.addColorStop(1, '#020d07');
  ctx.fillStyle = turfGrad;
  ctx.fillRect(0, 0, size, size);

  for (let r = 50; r < size * 0.5; r += 48) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.strokeStyle = (r / 48) % 2 === 0 ? 'rgba(34, 197, 94, 0.07)' : 'rgba(4, 47, 26, 0.12)';
    ctx.lineWidth = 44;
    ctx.stroke();
  }

  const colors = [
    '#166534',
    '#15803d',
    '#16a34a',
    '#052e16',
    '#047857',
    '#22c55e',
    '#0f3e24',
  ];

  for (let i = 0; i < 38000; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (size * 0.48);
    const x = size / 2 + Math.cos(angle) * dist;
    const y = size / 2 + Math.sin(angle) * dist;
    const len = 3 + Math.random() * 6;
    const bladeAngle = angle + (Math.random() - 0.5) * 1.2;

    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.lineWidth = 0.8 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(bladeAngle) * len, y + Math.sin(bladeAngle) * len);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 12;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cachedTurfTexture = texture;
  return texture;
}
