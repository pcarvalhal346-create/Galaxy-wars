import { describe, expect, it } from 'vitest';
import { checkBoardInvariants } from '../game/board/invariants';
import { Rng } from '../game/core/rng';
import { ALL_MECHANICS } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import { parseLevel } from '../game/levels/levelParser';
import { LevelRun } from '../game/levels/LevelRun';
import { resolveCascades } from '../game/resolution/turnResolver';
import { GameSession } from '../game/session/GameSession';
import { boardFrom, makeCtx, p } from './helpers';

describe('gelo', () => {
  it('cada célula limpa perde uma camada; o gelo fica na célula, não cai com as peças', () => {
    const b = boardFrom(['AELA', 'FFFW', 'LAEL']);
    b.setIce(p(1, 0), 2);
    b.setIce(p(1, 1), 1);
    b.setIce(p(2, 0), 1); // não é limpa
    const { steps } = resolveCascades(b, makeCtx(1, { maxCascades: 1 }));
    expect(steps[0]?.iceBroken).toEqual([
      { at: p(1, 0), remaining: 1 },
      { at: p(1, 1), remaining: 0 },
    ]);
    expect(b.getIce(p(1, 0))).toBe(1);
    expect(b.getIce(p(1, 1))).toBe(0);
    expect(b.getIce(p(2, 0))).toBe(1);
  });

  it('o gelo mantém-se no embaralhamento e nas cópias', () => {
    const b = boardFrom(['FWLE', 'EAFW', 'FWLE', 'EAFW']);
    b.setIce(p(0, 0), 2);
    expect(b.clone().getIce(p(0, 0))).toBe(2);
    expect(b.emptyLike().getIce(p(0, 0))).toBe(2);
  });

  it('não pode haver gelo em buracos', () => {
    const b = boardFrom(['F#W', 'EAF', 'LWE']);
    expect(() => b.setIce(p(0, 1), 1)).toThrow(/gelo/);
  });

  it('objetivo de gelo: alvo calculado e vitória quando todo o gelo parte', () => {
    const level = parseLevel({
      id: 1, name: 'Gelo', moves: 30, elements: ['fire', 'water', 'lightning', 'earth', 'air'], mechanics: {},
      shape: ['......', '......', '......', '......', '......', '......'],
      ice: ['......', '......', '..22..', '..11..', '......', '......'],
      objectives: [{ type: 'ice' }], stars: [100, 200, 300],
    });
    expect(level.objectives[0]).toEqual({ type: 'ice', target: 4 });
    const s = new GameSession({ seed: 5, shape: level.shape, ice: level.ice ?? [] });
    expect(s.board.icedCells).toBe(4);
    const run = new LevelRun(level);
    const pick = new Rng(2);
    for (let i = 0; i < 30 && run.status === 'playing'; i++) {
      // Prefere jogadas que partem gelo, para o teste ser rápido e determinístico.
      const moves = s.validMoves();
      const best = moves.find((m) => {
        const r = s.preview(m);
        return r.kind === 'resolved' && r.steps.some((st) => st.iceBroken.length > 0);
      });
      run.applyTurn(s.trySwap(best ?? pick.pick(moves)));
      expect(run.progress[0]?.current).toBe(4 - s.board.icedCells);
    }
    expect(run.status).toBe('won');
  });

  it('parser rejeita gelo inválido', () => {
    const base = {
      id: 1, name: 'x', moves: 10, elements: ['fire', 'water', 'lightning'], mechanics: {},
      shape: ['#.....', '......', '......', '......', '......'], objectives: [{ type: 'score', target: 10 }], stars: [1, 2, 3],
    };
    expect(() => parseLevel({ ...base, ice: ['1.....', '......', '......', '......', '......'] })).toThrow(/buraco/);
    expect(() => parseLevel({ ...base, ice: ['.3....', '......', '......', '......', '......'] })).toThrow(/0–2/);
    expect(() => parseLevel({ ...base, objectives: [{ type: 'ice' }] })).toThrow(/sem gelo/);
  });

  it('fuzz com gelo, especiais e reações: invariantes e gelo nunca negativo', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = new GameSession({ seed, mechanics: ALL_MECHANICS, ice: ['22222222', '11111111', '........', '........', '........', '........', '11111111', '22222222'] });
      const pick = new Rng(seed);
      for (let t = 0; t < 25; t++) {
        s.trySwap(pick.pick(s.validMoves()));
        const b = s.board;
        expect(checkBoardInvariants(b)).toEqual([]);
        expect(findMatches(b)).toHaveLength(0);
        for (const q of b.positions()) expect(b.getIce(q)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
