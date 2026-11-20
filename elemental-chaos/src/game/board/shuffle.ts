import type { IdSource } from '../core/ids';
import type { Rng } from '../core/rng';
import type { ElementType, Position, Tile, TileId } from '../core/types';
import { findMatches } from '../matching/matchFinder';
import { hasValidMove } from '../matching/moveFinder';
import type { Board } from './Board';
import { generateBoard } from './generator';

export interface ShuffleMove {
  readonly id: TileId;
  readonly from: Position;
  readonly to: Position;
}

export type ShuffleResult =
  | { readonly kind: 'shuffled'; readonly board: Board; readonly moves: readonly ShuffleMove[] }
  /** Recurso de último caso: as mesmas peças não admitem arranjo jogável → tabuleiro novo. */
  | { readonly kind: 'regenerated'; readonly board: Board; readonly removed: readonly Tile[] };

/**
 * Embaralhamento controlado: reorganiza as MESMAS peças (mantém IDs) até não haver
 * matches automáticos e existir pelo menos uma jogada válida.
 */
export function shuffleBoard(
  board: Board,
  rng: Rng,
  ids: IdSource,
  elements: readonly ElementType[],
  maxAttempts = 100,
): ShuffleResult {
  const origin = new Map<TileId, Position>();
  const tiles: Tile[] = [];
  for (const p of board.positions()) {
    const t = board.require(p);
    origin.set(t.id, p);
    tiles.push(t);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const order = rng.shuffle([...tiles]);
    const next = board.emptyLike();
    let i = 0;
    for (const p of next.positions()) next.set(p, order[i++] as Tile);
    if (findMatches(next).length === 0 && hasValidMove(next)) {
      const moves: ShuffleMove[] = [];
      for (const p of next.positions()) {
        const t = next.require(p);
        moves.push({ id: t.id, from: origin.get(t.id) as Position, to: p });
      }
      return { kind: 'shuffled', board: next, moves };
    }
  }

  const fresh = generateBoard({ rows: board.rows, cols: board.cols, elements, rng, ids, shapeOf: board });
  return { kind: 'regenerated', board: fresh, removed: tiles };
}
