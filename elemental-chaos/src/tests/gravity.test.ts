import { describe, expect, it } from 'vitest';
import { IdSource } from '../game/core/ids';
import { Rng } from '../game/core/rng';
import { ELEMENTS } from '../game/core/types';
import { applyGravity, refill } from '../game/gravity/gravity';
import { boardFrom, boardToRows, p } from './helpers';

describe('gravidade e refill', () => {
  it('faz cair as peças e preserva a ordem relativa na coluna', () => {
    const b = boardFrom(['F', 'W', '.', 'L', '.']);
    const fireId = b.require(p(0, 0)).id;
    const falls = applyGravity(b);
    expect(boardToRows(b)).toEqual(['.', '.', 'F', 'W', 'L']);
    expect(falls).toContainEqual({ id: fireId, from: p(0, 0), to: p(2, 0) });
    expect(falls).toHaveLength(3); // F, W e L descem todas
  });

  it('não regista movimento para peças que não caem', () => {
    const b = boardFrom(['.A', 'FW']);
    expect(applyGravity(b)).toEqual([]);
  });

  it('refill preenche apenas as células vazias do topo com IDs novos', () => {
    const b = boardFrom(['..', '.W', 'FA']);
    const spawns = refill(b, new Rng(3), new IdSource(100), ELEMENTS);
    expect(b.isFull()).toBe(true);
    expect(spawns).toHaveLength(3);
    expect(spawns.map((s) => s.tile.id).sort()).toEqual([100, 101, 102]);
    // Coluna 0 tinha 2 vazios: as novas peças entram a partir de linhas virtuais -2 e -1.
    const col0 = spawns.filter((s) => s.to.col === 0).map((s) => [s.to.row, s.fromRow]);
    expect(col0).toEqual([
      [1, -1],
      [0, -2],
    ]);
  });
});
