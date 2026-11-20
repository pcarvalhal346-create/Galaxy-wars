/**
 * Tipos centrais do modelo de jogo. Este módulo (e tudo em src/game) NÃO pode
 * depender do Phaser: a lógica tem de correr e ser testada sem browser.
 */

export const ELEMENTS = ['fire', 'water', 'lightning', 'earth', 'air'] as const;
export type ElementType = (typeof ELEMENTS)[number];

/** Identificador único e estável de uma peça durante toda a sessão. */
export type TileId = number;

export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * Uma peça do tabuleiro. Mantém-se mínima na Fase 1.
 * A Fase 2 acrescenta estados elementais (ex.: `wet`) aqui, sem mudar o resto do motor.
 */
export interface Tile {
  readonly id: TileId;
  readonly element: ElementType;
}

/** Uma sequência contínua (horizontal ou vertical) de 3+ peças iguais. */
export interface MatchRun {
  readonly element: ElementType;
  readonly orientation: 'horizontal' | 'vertical';
  readonly cells: readonly Position[];
}

/**
 * Grupo de match: runs do mesmo elemento que partilham células
 * (ex.: forma em L, T ou cruz) são fundidas num só grupo.
 */
export interface MatchGroup {
  readonly element: ElementType;
  readonly runs: readonly MatchRun[];
  /** Células únicas do grupo, ordenadas por linha e coluna. */
  readonly cells: readonly Position[];
  readonly shape: MatchShape;
}

export type MatchShape = 'line3' | 'line4' | 'line5plus' | 'cross';

export interface Swap {
  readonly a: Position;
  readonly b: Position;
}
