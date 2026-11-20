import type { ElementType, Mechanics } from '../core/types';
import type { GuideStep } from '../tutorial/guide';

export type ReactionKind = 'steam' | 'lightning' | 'any';

export type Objective =
  | { readonly type: 'score'; readonly target: number }
  | { readonly type: 'collect'; readonly element: ElementType; readonly target: number }
  | { readonly type: 'reactions'; readonly reaction: ReactionKind; readonly target: number };

/** Definição de um nível (vem de dados externos, ver src/data/levels.json). */
export interface LevelDefinition {
  readonly id: number;
  readonly name: string;
  /** Texto curto mostrado antes de jogar (ensina a mecânica do nível). */
  readonly tutorial: string;
  readonly moves: number;
  readonly elements: readonly ElementType[];
  readonly mechanics: Mechanics;
  readonly objectives: readonly Objective[];
  /** Pontuações para 1, 2 e 3 estrelas (crescentes). */
  readonly stars: readonly [number, number, number];
  /** Seed opcional: tabuleiro inicial sempre igual. */
  readonly seed?: number;
  /** Forma do tabuleiro: linhas com `.` (jogável) e `#` (buraco). Define o tamanho. */
  readonly shape: readonly string[];
  /** Configuração inicial opcional: letras (F W L E A), `.` aleatório, `#` buraco. */
  readonly preset?: readonly string[];
  /** Tutorial guiado (níveis de aprendizagem). */
  readonly guide?: readonly GuideStep[];
  /** Tema visual do fundo. */
  readonly theme: LevelTheme;
}

export type LevelTheme = 'meadow' | 'lagoon' | 'volcano' | 'storm';
