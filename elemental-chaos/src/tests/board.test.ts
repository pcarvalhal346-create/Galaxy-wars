import { describe, expect, it } from 'vitest';
import { generateBoard } from '../game/board/generator';
import { checkBoardInvariants } from '../game/board/invariants';
import { shuffleBoard } from '../game/board/shuffle';
import { IdSource } from '../game/core/ids';
import { Rng } from '../game/core/rng';
import { ELEMENTS } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import { hasValidMove } from '../game/matching/moveFinder';
import { boardFrom, boardToRows } from './helpers';

const gen = (seed: number) =>
  generateBoard({ rows: 8, cols: 8, elements: ELEMENTS, rng: new Rng(seed), ids: new IdSource() });

describe('tabuleiro inicial', () => {
  it('é 8x8, cheio, sem IDs duplicados, sem matches e com jogada válida (200 seeds)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const b = gen(seed);
      expect(b.rows).toBe(8);
      expect(b.cols).toBe(8);
      expect(checkBoardInvariants(b)).toEqual([]);
      expect(findMatches(b)).toHaveLength(0);
      expect(hasValidMove(b)).toBe(true);
    }
  });

  it('é reproduzível pela seed', () => {
    expect(boardToRows(gen(123))).toEqual(boardToRows(gen(123)));
    expect(boardToRows(gen(123))).not.toEqual(boardToRows(gen(124)));
  });

  it('usa todos os elementos', () => {
    const found = new Set<string>();
    const b = gen(9);
    for (const pos of b.positions()) found.add(b.require(pos).element);
    expect(found.size).toBe(5);
  });
});

describe('embaralhamento', () => {
  const dead = ['FWLE', 'EAFW', 'FWLE', 'EAFW'];

  it('reorganiza as mesmas peças até haver jogada e nenhum match', () => {
    const b = boardFrom(dead);
    expect(hasValidMove(b)).toBe(false);
    const idsBefore = [...b.positions()].map((q) => b.require(q).id).sort((x, y) => x - y);
    const r = shuffleBoard(b, new Rng(5), new IdSource(500), ELEMENTS);
    expect(r.kind).toBe('shuffled');
    const idsAfter = [...r.board.positions()].map((q) => r.board.require(q).id).sort((x, y) => x - y);
    expect(idsAfter).toEqual(idsBefore);
    expect(findMatches(r.board)).toHaveLength(0);
    expect(hasValidMove(r.board)).toBe(true);
    if (r.kind === 'shuffled') {
      for (const m of r.moves) expect(r.board.require(m.to).id).toBe(m.id);
    }
  });

  it('gera um tabuleiro novo como último recurso', () => {
    const r = shuffleBoard(boardFrom(dead), new Rng(5), new IdSource(500), ELEMENTS, 0);
    expect(r.kind).toBe('regenerated');
    expect(checkBoardInvariants(r.board)).toEqual([]);
    expect(hasValidMove(r.board)).toBe(true);
    for (const q of r.board.positions()) expect(r.board.require(q).id).toBeGreaterThanOrEqual(500);
  });
});
