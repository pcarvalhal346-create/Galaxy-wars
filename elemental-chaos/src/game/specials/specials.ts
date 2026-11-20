import type { Board } from '../board/Board';
import { comparePos, posKey, samePos } from '../core/position';
import { ELEMENTS, type ElementType, type MatchGroup, type MatchRun, type Position, type SpecialKind, type Tile, type TileId } from '../core/types';

/**
 * Cristais especiais (lógica pura).
 * Criação (por grupo de match): 5+ em linha → Orbe do Caos; L/T/cruz → Núcleo; 4 em linha → Lança.
 * Ativação (quando o especial é eliminado por qualquer causa): Lança limpa a linha/coluna,
 * Núcleo explode em losango (raio 2), Orbe destrói o elemento mais comum.
 */

export interface SpecialCreation {
  readonly id: TileId;
  readonly at: Position;
  readonly kind: SpecialKind;
  readonly element: ElementType;
}

export interface SpecialActivation {
  readonly id: TileId;
  readonly at: Position;
  readonly kind: SpecialKind;
  readonly element: ElementType;
  /** Células atingidas (sem incluir a própria). */
  readonly cells: readonly Position[];
  /** Para o Orbe: elemento destruído (ou 'all' se Orbe + Orbe). */
  readonly target?: ElementType | 'all';
}

export const CORE_RADIUS = 2;

/** Que especial (e onde) nasce de um grupo. `preferred` são as células da troca (passo 0). */
export function specialForGroup(board: Board, group: MatchGroup, preferred: readonly Position[]): { at: Position; kind: SpecialKind } | null {
  const longest = group.runs.reduce<MatchRun | null>((a, r) => (!a || r.cells.length > a.cells.length ? r : a), null);
  if (!longest) return null;
  let kind: SpecialKind | null = null;
  if (longest.cells.length >= 5) kind = 'orb';
  else if (group.shape === 'cross') kind = 'core';
  else if (longest.cells.length === 4) kind = longest.orientation === 'horizontal' ? 'lance-h' : 'lance-v';
  if (!kind) return null;

  // Onde nasce: na célula da troca (se pertencer ao grupo), senão no cruzamento ou no meio.
  const candidates: Position[] = [];
  for (const p of preferred) if (group.cells.some((c) => samePos(c, p))) candidates.push(p);
  if (group.shape === 'cross') {
    const keys = new Map<number, number>();
    for (const r of group.runs) for (const c of r.cells) keys.set(posKey(c), (keys.get(posKey(c)) ?? 0) + 1);
    for (const c of group.cells) if ((keys.get(posKey(c)) ?? 0) > 1) candidates.push(c);
  }
  const mid = longest.cells[Math.floor((longest.cells.length - 1) / 2)];
  if (mid) candidates.push(mid);
  candidates.push(...[...group.cells].sort(comparePos));
  // Não transforma uma peça que já é especial (essa vai ser ativada).
  const at = candidates.find((c) => !board.get(c)?.special);
  return at ? { at, kind } : null;
}

/** Elemento mais comum no tabuleiro (empates pela ordem de ELEMENTS); ignora Orbes. */
export function mostCommonElement(board: Board): ElementType {
  const count = new Map<ElementType, number>();
  for (const p of board.positions()) {
    const t = board.get(p);
    if (t && t.special !== 'orb') count.set(t.element, (count.get(t.element) ?? 0) + 1);
  }
  let best: ElementType = 'fire';
  let bestN = -1;
  for (const e of ELEMENTS) {
    const n = count.get(e) ?? 0;
    if (n > bestN) {
      best = e;
      bestN = n;
    }
  }
  return best;
}

export function cellsOfElement(board: Board, element: ElementType | 'all', except: Position): Position[] {
  const out: Position[] = [];
  for (const p of board.positions()) {
    if (samePos(p, except)) continue;
    const t = board.get(p);
    if (t && (element === 'all' || (t.element === element && t.special !== 'orb'))) out.push(p);
  }
  return out;
}

/** Células atingidas pela ativação de um especial. */
export function activationCells(board: Board, at: Position, tile: Tile, orbTarget?: ElementType | 'all'): { cells: Position[]; target?: ElementType | 'all' } {
  const out: Position[] = [];
  switch (tile.special) {
    case 'lance-h':
      for (let c = 0; c < board.cols; c++) if (c !== at.col && board.isPlayable({ row: at.row, col: c })) out.push({ row: at.row, col: c });
      return { cells: out };
    case 'lance-v':
      for (let r = 0; r < board.rows; r++) if (r !== at.row && board.isPlayable({ row: r, col: at.col })) out.push({ row: r, col: at.col });
      return { cells: out };
    case 'core':
      for (let dr = -CORE_RADIUS; dr <= CORE_RADIUS; dr++) {
        for (let dc = -CORE_RADIUS; dc <= CORE_RADIUS; dc++) {
          if ((dr === 0 && dc === 0) || Math.abs(dr) + Math.abs(dc) > CORE_RADIUS) continue;
          const p = { row: at.row + dr, col: at.col + dc };
          if (board.isPlayable(p)) out.push(p);
        }
      }
      return { cells: out };
    case 'orb': {
      const target = orbTarget ?? mostCommonElement(board);
      return { cells: cellsOfElement(board, target, at), target };
    }
    default:
      return { cells: [] };
  }
}
