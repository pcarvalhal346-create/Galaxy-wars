import { ELEMENTS, type ElementType } from '../game/core/types';

/**
 * Parâmetros de regras e de ritmo. Valores de jogo vivem AQUI, não espalhados pelo código.
 * (A pontuação entra na Fase 3, neste mesmo ficheiro.)
 */
export const BOARD_CONFIG = {
  rows: 8,
  cols: 8,
  elements: ELEMENTS as readonly ElementType[],
} as const;

export const RESOLUTION_LIMITS = {
  /** Limite de segurança de cascatas por jogada (evita ciclos infinitos). */
  maxCascades: 40,
  /** Tentativas de embaralhamento antes de gerar um tabuleiro novo. */
  maxShuffleAttempts: 100,
} as const;

/** Durações das animações, em ms. Curtas de propósito: o jogo deve ser rápido. */
export const TIMINGS = {
  swap: 170,
  invalidSwap: 130,
  matchPop: 110,
  matchVanish: 150,
  fallPerRow: 55,
  fallMin: 150,
  fallMax: 420,
  landBounce: 90,
  cascadePause: 40,
  shuffle: 420,
  reaction: 260,
  feedback: 900,
  /** Multiplicador global aplicado quando “efeitos reduzidos” está ativo. */
  reducedMotionFactor: 0.6,
} as const;

/** Regras das reações elementais (ver GAME_DESIGN.md §9). */
export const ELEMENTAL_RULES = {
  /** Jogadas válidas seguintes durante as quais uma peça fica molhada. */
  wetDuration: 2,
  /** Raio da explosão de vapor: 1 → área 3×3. */
  steamRadius: 1,
  /** Máximo de peças molhadas atingidas por uma corrente elétrica. */
  lightningMaxTiles: 8,
  /** Limites de segurança contra cadeias descontroladas. */
  maxReactionsPerStep: 8,
  maxReactionsPerTurn: 24,
} as const;

/** Pontuação. Todos os valores de pontos vivem aqui. */
export const SCORING = {
  perTile: 20,
  shapeBonus: { line3: 0, line4: 60, line5plus: 150, cross: 100 },
  /** Multiplicador por cascata: passo n vale × (1 + n × cascadeStep). */
  cascadeStep: 0.5,
  reaction: { steam: 120, lightning: 80, lightningPerTile: 25 },
  /** Pontos por peça destruída só por uma reação (fora dos matches). */
  reactionTile: 20,
  /** Bónus por cada jogada que sobra quando o nível é vencido. */
  movesLeftBonus: 80,
} as const;

export const INPUT_CONFIG = {
  /** Fração do tamanho da célula que um arrasto tem de percorrer para contar como swipe. */
  swipeThreshold: 0.3,
} as const;
