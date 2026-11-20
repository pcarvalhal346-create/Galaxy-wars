import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SettingsStore, parseSettings, type KeyValueStore } from '../storage/settings';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('persistência de preferências', () => {
  it('guarda e volta a carregar', () => {
    const mem = new MemoryStore();
    new SettingsStore(mem).update({ reducedEffects: true, sfxVolume: 0.3 });
    const again = new SettingsStore(mem);
    expect(again.value).toEqual({ ...DEFAULT_SETTINGS, reducedEffects: true, sfxVolume: 0.3 });
  });

  it('recupera de dados corrompidos ou inválidos', () => {
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ musicVolume: 7, reducedEffects: 'sim' }))).toEqual({
      ...DEFAULT_SETTINGS,
      musicVolume: 1,
    });
  });

  it('funciona sem armazenamento e quando a escrita falha', () => {
    const failing: KeyValueStore = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const s = new SettingsStore(failing);
    expect(s.value).toEqual(DEFAULT_SETTINGS);
    expect(s.update({ reducedEffects: true }).reducedEffects).toBe(true);
    expect(new SettingsStore(null).value).toEqual(DEFAULT_SETTINGS);
  });

  it('notifica alterações', () => {
    const s = new SettingsStore(new MemoryStore());
    const seen: boolean[] = [];
    const off = s.onChange((v) => seen.push(v.reducedEffects));
    s.update({ reducedEffects: true });
    off();
    s.update({ reducedEffects: false });
    expect(seen).toEqual([true]);
  });
});
