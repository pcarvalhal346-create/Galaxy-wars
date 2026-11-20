import type { ElementType, Swap } from '../core/types';
import type { TurnResult } from '../resolution/turnResolver';
import type { GameSession } from '../session/GameSession';

/**
 * Tutorial guiado (lógica pura). Cada passo mostra uma mensagem da mascote e, se tiver
 * objetivo, aponta uma jogada que o demonstra; só essa jogada é aceite.
 * A jogada é encontrada simulando todas as jogadas válidas com `GameSession.preview`,
 * por isso não depende de tabuleiros desenhados à mão.
 */
export type GuideGoal =
  | 'none' // só mensagem; o jogador toca em "Continuar"
  | 'match' // qualquer combinação
  | 'match4' // combinação de 4+ (ou cruz)
  | 'wet' // combinar Água e molhar cristais
  | 'steam' // provocar uma explosão de vapor
  | 'lightning' // provocar uma corrente elétrica
  | 'special' // criar um cristal especial
  | 'activate' // ativar um cristal especial
  | `collect:${ElementType}`; // eliminar um elemento

/** Para onde a seta/realce aponta enquanto a mensagem está visível. */
export type GuidePoint = 'objectives' | 'moves' | 'score' | 'wet' | 'board';

export interface GuideStep {
  readonly text: string;
  readonly goal: GuideGoal;
  readonly point?: GuidePoint;
  /** Elemento(s) a mostrar ao lado da mensagem (para apresentar os elementos). */
  readonly show?: ElementType | 'all';
}

export const GUIDE_GOALS: readonly string[] = ['none', 'match', 'match4', 'wet', 'steam', 'lightning', 'special', 'activate'];

export function isValidGoal(goal: string, elements: readonly string[]): boolean {
  if (GUIDE_GOALS.includes(goal)) return true;
  const m = /^collect:(\w+)$/.exec(goal);
  return !!m && elements.includes(m[1] as string);
}

/** A jogada cumpriu o objetivo do passo? */
export function goalMet(goal: GuideGoal, result: TurnResult): boolean {
  if (result.kind !== 'resolved') return false;
  const steps = result.steps;
  switch (goal) {
    case 'none':
      return true;
    case 'match':
      return steps.length > 0;
    case 'match4':
      return steps.some((s) => s.matches.some((m) => m.shape !== 'line3'));
    case 'wet':
      return steps.some((s) => s.wetApplied.length > 0);
    case 'steam':
      return steps.some((s) => s.reactions.some((r) => r.kind === 'steam'));
    case 'lightning':
      return steps.some((s) => s.reactions.some((r) => r.kind === 'lightning'));
    case 'special':
      return steps.some((s) => s.specialsCreated.length > 0);
    case 'activate':
      return steps.some((s) => s.activations.length > 0);
    default: {
      const element = goal.slice('collect:'.length);
      return steps.some((s) => s.cleared.some((c) => c.tile.element === element));
    }
  }
}

/** Quão "clara" é a demonstração (maior = melhor). Preferimos jogadas simples e visíveis. */
function demoQuality(goal: GuideGoal, result: TurnResult): number {
  if (result.kind !== 'resolved') return -1;
  const first = result.steps[0];
  if (!first) return -1;
  switch (goal) {
    case 'wet':
      return result.steps.reduce((a, s) => a + s.wetApplied.length, 0);
    case 'steam':
    case 'lightning':
      return result.steps.reduce((a, s) => a + s.reactions.length, 0);
    case 'match4':
      return Math.max(...first.matches.map((m) => m.cells.length));
    case 'special':
      return first.specialsCreated.length * 10 - result.steps.length;
    case 'activate':
      return result.steps.reduce((a, s) => a + s.activations.length, 0);
    default:
      // Para ensinar o básico: o 1.º passo deve conter o objetivo; menos confusão = melhor.
      return 10 - result.steps.length;
  }
}

/** Jogada que demonstra o objetivo, ou null se o tabuleiro atual não o permitir. */
export function findDemoMove(session: GameSession, goal: GuideGoal): Swap | null {
  if (goal === 'none') return null;
  let best: Swap | null = null;
  let bestQ = -Infinity;
  for (const move of session.validMoves()) {
    const r = session.preview(move);
    if (!goalMet(goal, r)) continue;
    const q = demoQuality(goal, r);
    if (q > bestQ) {
      bestQ = q;
      best = move;
    }
  }
  return best;
}

export const sameSwap = (a: Swap, b: Swap): boolean =>
  (a.a.row === b.a.row && a.a.col === b.a.col && a.b.row === b.b.row && a.b.col === b.b.col) ||
  (a.a.row === b.b.row && a.a.col === b.b.col && a.b.row === b.a.row && a.b.col === b.a.col);

/** Estado do tutorial durante um nível. */
export class GuideRun {
  private index = 0;

  constructor(readonly steps: readonly GuideStep[]) {}

  get current(): GuideStep | null {
    return this.steps[this.index] ?? null;
  }

  get done(): boolean {
    return this.index >= this.steps.length;
  }

  get position(): number {
    return this.index;
  }

  /** Passo só de mensagem: o jogador tocou em "Continuar". */
  dismiss(): void {
    if (this.current?.goal === 'none') this.index++;
  }

  /** Depois de cada jogada: avança se o objetivo do passo atual foi cumprido. */
  onTurn(result: TurnResult): boolean {
    const step = this.current;
    if (!step || step.goal === 'none') return false;
    if (!goalMet(step.goal, result)) return false;
    this.index++;
    return true;
  }
}
