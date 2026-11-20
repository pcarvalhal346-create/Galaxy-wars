import type { Board } from '../board/Board';
import { comparePos, posKey } from '../core/position';
import type { ElementType, MatchGroup, MatchRun, MatchShape, Position } from '../core/types';

export const MIN_MATCH = 3;

/** Encontra todas as runs horizontais e verticais de 3+ peças iguais. */
export function findRuns(board: Board): MatchRun[] {
  const runs: MatchRun[] = [];
  scanLines(board, 'horizontal', runs);
  scanLines(board, 'vertical', runs);
  return runs;
}

function scanLines(board: Board, orientation: MatchRun['orientation'], out: MatchRun[]): void {
  const outer = orientation === 'horizontal' ? board.rows : board.cols;
  const inner = orientation === 'horizontal' ? board.cols : board.rows;
  const at = (o: number, i: number): Position =>
    orientation === 'horizontal' ? { row: o, col: i } : { row: i, col: o };

  for (let o = 0; o < outer; o++) {
    let start = 0;
    for (let i = 1; i <= inner; i++) {
      const prev = board.get(at(o, i - 1))?.element;
      const cur = i < inner ? board.get(at(o, i))?.element : undefined;
      if (cur !== undefined && cur === prev) continue;
      const length = i - start;
      if (prev !== undefined && length >= MIN_MATCH) {
        const cells: Position[] = [];
        for (let k = start; k < i; k++) cells.push(at(o, k));
        out.push({ element: prev, orientation, cells });
      }
      start = i;
    }
  }
}

/**
 * Agrupa runs do mesmo elemento que partilham pelo menos uma célula
 * (L, T, cruz). Resultado determinístico: ordenado pela primeira célula.
 */
export function findMatches(board: Board): MatchGroup[] {
  const runs = findRuns(board);
  if (runs.length === 0) return [];

  // Union-find sobre os índices das runs.
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i] as number] as number;
      i = parent[i] as number;
    }
    return i;
  };
  const owner = new Map<number, number>();
  runs.forEach((run, i) => {
    for (const c of run.cells) {
      const key = posKey(c);
      const other = owner.get(key);
      if (other !== undefined && runs[other]?.element === run.element) {
        parent[find(i)] = find(other);
      } else if (other === undefined) {
        owner.set(key, i);
      }
    }
  });

  const byRoot = new Map<number, MatchRun[]>();
  runs.forEach((run, i) => {
    const root = find(i);
    const list = byRoot.get(root);
    if (list) list.push(run);
    else byRoot.set(root, [run]);
  });

  const groups: MatchGroup[] = [];
  for (const groupRuns of byRoot.values()) {
    const unique = new Map<number, Position>();
    for (const r of groupRuns) for (const c of r.cells) unique.set(posKey(c), c);
    const cells = [...unique.values()].sort(comparePos);
    groups.push({
      element: (groupRuns[0] as MatchRun).element,
      runs: groupRuns,
      cells,
      shape: classifyShape(groupRuns),
    });
  }
  return groups.sort((a, b) => comparePos(a.cells[0] as Position, b.cells[0] as Position));
}

function classifyShape(runs: readonly MatchRun[]): MatchShape {
  const hasH = runs.some((r) => r.orientation === 'horizontal');
  const hasV = runs.some((r) => r.orientation === 'vertical');
  if (hasH && hasV) return 'cross';
  const longest = Math.max(...runs.map((r) => r.cells.length));
  if (longest >= 5) return 'line5plus';
  if (longest === 4) return 'line4';
  return 'line3';
}

/** Verifica rapidamente se a célula `p` faz parte de uma run de 3+. */
export function hasMatchAt(board: Board, p: Position): boolean {
  const element = board.get(p)?.element;
  if (element === undefined) return false;
  return (
    countDir(board, p, element, 0, -1) + countDir(board, p, element, 0, 1) + 1 >= MIN_MATCH ||
    countDir(board, p, element, -1, 0) + countDir(board, p, element, 1, 0) + 1 >= MIN_MATCH
  );
}

function countDir(board: Board, p: Position, element: ElementType, dr: number, dc: number): number {
  let n = 0;
  let r = p.row + dr;
  let c = p.col + dc;
  while (board.get({ row: r, col: c })?.element === element) {
    n++;
    r += dr;
    c += dc;
  }
  return n;
}
