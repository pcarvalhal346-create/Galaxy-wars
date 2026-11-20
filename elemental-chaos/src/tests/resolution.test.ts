import { describe, expect, it } from 'vitest';
import { checkBoardInvariants } from '../game/board/invariants';
import { findMatches } from '../game/matching/matchFinder';
import { resolveCascades, resolveSwap } from '../game/resolution/turnResolver';
import { boardFrom, makeCtx, p } from './helpers';

describe('resolução de jogadas e cascatas', () => {
  // Trocar (2,0)<->(2,1) faz FFF vertical na coluna 0 (linhas 2-4).
  // Ao cair, o W de (1,0) aterra em (4,0) e forma WWW na linha 4 → cascata garantida.
  const rows = [
    'ELA', //
    'WAE',
    'AFL',
    'FEA',
    'FWW',
  ];

  it('resolve match da troca e uma cascata automática determinística', () => {
    const b = boardFrom(rows);
    const water = [b.require(p(1, 0)).id, b.require(p(4, 1)).id, b.require(p(4, 2)).id];
    const r = resolveSwap(b, { a: p(2, 0), b: p(2, 1) }, makeCtx(7));
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;

    const [first, second] = r.steps;
    expect(first?.index).toBe(0);
    expect(first?.matches).toHaveLength(1);
    expect(first?.matches[0]?.element).toBe('fire');
    expect(first?.cleared.map((c) => c.at)).toEqual([p(2, 0), p(3, 0), p(4, 0)]);
    expect(first?.spawns).toHaveLength(3);

    expect(second?.index).toBe(1);
    const waterGroup = second?.matches.find((m) => m.element === 'water');
    expect(waterGroup?.cells).toEqual(expect.arrayContaining([p(4, 0), p(4, 1), p(4, 2)]));
    expect(second?.cleared.map((c) => c.tile.id)).toEqual(expect.arrayContaining(water));

    expect(findMatches(b)).toHaveLength(0);
    expect(checkBoardInvariants(b)).toEqual([]);
  });

  it('é reproduzível: mesma seed → mesmo resultado', () => {
    const run = () => resolveSwap(boardFrom(rows), { a: p(2, 0), b: p(2, 1) }, makeCtx(42));
    expect(run()).toEqual(run());
  });

  it('nunca remove a mesma peça duas vezes no mesmo passo', () => {
    const b = boardFrom(['AFAW', 'FFFL', 'WFEA', 'LAWE']);
    const { steps } = resolveCascades(b, makeCtx(3));
    const ids = steps[0]?.cleared.map((c) => c.tile.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    // 5 peças em cruz: uma transforma-se em Núcleo Elemental, as outras 4 desaparecem.
    expect(ids).toHaveLength(4);
    expect(steps[0]?.specialsCreated.map((c) => c.kind)).toEqual(['core']);
  });

  it('respeita o limite de segurança de cascatas', () => {
    // Com um só elemento, cada refill volta a criar matches: sem limite seria infinito.
    const b = boardFrom(['FFF', 'FFF', 'FFF']);
    const { steps, hitLimit } = resolveCascades(b, makeCtx(1, { elements: ['fire'], maxCascades: 5 }));
    expect(steps).toHaveLength(5);
    expect(hitLimit).toBe(true);
  });
});
