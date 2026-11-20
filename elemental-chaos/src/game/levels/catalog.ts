import rawLevels from '../../data/levels.json';
import { parseLevels } from './levelParser';
import type { LevelDefinition } from './types';

/** Catálogo de níveis validado no arranque. Adicionar níveis = editar src/data/levels.json. */
export const LEVELS: readonly LevelDefinition[] = parseLevels(rawLevels);

export function getLevel(id: number): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

export const LEVEL_COUNT = LEVELS.length;
