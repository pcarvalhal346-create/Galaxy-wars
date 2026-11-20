/**
 * Gerador pseudo-aleatório determinístico (mulberry32).
 * O mesmo seed produz sempre a mesma sequência → tabuleiros e testes reproduzíveis.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Número em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [0, maxExclusive). */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: lista vazia');
    return items[this.int(items.length)] as T;
  }

  /** Fisher–Yates in-place. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }

  /** Estado interno, para guardar/retomar uma sessão no futuro. */
  getState(): number {
    return this.state;
  }
}

/** Seed aleatória para jogos sem seed fixa. */
export const randomSeed = (): number => (Math.random() * 0xffffffff) >>> 0;
