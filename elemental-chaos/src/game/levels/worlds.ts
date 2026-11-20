import type { LevelTheme } from './types';

/** Mundos do mapa (agrupam níveis; cada um tem nome e tema). */
export interface World {
  readonly name: string;
  readonly first: number;
  readonly last: number;
  readonly theme: LevelTheme;
}

export const WORLDS: readonly World[] = [
  { name: 'Vale Elemental', first: 1, last: 10, theme: 'meadow' },
  { name: 'Picos Gelados', first: 11, last: 20, theme: 'frost' },
  { name: 'Coração do Caos', first: 21, last: 30, theme: 'storm' },
];

export function worldOf(levelId: number): World {
  return WORLDS.find((w) => levelId >= w.first && levelId <= w.last) ?? (WORLDS[WORLDS.length - 1] as World);
}
