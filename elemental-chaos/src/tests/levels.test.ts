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
  it('os 30 níveis são válidos; os 5 primeiros são tutoriais que seguem a curva de aprendizagem', () => {
    expect(LEVELS).toHaveLength(30);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    // Todos diferentes: forma, gelo ou tamanho variam a partir do nível 6.
    for (const l of LEVELS.slice(5)) {
      const varied = l.shape.join('').includes('#') || !!l.ice || l.shape.length !== 8;
      expect(varied, `nível ${l.id}`).toBe(true);
    }
    expect(LEVELS.filter((l) => l.objectives.some((o) => o.type === 'ice')).length).toBeGreaterThanOrEqual(8);
    for (const l of LEVELS.slice(0, 5)) {
      expect(l.guide?.length, `nível ${l.id}`).toBeGreaterThan(0);
      expect(l.seed, `nível ${l.id}: tutorial com tabuleiro fixo`).toBeDefined();
    }
    // Tutoriais começam pequenos; os níveis seguintes usam formas diferentes.
    expect(LEVELS[0]?.shape.length).toBe(6);
    expect(LEVELS[1]?.shape.length).toBe(7);
    expect(LEVELS.slice(5, 10).every((l) => l.shape.join('').includes('#'))).toBe(true);
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
    expect(bad({ shape: ['....', '....', '....', '....'] })).toThrow(/entre 5 e 9/);
    expect(bad({ shape: ['......', '.....', '......', '......', '......'] })).toThrow(/larguras/);
    expect(bad({ shape: ['#####', '#####', '#####', '#...#', '#...#'] })).toThrow(/20 células/);
    expect(bad({ shape: ['.....x', '......', '......', '......', '......'] })).toThrow(/só aceita/);
    expect(bad({ shape: ['#.....', '......', '......', '......', '......'], preset: ['F.....', '......', '......', '......', '......'] })).toThrow(/não coincide/);
    expect(bad({ guide: [{ text: 'x', goal: 'voar' }] })).toThrow(/tutorial inválido/);
    expect(bad({ mechanics: {}, guide: [{ text: 'x', goal: 'steam' }] })).toThrow(/mecânica desligada/);
    expect(bad({ guide: [{ goal: 'match' }] })).toThrow(/sem texto/);
    expect(() => parseLevels([{ ...base, id: 2 }])).toThrow(/sequenciais/);
  });

  it('o ficheiro JSON e o catálogo coincidem', () => {
    expect(parseLevels(rawLevels)).toEqual(LEVELS);
  });

  it('preset fixa células e o resto continua sem matches', () => {
    const preset = presetCells(['FW......', '........', '........', '........', '........', '........', '........', '.......A']);
    const b = generateBoard({ rows: 8, cols: 8, elements: ELEMENTS, rng: new Rng(3), ids: new IdSource(), preset });
    expect(b.rows).toBe(8);
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
    specialsCreated: [],
    activations: [],
    iceBroken: [],
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
    index, matches, reactions: [], cleared: [], wetApplied: [], specialsCreated: [], activations: [], iceBroken: [], falls: [], spawns: [],
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

describe('tutoriais e equilíbrio', () => {
  for (const level of LEVELS.filter((l) => l.guide)) {
    it(`nível ${level.id}: o tutorial mostra sempre a jogada pedida em cada passo`, () => {
      for (const strat of ['greedy', 'random'] as const) {
        const r = simulateLevel(level, 7, strat);
        expect(r.guideCompleted, strat).toBe(true);
      }
    });
  }

  for (const level of LEVELS) {
    it(`nível ${level.id} é vencível de forma consistente (bot greedy)`, () => {
      const results = Array.from({ length: 12 }, (_, i) => simulateLevel(level, 1000 + i, 'greedy'));
      // Tutoriais quase sempre; níveis difíceis pelo menos 3 em 4.
      expect(results.filter((r) => r.won).length).toBeGreaterThanOrEqual(level.id <= 5 ? 11 : 9);
    }, 60000);
  }

  it('a dificuldade sobe: jogar ao acaso ganha muito menos nos níveis 6–10 do que nos tutoriais', () => {
    const rate = (ids: number[]) => {
      let wins = 0;
      for (const id of ids) {
        const level = LEVELS[id - 1] as LevelDefinition;
        for (let i = 0; i < 12; i++) if (simulateLevel(level, 3000 + i, 'random').won) wins++;
      }
      return wins / (ids.length * 12);
    };
    const tutorials = rate([1, 2, 3, 4, 5]);
    const later = rate([6, 7, 8, 9, 10]);
    const chaos = rate([21, 22, 23, 24, 25, 27, 29, 30]);
    expect(tutorials).toBeGreaterThan(0.7);
    expect(later).toBeLessThan(tutorials - 0.3);
    expect(chaos).toBeLessThan(0.2);
  }, 120000);
});
