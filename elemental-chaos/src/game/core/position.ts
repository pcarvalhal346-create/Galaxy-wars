import type { Position } from './types';

export const pos = (row: number, col: number): Position => ({ row, col });

export const samePos = (a: Position, b: Position): boolean => a.row === b.row && a.col === b.col;

export const isAdjacent = (a: Position, b: Position): boolean =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

/** Chave numérica compacta para usar em Set/Map (assume colunas < 1000). */
export const posKey = (p: Position): number => p.row * 1000 + p.col;

export const comparePos = (a: Position, b: Position): number => a.row - b.row || a.col - b.col;

export const ORTHOGONAL: readonly Position[] = [pos(-1, 0), pos(1, 0), pos(0, -1), pos(0, 1)];
