import { Rng } from '../core/rng';
import { chooseGreedyMove } from '../ai/greedyBot';
import { GameSession } from '../session/GameSession';
import { presetCells } from './levelParser';
import { LevelRun } from './LevelRun';
import type { LevelDefinition } from './types';

export interface SimulationResult {
  readonly won: boolean;
  readonly stars: number;
  readonly score: number;
  readonly movesLeft: number;
}

/** Joga um nível até ao fim com o bot (greedy) ou com jogadas aleatórias. */
export function simulateLevel(level: LevelDefinition, seed: number, strategy: 'greedy' | 'random'): SimulationResult {
  const session = new GameSession({
    seed: level.seed ?? seed,
    elements: level.elements,
    mechanics: level.mechanics,
    ...(level.preset ? { preset: presetCells(level.preset) } : {}),
  });
  const run = new LevelRun(level);
  const pick = new Rng(seed ^ 0x9e3779b9);
  while (run.status === 'playing') {
    const move = strategy === 'greedy' ? chooseGreedyMove(session, run) : pick.pick(session.validMoves());
    if (!move) break;
    run.applyTurn(session.trySwap(move));
  }
  return { won: run.status === 'won', stars: run.stars, score: run.score, movesLeft: run.movesLeft };
}
