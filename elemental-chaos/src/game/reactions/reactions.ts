import { ELEMENTAL_RULES } from '../../config/balance';
import type { Board } from '../board/Board';
import { comparePos, ORTHOGONAL, posKey } from '../core/position';
import { isWet, type MatchGroup, type Mechanics, type Position, type Tile, type TileId } from '../core/types';

/**
 * Reações elementais (Fase 2). Funções puras sobre o tabuleiro.
 *
 * Regra de ordem (determinística, independente das animações):
 * 1. As reações de um passo usam o estado Wet que existia NO INÍCIO desse passo.
 * 2. Todas as células afetadas (matches + reações) são removidas em simultâneo, uma só vez.
 * 3. O Wet criado por matches de Água aplica-se depois, só a peças que sobrevivem.
 */

export interface ReactionRules {
  readonly steamRadius: number;
  readonly lightningMaxTiles: number;
  readonly maxReactionsPerStep: number;
  readonly maxReactionsPerTurn: number;
  readonly wetDuration: number;
}

export const DEFAULT_REACTION_RULES: ReactionRules = ELEMENTAL_RULES;

export interface SteamBurst {
  readonly kind: 'steam';
  /** Índice do grupo de Fogo (em `matches`) que disparou a reação. */
  readonly group: number;
  /** Peça molhada no centro da explosão. */
  readonly center: Position;
  readonly centerId: TileId;
  /** Células da área (dentro do tabuleiro). */
  readonly area: readonly Position[];
}

export interface LightningChain {
  readonly kind: 'lightning';
  readonly group: number;
  /** Peças molhadas atingidas, pela ordem da propagação. */
  readonly path: readonly Position[];
  /** Ligações a desenhar: do grupo de Raio para a 1.ª peça e entre peças sucessivas. */
  readonly links: readonly (readonly [Position, Position])[];
}

export type ReactionEvent = SteamBurst | LightningChain;

/** Estado partilhado ao longo de UMA jogada (todas as cascatas). */
export interface TurnReactionState {
  /** `tipo:idPeça` já usados como gatilho nesta jogada. */
  readonly usedTriggers: Set<string>;
  /** Peças molhadas (ou renovadas) nesta jogada: não perdem duração no fim dela. */
  readonly freshWet: Set<TileId>;
  reactionsThisTurn: number;
}

export const newTurnReactionState = (): TurnReactionState => ({
  usedTriggers: new Set(),
  freshWet: new Set(),
  reactionsThisTurn: 0,
});

/** Vizinhos ortogonais de um grupo (fora do grupo), ordenados. */
export function neighborsOfGroup(board: Board, cells: readonly Position[]): Position[] {
  const inGroup = new Set(cells.map(posKey));
  const out = new Map<number, Position>();
  for (const c of cells) {
    for (const d of ORTHOGONAL) {
      const n = { row: c.row + d.row, col: c.col + d.col };
      const k = posKey(n);
      if (board.isPlayable(n) && !inGroup.has(k)) out.set(k, n);
    }
  }
  return [...out.values()].sort(comparePos);
}

/**
 * Calcula as reações provocadas pelos matches de um passo.
 * Não altera o tabuleiro; atualiza `turn` (gatilhos usados e contadores).
 */
export function computeReactions(
  board: Board,
  matches: readonly MatchGroup[],
  mechanics: Mechanics,
  turn: TurnReactionState,
  rules: ReactionRules = DEFAULT_REACTION_RULES,
): ReactionEvent[] {
  const events: ReactionEvent[] = [];
  if (!mechanics.wet) return events; // sem Wet não há reações
  const budget = () =>
    events.length < rules.maxReactionsPerStep && turn.reactionsThisTurn < rules.maxReactionsPerTurn;

  matches.forEach((group, gi) => {
    if (group.element === 'fire' && mechanics.steam) {
      for (const n of neighborsOfGroup(board, group.cells)) {
        if (!budget()) return;
        const tile = board.get(n);
        if (!tile || !isWet(tile)) continue;
        const key = `steam:${tile.id}`;
        if (turn.usedTriggers.has(key)) continue;
        turn.usedTriggers.add(key);
        turn.reactionsThisTurn++;
        events.push({ kind: 'steam', group: gi, center: n, centerId: tile.id, area: squareArea(board, n, rules.steamRadius) });
      }
    }
    if (group.element === 'lightning' && mechanics.lightning) {
      if (!budget()) return;
      const chain = lightningChain(board, group, turn, rules.lightningMaxTiles);
      if (chain) {
        turn.reactionsThisTurn++;
        events.push({ ...chain, group: gi });
      }
    }
  });
  return events;
}

