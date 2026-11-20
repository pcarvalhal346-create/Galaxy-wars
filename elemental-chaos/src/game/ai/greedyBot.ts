import type { Swap } from '../core/types';
import type { LevelRun } from '../levels/LevelRun';
import type { TurnResult } from '../resolution/turnResolver';
import { scoreStep } from '../scoring/scoring';
import type { GameSession } from '../session/GameSession';

/**
 * Jogador automático simples (1 jogada de antecipação), usado para equilibrar níveis
 * e, no futuro, para dicas. Valoriza o que faz avançar os objetivos por cumprir.
 */
export function evaluateTurn(result: TurnResult, run: LevelRun): number {
  if (result.kind !== 'resolved') return -Infinity;
  let value = 0;
  for (const step of result.steps) value += scoreStep(step) * 0.05;
  for (const p of run.progress) {
    if (p.done) continue;
    const o = p.objective;
    for (const step of result.steps) {
      if (o.type === 'collect') value += step.cleared.filter((c) => c.tile.element === o.element).length * 10;
      if (o.type === 'reactions') value += step.reactions.filter((r) => o.reaction === 'any' || r.kind === o.reaction).length * 60;
      // Preparar reações: molhar peças vale alguma coisa quando o objetivo as pede.
      if (o.type === 'reactions') value += step.wetApplied.length * 3;
    }
  }
  return value;
}

export function chooseGreedyMove(session: GameSession, run: LevelRun): Swap | null {
  let best: Swap | null = null;
  let bestValue = -Infinity;
  for (const move of session.validMoves()) {
    const v = evaluateTurn(session.preview(move), run);
    if (v > bestValue) {
      bestValue = v;
      best = move;
    }
  }
  return best;
}
