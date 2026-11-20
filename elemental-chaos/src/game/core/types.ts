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
 * Uma peça do tabuleiro. Imutável: alterar um estado cria um objeto novo com o mesmo `id`.
 */
export interface Tile {
  readonly id: TileId;
  readonly element: ElementType;
  /** Jogadas restantes do estado Molhado (ausente ou 0 = seca). */
  readonly wet?: number;
}

export const isWet = (t: Tile | null | undefined): boolean => (t?.wet ?? 0) > 0;

/** Mecânicas elementais ativas (definidas por nível). */
export interface Mechanics {
  readonly wet: boolean;
  readonly steam: boolean;
  readonly lightning: boolean;
}

export const ALL_MECHANICS: Mechanics = { wet: true, steam: true, lightning: true };
export const NO_MECHANICS: Mechanics = { wet: false, steam: false, lightning: false };

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
