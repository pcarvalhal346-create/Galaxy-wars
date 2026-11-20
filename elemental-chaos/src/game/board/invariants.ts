import type { Board } from './Board';

/**
 * Verifica invariantes estruturais do tabuleiro estável:
 * sem células vazias e sem IDs duplicados (nenhuma peça "clonada" logicamente).
 * Devolve a lista de problemas (vazia = válido).
 */
export function checkBoardInvariants(board: Board): string[] {
  const problems: string[] = [];
  const seen = new Set<number>();
  for (const p of board.positions()) {
    const tile = board.get(p);
    if (!tile) {
      problems.push(`célula vazia em (${p.row}, ${p.col})`);
      continue;
    }
    if (seen.has(tile.id)) problems.push(`ID duplicado ${tile.id} em (${p.row}, ${p.col})`);
    seen.add(tile.id);
  }
  return problems;
}
