/**
 * Máquina de estados de uma jogada.
 * IDLE → SWAPPING → MATCHING → (REACTING) → CLEARING → FALLING → REFILLING → CHECKING → IDLE
 * CHECKING pode voltar a MATCHING (cascata) ou passar a SHUFFLING se não houver jogadas.
 * O input do jogador só é aceite em IDLE.
 */
export type GamePhase =
  | 'IDLE'
  | 'SWAPPING'
  | 'MATCHING'
  | 'REACTING'
  | 'CLEARING'
  | 'FALLING'
  | 'REFILLING'
  | 'CHECKING'
  | 'SHUFFLING';

const TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  IDLE: ['SWAPPING', 'SHUFFLING'],
  // Troca inválida volta diretamente a IDLE (com animação de reversão).
  SWAPPING: ['MATCHING', 'IDLE'],
  // REACTING é opcional: só existe quando há reações elementais (Fase 2).
  MATCHING: ['REACTING', 'CLEARING'],
  REACTING: ['CLEARING'],
  CLEARING: ['FALLING'],
  FALLING: ['REFILLING'],
  REFILLING: ['CHECKING'],
  CHECKING: ['MATCHING', 'SHUFFLING', 'IDLE'],
  SHUFFLING: ['IDLE'],
};

export type PhaseListener = (from: GamePhase, to: GamePhase) => void;

export class PhaseMachine {
  private current: GamePhase = 'IDLE';
  private readonly listeners = new Set<PhaseListener>();

  get phase(): GamePhase {
    return this.current;
  }

  get acceptsInput(): boolean {
    return this.current === 'IDLE';
  }

  canTransition(to: GamePhase): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  transition(to: GamePhase): void {
    if (!this.canTransition(to)) {
      throw new Error(`Transição de fase inválida: ${this.current} → ${to}`);
    }
    const from = this.current;
    this.current = to;
    for (const l of this.listeners) l(from, to);
  }

  /** Recuperação de erro: força IDLE (ex.: cena reiniciada a meio de uma animação). */
  reset(): void {
    this.current = 'IDLE';
  }

  onChange(listener: PhaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
