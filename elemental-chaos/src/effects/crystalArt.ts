import { ELEMENT_STYLE, type ElementStyle } from '../config/theme';
import type { ElementType } from '../game/core/types';
import { mix, rgba } from '../utils/color';

/**
 * Arte temporária dos cristais, desenhada em Canvas 2D (gradientes, facetas, brilho).
 * Cada elemento tem silhueta e símbolo próprios para ser reconhecível sem depender da cor.
 * Para trocar por sprites finais basta carregar texturas com as mesmas chaves.
 */
export const TILE_TEXTURE_SIZE = 168;

type Path = (ctx: CanvasRenderingContext2D, s: number) => void;

/** Silhuetas (coordenadas num quadrado de lado s, com margem para sombra). */
const SHAPES: Record<ElementType, Path> = {
  // Chama: base redonda, ponta superior curva.
  fire: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c + s * 0.02, s * 0.1);
    ctx.bezierCurveTo(c + s * 0.3, s * 0.3, c + s * 0.38, s * 0.48, c + s * 0.34, s * 0.62);
    ctx.bezierCurveTo(c + s * 0.3, s * 0.82, c + s * 0.12, s * 0.88, c, s * 0.88);
    ctx.bezierCurveTo(c - s * 0.12, s * 0.88, c - s * 0.3, s * 0.82, c - s * 0.34, s * 0.62);
    ctx.bezierCurveTo(c - s * 0.37, s * 0.46, c - s * 0.24, s * 0.36, c - s * 0.16, s * 0.24);
    ctx.bezierCurveTo(c - s * 0.12, s * 0.34, c - s * 0.08, s * 0.38, c - s * 0.04, s * 0.38);
    ctx.bezierCurveTo(c - s * 0.06, s * 0.26, c - s * 0.04, s * 0.17, c + s * 0.02, s * 0.1);
    ctx.closePath();
  },
  // Água: orbe.
  water: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.37, 0, Math.PI * 2);
    ctx.closePath();
  },
  // Raio: losango.
  lightning: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c, s * 0.08);
    ctx.lineTo(s * 0.88, c);
    ctx.lineTo(c, s * 0.92);
    ctx.lineTo(s * 0.12, c);
    ctx.closePath();
  },
  // Terra: hexágono.
  earth: (ctx, s) => {
    const c = s / 2;
    const r = s * 0.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
  // Ar: quadrado de cantos muito arredondados, rodado 45° visualmente em forma de "almofada".
  air: (ctx, s) => {
    const m = s * 0.15;
    const w = s - m * 2;
    const r = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(m + r, m);
    ctx.lineTo(m + w - r, m);
    ctx.quadraticCurveTo(m + w, m, m + w, m + r);
    ctx.lineTo(m + w, m + w - r);
    ctx.quadraticCurveTo(m + w, m + w, m + w - r, m + w);
    ctx.lineTo(m + r, m + w);
    ctx.quadraticCurveTo(m, m + w, m, m + w - r);
    ctx.lineTo(m, m + r);
    ctx.quadraticCurveTo(m, m, m + r, m);
    ctx.closePath();
  },
};

/** Símbolos interiores (traço branco). */
const SYMBOLS: Record<ElementType, Path> = {
  fire: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c, s * 0.44);
    ctx.bezierCurveTo(c + s * 0.12, s * 0.56, c + s * 0.1, s * 0.74, c, s * 0.75);
    ctx.bezierCurveTo(c - s * 0.1, s * 0.74, c - s * 0.12, s * 0.6, c - s * 0.03, s * 0.55);
    ctx.bezierCurveTo(c - s * 0.02, s * 0.6, c + s * 0.02, s * 0.62, c + s * 0.03, s * 0.6);
    ctx.bezierCurveTo(c + s * 0.04, s * 0.54, c + s * 0.02, s * 0.49, c, s * 0.44);
    ctx.closePath();
    ctx.fill();
  },
  water: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c, s * 0.3);
    ctx.bezierCurveTo(c + s * 0.05, s * 0.4, c + s * 0.14, s * 0.5, c + s * 0.14, s * 0.58);
    ctx.arc(c, s * 0.58, s * 0.14, 0, Math.PI);
    ctx.bezierCurveTo(c - s * 0.14, s * 0.5, c - s * 0.05, s * 0.4, c, s * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  lightning: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.55, s * 0.26);
    ctx.lineTo(s * 0.38, s * 0.53);
    ctx.lineTo(s * 0.5, s * 0.53);
    ctx.lineTo(s * 0.43, s * 0.75);
    ctx.lineTo(s * 0.63, s * 0.46);
    ctx.lineTo(s * 0.51, s * 0.46);
    ctx.lineTo(s * 0.58, s * 0.26);
    ctx.closePath();
    ctx.fill();
  },
  earth: (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c - s * 0.13, s * 0.66);
    ctx.bezierCurveTo(c - s * 0.16, s * 0.42, c + s * 0.04, s * 0.3, c + s * 0.16, s * 0.32);
    ctx.bezierCurveTo(c + s * 0.18, s * 0.5, c + s * 0.02, s * 0.66, c - s * 0.13, s * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.moveTo(c - s * 0.15, s * 0.7);
    ctx.quadraticCurveTo(c - s * 0.02, s * 0.52, c + s * 0.12, s * 0.37);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  },
  // Três rajadas de vento, duas com remate em espiral.
  air: (ctx, s) => {
    ctx.lineWidth = s * 0.042;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.27, s * 0.42);
    ctx.lineTo(s * 0.6, s * 0.42);
    ctx.arc(s * 0.6, s * 0.35, s * 0.07, Math.PI / 2, -Math.PI * 0.95, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.53);
    ctx.lineTo(s * 0.72, s * 0.53);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.32, s * 0.64);
    ctx.lineTo(s * 0.55, s * 0.64);
    ctx.arc(s * 0.55, s * 0.71, s * 0.07, -Math.PI / 2, Math.PI * 0.95, false);
    ctx.stroke();
  },
};

