import { Rng } from '../core/rng';
import { chooseGreedyMove } from '../ai/greedyBot';
import { GameSession } from '../session/GameSession';
import { findDemoMove, GuideRun } from '../tutorial/guide';
import { presetCells } from './levelParser';
import { LevelRun } from './LevelRun';
import type { LevelDefinition } from './types';

export interface SimulationResult {
  readonly won: boolean;
  readonly stars: number;
  readonly score: number;
  readonly movesLeft: number;
  /** O tutorial guiado conseguiu mostrar todas as jogadas pedidas? */
  readonly guideCompleted: boolean;
}

export function createSession(level: LevelDefinition, seed: number): GameSession {
  return new GameSession({
    seed: level.seed ?? seed,
    elements: level.elements,
    mechanics: level.mechanics,
    shape: level.shape,
    ...(level.ice ? { ice: level.ice } : {}),
    ...(level.preset ? { preset: presetCells(level.preset) } : {}),
  });
}

/**
 * Joga um nível até ao fim: primeiro segue o tutorial (jogadas demonstradas), depois usa
 * o bot (greedy) ou jogadas aleatórias.
 */
export function simulateLevel(level: LevelDefinition, seed: number, strategy: 'greedy' | 'random'): SimulationResult {
  const session = createSession(level, seed);
  const run = new LevelRun(level);
  const guide = new GuideRun(level.guide ?? []);
  const pick = new Rng(seed ^ 0x9e3779b9);
  let guideStuck = false;
  while (run.status === 'playing') {
    while (guide.current?.goal === 'none') guide.dismiss();
    let move = guide.done ? null : findDemoMove(session, guide.current?.goal ?? 'none');
    if (!guide.done && !move) guideStuck = true;
    move ??= strategy === 'greedy' ? chooseGreedyMove(session, run) : pick.pick(session.validMoves());
    if (!move) break;
    const result = session.trySwap(move);
    guide.onTurn(result);
    run.applyTurn(result);
  }
  while (guide.current?.goal === 'none') guide.dismiss();
  return { won: run.status === 'won', stars: run.stars, score: run.score, movesLeft: run.movesLeft, guideCompleted: guide.done && !guideStuck };
}
