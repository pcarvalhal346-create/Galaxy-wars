import { describe, expect, it } from 'vitest';
import { Board } from '../game/board/Board';
import { checkBoardInvariants } from '../game/board/invariants';
import { Rng } from '../game/core/rng';
import { IdSource } from '../game/core/ids';
import { ALL_MECHANICS, ELEMENTS } from '../game/core/types';
import { applyGravity, refill } from '../game/gravity/gravity';
import { findMatches } from '../game/matching/matchFinder';
import { findValidMoves, hasValidMove } from '../game/matching/moveFinder';
import { GameSession } from '../game/session/GameSession';
import { boardFrom, boardToRows, p } from './helpers';

describe('tabuleiros com forma (buracos) e tamanhos diferentes', () => {
  it('um buraco quebra uma sequência', () => {
    expect(findMatches(boardFrom(['FF#F', 'WEAL']))).toHaveLength(0);
    expect(findMatches(boardFrom(['FFF#', 'WEAL']))).toHaveLength(1);
  });

  it('as peças caem através de buracos', () => {
    const b = boardFrom(['F', '#', '.', 'W']);
    const id = b.require(p(0, 0)).id;
    expect(applyGravity(b)).toEqual([{ id, from: p(0, 0), to: p(2, 0) }]);
    expect(boardToRows(b)).toEqual(['.', '#', 'F', 'W']);
  });

  it('refill nunca coloca peças em buracos e entra acima da 1.ª célula jogável', () => {
    const b = boardFrom(['#.', '..', '.W']);
    const spawns = refill(b, new Rng(1), new IdSource(50), ELEMENTS);
    expect(b.get(p(0, 0))).toBeNull();
    expect(b.isFull()).toBe(true);
    const col0 = spawns.filter((s) => s.to.col === 0);
    expect(col0.every((s) => s.fromRow < 1)).toBe(true);
    expect(() => b.set(p(0, 0), { id: 999, element: 'fire' })).toThrow(/buraco/);
  });

  it('não há jogadas que envolvam buracos', () => {
    const b = boardFrom(['FW#F', 'EAFL', 'WLEA']);
    for (const m of findValidMoves(b)) {
      expect(b.isPlayable(m.a) && b.isPlayable(m.b)).toBe(true);
    }
  });

  const shapes: string[][] = [
    ['......', '......', '......', '......', '......', '......'], // 6×6
    ['#......#', '........', '........', '...##...', '...##...', '........', '........', '#......#'],
    ['##....##', '#......#', '........', '........', '........', '........', '#......#', '##....##'],
  ];

  for (const shape of shapes) {
    it(`fuzz ${shape[0]?.length}×${shape.length} (${shape.join('').split('#').length - 1} buracos): invariantes e jogadas`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const s = new GameSession({ seed, shape, mechanics: ALL_MECHANICS });
        const pick = new Rng(seed);
        for (let t = 0; t < 20; t++) {
          const r = s.trySwap(pick.pick(s.validMoves()));
          expect(r.kind).toBe('resolved');
          const b = s.board;
          expect(checkBoardInvariants(b)).toEqual([]);
          expect(findMatches(b)).toHaveLength(0);
          expect(hasValidMove(b)).toBe(true);
          for (let row = 0; row < b.rows; row++)
            for (let col = 0; col < b.cols; col++) if (!b.isPlayable(p(row, col))) expect(b.get(p(row, col))).toBeNull();
        }
      }
    });
  }

  it('Board.fromShape valida larguras', () => {
    expect(() => Board.fromShape(['..', '...'])).toThrow();
    expect(Board.fromShape(['.#', '..']).playableCount).toBe(3);
  });
});
