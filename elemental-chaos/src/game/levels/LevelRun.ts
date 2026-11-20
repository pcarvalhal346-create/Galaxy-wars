import type { LevelDefinition, Objective } from './types';
import type { TurnResult } from '../resolution/turnResolver';
import { SCORING } from '../../config/balance';
import { feedbackFor, scoreStep, type Feedback } from '../scoring/scoring';

export type RunStatus = 'playing' | 'won' | 'lost';

export interface ObjectiveProgress {
  readonly objective: Objective;
  readonly current: number;
  readonly done: boolean;
}

export interface TurnSummary {
  /** Pontos de cada passo de cascata (mesma ordem de result.steps). */
  readonly stepScores: readonly number[];
  readonly scoreGained: number;
  readonly feedback: Feedback | null;
  readonly status: RunStatus;
  /** Bónus de jogadas restantes (só na jogada que vence o nível). */
  readonly winBonus: number;
}

/**
 * Regras de um nível em curso: jogadas restantes, pontuação, objetivos, vitória/derrota.
 * Puro e sem Phaser; alimentado pelos TurnResult da GameSession.
 */
export class LevelRun {
  private moves: number;
  private points = 0;
  private readonly counters: number[];
  private state: RunStatus = 'playing';

  constructor(readonly level: LevelDefinition) {
    this.moves = level.moves;
    this.counters = level.objectives.map(() => 0);
  }

  get movesLeft(): number {
    return this.moves;
  }

  get score(): number {
    return this.points;
  }

  get status(): RunStatus {
    return this.state;
  }

  get progress(): ObjectiveProgress[] {
    return this.level.objectives.map((objective, i) => {
      const current = objective.type === 'score' ? this.points : (this.counters[i] ?? 0);
      return { objective, current: Math.min(current, objective.target), done: current >= objective.target };
    });
  }

  /** Estrelas: 0 se não venceu; senão pelo menos 1, conforme os limites de pontuação. */
  get stars(): 0 | 1 | 2 | 3 {
    if (this.state !== 'won') return 0;
    const [, two, three] = this.level.stars;
    if (this.points >= three) return 3;
    if (this.points >= two) return 2;
    return 1;
  }

  applyTurn(result: TurnResult): TurnSummary {
    if (this.state !== 'playing' || result.kind !== 'resolved') {
      return { stepScores: [], scoreGained: 0, feedback: null, status: this.state, winBonus: 0 };
    }
    this.moves--;
    const stepScores = result.steps.map((s) => scoreStep(s));
    const gained = stepScores.reduce((a, b) => a + b, 0);
    this.points += gained;

    this.level.objectives.forEach((o, i) => {
      let add = 0;
      for (const step of result.steps) {
        if (o.type === 'collect') add += step.cleared.filter((c) => c.tile.element === o.element).length;
        if (o.type === 'reactions') add += step.reactions.filter((r) => o.reaction === 'any' || r.kind === o.reaction).length;
      }
      this.counters[i] = (this.counters[i] ?? 0) + add;
    });

    let winBonus = 0;
    if (this.progress.every((p) => p.done)) {
      this.state = 'won';
      winBonus = this.moves * SCORING.movesLeftBonus;
      this.points += winBonus;
    } else if (this.moves <= 0) {
      this.state = 'lost';
    }
    return { stepScores, scoreGained: gained, feedback: feedbackFor(result), status: this.state, winBonus };
  }
}
