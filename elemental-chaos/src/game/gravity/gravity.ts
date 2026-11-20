import type { Board } from '../board/Board';
import type { IdSource } from '../core/ids';
import type { Rng } from '../core/rng';
import type { ElementType, Position, Tile, TileId } from '../core/types';

export interface FallMove {
  readonly id: TileId;
  readonly from: Position;
  readonly to: Position;
}

export interface Spawn {
  readonly tile: Tile;
  readonly to: Position;
  /** Linha virtual (acima da 1.ª célula jogável da coluna) de onde a peça entra, para a animação. */
  readonly fromRow: number;
}

/**
 * Faz cair as peças em cada coluna para preencher células vazias, atravessando buracos.
 * Altera `board`. Devolve apenas as peças que efetivamente se moveram.
 */
export function applyGravity(board: Board): FallMove[] {
  const falls: FallMove[] = [];
  for (let col = 0; col < board.cols; col++) {
    const rows = board.playableRows(col);
    let write = rows.length - 1;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i] as number;
      const tile = board.get({ row, col });
      if (!tile) continue;
      const target = rows[write] as number;
      if (target !== row) {
        board.set({ row: target, col }, tile);
        board.set({ row, col }, null);
        falls.push({ id: tile.id, from: { row, col }, to: { row: target, col } });
      }
      write--;
    }
  }
  return falls;
}

/**
 * Preenche as células vazias (que, após a gravidade, são sempre as de cima de cada coluna)
 * com peças novas. Altera `board`.
 */
export function refill(board: Board, rng: Rng, ids: IdSource, elements: readonly ElementType[]): Spawn[] {
  const spawns: Spawn[] = [];
  for (let col = 0; col < board.cols; col++) {
    const rows = board.playableRows(col);
    let empty = 0;
    while (empty < rows.length && board.get({ row: rows[empty] as number, col }) === null) empty++;
    const top = rows[0] ?? 0;
    // Gera de baixo para cima para que a ordem visual de entrada seja natural.
    for (let i = empty - 1; i >= 0; i--) {
      const row = rows[i] as number;
      const tile: Tile = { id: ids.next(), element: rng.pick(elements) };
      board.set({ row, col }, tile);
      spawns.push({ tile, to: { row, col }, fromRow: top - (empty - i) });
    }
  }
  return spawns;
}
