import { Board } from '../game/board/Board';
import { IdSource } from '../game/core/ids';
import { Rng } from '../game/core/rng';
import type { ElementType, Position } from '../game/core/types';
import { ELEMENTS } from '../game/core/types';
import type { ResolverContext } from '../game/resolution/turnResolver';

/** Letras usadas nos tabuleiros de teste. `.` = célula vazia. */
const LETTER: Record<string, ElementType> = { F: 'fire', W: 'water', L: 'lightning', E: 'earth', A: 'air' };
const TO_LETTER: Record<ElementType, string> = { fire: 'F', water: 'W', lightning: 'L', earth: 'E', air: 'A' };

/** Constrói um tabuleiro a partir de linhas de texto, com IDs 1..n (linha a linha). */
export function boardFrom(rows: readonly string[], ids = new IdSource()): Board {
  const cols = rows[0]?.length ?? 0;
  const board = new Board(rows.length, cols);
  rows.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`linha ${row} com largura diferente`);
    [...line].forEach((ch, col) => {
      if (ch === '.') return;
      const element = LETTER[ch];
      if (!element) throw new Error(`letra desconhecida: ${ch}`);
      board.set({ row, col }, { id: ids.next(), element });
    });
  });
  return board;
}

export function boardToRows(board: Board): string[] {
  const out: string[] = [];
  for (let row = 0; row < board.rows; row++) {
    let line = '';
    for (let col = 0; col < board.cols; col++) {
      const t = board.get({ row, col });
      line += t ? TO_LETTER[t.element] : '.';
    }
    out.push(line);
  }
  return out;
}

export const p = (row: number, col: number): Position => ({ row, col });

export function makeCtx(seed = 1, overrides: Partial<ResolverContext> = {}, startId = 1000): ResolverContext {
  return {
    rng: new Rng(seed),
    ids: new IdSource(startId),
    elements: ELEMENTS,
    maxCascades: 40,
    maxShuffleAttempts: 100,
    ...overrides,
  };
}

/** Marca peças como molhadas (para preparar cenários de teste). */
export function setWet(board: Board, cells: readonly Position[], turns = 2): void {
  for (const c of cells) {
    const t = board.require(c);
    board.set(c, { ...t, wet: turns });
  }
}
