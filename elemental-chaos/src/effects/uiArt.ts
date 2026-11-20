import { ELEMENTS } from '../game/core/types';
import { mix, rgba } from '../utils/color';
import { createCrystalCanvas } from './crystalArt';

/** Elementos de interface desenhados em Canvas (logótipo, botões, painéis, estrelas, nós). */

function ctx2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [canvas, ctx];
}

export const LOGO_FONT = '{size}px "Lilita One", "Arial Black", "Arial Rounded MT Bold", sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Texto do logótipo com gradiente dourado, contorno roxo grosso e brilho. */
function logoWord(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, from: string, to: string): void {
  ctx.font = LOGO_FONT.replace('{size}', String(size));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(40, 0, 80, 0.55)';
  ctx.shadowOffsetY = size * 0.08;
  ctx.shadowBlur = size * 0.08;
  ctx.lineWidth = size * 0.26;
  ctx.strokeStyle = '#3d0f6e';
  ctx.strokeText(text, cx, y);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = '#8a3dff';
  ctx.strokeText(text, cx, y);
  const g = ctx.createLinearGradient(0, y - size * 0.85, 0, y);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillText(text, cx, y);
  // Brilho superior.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, y - size * 0.8, ctx.canvas.width, size * 0.26);
  ctx.restore();
}

export function createLogoCanvas(w = 900, h = 520): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(w, h);
  // Coroa de cristais elementais por cima do nome.
  ELEMENTS.forEach((e, i) => {
    const a = Math.PI * (1.15 + (i / (ELEMENTS.length - 1)) * 0.7);
    const r = w * 0.3;
    const x = w / 2 + Math.cos(a) * r;
    const y = h * 0.42 + Math.sin(a) * r * 0.55;
    const s = w * (i === 2 ? 0.17 : 0.13);
    ctx.drawImage(createCrystalCanvas(e, 160), x - s / 2, y - s / 2, s, s);
  });
  // Texto desenhado numa camada própria (para o brilho "source-atop" não afetar os cristais).
  const [tc, t] = ctx2d(w, h);
  logoWord(t, 'ELEMENTAL', w / 2, h * 0.62, w * 0.13, '#fff6b0', '#ffb21f');
  logoWord(t, 'CHAOS', w / 2, h * 0.93, w * 0.21, '#ffe07a', '#ff5a1f');
  ctx.drawImage(tc, 0, 0);
  return canvas;
}

/** Botão em pílula brilhante. */
export function createPillCanvas(w: number, h: number, color: number): HTMLCanvasElement {
  const pad = h * 0.12;
  const [canvas, ctx] = ctx2d(w + pad * 2, h + pad * 2);
  const x = pad;
  const y = pad * 0.6;
  ctx.shadowColor = 'rgba(30, 0, 60, 0.45)';
  ctx.shadowOffsetY = h * 0.08;
  ctx.shadowBlur = h * 0.1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = rgba(mix(color, 0x000000, 0.45));
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(mix(color, 0xffffff, 0.35)));
  g.addColorStop(0.55, rgba(color));
  g.addColorStop(1, rgba(mix(color, 0x000000, 0.2)));
  roundRect(ctx, x + h * 0.04, y + h * 0.03, w - h * 0.08, h - h * 0.12, h / 2);
  ctx.fillStyle = g;
  ctx.fill();
  roundRect(ctx, x + h * 0.18, y + h * 0.1, w - h * 0.36, h * 0.32, h * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  roundRect(ctx, x + h * 0.02, y + h * 0.01, w - h * 0.04, h - h * 0.08, h / 2);
  ctx.lineWidth = h * 0.05;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.stroke();
  return canvas;
}

