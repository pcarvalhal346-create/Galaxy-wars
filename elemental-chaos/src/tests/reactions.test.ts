import { describe, expect, it } from 'vitest';
import { posKey } from '../game/core/position';
import { ALL_MECHANICS, isWet, NO_MECHANICS, type Mechanics } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import {
  computeReactions,
  DEFAULT_REACTION_RULES,
  newTurnReactionState,
  tickWet,
} from '../game/reactions/reactions';
import { resolveCascades, resolveSwap } from '../game/resolution/turnResolver';
import { feedbackFor } from '../game/scoring/scoring';
import { boardFrom, makeCtx, p, setWet } from './helpers';

const WET_ONLY: Mechanics = { wet: true, steam: false, lightning: false };
const WET_STEAM: Mechanics = { wet: true, steam: true, lightning: false };

describe('Wet (molhado)', () => {
  // Match de Água na linha 1 (colunas 0-2); nenhum outro match.
  const rows = ['FAELA', 'WWWEF', 'LEAFL', 'EFLAE'];

  it('molha as peças ortogonalmente adjacentes que sobrevivem', () => {
    const b = boardFrom(rows);
    const expected = [p(0, 0), p(0, 1), p(0, 2), p(2, 0), p(2, 1), p(2, 2), p(1, 3)].map((q) => b.require(q).id);
    const { steps } = resolveCascades(b, makeCtx(1, { mechanics: WET_ONLY }));
    const applied = steps[0]?.wetApplied ?? [];
    expect(applied.map((w) => w.id).sort((x, y) => x - y)).toEqual([...expected].sort((x, y) => x - y));
    expect(applied.every((w) => w.wet === DEFAULT_REACTION_RULES.wetDuration)).toBe(true);
    // As peças molhadas continuam molhadas depois de caírem (o estado viaja com a peça).
    for (const id of expected) {
      const at = b.findTile(id);
      if (at) expect(b.require(at).wet).toBe(2);
    }
  });

  it('não molha nada se a mecânica estiver desligada', () => {
    const b = boardFrom(rows);
    const { steps } = resolveCascades(b, makeCtx(1, { mechanics: NO_MECHANICS }));
    expect(steps[0]?.wetApplied).toEqual([]);
    for (const q of b.positions()) expect(isWet(b.get(q))).toBe(false);
  });

  it('não molha peças que são eliminadas no mesmo passo', () => {
    // Água (0,0-2) ao lado de Fogo (0,3-5): o Fogo é eliminado, não fica molhado.
    const b = boardFrom(['WWWFFF', 'AELAEL', 'LAEELA']);
    const fireIds = [p(0, 3), p(0, 4), p(0, 5)].map((q) => b.require(q).id);
    const { steps } = resolveCascades(b, makeCtx(1, { mechanics: WET_ONLY }));
    const applied = new Set(steps[0]?.wetApplied.map((w) => w.id));
    for (const id of fireIds) expect(applied.has(id)).toBe(false);
  });

  it('expira ao fim de 2 jogadas; o efeito acabado de criar não perde duração', () => {
    const b = boardFrom(['FAE', 'LEA']);
    setWet(b, [p(0, 0)], 2);
    setWet(b, [p(0, 1)], 2);
    const fresh = b.require(p(0, 1)).id;
    const t1 = newTurnReactionState();
    t1.freshWet.add(fresh);
    tickWet(b, t1); // jogada em que (0,1) foi molhada
    expect(b.require(p(0, 0)).wet).toBe(1);
    expect(b.require(p(0, 1)).wet).toBe(2);
    const t2 = newTurnReactionState();
    const ch = tickWet(b, t2);
    expect(isWet(b.require(p(0, 0)))).toBe(false);
    expect(b.require(p(0, 0))).not.toHaveProperty('wet');
    expect(ch).toContainEqual({ id: b.require(p(0, 0)).id, wet: 0 });
    tickWet(b, newTurnReactionState());
    expect(isWet(b.require(p(0, 1)))).toBe(false);
  });

  it('a contagem acontece no fim da jogada e inclui só peças não renovadas', () => {
    // Trocar (2,0)<->(2,1) faz FFF vertical; (4,2) já estava molhada → perde 1 no fim.
    const b = boardFrom(['ELA', 'WAE', 'AFL', 'FEA', 'FWW']);
    setWet(b, [p(4, 2)], 1);
    const oldId = b.require(p(4, 2)).id;
    const r = resolveSwap(b, { a: p(2, 0), b: p(2, 1) }, makeCtx(7, { mechanics: WET_ONLY }));
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;
    const removed = r.steps.some((s) => s.cleared.some((c) => c.tile.id === oldId));
    if (!removed) expect(r.wetTicks).toContainEqual({ id: oldId, wet: 0 });
    const freshIds = new Set(r.steps.flatMap((s) => s.wetApplied.map((w) => w.id)));
    for (const t of r.wetTicks) expect(freshIds.has(t.id)).toBe(false);
  });
});

