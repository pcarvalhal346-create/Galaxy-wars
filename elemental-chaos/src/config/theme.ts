import type { ElementType } from '../game/core/types';

/** Identidade visual: cores e nomes por elemento. Substituível por arte final mais tarde. */
export interface ElementStyle {
  readonly name: string;
  readonly base: number;
  readonly light: number;
  readonly dark: number;
  /** Cor das partículas e do brilho. */
  readonly glow: number;
}

export const ELEMENT_STYLE: Readonly<Record<ElementType, ElementStyle>> = {
  fire: { name: 'Fogo', base: 0xff5a1f, light: 0xffd36b, dark: 0x8c1405, glow: 0xff8a3a },
  water: { name: 'Água', base: 0x1aa6ff, light: 0xa6f0ff, dark: 0x0b3f9c, glow: 0x4fd0ff },
  lightning: { name: 'Raio', base: 0xffd21f, light: 0xfff6b0, dark: 0x6a2bd0, glow: 0xffe14a },
  earth: { name: 'Terra', base: 0x19c46a, light: 0xa8f7b9, dark: 0x0a5530, glow: 0x45e08a },
  air: { name: 'Ar', base: 0x7ff0dc, light: 0xf0fffc, dark: 0x2a8f94, glow: 0xb8fff2 },
};

export const UI_COLORS = {
  bgTop: 0x0b0f2a,
  bgBottom: 0x1b0d33,
  panel: 0x141a3d,
  panelEdge: 0x6f7cff,
  cellA: 0x1c2452,
  cellB: 0x19204a,
  text: '#f4f1ff',
  textDim: '#a9a6d6',
  accent: '#ffd36b',
  accentNum: 0xffd36b,
  violet: 0x8b5cff,
} as const;

export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

export const TEXTURE_KEYS = {
  tile: (e: ElementType) => `tile-${e}`,
  spark: 'fx-spark',
  ring: 'fx-ring',
  background: 'bg-nebula',
} as const;
