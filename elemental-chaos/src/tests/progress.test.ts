import { describe, expect, it } from 'vitest';
import { EMPTY_PROGRESS, parseProgress, ProgressStore } from '../storage/progress';
import type { KeyValueStore } from '../storage/settings';

const mem = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('progresso', () => {
  it('começa com o nível 1 desbloqueado', () => {
    const s = new ProgressStore(mem());
    expect(s.value).toEqual(EMPTY_PROGRESS);
    expect(s.isUnlocked(1)).toBe(true);
    expect(s.isUnlocked(2)).toBe(false);
  });

  it('vitória desbloqueia o seguinte, guarda o melhor resultado e persiste', () => {
    const store = mem();
    const s = new ProgressStore(store);
    s.recordWin(1, 2, 3000, 5);
    s.recordWin(1, 1, 2000, 5); // pior: não substitui
    expect(s.value.levels[1]).toEqual({ stars: 2, bestScore: 3000 });
    expect(s.isUnlocked(2)).toBe(true);
    const again = new ProgressStore(store);
    expect(again.value).toEqual(s.value);
    expect(again.totalStars()).toBe(2);
  });

  it('não desbloqueia para além do último nível', () => {
    const s = new ProgressStore(mem());
    s.recordWin(5, 3, 100, 5);
    expect(s.value.unlocked).toBe(5);
  });

  it('recupera de dados corrompidos', () => {
    expect(parseProgress('xx')).toEqual(EMPTY_PROGRESS);
    expect(parseProgress(JSON.stringify({ unlocked: -3, levels: { a: 1, 2: { stars: 9, bestScore: -1 } } }))).toEqual({
      unlocked: 1,
      levels: { 2: { stars: 3, bestScore: 0 } },
    });
  });
});
