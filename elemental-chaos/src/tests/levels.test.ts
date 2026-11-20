import { describe, expect, it } from 'vitest';
import rawLevels from '../data/levels.json';
import { SCORING } from '../config/balance';
import { generateBoard } from '../game/board/generator';
import { IdSource } from '../game/core/ids';
import { Rng } from '../game/core/rng';
import { ELEMENTS, type Position } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import { LEVELS } from '../game/levels/catalog';
import { LevelError, parseLevel, parseLevels, presetCells } from '../game/levels/levelParser';
import { LevelRun } from '../game/levels/LevelRun';
import { simulateLevel } from '../game/levels/simulate';
import type { LevelDefinition } from '../game/levels/types';
import type { CascadeStep, TurnResult } from '../game/resolution/turnResolver';
import { scoreStep } from '../game/scoring/scoring';

const base = {
  id: 1,
  name: 'Teste',
  moves: 10,
  elements: ['fire', 'water', 'lightning', 'earth', 'air'],
  mechanics: { wet: true, steam: true, lightning: true },
  objectives: [{ type: 'score', target: 100 }],
  stars: [100, 200, 300],
};

describe('dados dos níveis', () => {
  it('os 5 níveis incluídos são válidos e seguem a curva de aprendizagem', () => {
    expect(LEVELS).toHaveLength(5);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
    const m = LEVELS.map((l) => l.mechanics);
    expect(m[0]).toEqual({ wet: false, steam: false, lightning: false });
    expect(m[1]).toEqual({ wet: false, steam: false, lightning: false });
    expect(m[2]).toEqual({ wet: true, steam: false, lightning: false });
    expect(m[3]).toEqual({ wet: true, steam: true, lightning: false });
    expect(m[4]).toEqual({ wet: true, steam: true, lightning: true });
    expect(LEVELS[1]?.objectives.some((o) => o.type === 'collect')).toBe(true);
    expect(LEVELS[3]?.objectives.some((o) => o.type === 'reactions' && o.reaction === 'steam')).toBe(true);
    expect(LEVELS[4]?.objectives.some((o) => o.type === 'reactions' && o.reaction === 'lightning')).toBe(true);
  });

  it('rejeita dados inválidos com mensagens claras', () => {
    const bad = (patch: object) => () => parseLevel({ ...base, ...patch });
    expect(bad({ moves: 0 })).toThrow(LevelError);
    expect(bad({ elements: ['fire', 'water'] })).toThrow(/3 elementos/);
    expect(bad({ elements: ['fire', 'water', 'plasma'] })).toThrow(/desconhecido/);
    expect(bad({ objectives: [] })).toThrow(/objetivos/);
    expect(bad({ objectives: [{ type: 'collect', element: 'air', target: 5 }], elements: ['fire', 'water', 'lightning'] })).toThrow(/indisponível/);
    expect(bad({ mechanics: { wet: true }, objectives: [{ type: 'reactions', reaction: 'steam', target: 1 }] })).toThrow(/desligada/);
    expect(bad({ mechanics: { steam: true } })).toThrow(/exigem wet/);
    expect(bad({ stars: [300, 200, 100] })).toThrow(/crescentes/);
    expect(bad({ preset: ['FFF'] })).toThrow(/preset/);
    expect(bad({ theme: 'lava' })).toThrow(/tema/);
    expect(() => parseLevels([{ ...base, id: 2 }])).toThrow(/sequenciais/);
  });

  it('o ficheiro JSON e o catálogo coincidem', () => {
    expect(parseLevels(rawLevels)).toEqual(LEVELS);
  });

  it('preset fixa células e o resto continua sem matches', () => {
    const preset = presetCells(['FW......', '........', '........', '........', '........', '........', '........', '.......A']);
    const b = generateBoard({ rows: 8, cols: 8, elements: ELEMENTS, rng: new Rng(3), ids: new IdSource(), preset });
    expect(b.require({ row: 0, col: 0 }).element).toBe('fire');
    expect(b.require({ row: 0, col: 1 }).element).toBe('water');
    expect(b.require({ row: 7, col: 7 }).element).toBe('air');
    expect(findMatches(b)).toHaveLength(0);
  });
});

