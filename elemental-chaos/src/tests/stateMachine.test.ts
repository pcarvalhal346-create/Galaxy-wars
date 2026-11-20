import { describe, expect, it } from 'vitest';
import { PhaseMachine, type GamePhase } from '../game/resolution/stateMachine';

describe('máquina de estados', () => {
  it('percorre o ciclo completo de uma jogada com cascata e reação', () => {
    const m = new PhaseMachine();
    const path: GamePhase[] = [
      'SWAPPING', 'MATCHING', 'CLEARING', 'FALLING', 'REFILLING', 'CHECKING',
      'MATCHING', 'REACTING', 'CLEARING', 'FALLING', 'REFILLING', 'CHECKING', 'IDLE',
    ];
    for (const ph of path) m.transition(ph);
    expect(m.phase).toBe('IDLE');
  });

  it('só aceita input em IDLE', () => {
    const m = new PhaseMachine();
    expect(m.acceptsInput).toBe(true);
    m.transition('SWAPPING');
    expect(m.acceptsInput).toBe(false);
  });

  it('troca inválida volta de SWAPPING a IDLE', () => {
    const m = new PhaseMachine();
    m.transition('SWAPPING');
    m.transition('IDLE');
    expect(m.phase).toBe('IDLE');
  });

  it('rejeita transições ilegais', () => {
    const m = new PhaseMachine();
    expect(() => m.transition('FALLING')).toThrow(/inválida/);
    m.transition('SWAPPING');
    expect(() => m.transition('SWAPPING')).toThrow();
  });

  it('notifica listeners e permite remover', () => {
    const m = new PhaseMachine();
    const seen: string[] = [];
    const off = m.onChange((a, b) => seen.push(`${a}>${b}`));
    m.transition('SWAPPING');
    off();
    m.transition('IDLE');
    expect(seen).toEqual(['IDLE>SWAPPING']);
  });
});
