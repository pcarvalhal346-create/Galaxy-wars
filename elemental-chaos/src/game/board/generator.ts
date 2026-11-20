import type { IdSource } from '../core/ids';
import type { Rng } from '../core/rng';
import type { ElementType, Position } from '../core/types';
import { findMatches } from '../matching/matchFinder';
import { hasValidMove } from '../matching/moveFinder';
import { Board } from './Board';

export interface GenerateOptions {
  rows: number;
  cols: number;
  elements: readonly ElementType[];
  rng: Rng;
  ids: IdSource;
  /** Tentativas antes de desistir (só acontece com configurações impossíveis). */
  maxAttempts?: number;
  /** Elementos fixos por célula (null = aleatório). */
  preset?: readonly (readonly (ElementType | null)[])[];
}

/**
 * Gera um tabuleiro cheio, sem matches iniciais e com pelo menos uma jogada válida.
 * Determinístico dado o estado do `rng`.
 */
export function generateBoard(opts: GenerateOptions): Board {
  if (opts.elements.length < 3) throw new Error('generateBoard: são precisos pelo menos 3 elementos');
  const maxAttempts = opts.maxAttempts ?? 200;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = new Board(opts.rows, opts.cols);
    for (const p of board.positions()) {
      const fixed = opts.preset?.[p.row]?.[p.col] ?? null;
      const element = fixed ?? opts.rng.pick(allowedAt(board, p, opts.elements));
      board.set(p, { id: opts.ids.next(), element });
    }
    if (findMatches(board).length === 0 && hasValidMove(board)) return board;
  }
  throw new Error('generateBoard: não foi possível gerar um tabuleiro jogável');
}

/** Elementos que não criam match com as duas peças à esquerda ou acima. */
export function allowedAt(board: Board, p: Position, elements: readonly ElementType[]): ElementType[] {
  const banned = new Set<ElementType>();
  const l1 = board.get({ row: p.row, col: p.col - 1 })?.element;
  const l2 = board.get({ row: p.row, col: p.col - 2 })?.element;
  if (l1 !== undefined && l1 === l2) banned.add(l1);
  const u1 = board.get({ row: p.row - 1, col: p.col })?.element;
  const u2 = board.get({ row: p.row - 2, col: p.col })?.element;
  if (u1 !== undefined && u1 === u2) banned.add(u1);
  const allowed = elements.filter((e) => !banned.has(e));
  return allowed.length > 0 ? allowed : [...elements];
}
