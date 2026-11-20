import { describe, expect, it } from 'vitest';
import { checkBoardInvariants } from '../game/board/invariants';
import { Rng } from '../game/core/rng';
import { ALL_MECHANICS, type SpecialKind } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import { findValidMoves, isValidSwap } from '../game/matching/moveFinder';
import { resolveCascades, resolveSwap } from '../game/resolution/turnResolver';
import { feedbackFor, scoreStep } from '../game/scoring/scoring';
import { GameSession } from '../game/session/GameSession';
import { mostCommonElement } from '../game/specials/specials';
import type { Board } from '../game/board/Board';
import { boardFrom, makeCtx, p } from './helpers';

const special = (b: Board, at: { row: number; col: number }, kind: SpecialKind) => b.set(at, { ...b.require(at), special: kind });

describe('criação de cristais especiais', () => {
  it('4 em linha horizontal cria uma Lança horizontal na célula da troca', () => {
    // Trocar (1,3)<->(0,3) completa FFFF na linha 0.
    const b = boardFrom(['FFFWA', 'LEAFE', 'WAELW']);
    const r = resolveSwap(b, { a: p(1, 3), b: p(0, 3) }, makeCtx(1, { maxCascades: 1 }));
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;
    const step = r.steps[0];
    expect(step?.specialsCreated).toEqual([{ id: expect.any(Number), at: p(0, 3), kind: 'lance-h', element: 'fire' }]);
    expect(step?.cleared).toHaveLength(3);
    expect(b.findTile(step?.specialsCreated[0]?.id ?? -1)).not.toBeNull();
  });

  it('4 em linha vertical cria uma Lança vertical', () => {
    const b = boardFrom(['WAE', 'WLF', 'WEA', 'WAL', 'EFE']);
    const { steps } = resolveCascades(b, makeCtx(1, { maxCascades: 1 }));
    expect(steps[0]?.specialsCreated[0]?.kind).toBe('lance-v');
  });

  it('5 em linha cria o Orbe do Caos; L/T cria um Núcleo no cruzamento', () => {
    expect(resolveCascades(boardFrom(['EEEEE', 'AWFLA']), makeCtx(1, { maxCascades: 1 })).steps[0]?.specialsCreated[0]?.kind).toBe('orb');
    const t = resolveCascades(boardFrom(['AFAW', 'FFFL', 'WFEA', 'LAWE']), makeCtx(1, { maxCascades: 1 })).steps[0];
    expect(t?.specialsCreated[0]).toMatchObject({ kind: 'core', at: p(1, 1) });
  });

  it('o Orbe do Caos nunca combina com outras peças', () => {
    const b = boardFrom(['FFWA', 'LEAE']);
    special(b, p(0, 2), 'orb');
    b.set(p(0, 2), { ...b.require(p(0, 2)), element: 'fire', special: 'orb' });
    expect(findMatches(b)).toHaveLength(0);
  });
});

