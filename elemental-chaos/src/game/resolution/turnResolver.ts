import type { Board } from '../board/Board';
import { shuffleBoard, type ShuffleResult } from '../board/shuffle';
import type { IdSource } from '../core/ids';
import { isAdjacent, posKey } from '../core/position';
import type { Rng } from '../core/rng';
import { NO_MECHANICS, type ElementType, type MatchGroup, type Mechanics, type Position, type Swap, type Tile } from '../core/types';
import { applyGravity, refill, type FallMove, type Spawn } from '../gravity/gravity';
import { findMatches } from '../matching/matchFinder';
import { hasValidMove, isValidSwap } from '../matching/moveFinder';
import {
  applyWet,
  computeReactions,
  DEFAULT_REACTION_RULES,
  newTurnReactionState,
  tickWet,
  type ReactionEvent,
  type ReactionRules,
  type TurnReactionState,
  type WetChange,
} from '../reactions/reactions';

export type ClearCause = 'match' | 'steam' | 'lightning';

export interface ClearedTile {
  readonly tile: Tile;
  readonly at: Position;
  /** Primeira causa por prioridade: match > vapor > raio. */
  readonly cause: ClearCause;
}

/**
 * Um passo de cascata. A ordem dos campos é a ordem de resolução:
 * matches → reações → remoção → Wet → gravidade → refill.
 */
export interface CascadeStep {
  /** 0 = matches provocados pela troca; 1+ = cascatas automáticas. */
  readonly index: number;
  readonly matches: readonly MatchGroup[];
  readonly reactions: readonly ReactionEvent[];
  readonly cleared: readonly ClearedTile[];
  /** Peças molhadas (ou renovadas) por matches de Água neste passo. */
  readonly wetApplied: readonly WetChange[];
  readonly falls: readonly FallMove[];
  readonly spawns: readonly Spawn[];
}

export type TurnResult =
  | { readonly kind: 'invalid'; readonly swap: Swap; readonly reason: 'not-adjacent' | 'no-match' | 'empty' }
  | {
      readonly kind: 'resolved';
      readonly swap: Swap;
      readonly steps: readonly CascadeStep[];
      /** Contagem do Wet no fim da jogada (depois de todas as cascatas). */
      readonly wetTicks: readonly WetChange[];
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
  /** Mecânicas elementais ativas (por omissão: nenhuma — Match-3 clássico). */
  readonly mechanics?: Mechanics;
  readonly reactionRules?: ReactionRules;
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
  const turn = newTurnReactionState();
  const { steps, hitLimit } = resolveCascades(board, ctx, turn);
  const wetTicks = tickWet(board, turn);
  const shuffle = ensurePlayable(board, ctx);
  return { kind: 'resolved', swap, steps, wetTicks, shuffle, hitCascadeLimit: hitLimit };
}

/** Resolve matches, reações e cascatas até o tabuleiro estabilizar (ou até ao limite de segurança). */
export function resolveCascades(
  board: Board,
  ctx: ResolverContext,
  turn: TurnReactionState = newTurnReactionState(),
): { steps: CascadeStep[]; hitLimit: boolean } {
  const mechanics = ctx.mechanics ?? NO_MECHANICS;
  const rules = ctx.reactionRules ?? DEFAULT_REACTION_RULES;
  const steps: CascadeStep[] = [];

  for (let index = 0; index < ctx.maxCascades; index++) {
    const matches = findMatches(board);
    if (matches.length === 0) return { steps, hitLimit: false };

    // REACTING: calculado sobre o estado do início do passo.
    const reactions = computeReactions(board, matches, mechanics, turn, rules);

    // CLEARING: união de todas as células, cada uma removida uma única vez.
    const toClear = new Map<number, { at: Position; cause: ClearCause }>();
    const mark = (at: Position, cause: ClearCause) => {
      const k = posKey(at);
      if (!toClear.has(k)) toClear.set(k, { at, cause });
    };
    for (const g of matches) for (const c of g.cells) mark(c, 'match');
    for (const r of reactions) if (r.kind === 'steam') for (const c of r.area) mark(c, 'steam');
    for (const r of reactions) if (r.kind === 'lightning') for (const c of r.path) mark(c, 'lightning');

    // Wet aplica-se antes de remover (as posições ainda são válidas), só a sobreviventes.
    const clearedKeys = new Set(toClear.keys());
    const wetApplied = mechanics.wet ? applyWet(board, matches, clearedKeys, turn, rules.wetDuration) : [];

    const cleared: ClearedTile[] = [];
    for (const { at, cause } of toClear.values()) {
      const tile = board.get(at);
      if (!tile) continue;
      cleared.push({ tile, at, cause });
      board.set(at, null);
    }

    const falls = applyGravity(board);
    const spawns = refill(board, ctx.rng, ctx.ids, ctx.elements);
    steps.push({ index, matches, reactions, cleared, wetApplied, falls, spawns });
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
