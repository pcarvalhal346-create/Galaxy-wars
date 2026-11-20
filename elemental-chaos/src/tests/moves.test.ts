import { describe, expect, it } from 'vitest';
import { findValidMoves, hasValidMove, isValidSwap } from '../game/matching/moveFinder';
import { resolveSwap } from '../game/resolution/turnResolver';
import { boardFrom, boardToRows, makeCtx, p } from './helpers';

describe('trocas', () => {
  const rows = [
    'FWFA', // trocar (0,1) com (1,1) faz FFF na linha 0
    'LFEW',
    'AELA',
    'WAWE',
  ];

  it('troca válida cria match', () => {
    expect(isValidSwap(boardFrom(rows), { a: p(0, 1), b: p(1, 1) })).toBe(true);
  });

  it('troca sem match é inválida e não altera o tabuleiro', () => {
    const b = boardFrom(rows);
    const before = boardToRows(b);
    const r = resolveSwap(b, { a: p(3, 0), b: p(3, 1) }, makeCtx());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('no-match');
    expect(boardToRows(b)).toEqual(before);
  });

  it('troca não adjacente é rejeitada', () => {
    const r = resolveSwap(boardFrom(rows), { a: p(0, 0), b: p(1, 1) }, makeCtx());
    expect(r.kind === 'invalid' && r.reason).toBe('not-adjacent');
  });

  it('troca de peças iguais nunca é válida', () => {
    expect(isValidSwap(boardFrom(['FF', 'FW']), { a: p(0, 0), b: p(0, 1) })).toBe(false);
  });

  it('encontra todas as jogadas válidas de forma determinística', () => {
    const moves = findValidMoves(boardFrom(rows));
    expect(moves.length).toBeGreaterThan(0);
    expect(moves).toEqual(findValidMoves(boardFrom(rows)));
    expect(moves).toContainEqual({ a: p(0, 1), b: p(1, 1) });
  });

  it('deteta tabuleiro sem jogadas', () => {
    const dead = boardFrom(['FWLE', 'EAFW', 'FWLE', 'EAFW']);
    expect(hasValidMove(dead)).toBe(false);
  });
});
