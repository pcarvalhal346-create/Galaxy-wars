import { describe, expect, it } from 'vitest';
import { ALL_MECHANICS } from '../game/core/types';
import { GameSession } from '../game/session/GameSession';
import { findDemoMove, goalMet, GuideRun, isValidGoal, sameSwap, type GuideGoal } from '../game/tutorial/guide';
import { p } from './helpers';

describe('tutorial guiado', () => {
  it('a jogada demonstrada cumpre mesmo o objetivo do passo', () => {
    const goals: GuideGoal[] = ['match', 'match4', 'wet', 'steam', 'lightning', 'collect:earth'];
    for (const goal of goals) {
      let found = 0;
      for (let seed = 1; seed <= 15; seed++) {
        const s = new GameSession({ seed, mechanics: ALL_MECHANICS });
        // Prepara Wet para que vapor e raio sejam possíveis.
        if (goal === 'steam' || goal === 'lightning') {
          const w = findDemoMove(s, 'wet');
          if (w) s.trySwap(w);
        }
        const move = findDemoMove(s, goal);
        if (!move) continue;
        found++;
        expect(goalMet(goal, s.preview(move)), `${goal} seed ${seed}`).toBe(true);
        expect(goalMet(goal, s.trySwap(move))).toBe(true);
      }
      expect(found, goal).toBeGreaterThan(0);
    }
  });

  it('GuideRun avança só quando o objetivo é cumprido; mensagens avançam ao tocar', () => {
    const g = new GuideRun([
      { text: 'olá', goal: 'none' },
      { text: 'molha', goal: 'wet' },
      { text: 'fim', goal: 'none' },
    ]);
    expect(g.current?.text).toBe('olá');
    g.dismiss();
    const s = new GameSession({ seed: 4, mechanics: ALL_MECHANICS });
    const plain = s.validMoves().find((m) => !goalMet('wet', s.preview(m)));
    if (plain) {
      expect(g.onTurn(s.preview(plain))).toBe(false);
      expect(g.current?.goal).toBe('wet');
    }
    const wet = findDemoMove(s, 'wet');
    expect(wet).not.toBeNull();
    expect(g.onTurn(s.trySwap(wet as NonNullable<typeof wet>))).toBe(true);
    g.dismiss(); // dismiss num passo com objetivo não faz nada; aqui o passo é 'none'
    expect(g.done).toBe(true);
  });

  it('valida objetivos e compara trocas nos dois sentidos', () => {
    expect(isValidGoal('collect:fire', ['fire'])).toBe(true);
    expect(isValidGoal('collect:air', ['fire'])).toBe(false);
    expect(isValidGoal('voar', ['fire'])).toBe(false);
    expect(sameSwap({ a: p(0, 0), b: p(0, 1) }, { a: p(0, 1), b: p(0, 0) })).toBe(true);
    expect(sameSwap({ a: p(0, 0), b: p(0, 1) }, { a: p(0, 0), b: p(1, 0) })).toBe(false);
  });
});
