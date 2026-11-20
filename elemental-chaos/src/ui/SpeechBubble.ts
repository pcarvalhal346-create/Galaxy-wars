import type Phaser from 'phaser';
import { TEXT_FONT, UI_COLORS } from '../config/theme';
import { comicBubbleCenter, createComicBubbleCanvas, type TailSide } from '../effects/uiArt';
import { ensureTexture } from './textures';

export interface BubbleOptions {
  /** Largura máxima do texto (em unidades de referência, multiplicada por s). */
  width?: number;
  fontSize?: number;
  /** Para onde aponta o rabo (onde está a Lumi). */
  tail?: TailSide;
  font?: string;
}

/**
 * Balão de fala da Lumi em estilo banda desenhada. O contentor fica centrado no corpo
 * do balão (o rabo sai para o lado indicado).
 */
export function createSpeechBubble(scene: Phaser.Scene, x: number, y: number, text: string, s: number, opts: BubbleOptions = {}): Phaser.GameObjects.Container {
  const tail = opts.tail ?? 'left';
  const fontSize = opts.fontSize ?? 44;
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: opts.font ?? TEXT_FONT,
      fontSize: `${Math.round(fontSize * s)}px`,
      fontStyle: '600',
      color: UI_COLORS.textDark,
      align: 'center',
      lineSpacing: 4 * s,
      wordWrap: { width: (opts.width ?? 420) * s, useAdvancedWrap: true },
    })
    .setOrigin(0.5);
  // A superelipse deixa ~80% de cada eixo para o texto.
  const w = Math.round(Math.max(label.width / 0.8 + 50 * s, 220 * s));
  const h = Math.round(Math.max(label.height / 0.78 + 40 * s, 120 * s));
  const key = ensureTexture(scene, `bubble-${w}x${h}-${tail}`, () => createComicBubbleCanvas(w, h, tail));
  const c = comicBubbleCenter(w, h, tail);
  const img = scene.add.image(0, 0, key).setOrigin(c.x / c.width, c.y / c.height);
  const container = scene.add.container(x, y, [img, label]);
  container.setSize(w, h);
  return container;
}
