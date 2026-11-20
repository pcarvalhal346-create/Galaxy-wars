import type { Board } from '../board/Board';
import { shuffleBoard, type ShuffleResult } from '../board/shuffle';
import type { IdSource } from '../core/ids';
import { isAdjacent, posKey } from '../core/position';
import type { Rng } from '../core/rng';
import { NO_MECHANICS, type ElementType, type MatchGroup, type Mechanics, type Position, type Swap, type Tile, type TileId } from '../core/types';
import { applyGravity, refill, type FallMove, type Spawn } from '../gravity/gravity';
import { findMatches } from '../matching/matchFinder';
import { hasValidMove, isSpecialSwap, isValidSwap } from '../matching/moveFinder';
import { activationCells, specialForGroup, type SpecialActivation, type SpecialCreation } from '../specials/specials';
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

export type ClearCause = 'match' | 'steam' | 'lightning' | 'special';

export interface ClearedTile {
  readonly tile: Tile;
  readonly at: Position;
  /** Primeira causa por prioridade: match > vapor > raio > especial. */
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
  /** Cristais especiais criados neste passo (a peça fica no sítio e transforma-se). */
  readonly specialsCreated: readonly SpecialCreation[];
  /** Especiais ativados neste passo, pela ordem da cadeia. */
  readonly activations: readonly SpecialActivation[];
  /** Gelo partido neste passo (uma camada por célula limpa). */
  readonly iceBroken: readonly IceBreak[];
  readonly falls: readonly FallMove[];
  readonly spawns: readonly Spawn[];
}

export interface IceBreak {
  readonly at: Position;
  /** Camadas que ficam (0 = célula livre de gelo). */
  readonly remaining: number;
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
  /** Máximo de especiais ativados por passo (segurança). */
  readonly maxActivationsPerStep?: number;
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

  const ta = board.get(swap.a) as Tile;
  const tb = board.get(swap.b) as Tile;
  board.swap(swap.a, swap.b);
  // Depois da troca, ta está em b e tb em a.
  let initial: InitialActivation | null = null;
  if (isSpecialSwap(ta, tb)) {
    if (ta.special === 'orb' || tb.special === 'orb') {
      const orbAt = ta.special === 'orb' ? swap.b : swap.a;
      const other = ta.special === 'orb' ? tb : ta;
      initial = { orb: { at: orbAt, target: other.special === 'orb' ? 'all' : other.element }, also: [] };
    } else {
      initial = { orb: null, also: [swap.a, swap.b] };
    }
  }
  const turn = newTurnReactionState();
  const { steps, hitLimit } = resolveCascades(board, ctx, turn, initial, [swap.a, swap.b]);
  const wetTicks = tickWet(board, turn);
  const shuffle = ensurePlayable(board, ctx);
  return { kind: 'resolved', swap, steps, wetTicks, shuffle, hitCascadeLimit: hitLimit };
}

/** Ativação provocada diretamente pela troca (Orbe do Caos ou dois especiais). */
export interface InitialActivation {
  readonly orb: { readonly at: Position; readonly target: ElementType | 'all' } | null;
  /** Especiais a ativar (troca de dois especiais). */
  readonly also: readonly Position[];
}

/** Resolve matches, reações e cascatas até o tabuleiro estabilizar (ou até ao limite de segurança). */
export function resolveCascades(
  board: Board,
  ctx: ResolverContext,
  turn: TurnReactionState = newTurnReactionState(),
  initial: InitialActivation | null = null,
  swapCells: readonly Position[] = [],
): { steps: CascadeStep[]; hitLimit: boolean } {
  const mechanics = ctx.mechanics ?? NO_MECHANICS;
  const rules = ctx.reactionRules ?? DEFAULT_REACTION_RULES;
  const steps: CascadeStep[] = [];

  for (let index = 0; index < ctx.maxCascades; index++) {
    const matches = findMatches(board);
    const first = index === 0 ? initial : null;
    if (matches.length === 0 && !first) return { steps, hitLimit: false };

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

    // Criação de especiais: a peça escolhida não é eliminada, transforma-se.
    const specialsCreated: SpecialCreation[] = [];
    const created = new Set<number>();
    for (const g of matches) {
      const spec = specialForGroup(board, g, index === 0 ? swapCells : []);
      if (!spec || created.has(posKey(spec.at))) continue;
      const tile = board.require(spec.at);
      created.add(posKey(spec.at));
      specialsCreated.push({ id: tile.id, at: spec.at, kind: spec.kind, element: g.element });
    }

    // Ativação de especiais em cadeia (cada um uma vez; peças acabadas de criar não são atingidas).
    const activations: SpecialActivation[] = [];
    const activated = new Set<TileId>();
    const queue: { at: Position; orbTarget?: ElementType | 'all' }[] = [];
    if (first?.orb) queue.push({ at: first.orb.at, orbTarget: first.orb.target });
    for (const p of first?.also ?? []) queue.push({ at: p });
    for (const p of first ? [...(first.orb ? [first.orb.at] : []), ...first.also] : []) mark(p, 'special');
    const enqueueHit = () => {
      for (const { at } of toClear.values()) {
        const t = board.get(at);
        if (t?.special && !activated.has(t.id) && !created.has(posKey(at)) && !queue.some((q) => q.at.row === at.row && q.at.col === at.col)) queue.push({ at });
      }
    };
    enqueueHit();
    const maxActivations = ctx.maxActivationsPerStep ?? 30;
    while (queue.length > 0 && activations.length < maxActivations) {
      const { at, orbTarget } = queue.shift() as { at: Position; orbTarget?: ElementType | 'all' };
      const tile = board.get(at);
      if (!tile?.special || activated.has(tile.id)) continue;
      activated.add(tile.id);
      const { cells, target } = activationCells(board, at, tile, orbTarget);
      const hit = cells.filter((c) => !created.has(posKey(c)));
      for (const c of hit) mark(c, 'special');
      activations.push({ id: tile.id, at, kind: tile.special, element: tile.element, cells: hit, ...(target ? { target } : {}) });
      enqueueHit();
    }
    for (const k of created) toClear.delete(k);

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
    for (const c of specialsCreated) {
      const t = board.require(c.at);
      board.set(c.at, { ...t, special: c.kind });
    }
    // Cada célula limpa perde uma camada de gelo.
    const iceBroken: IceBreak[] = [];
    for (const c of cleared) {
      const layers = board.getIce(c.at);
      if (layers > 0) {
        board.setIce(c.at, layers - 1);
        iceBroken.push({ at: c.at, remaining: layers - 1 });
      }
    }

    const falls = applyGravity(board);
    const spawns = refill(board, ctx.rng, ctx.ids, ctx.elements);
    steps.push({ index, matches, reactions, cleared, wetApplied, specialsCreated, activations, iceBroken, falls, spawns });
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
