import { createLumiCanvas } from './mascotArt';
import { createLogoCanvas } from './uiArt';

/** Ícone da app (quadrado, sem transparência): fundo mágico roxo com a Lumi. */
export function createAppIconCanvas(size = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const bg = ctx.createRadialGradient(size * 0.5, size * 0.4, size * 0.05, size * 0.5, size * 0.55, size * 0.75);
  bg.addColorStop(0, '#c8a6ff');
  bg.addColorStop(0.5, '#7b3fe4');
  bg.addColorStop(1, '#3a1680');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  // Raios de luz.
  ctx.save();
  ctx.translate(size / 2, size * 0.55);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.08, -size);
    ctx.lineTo(size * 0.08, -size);
    ctx.fill();
  }
  ctx.restore();
  const lumi = createLumiCanvas(Math.round(size * 0.86), 'happy');
  ctx.drawImage(lumi, size * 0.07, size * 0.08);
  // Estrelinhas.
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of [[0.16, 0.2, 0.025], [0.84, 0.26, 0.02], [0.8, 0.8, 0.03], [0.2, 0.82, 0.018]] as const) {
    ctx.beginPath();
    ctx.moveTo(size * x, size * (y - r * 2));
    ctx.quadraticCurveTo(size * x, size * y, size * (x + r * 2), size * y);
    ctx.quadraticCurveTo(size * x, size * y, size * x, size * (y + r * 2));
    ctx.quadraticCurveTo(size * x, size * y, size * (x - r * 2), size * y);
    ctx.quadraticCurveTo(size * x, size * y, size * x, size * (y - r * 2));
    ctx.fill();
  }
  return canvas;
}

/** Ecrã de arranque nativo (quadrado grande; o sistema recorta ao centro). */
export function createSplashCanvas(size = 2732): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const bg = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.7);
  bg.addColorStop(0, '#8f5cf0');
  bg.addColorStop(1, '#3a1680');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const logo = createLogoCanvas();
  const lw = size * 0.42;
  ctx.drawImage(logo, size / 2 - lw / 2, size * 0.28, lw, (lw * logo.height) / logo.width);
  const lumi = createLumiCanvas(Math.round(size * 0.22), 'happy');
  ctx.drawImage(lumi, size / 2 - lumi.width / 2, size * 0.5);
  return canvas;
}
