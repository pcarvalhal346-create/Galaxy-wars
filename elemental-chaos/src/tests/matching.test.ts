import { describe, expect, it } from 'vitest';
import { findMatches, findRuns, hasMatchAt } from '../game/matching/matchFinder';
import { boardFrom, p } from './helpers';

describe('deteção de matches', () => {
  it('deteta match horizontal de 3', () => {
    const b = boardFrom(['FFFW', 'WLEA', 'LEAW']);
    const m = findMatches(b);
    expect(m).toHaveLength(1);
    expect(m[0]?.element).toBe('fire');
    expect(m[0]?.cells).toEqual([p(0, 0), p(0, 1), p(0, 2)]);
    expect(m[0]?.shape).toBe('line3');
  });

  it('deteta match vertical', () => {
    const b = boardFrom(['WLE', 'WEA', 'WAL']);
    const m = findMatches(b);
    expect(m).toHaveLength(1);
    expect(m[0]?.element).toBe('water');
    expect(m[0]?.runs[0]?.orientation).toBe('vertical');
    expect(m[0]?.cells).toEqual([p(0, 0), p(1, 0), p(2, 0)]);
  });

  it('classifica linhas de 4 e de 5+', () => {
    expect(findMatches(boardFrom(['LLLLA', 'AEWFE']))[0]?.shape).toBe('line4');
    expect(findMatches(boardFrom(['EEEEEE', 'AWFLAW']))[0]?.shape).toBe('line5plus');
  });

  it('funde matches cruzados (T/L/cruz) num único grupo sem células repetidas', () => {
    const b = boardFrom([
      'AFAW', //
      'FFFL',
      'WFEA',
      'LAWE',
    ]);
    const m = findMatches(b);
    expect(m).toHaveLength(1);
    expect(m[0]?.shape).toBe('cross');
    expect(m[0]?.runs).toHaveLength(2);
    expect(m[0]?.cells).toHaveLength(5);
  });

  it('mantém separados grupos de elementos diferentes', () => {
    const b = boardFrom(['FFFA', 'WWWL']);
    const m = findMatches(b);
    expect(m.map((g) => g.element)).toEqual(['fire', 'water']);
  });

  it('ignora sequências de 2 e células vazias', () => {
    const b = boardFrom(['FF.F', 'W.WW']);
    expect(findRuns(b)).toHaveLength(0);
  });

  it('hasMatchAt verifica a célula nas duas direções', () => {
    const b = boardFrom(['FWA', 'FLE', 'FAW']);
    expect(hasMatchAt(b, p(1, 0))).toBe(true);
    expect(hasMatchAt(b, p(1, 1))).toBe(false);
  });
});
