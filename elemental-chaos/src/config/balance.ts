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
  /** Multiplicador global aplicado quando “efeitos reduzidos” está ativo. */
  reducedMotionFactor: 0.6,
} as const;

export const INPUT_CONFIG = {
  /** Fração do tamanho da célula que um arrasto tem de percorrer para contar como swipe. */
  swipeThreshold: 0.3,
} as const;
