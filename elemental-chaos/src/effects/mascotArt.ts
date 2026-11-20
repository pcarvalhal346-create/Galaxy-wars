import { ELEMENTS } from '../game/core/types';
import { ELEMENT_STYLE } from '../config/theme';
import { rgba } from '../utils/color';

/**
 * Lumi: mascote original do jogo — um pequeno espírito de cristal com uma coroa
 * de lascas dos cinco elementos. Desenhada em Canvas, em duas expressões.
 */
export type LumiMood = 'happy' | 'wow' | 'sad';

function ctx2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [canvas, ctx];
}

export function createLumiCanvas(size: number, mood: LumiMood): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const c = size / 2;
  const bodyY = size * 0.6;
  const r = size * 0.3;

  // Coroa de lascas elementais.
  ELEMENTS.forEach((e, i) => {
    const a = -Math.PI / 2 + (i - 2) * 0.42;
    const x = c + Math.cos(a) * r * 1.05;
    const y = bodyY - r * 0.75 + Math.sin(a) * r * 0.55;
    const st = ELEMENT_STYLE[e];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    const h = size * (i === 2 ? 0.2 : 0.15);
    const w = h * 0.45;
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, rgba(st.light));
    g.addColorStop(1, rgba(st.base));
    ctx.fillStyle = g;
    ctx.strokeStyle = rgba(st.dark);
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(w, -h * 0.35);
    ctx.lineTo(0, 0);
    ctx.lineTo(-w, -h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Corpo: gota redonda de cristal, violeta → ciano.
  ctx.save();
  ctx.shadowColor = 'rgba(40, 0, 80, 0.45)';
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetY = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(c, bodyY - r * 1.15);
  ctx.bezierCurveTo(c + r * 0.9, bodyY - r * 0.9, c + r * 1.15, bodyY - r * 0.1, c + r * 1.05, bodyY + r * 0.35);
  ctx.bezierCurveTo(c + r * 0.9, bodyY + r * 1.0, c - r * 0.9, bodyY + r * 1.0, c - r * 1.05, bodyY + r * 0.35);
  ctx.bezierCurveTo(c - r * 1.15, bodyY - r * 0.1, c - r * 0.9, bodyY - r * 0.9, c, bodyY - r * 1.15);
  ctx.closePath();
  const body = ctx.createRadialGradient(c - r * 0.35, bodyY - r * 0.4, r * 0.1, c, bodyY, r * 1.2);
  body.addColorStop(0, '#f3e9ff');
  body.addColorStop(0.45, '#b48cff');
  body.addColorStop(1, '#4fb8ff');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = size * 0.018;
  ctx.strokeStyle = '#4a1f9a';
  ctx.stroke();

  // Brilho.
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(c - r * 0.45, bodyY - r * 0.55, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // Olhos grandes.
  for (const dx of [-1, 1]) {
    const ex = c + dx * r * 0.38;
    const ey = bodyY - r * 0.02;
    ctx.fillStyle = '#2a0f5a';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.16, r * (mood === 'wow' ? 0.24 : 0.21), 0, 0, Math.PI * 2);
    ctx.fill();
    if (mood === 'sad') {
      // Sobrancelhas inclinadas e uma lágrima.
      ctx.strokeStyle = '#2a0f5a';
      ctx.lineWidth = size * 0.016;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - dx * r * 0.2, ey - r * 0.36);
      ctx.lineTo(ex + dx * r * 0.14, ey - r * 0.27);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.05, ey - r * 0.08, r * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + r * 0.05, ey + r * 0.07, r * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bochechas.
  ctx.fillStyle = 'rgba(255, 110, 170, 0.55)';
  for (const dx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(c + dx * r * 0.68, bodyY + r * 0.22, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boca.
  ctx.strokeStyle = '#2a0f5a';
  ctx.fillStyle = '#7a1f4a';
  ctx.lineWidth = size * 0.014;
  ctx.lineCap = 'round';
  if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(c, bodyY + r * 0.2, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(c, bodyY + r * 0.42, r * 0.14, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    const tx = c + r * 0.4;
    const ty = bodyY + r * 0.2;
    ctx.fillStyle = '#7fd8ff';
    ctx.beginPath();
    ctx.moveTo(tx, ty - r * 0.1);
    ctx.quadraticCurveTo(tx + r * 0.08, ty + r * 0.06, tx, ty + r * 0.1);
    ctx.quadraticCurveTo(tx - r * 0.08, ty + r * 0.06, tx, ty - r * 0.1);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(c, bodyY + r * 0.3, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  return canvas;
}

/** Mão branca a apontar (para o tutorial). */
export function createHandCanvas(size: number): HTMLCanvasElement {
  const [canvas, ctx] = ctx2d(size, size);
  const u = size / 10;
  ctx.save();
  ctx.translate(size * 0.5, size * 0.5);
  ctx.rotate(-0.35);
  ctx.translate(-size * 0.5, -size * 0.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(40,0,80,0.45)';
  ctx.shadowBlur = u * 0.6;
  ctx.shadowOffsetY = u * 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4a1f9a';
  ctx.lineWidth = u * 0.35;
  ctx.beginPath();
  // Dedo indicador (a ponta em cima, perto de (5, 0.8)).
  ctx.moveTo(4.2 * u, 5.2 * u);
  ctx.lineTo(4.2 * u, 1.5 * u);
  ctx.quadraticCurveTo(5 * u, 0.4 * u, 5.8 * u, 1.5 * u);
  ctx.lineTo(5.8 * u, 4.4 * u);
  // Outros dedos dobrados.
  ctx.quadraticCurveTo(6.6 * u, 3.8 * u, 7.2 * u, 4.6 * u);
  ctx.quadraticCurveTo(8 * u, 4.2 * u, 8.4 * u, 5.2 * u);
  ctx.quadraticCurveTo(9.2 * u, 5 * u, 9.2 * u, 6.2 * u);
  ctx.lineTo(9 * u, 7.6 * u);
  ctx.quadraticCurveTo(8.6 * u, 9.4 * u, 6.6 * u, 9.4 * u);
  ctx.lineTo(4.8 * u, 9.4 * u);
  ctx.quadraticCurveTo(3.4 * u, 9.2 * u, 2.6 * u, 7.8 * u);
  ctx.lineTo(1.6 * u, 6.2 * u);
  ctx.quadraticCurveTo(1.4 * u, 5.2 * u, 2.4 * u, 5.4 * u);
  ctx.lineTo(4.2 * u, 6.6 * u);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.restore();
  return canvas;
}

/** Ponta do dedo da mão, em fração do tamanho (para alinhar com o alvo). */
export const HAND_TIP = { x: 0.44, y: 0.12 } as const;
