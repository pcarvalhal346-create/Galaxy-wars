import { ELEMENTS } from '../game/core/types';
import type { LevelTheme } from '../game/levels/types';
import { createCrystalCanvas } from './crystalArt';

/**
 * Cenários originais desenhados em Canvas: céu, auroras, montanhas, colinas e cristais.
 * Determinísticos (gerador pseudo-aleatório fixo) para serem sempre iguais.
 */

interface Palette {
  skyTop: string;
  skyBottom: string;
  glow: string;
  aurora: [string, string, string];
  farMountain: string;
  nearMountain: string;
  hillLight: string;
  hillDark: string;
}

const PALETTES: Record<LevelTheme | 'title', Palette> = {
  title: {
    skyTop: '#5fb8ff', skyBottom: '#d9f1ff', glow: 'rgba(255, 244, 200, 0.9)',
    aurora: ['rgba(255,120,200,0.35)', 'rgba(140,120,255,0.3)', 'rgba(80,220,255,0.3)'],
    farMountain: '#9b8cf0', nearMountain: '#7a6ae0', hillLight: '#8be06a', hillDark: '#3fae4f',
  },
  meadow: {
    skyTop: '#6cc2ff', skyBottom: '#e2f5ff', glow: 'rgba(255, 246, 210, 0.9)',
    aurora: ['rgba(255,150,210,0.32)', 'rgba(160,140,255,0.28)', 'rgba(110,230,255,0.28)'],
    farMountain: '#a69af2', nearMountain: '#8576e4', hillLight: '#93e46f', hillDark: '#46b456',
  },
  lagoon: {
    skyTop: '#47c6ff', skyBottom: '#dafcff', glow: 'rgba(230, 255, 255, 0.9)',
    aurora: ['rgba(90,255,230,0.3)', 'rgba(90,170,255,0.3)', 'rgba(200,160,255,0.28)'],
    farMountain: '#7fb4f0', nearMountain: '#4f8fe0', hillLight: '#5fe0c8', hillDark: '#1fa59c',
  },
  volcano: {
    skyTop: '#ff8a5c', skyBottom: '#ffe1b0', glow: 'rgba(255, 220, 150, 0.95)',
    aurora: ['rgba(255,90,90,0.3)', 'rgba(255,190,80,0.32)', 'rgba(255,120,200,0.25)'],
    farMountain: '#c06a8a', nearMountain: '#9a4566', hillLight: '#f0a14a', hillDark: '#c4632a',
  },
  storm: {
    skyTop: '#5b4ad0', skyBottom: '#c8b8ff', glow: 'rgba(255, 245, 160, 0.85)',
    aurora: ['rgba(255,230,80,0.3)', 'rgba(150,110,255,0.35)', 'rgba(90,220,255,0.28)'],
    farMountain: '#6d5fd0', nearMountain: '#4b3fa8', hillLight: '#8f7ef0', hillDark: '#5e4fc8',
  },
};

const seeded = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

function ctx2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [canvas, ctx];
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha = 0.95): void {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  const blobs: [number, number, number][] = [[0, 0, 1], [0.9, -0.25, 0.8], [1.7, 0.05, 0.7], [-0.8, 0.1, 0.65], [0.5, 0.25, 0.75]];
  ctx.beginPath();
  for (const [dx, dy, r] of blobs) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
}

function ridge(ctx: CanvasRenderingContext2D, w: number, baseY: number, amp: number, peaks: number, color: string, rnd: () => number, snow = false): void {
  const pts: [number, number][] = [];
  for (let i = 0; i <= peaks * 2; i++) {
    const x = (w * i) / (peaks * 2);
    const y = baseY - (i % 2 === 1 ? amp * (0.6 + rnd() * 0.5) : amp * rnd() * 0.25);
    pts.push([x, y]);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY + amp);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(w, baseY + amp * 3);
  ctx.lineTo(0, baseY + amp * 3);
  ctx.fill();
  if (snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 1; i < pts.length - 1; i += 2) {
      const [x, y] = pts[i] as [number, number];
      const [px, py] = pts[i - 1] as [number, number];
      const [nx, ny] = pts[i + 1] as [number, number];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (px - x) * 0.22, y + (py - y) * 0.22);
      ctx.lineTo(x + (nx - x) * 0.05, y + (ny - y) * 0.12);
      ctx.lineTo(x + (nx - x) * 0.22, y + (ny - y) * 0.22);
      ctx.fill();
    }
  }
}

function hill(ctx: CanvasRenderingContext2D, w: number, h: number, y: number, bulge: number, light: string, dark: string, phase: number): void {
  const g = ctx.createLinearGradient(0, y - bulge, 0, h);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, y + Math.sin(phase) * bulge);
  for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, y - Math.sin((x / w) * Math.PI * 1.2 + phase) * bulge);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function aurora(ctx: CanvasRenderingContext2D, w: number, h: number, colors: [string, string, string]): void {
  colors.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = h * (0.035 - i * 0.006);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const y0 = h * (0.16 + i * 0.045);
    ctx.moveTo(-w * 0.1, y0 + h * 0.1);
    ctx.bezierCurveTo(w * 0.25, y0 - h * 0.08, w * 0.6, y0 + h * 0.1, w * 1.1, y0 - h * 0.04);
    ctx.stroke();
  });
}