describe('Steam Burst (vapor)', () => {
  // Fogo na linha 2 (0-2); a peça molhada (1,1) está por cima do centro.
  const rows = ['AELAE', 'EWLEA', 'FFFAL', 'LAELA', 'WEAWE'];

  it('explode uma área 3×3 centrada na peça molhada', () => {
    const b = boardFrom(rows);
    setWet(b, [p(1, 1)]);
    const { steps } = resolveCascades(b, makeCtx(2, { mechanics: WET_STEAM, maxCascades: 1 }));
    const step = steps[0];
    expect(step?.reactions).toHaveLength(1);
    const ev = step?.reactions[0];
    expect(ev?.kind).toBe('steam');
    if (ev?.kind === 'steam') {
      expect(ev.center).toEqual(p(1, 1));
      expect(ev.area).toHaveLength(9);
    }
    expect(step?.cleared).toHaveLength(9);
    expect(step?.cleared.filter((c) => c.cause === 'match')).toHaveLength(3);
    expect(step?.cleared.filter((c) => c.cause === 'steam')).toHaveLength(6);
  });

  it('a área é cortada nas bordas do tabuleiro', () => {
    const b = boardFrom(['WLEAE', 'FFFAL', 'LAELA']);
    setWet(b, [p(0, 0)]);
    const ev = computeReactions(b, findMatches(b), WET_STEAM, newTurnReactionState())[0];
    expect(ev?.kind === 'steam' && ev.area.length).toBe(4);
  });

  it('não acontece com o vapor desligado', () => {
    const b = boardFrom(rows);
    setWet(b, [p(1, 1)]);
    const { steps } = resolveCascades(b, makeCtx(2, { mechanics: WET_ONLY, maxCascades: 1 }));
    expect(steps[0]?.reactions).toEqual([]);
    expect(steps[0]?.cleared).toHaveLength(3);
  });
});

describe('Lightning Chain (corrente elétrica)', () => {
  // Raio na linha 2 (0-2). Molhadas ligadas: (1,1),(0,1),(0,2),(0,3). Isolada: (3,4).
  const rows = ['AWEAF', 'EAFEA', 'LLLAE', 'FEAFW', 'AFEWA'];
  const chainWet = [p(1, 1), p(0, 1), p(0, 2), p(0, 3)];

  it('percorre as peças molhadas ligadas, de forma determinística', () => {
    const b = boardFrom(rows);
    setWet(b, [...chainWet, p(3, 4)]);
    const ev = computeReactions(b, findMatches(b), ALL_MECHANICS, newTurnReactionState());
    expect(ev).toHaveLength(1);
    const chain = ev[0];
    expect(chain?.kind).toBe('lightning');
    if (chain?.kind !== 'lightning') return;
    expect(chain.path).toEqual(chainWet);
    expect(chain.links).toEqual([
      [p(2, 1), p(1, 1)],
      [p(1, 1), p(0, 1)],
      [p(0, 1), p(0, 2)],
      [p(0, 2), p(0, 3)],
    ]);
    expect(chain.path).not.toContainEqual(p(3, 4));
  });

  it('elimina as peças atingidas e pode provocar cascatas', () => {
    const b = boardFrom(rows);
    setWet(b, [...chainWet, p(3, 4)]);
    const { steps } = resolveCascades(b, makeCtx(5, { mechanics: ALL_MECHANICS }));
    expect(steps[0]?.cleared.filter((c) => c.cause === 'lightning')).toHaveLength(4);
    expect(findMatches(b)).toHaveLength(0);
  });

  it('respeita o limite de peças da corrente', () => {
    const b = boardFrom(rows);
    setWet(b, chainWet);
    const rules = { ...DEFAULT_REACTION_RULES, lightningMaxTiles: 2 };
    const ev = computeReactions(b, findMatches(b), ALL_MECHANICS, newTurnReactionState(), rules)[0];
    expect(ev?.kind === 'lightning' && ev.path).toEqual([p(1, 1), p(0, 1)]);
    // Por omissão o limite é 8.
    expect(DEFAULT_REACTION_RULES.lightningMaxTiles).toBe(8);
  });

  it('limite de 8 numa rede grande de peças molhadas', () => {
    const b = boardFrom(['AEAEAEAE', 'EAEAEAEA', 'LLLAEAEA', 'EAEAEAEA']);
    const all = [...b.positions()].filter((q) => q.row !== 2 || q.col > 2);
    setWet(b, all);
    const ev = computeReactions(b, findMatches(b), ALL_MECHANICS, newTurnReactionState())[0];
    expect(ev?.kind === 'lightning' && ev.path.length).toBe(8);
  });
});

