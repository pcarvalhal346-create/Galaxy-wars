import type { Board } from '../board/Board';
import { shuffleBoard, type ShuffleResult } from '../board/shuffle';
import type { IdSource } from '../core/ids';
import { isAdjacent, posKey } from '../core/position';
import type { Rng } from '../core/rng';
import type { ElementType, MatchGroup, Position, Swap, Tile } from '../core/types';
import { applyGravity, refill, type FallMove, type Spawn } from '../gravity/gravity';
import { findMatches } from '../matching/matchFinder';
import { hasValidMove, isValidSwap } from '../matching/moveFinder';

export interface ClearedTile {
  readonly tile: Tile;
  readonly at: Position;
}

/**
 * Um passo de cascata. A ordem dos campos é a ordem de resolução:
 * matches → (reações, Fase 2) → remoção → gravidade → refill.
 */
export interface CascadeStep {
  /** 0 = matches provocados pela troca; 1+ = cascatas automáticas. */
  readonly index: number;
  readonly matches: readonly MatchGroup[];
  readonly cleared: readonly ClearedTile[];
  readonly falls: readonly FallMove[];
  readonly spawns: readonly Spawn[];
}

export type TurnResult =
  | { readonly kind: 'invalid'; readonly swap: Swap; readonly reason: 'not-adjacent' | 'no-match' | 'empty' }
  | {
      readonly kind: 'resolved';
      readonly swap: Swap;
      readonly steps: readonly CascadeStep[];
      /** Presente se, no fim, não havia jogadas e o tabuleiro foi reorganizado. */
      readonly shuffle: ShuffleResult | null;
      /** true se o limite de cascatas foi atingido (não deve acontecer em jogo normal). */
      readonly hitCascadeLimit: boolean;
    };

export interface ResolverContext {
  readonly rng: Rng;
  readonly ids: IdSource;
  readonly elements: readonly ElementType[];
  readonly maxCascades: number;
  readonly maxShuffleAttempts: number;
}

/**
 * Resolve uma jogada completa de forma síncrona e determinística, alterando `board`.
 * Devolve a descrição de tudo o que aconteceu; a camada de apresentação apenas reproduz
 * esses passos com animações (a lógica nunca depende da ordem das animações).
 */
export function resolveSwap(board: Board, swap: Swap, ctx: ResolverContext): TurnResult {
  if (!isAdjacent(swap.a, swap.b)) return { kind: 'invalid', swap, reason: 'not-adjacent' };
  if (!board.get(swap.a) || !board.get(swap.b)) return { kind: 'invalid', swap, reason: 'empty' };
  if (!isValidSwap(board, swap)) return { kind: 'invalid', swap, reason: 'no-match' };

  board.swap(swap.a, swap.b);
  const { steps, hitLimit } = resolveCascades(board, ctx);
  const shuffle = ensurePlayable(board, ctx);
  return { kind: 'resolved', swap, steps, shuffle, hitCascadeLimit: hitLimit };
}

/** Resolve matches e cascatas até o tabuleiro estabilizar (ou até ao limite de segurança). */
export function resolveCascades(
  board: Board,
  ctx: ResolverContext,
): { steps: CascadeStep[]; hitLimit: boolean } {
  const steps: CascadeStep[] = [];
  for (let index = 0; index < ctx.maxCascades; index++) {
    const matches = findMatches(board);
    if (matches.length === 0) return { steps, hitLimit: false };

    // Cada célula é removida uma única vez, mesmo que pertença a vários grupos.
    const toClear = new Map<number, Position>();
    for (const g of matches) for (const c of g.cells) toClear.set(posKey(c), c);
    const cleared: ClearedTile[] = [];
    for (const at of toClear.values()) {
      cleared.push({ tile: board.require(at), at });
      board.set(at, null);
    }

    const falls = applyGravity(board);
    const spawns = refill(board, ctx.rng, ctx.ids, ctx.elements);
    steps.push({ index, matches, cleared, falls, spawns });
  }
  return { steps, hitLimit: findMatches(board).length > 0 };
}

/**
 * Garante que o tabuleiro estável tem jogadas e não tem matches pendentes.
 * Altera `board` se for necessário reorganizar. Devolve o resultado ou null.
 */
export function ensurePlayable(board: Board, ctx: ResolverContext): ShuffleResult | null {
  if (findMatches(board).length === 0 && hasValidMove(board)) return null;
  const result = shuffleBoard(board, ctx.rng, ctx.ids, ctx.elements, ctx.maxShuffleAttempts);
  for (const p of board.positions()) board.set(p, result.board.get(p));
  return result;
}
