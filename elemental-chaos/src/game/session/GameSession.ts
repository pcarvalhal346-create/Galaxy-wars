import { BOARD_CONFIG, RESOLUTION_LIMITS } from '../../config/balance';
import { Board } from '../board/Board';
import { generateBoard } from '../board/generator';
import { IdSource } from '../core/ids';
import { Rng } from '../core/rng';
import type { ElementType, Swap } from '../core/types';
import { findValidMoves } from '../matching/moveFinder';
import { resolveSwap, type ResolverContext, type TurnResult } from '../resolution/turnResolver';

export interface SessionOptions {
  seed: number;
  rows?: number;
  cols?: number;
  elements?: readonly ElementType[];
}

/**
 * Estado lógico de uma partida: tabuleiro, RNG e contadores.
 * É a única porta de entrada da camada de apresentação para alterar o jogo.
 */
export class GameSession {
  readonly seed: number;
  private readonly rng: Rng;
  private readonly ids = new IdSource();
  private readonly ctx: ResolverContext;
  private boardState: Board;
  private moves = 0;

  constructor(opts: SessionOptions) {
    this.seed = opts.seed;
    this.rng = new Rng(opts.seed);
    const elements = opts.elements ?? BOARD_CONFIG.elements;
    this.ctx = {
      rng: this.rng,
      ids: this.ids,
      elements,
      maxCascades: RESOLUTION_LIMITS.maxCascades,
      maxShuffleAttempts: RESOLUTION_LIMITS.maxShuffleAttempts,
    };
    this.boardState = generateBoard({
      rows: opts.rows ?? BOARD_CONFIG.rows,
      cols: opts.cols ?? BOARD_CONFIG.cols,
      elements,
      rng: this.rng,
      ids: this.ids,
    });
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
    const result = resolveSwap(this.boardState, swap, this.ctx);
    if (result.kind === 'resolved') this.moves++;
    return result;
  }

  /** Sugestão de jogada (para dica futura / testes). */
  hint(): Swap | null {
    return findValidMoves(this.boardState, 1)[0] ?? null;
  }
}
