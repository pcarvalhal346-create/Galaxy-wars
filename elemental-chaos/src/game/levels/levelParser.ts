import { ELEMENTS, type ElementType, type Mechanics } from '../core/types';
import { isValidGoal, type GuideGoal, type GuideStep } from '../tutorial/guide';
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
export function parseLevel(raw: unknown): LevelDefinition {
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

  // Forma: por omissão 8×8 completo; entre 5 e 9 de lado; pelo menos 20 células jogáveis.
  const shape = raw.shape === undefined ? Array.from({ length: 8 }, () => '........') : raw.shape;
  if (!Array.isArray(shape) || shape.length < 5 || shape.length > 9) fail(id, 'shape tem de ter entre 5 e 9 linhas');
  const lines = shape as unknown[];
  const cols = typeof lines[0] === 'string' ? lines[0].length : 0;
  if (cols < 5 || cols > 9) fail(id, 'shape tem de ter entre 5 e 9 colunas');
  for (const line of lines) {
    if (typeof line !== 'string' || line.length !== cols) fail(id, 'linhas da shape com larguras diferentes');
    if (!/^[.#]+$/.test(line as string)) fail(id, 'shape só aceita "." e "#"');
  }
  const playable = (lines as string[]).join('').split('').filter((c) => c === '.').length;
  if (playable < 20) fail(id, 'shape com menos de 20 células jogáveis');
  const rows = lines.length;

  let preset: string[] | undefined;
  if (raw.preset !== undefined) {
    if (!Array.isArray(raw.preset) || raw.preset.length !== rows) fail(id, `preset tem de ter ${rows} linhas`);
    preset = raw.preset as string[];
    preset.forEach((line, r) => {
      if (typeof line !== 'string' || line.length !== cols) fail(id, `linhas do preset têm de ter ${cols} colunas`);
      [...line].forEach((ch, c) => {
        const hole = (lines[r] as string)[c] === '#';
        if (hole !== (ch === '#')) fail(id, `preset não coincide com a shape em (${r}, ${c})`);
        if (ch === '.' || ch === '#') return;
        const e = LETTERS[ch];
        if (!e || !els.includes(e)) fail(id, `letra inválida no preset: ${ch}`);
      });
    });
  }

  let guide: GuideStep[] | undefined;
  if (raw.guide !== undefined) {
    if (!Array.isArray(raw.guide)) fail(id, 'guide tem de ser uma lista');
    guide = (raw.guide as unknown[]).map((g): GuideStep => {
      if (!isObj(g) || typeof g.text !== 'string' || g.text.length === 0) return fail(id, 'passo de tutorial sem texto');
      const goal = typeof g.goal === 'string' ? g.goal : 'none';
      if (!isValidGoal(goal, els as string[])) fail(id, `objetivo de tutorial inválido: ${goal}`);
      if ((goal === 'wet' && !mechanics.wet) || (goal === 'steam' && !mechanics.steam) || (goal === 'lightning' && !mechanics.lightning)) {
        fail(id, `tutorial pede ${goal} com a mecânica desligada`);
      }
      const point = g.point;
      if (point !== undefined && !['objectives', 'moves', 'score', 'wet', 'board'].includes(point as string)) fail(id, 'point inválido');
      const show = g.show;
      if (show !== undefined && show !== 'all' && !els.includes(show)) fail(id, `show com elemento indisponível: ${String(show)}`);
      return {
        text: g.text,
        goal: goal as GuideGoal,
        ...(point !== undefined ? { point: point as NonNullable<GuideStep['point']> } : {}),
        ...(show !== undefined ? { show: show as ElementType | 'all' } : {}),
      };
    });
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
    shape: lines as string[],
    ...(guide ? { guide } : {}),
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
