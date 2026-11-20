import { BOARD_CONFIG, RESOLUTION_LIMITS } from '../../config/balance';
import { Board } from '../board/Board';
import { generateBoard } from '../board/generator';
import { IdSource } from '../core/ids';
import { Rng } from '../core/rng';
import { NO_MECHANICS, type ElementType, type Mechanics, type Swap } from '../core/types';
import { findValidMoves } from '../matching/moveFinder';
import { resolveSwap, type ResolverContext, type TurnResult } from '../resolution/turnResolver';

export interface SessionOptions {
  seed: number;
  rows?: number;
  cols?: number;
  elements?: readonly ElementType[];
  mechanics?: Mechanics;
  preset?: readonly (readonly (ElementType | null)[])[];
}

/**
 * Estado lógico do tabuleiro de uma partida: tabuleiro, RNG e IDs.
 * É a única porta de entrada da camada de apresentação para alterar o tabuleiro.
 * (Objetivos, jogadas restantes e pontuação vivem em LevelRun.)
 */
export class GameSession {
  readonly seed: number;
  readonly mechanics: Mechanics;
  private rng: Rng;
  private ids: IdSource;
  private readonly elements: readonly ElementType[];
  private boardState: Board;
  private moves = 0;

  constructor(opts: SessionOptions) {
    this.seed = opts.seed;
    this.rng = new Rng(opts.seed);
    this.ids = new IdSource();
    this.elements = opts.elements ?? BOARD_CONFIG.elements;
    this.mechanics = opts.mechanics ?? NO_MECHANICS;
    this.boardState = generateBoard({
      rows: opts.rows ?? BOARD_CONFIG.rows,
      cols: opts.cols ?? BOARD_CONFIG.cols,
      elements: this.elements,
      rng: this.rng,
      ids: this.ids,
      ...(opts.preset ? { preset: opts.preset } : {}),
    });
  }

  private context(rng: Rng, ids: IdSource): ResolverContext {
    return {
      rng,
      ids,
      elements: this.elements,
      mechanics: this.mechanics,
      maxCascades: RESOLUTION_LIMITS.maxCascades,
      maxShuffleAttempts: RESOLUTION_LIMITS.maxShuffleAttempts,
    };
  }

  /** Cópia só de leitura do tabuleiro atual (a apresentação nunca altera o original). */
  get board(): Board {
    return this.boardState.clone();
  }

  get movesMade(): number {
    return this.moves;
  }

  /** Tenta uma troca. Só uma troca válida consome uma jogada; cascatas não consomem. */
  trySwap(swap: Swap): TurnResult {
    const result = resolveSwap(this.boardState, swap, this.context(this.rng, this.ids));
    if (result.kind === 'resolved') this.moves++;
    return result;
  }

  /** Simula uma troca sem alterar a sessão (mesmo resultado que trySwap daria agora). */
  preview(swap: Swap): TurnResult {
    return resolveSwap(this.boardState.clone(), swap, this.context(this.rng.clone(), this.ids.clone()));
  }

  validMoves(): Swap[] {
    return findValidMoves(this.boardState);
  }

  /** Sugestão de jogada (para dica futura / testes). */
  hint(): Swap | null {
    return findValidMoves(this.boardState, 1)[0] ?? null;
  }
}