function sparkles(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, rnd: () => number, maxY = 1): void {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h * maxY;
    const r = 1 + rnd() * 2.2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.4);
    ctx.lineTo(x + r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 2.4, y);
    ctx.lineTo(x + r * 0.6, y + r * 0.6);
    ctx.lineTo(x, y + r * 2.4);
    ctx.lineTo(x - r * 0.6, y + r * 0.6);
    ctx.lineTo(x - r * 2.4, y);
    ctx.lineTo(x - r * 0.6, y - r * 0.6);
    ctx.fill();
  }
}

/** Cristais elementais espetados nas colinas (decoração). */
function crystalCluster(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rnd: () => number): void {
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const e = ELEMENTS[Math.floor(rnd() * ELEMENTS.length)] ?? 'water';
    const c = createCrystalCanvas(e, 96);
    const s = size * (0.55 + rnd() * 0.5);
    ctx.save();
    ctx.translate(x + (i - n / 2) * size * 0.45, y - s * 0.3);
    ctx.rotate((rnd() - 0.5) * 0.5);
    ctx.drawImage(c, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

/** Fundo de jogo/título por tema (proporção 9:16; esticado em "cover"). */
export function createLandscapeCanvas(theme: LevelTheme | 'title', w = 720, h = 1280): HTMLCanvasElement {
  const p = PALETTES[theme];
  const [canvas, ctx] = ctx2d(w, h);
  const rnd = seeded(theme.length * 7919 + 17);

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.72, h * 0.14, 0, w * 0.72, h * 0.14, w * 0.5);
  sun.addColorStop(0, p.glow);
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  aurora(ctx, w, h, p.aurora);
  sparkles(ctx, w, h, 40, rnd, 0.45);
  cloud(ctx, w * 0.15, h * 0.1, w * 0.06);
  cloud(ctx, w * 0.82, h * 0.27, w * 0.05, 0.85);
  cloud(ctx, w * 0.45, h * 0.36, w * 0.04, 0.7);

  ridge(ctx, w, h * 0.5, h * 0.12, 4, p.farMountain, rnd, true);
  ridge(ctx, w, h * 0.58, h * 0.09, 5, p.nearMountain, rnd);
  if (theme === 'volcano') {
    const lava = ctx.createRadialGradient(w * 0.5, h * 0.47, 0, w * 0.5, h * 0.47, w * 0.25);
    lava.addColorStop(0, 'rgba(255,200,80,0.8)');
    lava.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = lava;
    ctx.fillRect(0, 0, w, h);
  }
  if (theme === 'lagoon') {
    const water = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.75);
    water.addColorStop(0, '#7fe6ff');
    water.addColorStop(1, '#2fa6e8');
    ctx.fillStyle = water;
    ctx.fillRect(0, h * 0.62, w, h * 0.14);
  }
  hill(ctx, w, h, h * 0.68, h * 0.04, p.hillLight, p.hillDark, 0.4);
  hill(ctx, w, h, h * 0.78, h * 0.05, p.hillLight, p.hillDark, 2.1);
  // Flores luminosas nas colinas (decoração que não se confunde com as peças do jogo).
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = h * (0.72 + rnd() * 0.26);
    const r = w * (0.006 + rnd() * 0.008);
    ctx.fillStyle = ['rgba(255,255,255,0.85)', 'rgba(255,220,120,0.85)', 'rgba(255,160,220,0.85)'][i % 3] as string;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  sparkles(ctx, w, h, 30, rnd);
  return canvas;
}

/** Fundo comprido do mapa de níveis (rolagem vertical). */
export function createMapCanvas(w: number, h: number): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(w, h);
  const rnd = seeded(4242);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5b4ad0'); // topo: céu de tempestade (mundos futuros)
  g.addColorStop(0.35, '#b9a6ff');
  g.addColorStop(0.7, '#ffc8ea');
  g.addColorStop(1, '#ffe9c8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  sparkles(ctx, w, h, Math.round(h / 25), rnd);
  for (let y = h * 0.04; y < h; y += w * 0.55) {
    cloud(ctx, rnd() * w * 0.3, y + rnd() * 80, w * 0.05, 0.8);
    cloud(ctx, w * 0.7 + rnd() * w * 0.3, y + w * 0.3, w * 0.045, 0.75);
  }
  // Ilhas flutuantes laterais com cristais.
  for (let y = h * 0.1; y < h; y += w * 0.42) {
    const left = rnd() < 0.5;
    const x = left ? w * (0.08 + rnd() * 0.1) : w * (0.82 + rnd() * 0.1);
    const iw = w * 0.16;
    ctx.fillStyle = '#7ad46a';
    ctx.beginPath();
    ctx.ellipse(x, y, iw, iw * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a6a4a';
    ctx.beginPath();
    ctx.moveTo(x - iw, y);
    ctx.quadraticCurveTo(x, y + iw * 1.1, x + iw, y);
    ctx.fill();
    crystalCluster(ctx, x, y, w * 0.08, rnd);
  }
  return canvas;
}