function squareArea(board: Board, center: Position, radius: number): Position[] {
  const area: Position[] = [];
  for (let r = center.row - radius; r <= center.row + radius; r++) {
    for (let c = center.col - radius; c <= center.col + radius; c++) {
      const p = { row: r, col: c };
      if (board.isPlayable(p)) area.push(p);
    }
  }
  return area;
}

/** Busca em largura determinística pelas peças molhadas ligadas ao grupo de Raio. */
function lightningChain(
  board: Board,
  group: MatchGroup,
  turn: TurnReactionState,
  maxTiles: number,
): Omit<LightningChain, 'group'> | null {
  const inGroup = new Set(group.cells.map(posKey));
  const visited = new Set<number>();
  const queue: Position[] = [];
  const path: Position[] = [];
  const links: [Position, Position][] = [];

  // Gatilhos: peças molhadas adjacentes ao grupo; a ligação parte da célula do grupo mais próxima.
  for (const cell of group.cells) {
    for (const d of ORTHOGONAL) {
      const n = { row: cell.row + d.row, col: cell.col + d.col };
      const k = posKey(n);
      if (inGroup.has(k) || visited.has(k)) continue;
      const t = board.get(n);
      if (!t || !isWet(t) || turn.usedTriggers.has(`lightning:${t.id}`)) continue;
      visited.add(k);
      queue.push(n);
      links.push([cell, n]);
    }
  }
  queue.sort(comparePos);
  if (queue.length === 0) return null;

  while (queue.length > 0 && path.length < maxTiles) {
    const cur = queue.shift() as Position;
    path.push(cur);
    turn.usedTriggers.add(`lightning:${(board.get(cur) as Tile).id}`);
    for (const d of ORTHOGONAL) {
      const n = { row: cur.row + d.row, col: cur.col + d.col };
      const k = posKey(n);
      if (visited.has(k) || inGroup.has(k)) continue;
      const t = board.get(n);
      if (!t || !isWet(t) || turn.usedTriggers.has(`lightning:${t.id}`)) continue;
      visited.add(k);
      queue.push(n);
      links.push([cur, n]);
    }
  }
  // Só se desenham ligações para peças efetivamente atingidas.
  const hit = new Set(path.map(posKey));
  return { kind: 'lightning', path, links: links.filter(([, to]) => hit.has(posKey(to))) };
}

export interface WetChange {
  readonly id: TileId;
  /** Novo valor (0 = secou). */
  readonly wet: number;
}

/**
 * Matches de Água molham as peças vizinhas que sobrevivem ao passo. Altera `board`.
 * `cleared` são as chaves (posKey) removidas neste passo.
 */
export function applyWet(
  board: Board,
  matches: readonly MatchGroup[],
  cleared: ReadonlySet<number>,
  turn: TurnReactionState,
  duration: number,
): WetChange[] {
  const changes = new Map<TileId, WetChange>();
  for (const g of matches) {
    if (g.element !== 'water') continue;
    for (const n of neighborsOfGroup(board, g.cells)) {
      if (cleared.has(posKey(n))) continue;
      const t = board.get(n);
      if (!t) continue;
      board.set(n, { ...t, wet: duration });
      turn.freshWet.add(t.id);
      changes.set(t.id, { id: t.id, wet: duration });
    }
  }
  return [...changes.values()];
}

/** Fim de jogada: o Wet não renovado nesta jogada perde 1. Altera `board`. */
export function tickWet(board: Board, turn: TurnReactionState): WetChange[] {
  const changes: WetChange[] = [];
  for (const p of board.positions()) {
    const t = board.get(p);
    if (!t || !isWet(t) || turn.freshWet.has(t.id)) continue;
    const wet = (t.wet ?? 0) - 1;
    board.set(p, wet > 0 ? { ...t, wet } : { id: t.id, element: t.element });
    changes.push({ id: t.id, wet: Math.max(0, wet) });
  }
  return changes;
}
