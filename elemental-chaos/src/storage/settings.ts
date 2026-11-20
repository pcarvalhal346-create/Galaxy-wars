/**
 * Preferências do jogador guardadas localmente. Sem dependências do Phaser.
 * Tolerante a armazenamento indisponível (modo privado, WebView restrita, quota).
 */
export type Quality = 'high' | 'fast';

export interface Settings {
  readonly reducedEffects: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  /** Resolução de desenho: alta (1080×1920) ou rápida (720×1280, ~2,25× menos pixels). */
  readonly quality: Quality;
  /** O jogador escolheu a qualidade à mão (a deteção automática deixa de mexer). */
  readonly qualityLocked: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  reducedEffects: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  quality: 'high',
  qualityLocked: false,
};

/** Subconjunto da Web Storage API de que precisamos (facilita testes). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'elemental-chaos.settings.v1';

const clamp01 = (n: unknown, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_SETTINGS;
    const d = data as Record<string, unknown>;
    return {
      reducedEffects: typeof d.reducedEffects === 'boolean' ? d.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
      musicVolume: clamp01(d.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(d.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      quality: d.quality === 'fast' ? 'fast' : 'high',
      qualityLocked: d.qualityLocked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export class SettingsStore {
  private current: Settings;
  private readonly listeners = new Set<(s: Settings) => void>();

  constructor(private readonly store: KeyValueStore | null) {
    let raw: string | null = null;
    try {
      raw = store?.getItem(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    this.current = parseSettings(raw);
  }

  get value(): Settings {
    return this.current;
  }

  update(patch: Partial<Settings>): Settings {
    this.current = parseSettings(JSON.stringify({ ...this.current, ...patch }));
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Sem armazenamento: as preferências ficam válidas apenas nesta sessão.
    }
    for (const l of this.listeners) l(this.current);
    return this.current;
  }

  onChange(listener: (s: Settings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** localStorage, se acessível. */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Instância única partilhada pelas cenas. */
export const settings = new SettingsStore(browserStore());
