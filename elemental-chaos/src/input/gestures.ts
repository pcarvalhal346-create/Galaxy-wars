import type { Position } from '../game/core/types';
import type { Rect } from '../view/layout';

/** Converte coordenadas de ecrã numa célula do tabuleiro (ou null fora dele). */
export function pointToCell(x: number, y: number, board: Rect, cellSize: number, rows: number, cols: number): Position | null {
  const col = Math.floor((x - board.x) / cellSize);
  const row = Math.floor((y - board.y) / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}

/** Direção ortogonal dominante de um arrasto, se ultrapassar o limiar (px). */
export function swipeDirection(dx: number, dy: number, threshold: number): Position | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax >= ay) return { row: 0, col: dx > 0 ? 1 : -1 };
  return { row: dy > 0 ? 1 : -1, col: 0 };
}
