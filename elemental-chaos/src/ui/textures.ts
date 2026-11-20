import type Phaser from 'phaser';
import { createPanelCanvas, createPillCanvas, createRoundIconCanvas, type IconKind } from '../effects/uiArt';

/** Cria a textura uma única vez (cache do gestor de texturas) e devolve a chave. */
export function ensureTexture(scene: Phaser.Scene, key: string, make: () => HTMLCanvasElement): string {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, make());
  return key;
}

const r = (n: number) => Math.round(n);

export const pillTexture = (scene: Phaser.Scene, w: number, h: number, color: number): string =>
  ensureTexture(scene, `pill-${r(w)}x${r(h)}-${color.toString(16)}`, () => createPillCanvas(r(w), r(h), color));

export const panelTexture = (scene: Phaser.Scene, w: number, h: number, top: number, bottom: number, radius: number): string =>
  ensureTexture(scene, `panel-${r(w)}x${r(h)}-${top.toString(16)}-${bottom.toString(16)}-${r(radius)}`, () =>
    createPanelCanvas(r(w), r(h), top, bottom, r(radius)),
  );

export const iconButtonTexture = (scene: Phaser.Scene, size: number, color: number, icon: IconKind): string =>
  ensureTexture(scene, `iconbtn-${r(size)}-${color.toString(16)}-${icon}`, () => createRoundIconCanvas(r(size), color, icon));
