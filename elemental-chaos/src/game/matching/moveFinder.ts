import type { Board } from '../board/Board';
import type { Swap } from '../core/types';
import { hasMatchAt } from './matchFinder';

/** Uma troca adjacente produz pelo menos um match? (não altera o tabuleiro recebido) */
export function isValidSwap(board: Board, swap: Swap): boolean {
  const a = board.get(swap.a);
  const b = board.get(swap.b);
  if (!a || !b || a.element === b.element) return false;
  const work = board.clone();
  work.swap(swap.a, swap.b);
  return hasMatchAt(work, swap.a) || hasMatchAt(work, swap.b);
}

/** Todas as trocas válidas, por ordem determinística (linha, coluna; direita antes de baixo). */
export function findValidMoves(board: Board, limit = Infinity): Swap[] {
  const moves: Swap[] = [];
  const work = board.clone();
  for (const a of board.positions()) {
    for (const b of [
      { row: a.row, col: a.col + 1 },
      { row: a.row + 1, col: a.col },
    ]) {
      if (!work.inBounds(b)) continue;
      const ta = work.get(a);
      const tb = work.get(b);
      if (!ta || !tb || ta.element === tb.element) continue;
      work.swap(a, b);
      const ok = hasMatchAt(work, a) || hasMatchAt(work, b);
      work.swap(a, b);
      if (ok) {
        moves.push({ a, b });
        if (moves.length >= limit) return moves;
      }
    }
  }
  return moves;
}

export const hasValidMove = (board: Board): boolean => findValidMoves(board, 1).length > 0;
