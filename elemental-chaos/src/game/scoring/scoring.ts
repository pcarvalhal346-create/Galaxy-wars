import { SCORING } from '../../config/balance';
import type { CascadeStep, TurnResult } from '../resolution/turnResolver';

export type ScoringConfig = typeof SCORING;

/** Pontos de um passo de cascata (matches + reações), já com o multiplicador de cascata. */
export function scoreStep(step: CascadeStep, cfg: ScoringConfig = SCORING): number {
  let base = 0;
  for (const g of step.matches) base += g.cells.length * cfg.perTile + cfg.shapeBonus[g.shape];
  for (const r of step.reactions) {
    base += r.kind === 'steam' ? cfg.reaction.steam : cfg.reaction.lightning + r.path.length * cfg.reaction.lightningPerTile;
  }
  base += step.cleared.filter((c) => c.cause !== 'match').length * cfg.reactionTile;
  return Math.round(base * (1 + step.index * cfg.cascadeStep));
}

export type Feedback = 'GOOD' | 'GREAT' | 'AMAZING' | 'ELEMENTAL_CHAOS';

export const FEEDBACK_TEXT: Readonly<Record<Feedback, string>> = {
  GOOD: 'GOOD!',
  GREAT: 'GREAT!',
  AMAZING: 'AMAZING!',
  ELEMENTAL_CHAOS: 'ELEMENTAL CHAOS!',
};

/**
 * Mensagem de elogio para uma jogada (no máximo uma, só para jogadas especiais).
 * Prioridade: Elemental Chaos > Amazing > Great > Good > nada.
 */
export function feedbackFor(result: TurnResult): Feedback | null {
  if (result.kind !== 'resolved') return null;
  const steps = result.steps.length;
  const reactions = result.steps.flatMap((s) => s.reactions);
  const kinds = new Set(reactions.map((r) => r.kind));
  const longestChain = Math.max(0, ...reactions.map((r) => (r.kind === 'lightning' ? r.path.length : 0)));
  const special = result.steps.some((s) => s.matches.some((m) => m.shape === 'line5plus' || m.shape === 'cross'));
  if (kinds.size >= 2 || reactions.length >= 3) return 'ELEMENTAL_CHAOS';
  if (steps >= 4 || longestChain >= 5) return 'AMAZING';
  if (steps === 3 || reactions.length > 0) return 'GREAT';
  if (steps === 2 || special) return 'GOOD';
  return null;
}