// TurnResult sintético para testar regras de nível isoladamente.
function turn(cleared: { element: 'fire' | 'water' | 'earth'; n: number }[], reactions: ('steam' | 'lightning')[] = []): TurnResult {
  const at: Position = { row: 0, col: 0 };
  const step: CascadeStep = {
    index: 0,
    matches: [],
    reactions: reactions.map((k) =>
      k === 'steam'
        ? { kind: 'steam', group: 0, center: at, centerId: 1, area: [at] }
        : { kind: 'lightning', group: 0, path: [at], links: [] },
    ),
    cleared: cleared.flatMap(({ element, n }) => Array.from({ length: n }, (_, i) => ({ tile: { id: i, element }, at, cause: 'match' as const }))),
    wetApplied: [],
    falls: [],
    spawns: [],
  };
  return { kind: 'resolved', swap: { a: at, b: at }, steps: [step], wetTicks: [], shuffle: null, hitCascadeLimit: false };
}

describe('LevelRun: objetivos, vitória e derrota', () => {
  const level: LevelDefinition = {
    ...(parseLevel(base) as LevelDefinition),
    moves: 3,
    objectives: [
      { type: 'collect', element: 'fire', target: 5 },
      { type: 'reactions', reaction: 'steam', target: 1 },
    ],
  };

  it('conta recolhas e reações, e vence quando todos os objetivos estão cumpridos', () => {
    const run = new LevelRun(level);
    run.applyTurn(turn([{ element: 'fire', n: 3 }, { element: 'water', n: 3 }]));
    expect(run.progress.map((p) => p.current)).toEqual([3, 0]);
    expect(run.status).toBe('playing');
    const s = run.applyTurn(turn([{ element: 'fire', n: 4 }], ['steam', 'lightning']));
    expect(run.progress.map((p) => p.current)).toEqual([5, 1]); // limitado ao alvo
    expect(s.status).toBe('won');
    expect(s.winBonus).toBe(1 * SCORING.movesLeftBonus);
    expect(run.stars).toBeGreaterThanOrEqual(1);
  });

  it('perde quando as jogadas acabam sem cumprir os objetivos', () => {
    const run = new LevelRun(level);
    for (let i = 0; i < 3; i++) run.applyTurn(turn([{ element: 'earth', n: 3 }]));
    expect(run.movesLeft).toBe(0);
    expect(run.status).toBe('lost');
    expect(run.stars).toBe(0);
    // Depois de terminado, mais jogadas são ignoradas.
    expect(run.applyTurn(turn([{ element: 'fire', n: 9 }])).scoreGained).toBe(0);
  });

  it('trocas inválidas não gastam jogadas', () => {
    const run = new LevelRun(level);
    run.applyTurn({ kind: 'invalid', swap: { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } }, reason: 'no-match' });
    expect(run.movesLeft).toBe(3);
  });

  it('estrelas pelos limites de pontuação', () => {
    const run = new LevelRun({ ...level, objectives: [{ type: 'score', target: 1 }], stars: [1, 50, 100000] });
    run.applyTurn(turn([{ element: 'fire', n: 3 }], ['steam']));
    expect(run.status).toBe('won');
    expect(run.stars).toBe(2);
  });
});

describe('pontuação', () => {
  const g = (shape: 'line3' | 'line4' | 'line5plus' | 'cross', n: number) => ({
    element: 'fire' as const,
    runs: [],
    cells: Array.from({ length: n }, (_, col) => ({ row: 0, col })),
    shape,
  });
  const step = (index: number, matches: ReturnType<typeof g>[]): CascadeStep => ({
    index, matches, reactions: [], cleared: [], wetApplied: [], falls: [], spawns: [],
  });

  it('3 < 4 < 5 e cascatas multiplicam', () => {
    const s3 = scoreStep(step(0, [g('line3', 3)]));
    const s4 = scoreStep(step(0, [g('line4', 4)]));
    const s5 = scoreStep(step(0, [g('line5plus', 5)]));
    expect(s3).toBe(3 * SCORING.perTile);
    expect(s4).toBeGreaterThan(s3);
    expect(s5).toBeGreaterThan(s4);
    expect(scoreStep(step(2, [g('line3', 3)]))).toBe(Math.round(s3 * (1 + 2 * SCORING.cascadeStep)));
  });
});

describe('equilíbrio (bot greedy com 1 jogada de antecipação)', () => {
  for (const level of LEVELS) {
    it(`nível ${level.id} é vencível de forma consistente`, () => {
      const results = Array.from({ length: 20 }, (_, i) => simulateLevel(level, 1000 + i, 'greedy'));
      expect(results.filter((r) => r.won).length).toBeGreaterThanOrEqual(18);
    }, 30000);
  }

  it('a partir do nível 2 jogar ao acaso não chega para ganhar sempre', () => {
    for (const level of LEVELS.slice(1)) {
      const wins = Array.from({ length: 20 }, (_, i) => simulateLevel(level, 2000 + i, 'random')).filter((r) => r.won).length;
      expect(wins, `nível ${level.id}`).toBeLessThan(20);
    }
  }, 30000);
});
