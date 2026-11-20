import { ELEMENTS, type ElementType, type Mechanics } from '../core/types';
import type { LevelDefinition, LevelTheme, Objective, ReactionKind } from './types';

const LETTERS: Record<string, ElementType> = { F: 'fire', W: 'water', L: 'lightning', E: 'earth', A: 'air' };
const THEMES: readonly LevelTheme[] = ['meadow', 'lagoon', 'volcano', 'storm'];

export class LevelError extends Error {}

type Raw = Record<string, unknown>;

const fail = (id: unknown, msg: string): never => {
  throw new LevelError(`Nível ${String(id)}: ${msg}`);
};
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const posInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Valida e converte dados brutos (JSON) num LevelDefinition. Erros são explícitos. */
export function parseLevel(raw: unknown, rows = 8, cols = 8): LevelDefinition {
  if (!isObj(raw)) throw new LevelError('nível não é um objeto');
  const id = raw.id;
  if (!posInt(id)) fail(id, 'id tem de ser inteiro positivo');
  if (typeof raw.name !== 'string' || raw.name.length === 0) fail(id, 'nome em falta');
  if (!posInt(raw.moves)) fail(id, 'moves tem de ser inteiro positivo');

  const elements = raw.elements;
  if (!Array.isArray(elements) || elements.length < 3) fail(id, 'são precisos pelo menos 3 elementos');
  const els = elements as unknown[];
  for (const e of els) if (!ELEMENTS.includes(e as ElementType)) fail(id, `elemento desconhecido: ${String(e)}`);
  if (new Set(els).size !== els.length) fail(id, 'elementos repetidos');

  const m = isObj(raw.mechanics) ? raw.mechanics : {};
  const mechanics: Mechanics = { wet: m.wet === true, steam: m.steam === true, lightning: m.lightning === true };
  if ((mechanics.steam || mechanics.lightning) && !mechanics.wet) fail(id, 'vapor/raio exigem wet');
  if (mechanics.wet && !els.includes('water')) fail(id, 'wet exige o elemento água');
  if (mechanics.steam && !els.includes('fire')) fail(id, 'vapor exige o elemento fogo');
  if (mechanics.lightning && !els.includes('lightning')) fail(id, 'corrente exige o elemento raio');

  if (!Array.isArray(raw.objectives) || raw.objectives.length === 0) fail(id, 'sem objetivos');
  const objectives = (raw.objectives as unknown[]).map((o): Objective => {
    if (!isObj(o) || !posInt(o.target)) return fail(id, 'objetivo inválido');
    const target = o.target as number;
    switch (o.type) {
      case 'score':
        return { type: 'score', target };
      case 'collect': {
        const element = o.element as ElementType;
        if (!els.includes(element)) fail(id, `objetivo de recolha com elemento indisponível: ${String(o.element)}`);
        return { type: 'collect', element, target };
      }
      case 'reactions': {
        const reaction = o.reaction as ReactionKind;
        if (!['steam', 'lightning', 'any'].includes(reaction)) fail(id, 'tipo de reação inválido');
        const enabled = reaction === 'any' ? mechanics.steam || mechanics.lightning : mechanics[reaction];
        if (!enabled) fail(id, `objetivo de reação ${reaction} com a mecânica desligada`);
        return { type: 'reactions', reaction, target };
      }
      default:
        return fail(id, `tipo de objetivo desconhecido: ${String(o.type)}`);
    }
  });

  const stars = raw.stars;
  if (!Array.isArray(stars) || stars.length !== 3 || !stars.every(posInt)) fail(id, 'stars tem de ter 3 inteiros');
  const [s1, s2, s3] = stars as [number, number, number];
  if (!(s1 < s2 && s2 < s3)) fail(id, 'stars têm de ser crescentes');

  let preset: string[] | undefined;
  if (raw.preset !== undefined) {
    if (!Array.isArray(raw.preset) || raw.preset.length !== rows) fail(id, `preset tem de ter ${rows} linhas`);
    preset = raw.preset as string[];
    for (const line of preset) {
      if (typeof line !== 'string' || line.length !== cols) fail(id, `linhas do preset têm de ter ${cols} colunas`);
      for (const ch of line) {
        if (ch === '.') continue;
        const e = LETTERS[ch];
        if (!e || !els.includes(e)) fail(id, `letra inválida no preset: ${ch}`);
      }
    }
  }

  const theme = (raw.theme ?? 'meadow') as LevelTheme;
  if (!THEMES.includes(theme)) fail(id, `tema desconhecido: ${String(raw.theme)}`);
  if (raw.seed !== undefined && !posInt(raw.seed)) fail(id, 'seed tem de ser inteiro positivo');

  return {
    id: id as number,
    name: raw.name as string,
    tutorial: typeof raw.tutorial === 'string' ? raw.tutorial : '',
    moves: raw.moves as number,
    elements: els as ElementType[],
    mechanics,
    objectives,
    stars: [s1, s2, s3],
    theme,
    ...(raw.seed !== undefined ? { seed: raw.seed as number } : {}),
    ...(preset ? { preset } : {}),
  };
}

/** Valida uma lista de níveis: IDs únicos e sequenciais a partir de 1. */
export function parseLevels(raw: unknown): LevelDefinition[] {
  if (!Array.isArray(raw)) throw new LevelError('a lista de níveis tem de ser um array');
  const levels = raw.map((r) => parseLevel(r));
  levels.forEach((l, i) => {
    if (l.id !== i + 1) throw new LevelError(`IDs têm de ser sequenciais: esperado ${i + 1}, encontrado ${l.id}`);
  });
  return levels;
}

/** Converte um preset em elementos por célula (null = aleatório). */
export function presetCells(preset: readonly string[]): (ElementType | null)[][] {
  return preset.map((line) => [...line].map((ch) => LETTERS[ch] ?? null));
}