describe('ativação de cristais especiais', () => {
  it('Lança horizontal limpa a linha inteira quando é combinada', () => {
    // (0,0) é Lança de Fogo; trocar (1,3)<->(0,3)... aqui basta um match que a inclua.
    const b = boardFrom(['FFFWALE', 'LEAFEWA', 'WAELWEF']);
    special(b, p(0, 0), 'lance-h');
    const { steps } = resolveCascades(b, makeCtx(1, { maxCascades: 1 }));
    const step = steps[0];
    expect(step?.activations.map((a) => a.kind)).toEqual(['lance-h']);
    const rows = new Set(step?.cleared.map((c) => c.at.row));
    expect([...rows]).toEqual([0]);
    expect(step?.cleared).toHaveLength(7);
    expect(step?.cleared.filter((c) => c.cause === 'special')).toHaveLength(4);
  });

  it('Núcleo explode em losango de raio 2 (cortado nas bordas)', () => {
    const b = boardFrom(['AELAE', 'EWLEA', 'FFFAL', 'LAELA', 'WEAWE']);
    special(b, p(2, 2), 'core');
    const step = resolveCascades(b, makeCtx(1, { maxCascades: 1 })).steps[0];
    const act = step?.activations[0];
    expect(act?.kind).toBe('core');
    expect(act?.cells).toHaveLength(12); // 13 do losango menos a própria
  });

  it('ativações em cadeia: uma Lança atinge outra, cada uma ativa uma vez', () => {
    const b = boardFrom(['FFFWA', 'LEAFE', 'WAELW', 'AWLEA']);
    special(b, p(0, 0), 'lance-h');
    special(b, p(0, 4), 'lance-v');
    const step = resolveCascades(b, makeCtx(1, { maxCascades: 1 })).steps[0];
    expect(step?.activations.map((a) => a.kind)).toEqual(['lance-h', 'lance-v']);
    const ids = step?.cleared.map((c) => c.tile.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(step?.cleared.some((c) => c.at.col === 4 && c.at.row === 3)).toBe(true);
  });

  it('trocar o Orbe com um cristal destrói todos os desse elemento (troca sempre válida)', () => {
    const b = boardFrom(['WAEW', 'LEWF', 'AWLE']);
    special(b, p(0, 1), 'orb');
    expect(isValidSwap(b, { a: p(0, 1), b: p(0, 0) })).toBe(true);
    const r = resolveSwap(b, { a: p(0, 1), b: p(0, 0) }, makeCtx(1, { maxCascades: 1 }));
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;
    const step = r.steps[0];
    expect(step?.activations[0]).toMatchObject({ kind: 'orb', target: 'water' });
    const els = step?.cleared.map((c) => (c.tile.special === 'orb' ? 'orb' : c.tile.element));
    expect(els?.filter((e) => e === 'water')).toHaveLength(4);
    expect(els).toContain('orb');
  });

  it('Orbe + Orbe limpa o tabuleiro inteiro; dois especiais trocados ativam ambos', () => {
    const b = boardFrom(['WAEW', 'LEWF', 'AWLE']);
    special(b, p(1, 1), 'orb');
    special(b, p(1, 2), 'orb');
    const r = resolveSwap(b, { a: p(1, 1), b: p(1, 2) }, makeCtx(1, { maxCascades: 1 }));
    expect(r.kind === 'resolved' && r.steps[0]?.cleared.length).toBe(12);

    const c = boardFrom(['WAEW', 'LEWF', 'AWLE']);
    special(c, p(1, 1), 'lance-h');
    special(c, p(2, 1), 'lance-v');
    const r2 = resolveSwap(c, { a: p(1, 1), b: p(2, 1) }, makeCtx(1, { maxCascades: 1 }));
    expect(r2.kind === 'resolved' && r2.steps[0]?.activations.map((a) => a.kind).sort()).toEqual(['lance-h', 'lance-v']);
  });

  it('Orbe destruído por outra causa ataca o elemento mais comum', () => {
    const b = boardFrom(['WWWA', 'WEFL', 'AEWE']);
    expect(mostCommonElement(b)).toBe('water');
  });

  it('pontuação e feedback valorizam especiais', () => {
    const b = boardFrom(['WAEW', 'LEWF', 'AWLE']);
    special(b, p(0, 1), 'orb');
    const r = resolveSwap(b, { a: p(0, 1), b: p(0, 0) }, makeCtx(1, { maxCascades: 1 }));
    if (r.kind !== 'resolved') throw new Error('esperava jogada resolvida');
    expect(scoreStep(r.steps[0] as NonNullable<(typeof r.steps)[0]>)).toBeGreaterThan(300);
    expect(['AMAZING', 'ELEMENTAL_CHAOS']).toContain(feedbackFor(r));
  });
});

describe('fuzz com especiais e todas as mecânicas', () => {
  it('30 seeds × 30 jogadas: invariantes, sem matches pendentes e especiais a aparecer e a ser usados', () => {
    let created = 0;
    let activated = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = new GameSession({ seed, mechanics: ALL_MECHANICS });
      const pick = new Rng(seed * 7);
      for (let t = 0; t < 30; t++) {
        const moves = findValidMoves(s.board);
        // Prefere usar especiais quando existem (para os exercitar).
        const withSpecial = moves.filter((m) => s.board.get(m.a)?.special || s.board.get(m.b)?.special);
        const r = s.trySwap(withSpecial.length > 0 && pick.next() < 0.5 ? pick.pick(withSpecial) : pick.pick(moves));
        expect(r.kind).toBe('resolved');
        if (r.kind !== 'resolved') break;
        expect(r.hitCascadeLimit).toBe(false);
        created += r.steps.reduce((a, st) => a + st.specialsCreated.length, 0);
        activated += r.steps.reduce((a, st) => a + st.activations.length, 0);
        const after = s.board;
        expect(checkBoardInvariants(after)).toEqual([]);
        expect(findMatches(after)).toHaveLength(0);
      }
    }
    expect(created).toBeGreaterThan(20);
    expect(activated).toBeGreaterThan(10);
  });
});
