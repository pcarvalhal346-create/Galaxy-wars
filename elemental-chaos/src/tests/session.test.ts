import { describe, expect, it } from 'vitest';
import type { Board } from '../game/board/Board';
import { checkBoardInvariants } from '../game/board/invariants';
import { Rng } from '../game/core/rng';
import type { Position, TileId } from '../game/core/types';
import { findMatches } from '../game/matching/matchFinder';
import { findValidMoves, hasValidMove } from '../game/matching/moveFinder';
import type { TurnResult } from '../game/resolution/turnResolver';
import { GameSession } from '../game/session/GameSession';
import { p } from './helpers';

const key = (q: Position) => `${q.row},${q.col}`;

function toMap(board: Board): Map<string, TileId> {
  const m = new Map<string, TileId>();
  for (const q of board.positions()) m.set(key(q), board.require(q).id);
  return m;
}

/**
 * Reproduz os eventos de um TurnResult como a camada visual faz e verifica
 * que o resultado coincide com o tabuleiro lógico final. Garante o contrato
 * lógica → animação (nenhuma peça perdida, duplicada ou fora do sítio).
 */
function replay(before: Board, result: TurnResult): Map<string, TileId> {
  const m = toMap(before);
  if (result.kind === 'invalid') return m;
  const a = m.get(key(result.swap.a));
  const b = m.get(key(result.swap.b));
  m.set(key(result.swap.a), b as TileId);
  m.set(key(result.swap.b), a as TileId);
  for (const step of result.steps) {
    for (const c of step.cleared) {
      expect(m.get(key(c.at))).toBe(c.tile.id);
      m.delete(key(c.at));
    }
    const moving = step.falls.map((f) => {
      expect(m.get(key(f.from))).toBe(f.id);
      return f;
    });
    for (const f of moving) m.delete(key(f.from));
    for (const f of moving) m.set(key(f.to), f.id);
    for (const s of step.spawns) {
      expect(m.has(key(s.to))).toBe(false);
      expect(s.fromRow).toBeLessThan(0);
      m.set(key(s.to), s.tile.id);
    }
  }
  if (result.shuffle?.kind === 'shuffled') {
    m.clear();
    for (const mv of result.shuffle.moves) m.set(key(mv.to), mv.id);
  } else if (result.shuffle?.kind === 'regenerated') {
    return toMap(result.shuffle.board);
  }
  return m;
}

describe('sessão de jogo', () => {
  it('só consome jogada quando a troca é válida', () => {
    const s = new GameSession({ seed: 11 });
    const before = s.board;
    // Procura uma troca adjacente inválida.
    let invalid = null as { a: Position; b: Position } | null;
    const valid = findValidMoves(before);
    outer: for (const q of before.positions()) {
      const r = { row: q.row, col: q.col + 1 };
      if (!before.inBounds(r)) continue;
      if (!valid.some((v) => key(v.a) === key(q) && key(v.b) === key(r))) {
        invalid = { a: q, b: r };
        break outer;
      }
    }
    expect(invalid).not.toBeNull();
    expect(s.trySwap(invalid as { a: Position; b: Position }).kind).toBe('invalid');
    expect(s.movesMade).toBe(0);
    const hint = s.hint();
    expect(hint).not.toBeNull();
    expect(s.trySwap(hint as { a: Position; b: Position }).kind).toBe('resolved');
    expect(s.movesMade).toBe(1); // cascatas não contam
  });

  it('a apresentação recebe cópias: alterar o board devolvido não afeta a sessão', () => {
    const s = new GameSession({ seed: 2 });
    const copy = s.board;
    copy.set(p(0, 0), null);
    expect(s.board.get(p(0, 0))).not.toBeNull();
  });

  it('fuzz: 40 seeds × 25 jogadas mantêm invariantes e o replay coincide com a lógica', () => {
    let cascades = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = new GameSession({ seed });
      const pick = new Rng(seed * 31);
      const seenIds = new Set<TileId>();
      for (const q of s.board.positions()) seenIds.add(s.board.require(q).id);
      for (let turn = 0; turn < 25; turn++) {
        const before = s.board;
        const moves = findValidMoves(before);
        const result = s.trySwap(pick.pick(moves));
        expect(result.kind).toBe('resolved');
        if (result.kind !== 'resolved') break;
        expect(result.hitCascadeLimit).toBe(false);
        if (result.steps.length > 1) cascades++;
        const after = s.board;
        expect(checkBoardInvariants(after)).toEqual([]);
        expect(findMatches(after)).toHaveLength(0);
        expect(hasValidMove(after)).toBe(true);
        expect(replay(before, result)).toEqual(toMap(after));
        // Peças novas têm sempre IDs nunca vistos.
        for (const step of result.steps) {
          for (const sp of step.spawns) {
            expect(seenIds.has(sp.tile.id)).toBe(false);
            seenIds.add(sp.tile.id);
          }
        }
      }
      expect(s.movesMade).toBe(25);
    }
    expect(cascades).toBeGreaterThan(0);
  });
});
