import type { KeyValueStore } from './settings';
import { browserStore } from './settings';

/** Progresso do jogador nos níveis. Guardado localmente; tolerante a dados corrompidos. */
export interface LevelRecord {
  readonly stars: number;
  readonly bestScore: number;
}

export interface Progress {
  /** Maior nível desbloqueado (1 no início). */
  readonly unlocked: number;
  readonly levels: Readonly<Record<number, LevelRecord>>;
}

export const EMPTY_PROGRESS: Progress = { unlocked: 1, levels: {} };
const STORAGE_KEY = 'elemental-chaos.progress.v1';

export function parseProgress(raw: string | null): Progress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const d = JSON.parse(raw) as unknown;
    if (typeof d !== 'object' || d === null) return EMPTY_PROGRESS;
    const o = d as Record<string, unknown>;
    const unlocked = typeof o.unlocked === 'number' && Number.isInteger(o.unlocked) && o.unlocked >= 1 ? o.unlocked : 1;
    const levels: Record<number, LevelRecord> = {};
    if (typeof o.levels === 'object' && o.levels !== null) {
      for (const [k, v] of Object.entries(o.levels as Record<string, unknown>)) {
        const id = Number(k);
        if (!Number.isInteger(id) || id < 1 || typeof v !== 'object' || v === null) continue;
        const r = v as Record<string, unknown>;
        const stars = typeof r.stars === 'number' ? Math.max(0, Math.min(3, Math.floor(r.stars))) : 0;
        const bestScore = typeof r.bestScore === 'number' && r.bestScore >= 0 ? Math.floor(r.bestScore) : 0;
        levels[id] = { stars, bestScore };
      }
    }
    return { unlocked, levels };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export class ProgressStore {
  private current: Progress;

  constructor(private readonly store: KeyValueStore | null) {
    let raw: string | null = null;
    try {
      raw = store?.getItem(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    this.current = parseProgress(raw);
  }

  get value(): Progress {
    return this.current;
  }

  isUnlocked(levelId: number): boolean {
    return levelId <= this.current.unlocked;
  }

  /** Regista uma vitória: guarda o melhor resultado e desbloqueia o nível seguinte. */
  recordWin(levelId: number, stars: number, score: number, totalLevels: number): Progress {
    const prev = this.current.levels[levelId];
    const record: LevelRecord = {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestScore: Math.max(prev?.bestScore ?? 0, score),
    };
    this.current = {
      unlocked: Math.max(this.current.unlocked, Math.min(totalLevels, levelId + 1)),
      levels: { ...this.current.levels, [levelId]: record },
    };
    this.save();
    return this.current;
  }

  totalStars(): number {
    return Object.values(this.current.levels).reduce((a, r) => a + r.stars, 0);
  }

  reset(): void {
    this.current = EMPTY_PROGRESS;
    this.save();
  }

  private save(): void {
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Sem armazenamento: o progresso vale só nesta sessão.
    }
  }
}

export const progress = new ProgressStore(browserStore());