describe('reações simultâneas e limites', () => {
  // Raio (linha 0) e Fogo (linha 2) partilham a mesma peça molhada (1,1).
  const rows = ['LLLAE', 'EWAEA', 'FFFAL', 'AEALE', 'EAEAW'];

  it('raio e vapor disparam a partir da mesma peça; cada célula é removida uma vez', () => {
    const b = boardFrom(rows);
    setWet(b, [p(1, 1)]);
    const r = resolveCascades(b, makeCtx(3, { mechanics: ALL_MECHANICS, maxCascades: 1 }));
    const step = r.steps[0];
    expect(step?.reactions.map((e) => e.kind).sort()).toEqual(['lightning', 'steam']);
    const keys = step?.cleared.map((c) => posKey(c.at)) ?? [];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(9);
    const ids = step?.cleared.map((c) => c.tile.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a mesma peça não dispara duas reações do mesmo tipo na mesma jogada', () => {
    const b = boardFrom(['AELAE', 'EWLEA', 'FFFAL', 'LAELA', 'WEAWE']);
    setWet(b, [p(1, 1)]);
    const turn = newTurnReactionState();
    const m = findMatches(b);
    expect(computeReactions(b, m, WET_STEAM, turn)).toHaveLength(1);
    expect(computeReactions(b, m, WET_STEAM, turn)).toHaveLength(0);
  });

  it('respeita o máximo de reações por passo e por jogada', () => {
    const b = boardFrom(['AELAE', 'EWLEA', 'FFFAL', 'LAELA', 'WEAWE']);
    setWet(b, [p(1, 0), p(1, 1), p(1, 2), p(3, 0), p(3, 1)]);
    const m = findMatches(b);
    expect(computeReactions(b, m, WET_STEAM, newTurnReactionState())).toHaveLength(5);
    const perStep = { ...DEFAULT_REACTION_RULES, maxReactionsPerStep: 2 };
    expect(computeReactions(b, m, WET_STEAM, newTurnReactionState(), perStep)).toHaveLength(2);
    const turn = newTurnReactionState();
    turn.reactionsThisTurn = DEFAULT_REACTION_RULES.maxReactionsPerTurn - 1;
    expect(computeReactions(b, m, WET_STEAM, turn)).toHaveLength(1);
  });

  it('feedback ELEMENTAL CHAOS quando vapor e raio acontecem na mesma jogada', () => {
    const b = boardFrom(rows);
    setWet(b, [p(1, 1)]);
    const { steps } = resolveCascades(b, makeCtx(3, { mechanics: ALL_MECHANICS }));
    expect(
      feedbackFor({ kind: 'resolved', swap: { a: p(0, 0), b: p(0, 1) }, steps, wetTicks: [], shuffle: null, hitCascadeLimit: false }),
    ).toBe('ELEMENTAL_CHAOS');
  });
});
