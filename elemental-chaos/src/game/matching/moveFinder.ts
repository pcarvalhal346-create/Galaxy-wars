import type { Board } from '../board/Board';
import type { Swap, Tile } from '../core/types';
import { hasMatchAt } from './matchFinder';

/** Trocas que ativam especiais por si só: Orbe do Caos com qualquer peça, ou dois especiais. */
export function isSpecialSwap(a: Tile | null, b: Tile | null): boolean {
  if (!a || !b) return false;
  return a.special === 'orb' || b.special === 'orb' || (!!a.special && !!b.special);
}

/** Uma troca adjacente produz pelo menos um match (ou ativa especiais)? Não altera o tabuleiro. */
export function isValidSwap(board: Board, swap: Swap): boolean {
  const a = board.get(swap.a);
  const b = board.get(swap.b);
  if (!a || !b) return false;
  if (isSpecialSwap(a, b)) return true;
  if (a.element === b.element) return false;
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
      if (!work.isPlayable(b)) continue;
      const ta = work.get(a);
      const tb = work.get(b);
      if (!ta || !tb) continue;
      let ok = isSpecialSwap(ta, tb);
      if (!ok && ta.element !== tb.element) {
        work.swap(a, b);
        ok = hasMatchAt(work, a) || hasMatchAt(work, b);
        work.swap(a, b);
      }
      if (ok) {
        moves.push({ a, b });
        if (moves.length >= limit) return moves;
      }
    }
  }
  return moves;
}

export const hasValidMove = (board: Board): boolean => findValidMoves(board, 1).length > 0;