/** Painel arredondado com gradiente e moldura clara. */
export function createPanelCanvas(w: number, h: number, top: number, bottom: number, radius: number, border = 0xffffff): HTMLCanvasElement {
  const pad = Math.max(8, radius * 0.4);
  const [canvas, ctx] = ctx2d(w + pad * 2, h + pad * 2);
  ctx.shadowColor = 'rgba(30, 0, 60, 0.4)';
  ctx.shadowOffsetY = pad * 0.5;
  ctx.shadowBlur = pad;
  roundRect(ctx, pad, pad, w, h, radius);
  const g = ctx.createLinearGradient(0, pad, 0, pad + h);
  g.addColorStop(0, rgba(top));
  g.addColorStop(1, rgba(bottom));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(3, radius * 0.12);
  ctx.strokeStyle = rgba(border, 0.85);
  ctx.stroke();
  roundRect(ctx, pad + radius * 0.3, pad + radius * 0.18, w - radius * 0.6, Math.min(h * 0.3, radius * 1.2), radius * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  return canvas;
}

export function createStarCanvas(size: number, filled: boolean): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  const star = (r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.48;
      ctx.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr * 0.98);
    }
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  star(size * 0.44);
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = filled ? '#b55a00' : '#5b3a8a';
  ctx.stroke();
  const g = ctx.createRadialGradient(c * 0.8, c * 0.7, 0, c, c, size * 0.45);
  if (filled) {
    g.addColorStop(0, '#fff8c0');
    g.addColorStop(0.5, '#ffd23a');
    g.addColorStop(1, '#ff9a00');
  } else {
    g.addColorStop(0, '#a08ad0');
    g.addColorStop(1, '#6a52a8');
  }
  ctx.fillStyle = g;
  ctx.fill();
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(c * 0.82, c * 0.72, size * 0.1, size * 0.05, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Nó do mapa: círculo brilhante (aberto, concluído ou bloqueado). */
export function createNodeCanvas(size: number, kind: 'open' | 'done' | 'locked'): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  const colors = { open: [0xff6ab8, 0xd61f7a], done: [0xffd84a, 0xe07b00], locked: [0xb7a9d8, 0x7b6aa8] }[kind];
  ctx.shadowColor = 'rgba(40,0,70,0.45)';
  ctx.shadowOffsetY = size * 0.05;
  ctx.shadowBlur = size * 0.06;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(colors[1] as number, 0x000000, 0.35));
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const g = ctx.createRadialGradient(c * 0.8, c * 0.65, 0, c, c, size * 0.42);
  g.addColorStop(0, rgba(mix(colors[0] as number, 0xffffff, 0.4)));
  g.addColorStop(0.6, rgba(colors[0] as number));
  g.addColorStop(1, rgba(colors[1] as number));
  ctx.beginPath();
  ctx.arc(c, c - size * 0.015, size * 0.39, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(c, c - size * 0.2, size * 0.22, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

export function createLockCanvas(size: number): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#efe8ff';
  ctx.beginPath();
  ctx.arc(c, c * 0.8, size * 0.2, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#efe8ff';
  roundRect(ctx, c - size * 0.3, c * 0.8, size * 0.6, size * 0.45, size * 0.08);
  ctx.fill();
  ctx.fillStyle = '#7b6aa8';
  ctx.beginPath();
  ctx.arc(c, c * 1.15, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Ícone de objetivo "explosões de vapor". */
export function createSteamIconCanvas(size: number): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  const burst = ctx.createRadialGradient(c, c * 1.1, 0, c, c * 1.1, size * 0.45);
  burst.addColorStop(0, '#fff3a0');
  burst.addColorStop(0.5, '#ff8a2a');
  burst.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = burst;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#7a8aa8';
  ctx.lineWidth = size * 0.035;
  const puffs: [number, number, number][] = [[0.5, 0.42, 0.18], [0.32, 0.5, 0.14], [0.68, 0.5, 0.15], [0.5, 0.58, 0.16]];
  ctx.beginPath();
  for (const [x, y, r] of puffs) {
    ctx.moveTo(x * size + r * size, y * size);
    ctx.arc(x * size, y * size, r * size, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.fill();
  return canvas;
}

/** Ícone de objetivo "correntes elétricas". */
export function createLightningIconCanvas(size: number): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, size * 0.48);
  glow.addColorStop(0, 'rgba(255,250,180,0.95)');
  glow.addColorStop(1, 'rgba(160,90,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  const pts: [number, number][] = [[0.58, 0.08], [0.28, 0.54], [0.48, 0.54], [0.38, 0.92], [0.74, 0.42], [0.53, 0.42], [0.66, 0.08]];
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * size, y * size) : ctx.lineTo(x * size, y * size)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = '#6a2bd0';
  ctx.stroke();
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#fffbd0');
  g.addColorStop(1, '#ffc400');
  ctx.fillStyle = g;
  ctx.fill();
  return canvas;
}

export type IconKind = 'pause' | 'gear' | 'home' | 'close' | 'play' | 'book';

/** Botão redondo com ícone branco. */
export function createRoundIconCanvas(size: number, color: number, icon: IconKind): HTMLCanvasElement {
  const pill = createPillCanvas(size, size, color);
  const ctx = pill.getContext('2d') as CanvasRenderingContext2D;
  const pad = size * 0.12;
  const cx = pad + size / 2;
  const cy = pad * 0.6 + size * 0.46;
  const u = size * 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(40,0,80,0.5)';
  ctx.shadowOffsetY = u * 0.4;
  switch (icon) {
    case 'pause':
      roundRect(ctx, cx - u * 2, cy - u * 2.2, u * 1.4, u * 4.4, u * 0.5);
      ctx.fill();
      roundRect(ctx, cx + u * 0.6, cy - u * 2.2, u * 1.4, u * 4.4, u * 0.5);
      ctx.fill();
      break;
    case 'play':
      ctx.beginPath();
      ctx.moveTo(cx - u * 1.4, cy - u * 2.3);
      ctx.lineTo(cx + u * 2.3, cy);
      ctx.lineTo(cx - u * 1.4, cy + u * 2.3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'close':
      ctx.lineWidth = u * 1.1;
      ctx.beginPath();
      ctx.moveTo(cx - u * 1.7, cy - u * 1.7);
      ctx.lineTo(cx + u * 1.7, cy + u * 1.7);
      ctx.moveTo(cx + u * 1.7, cy - u * 1.7);
      ctx.lineTo(cx - u * 1.7, cy + u * 1.7);
      ctx.stroke();
      break;
    case 'home':
      ctx.beginPath();
      ctx.moveTo(cx, cy - u * 2.6);
      ctx.lineTo(cx + u * 2.6, cy - u * 0.2);
      ctx.lineTo(cx + u * 1.8, cy - u * 0.2);
      ctx.lineTo(cx + u * 1.8, cy + u * 2.2);
      ctx.lineTo(cx - u * 1.8, cy + u * 2.2);
      ctx.lineTo(cx - u * 1.8, cy - u * 0.2);
      ctx.lineTo(cx - u * 2.6, cy - u * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'book': {
      // Livro aberto.
      ctx.beginPath();
      ctx.moveTo(cx, cy - u * 1.6);
      ctx.quadraticCurveTo(cx - u * 1.4, cy - u * 2.3, cx - u * 2.8, cy - u * 1.8);
      ctx.lineTo(cx - u * 2.8, cy + u * 1.9);
      ctx.quadraticCurveTo(cx - u * 1.4, cy + u * 1.4, cx, cy + u * 2.1);
      ctx.quadraticCurveTo(cx + u * 1.4, cy + u * 1.4, cx + u * 2.8, cy + u * 1.9);
      ctx.lineTo(cx + u * 2.8, cy - u * 1.8);
      ctx.quadraticCurveTo(cx + u * 1.4, cy - u * 2.3, cx, cy - u * 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,40,160,0.8)';
      ctx.lineWidth = u * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx, cy - u * 1.5);
      ctx.lineTo(cx, cy + u * 1.9);
      ctx.stroke();
      break;
    }
    case 'gear': {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? u * 2.7 : u * 2.0;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, u * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
  }
  return pill;
}

export type TailSide = 'left' | 'right' | 'down';

/**
 * Balão de fala de banda desenhada: forma arredondada (superelipse), contorno grosso,
 * sombra e um "rabo" curvo a apontar para quem fala. Devolve também a área útil para texto.
 */
export function createComicBubbleCanvas(w: number, h: number, tail: TailSide): HTMLCanvasElement {
  const tailLen = Math.min(w, h) * 0.32;
  const pad = Math.max(10, Math.min(w, h) * 0.06);
  const left = pad + (tail === 'left' ? tailLen : 0);
  const top = pad;
  const cw = w + pad * 2 + (tail === 'down' ? 0 : tailLen);
  const ch = h + pad * 2 + (tail === 'down' ? tailLen : 0);
  const [canvas, ctx] = ctx2d(cw, ch);
  const cx = left + w / 2;
  const cy = top + h / 2;
  const a = w / 2;
  const b = h / 2;
  const line = Math.max(4, Math.min(w, h) * 0.035);

  const body = () => {
    ctx.beginPath();
    const n = 3.2; // superelipse: entre elipse e retângulo arredondado
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const x = cx + a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
      const y = cy + b * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  // Rabo curvo: base dentro do corpo, ponta fora.
  const tailPath = () => {
    ctx.beginPath();
    if (tail === 'down') {
      const bx = cx - a * 0.35;
      ctx.moveTo(bx - a * 0.12, cy + b * 0.7);
      ctx.quadraticCurveTo(bx - a * 0.05, cy + b + tailLen * 0.5, bx - a * 0.3, cy + b + tailLen);
      ctx.quadraticCurveTo(bx + a * 0.12, cy + b + tailLen * 0.45, bx + a * 0.16, cy + b * 0.7);
    } else {
      const dir = tail === 'left' ? -1 : 1;
      const by = cy + b * 0.25;
      ctx.moveTo(cx + dir * a * 0.7, by - b * 0.22);
      ctx.quadraticCurveTo(cx + dir * (a + tailLen * 0.4), by - b * 0.05, cx + dir * (a + tailLen), by + b * 0.45);
      ctx.quadraticCurveTo(cx + dir * (a + tailLen * 0.2), by + b * 0.25, cx + dir * a * 0.7, by + b * 0.22);
    }
    ctx.closePath();
  };

  // Sombra.
  ctx.save();
  ctx.translate(0, line * 1.6);
  ctx.fillStyle = 'rgba(40, 0, 80, 0.28)';
  body();
  ctx.fill();
  tailPath();
  ctx.fill();
  ctx.restore();
  // Contorno grosso (rabo + corpo) e depois o preenchimento por cima para fundir os dois.
  ctx.lineJoin = 'round';
  ctx.lineWidth = line * 2;
  ctx.strokeStyle = '#3d0f6e';
  tailPath();
  ctx.stroke();
  body();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#f1e6ff');
  ctx.fillStyle = g;
  tailPath();
  ctx.fill();
  body();
  ctx.fill();
  // Brilho de banda desenhada no canto superior.
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = line * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(cx - a * 0.55, cy - b * 0.55, a * 0.22, b * 0.2, -0.5, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
  return canvas;
}

/** Centro do corpo do balão dentro do canvas (o rabo desloca-o). */
export function comicBubbleCenter(w: number, h: number, tail: TailSide): { x: number; y: number; width: number; height: number } {
  const tailLen = Math.min(w, h) * 0.32;
  const pad = Math.max(10, Math.min(w, h) * 0.06);
  const cw = w + pad * 2 + (tail === 'down' ? 0 : tailLen);
  const ch = h + pad * 2 + (tail === 'down' ? tailLen : 0);
  const left = pad + (tail === 'left' ? tailLen : 0);
  return { x: left + w / 2, y: pad + h / 2, width: cw, height: ch };
}
