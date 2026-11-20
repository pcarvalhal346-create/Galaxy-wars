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
  /** Linha virtual (negativa) acima do tabuleiro de onde a peça entra, para a animação. */
  readonly fromRow: number;
}

/**
 * Faz cair as peças em cada coluna para preencher células vazias. Altera `board`.
 * Devolve apenas as peças que efetivamente se moveram.
 */
export function applyGravity(board: Board): FallMove[] {
  const falls: FallMove[] = [];
  for (let col = 0; col < board.cols; col++) {
    let writeRow = board.rows - 1;
    for (let row = board.rows - 1; row >= 0; row--) {
      const tile = board.get({ row, col });
      if (!tile) continue;
      if (row !== writeRow) {
        board.set({ row: writeRow, col }, tile);
        board.set({ row, col }, null);
        falls.push({ id: tile.id, from: { row, col }, to: { row: writeRow, col } });
      }
      writeRow--;
    }
  }
  return falls;
}

/**
 * Preenche as células vazias (que, após a gravidade, estão sempre no topo de cada coluna)
 * com peças novas. Altera `board`.
 */
export function refill(board: Board, rng: Rng, ids: IdSource, elements: readonly ElementType[]): Spawn[] {
  const spawns: Spawn[] = [];
  for (let col = 0; col < board.cols; col++) {
    let empty = 0;
    while (empty < board.rows && board.get({ row: empty, col }) === null) empty++;
    // Gera de baixo para cima para que a ordem visual de entrada seja natural.
    for (let row = empty - 1; row >= 0; row--) {
      const tile: Tile = { id: ids.next(), element: rng.pick(elements) };
      board.set({ row, col }, tile);
      spawns.push({ tile, to: { row, col }, fromRow: row - empty });
    }
  }
  return spawns;
}
