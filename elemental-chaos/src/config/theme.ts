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
  fire: { name: 'Fogo', base: 0xff6418, light: 0xffe27a, dark: 0xb81a00, glow: 0xff9a3c },
  water: { name: 'Água', base: 0x1fa8ff, light: 0xc9f5ff, dark: 0x0a4fc4, glow: 0x5fd6ff },
  lightning: { name: 'Raio', base: 0xffd000, light: 0xfffbd2, dark: 0x8436e0, glow: 0xffe84a },
  earth: { name: 'Terra', base: 0x27cc5e, light: 0xc6ffd0, dark: 0x0b7433, glow: 0x5cf08c },
  air: { name: 'Ar', base: 0x55ecd0, light: 0xf2fffc, dark: 0x13998a, glow: 0xb2fff0 },
};

/** Paleta da interface: viva e luminosa, com roxo-mágico como cor de marca. */
export const UI_COLORS = {
  text: '#ffffff',
  textDark: '#4a1f7a',
  textDim: '#efe6ff',
  stroke: '#4a1773',
  accent: '#ffd84a',
  accentNum: 0xffd84a,
  violet: 0x7b3fe4,
  violetDark: 0x4a1f9a,
  violetLight: 0xb48cff,
  panel: 0x5a2bb8,
  panelLight: 0x8f5cf0,
  boardBg: 0x2a1a6e,
  cellA: 0x5b7be8,
  cellB: 0x4d6bd9,
  pink: 0xff4fa3,
  orange: 0xff8a1f,
  green: 0x3bd16f,
  blue: 0x2f8cff,
} as const;

export const FONT_FAMILY = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

export const TEXTURE_KEYS = {
  tile: (e: ElementType) => `tile-${e}`,
  spark: 'fx-spark',
  ring: 'fx-ring',
  wet: 'fx-wet',
  smoke: 'fx-smoke',
  background: (theme: string) => `bg-${theme}`,
  title: 'bg-title',
  logo: 'ui-logo',
  starFull: 'ui-star-full',
  starEmpty: 'ui-star-empty',
  node: (kind: 'open' | 'done' | 'locked') => `ui-node-${kind}`,
  iconSteam: 'ui-icon-steam',
  iconLightning: 'ui-icon-lightning',
  iconScore: 'ui-icon-score',
  iconLock: 'ui-icon-lock',
  lumi: (mood: 'happy' | 'wow') => `ui-lumi-${mood}`,
  hand: 'ui-hand',
} as const;