function drawCrystal(ctx: CanvasRenderingContext2D, element: ElementType, s: number): void {
  const style: ElementStyle = ELEMENT_STYLE[element];
  const shape = SHAPES[element];

  // 1) Sombra suave por baixo (dá profundidade 2.5D).
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = s * 0.07;
  ctx.shadowOffsetY = s * 0.04;
  shape(ctx, s);
  ctx.fillStyle = rgba(style.dark);
  ctx.fill();
  ctx.restore();

  // 2) Corpo com gradiente radial (luz no canto superior esquerdo).
  ctx.save();
  shape(ctx, s);
  ctx.clip();
  const body = ctx.createRadialGradient(s * 0.36, s * 0.3, s * 0.04, s * 0.5, s * 0.55, s * 0.55);
  body.addColorStop(0, rgba(style.light));
  body.addColorStop(0.45, rgba(style.base));
  body.addColorStop(1, rgba(style.dark));
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, s, s);

  // 3) Facetas: triângulos translúcidos a partir do centro, mais claros em cima.
  const c = s / 2;
  const facets = 8;
  for (let i = 0; i < facets; i++) {
    const a0 = (Math.PI * 2 * i) / facets - Math.PI / 2;
    const a1 = (Math.PI * 2 * (i + 1)) / facets - Math.PI / 2;
    const mid = (a0 + a1) / 2;
    const lightness = (Math.cos(mid + Math.PI * 0.75) + 1) / 2; // 1 = virado para a luz
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a0) * s, c + Math.sin(a0) * s);
    ctx.lineTo(c + Math.cos(a1) * s, c + Math.sin(a1) * s);
    ctx.closePath();
    ctx.fillStyle = lightness > 0.5 ? rgba(0xffffff, 0.16 * lightness) : rgba(0x000000, 0.16 * (1 - lightness));
    ctx.fill();
  }

  // 4) Núcleo luminoso interno (translucidez).
  const core = ctx.createRadialGradient(c, c * 1.05, 0, c, c * 1.05, s * 0.3);
  core.addColorStop(0, rgba(mix(style.light, 0xffffff, 0.4), 0.55));
  core.addColorStop(1, rgba(style.light, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();

  // 5) Contornos: aro claro exterior e linha escura interior.
  ctx.save();
  shape(ctx, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = rgba(mix(style.dark, 0x000000, 0.35), 0.9);
  ctx.stroke();
  ctx.lineWidth = s * 0.016;
  ctx.strokeStyle = rgba(style.light, 0.85);
  ctx.stroke();
  ctx.restore();

  // 6) Símbolo com brilho.
  ctx.save();
  ctx.shadowColor = rgba(style.light, 0.9);
  ctx.shadowBlur = s * 0.05;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.93)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.93)';
  SYMBOLS[element](ctx, s);
  ctx.restore();

  // 7) Reflexo especular.
  ctx.save();
  shape(ctx, s);
  ctx.clip();
  const spec = ctx.createRadialGradient(s * 0.36, s * 0.27, 0, s * 0.36, s * 0.27, s * 0.17);
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.ellipse(s * 0.36, s * 0.27, s * 0.17, s * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createCrystalCanvas(element: ElementType, size = TILE_TEXTURE_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  drawCrystal(ctx, element, size);
  return canvas;
}

/** Partícula suave e circular (branca; colorida por tint). */
export function createSparkCanvas(size = 48): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Anel de seleção luminoso. */
export function createRingCanvas(size = TILE_TEXTURE_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  const c = size / 2;
  ctx.shadowColor = 'rgba(255, 236, 160, 1)';
  ctx.shadowBlur = size * 0.08;
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = 'rgba(255, 246, 210, 0.95)';
  ctx.beginPath();
  ctx.arc(c, c, size * 0.43, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}

/** Fundo de nebulosa com estrelas; desenhado uma vez e esticado (é suave por natureza). */
export function createBackgroundCanvas(w = 540, h = 960): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#0b0f2a');
  base.addColorStop(0.55, '#140c30');
  base.addColorStop(1, '#22103a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const blobs: [number, number, number, string][] = [
    [0.15, 0.18, 0.5, 'rgba(255, 110, 60, 0.18)'],
    [0.85, 0.3, 0.55, 'rgba(40, 170, 255, 0.16)'],
    [0.3, 0.78, 0.6, 'rgba(140, 80, 255, 0.2)'],
    [0.9, 0.9, 0.45, 'rgba(40, 220, 160, 0.12)'],
  ];
  for (const [x, y, r, color] of blobs) {
    const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Estrelas com posições fixas (gerador simples e determinístico).
  let seed = 1337;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    const r = rand() * 1.3 + 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + rand() * 0.6})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
