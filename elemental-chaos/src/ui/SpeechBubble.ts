import type Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import { panelTexture } from './textures';

/**
 * Balão de fala da Lumi: painel branco com "rabo" a apontar para ela.
 * `tail` é a direção do rabo: 'left' (Lumi à esquerda) ou 'down' (Lumi por baixo).
 */
export function createSpeechBubble(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  s: number,
  opts: { width?: number; fontSize?: number; tail?: 'left' | 'down' } = {},
): Phaser.GameObjects.Container {
  const fontSize = opts.fontSize ?? 44;
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONT_FAMILY,
      fontSize: `${Math.round(fontSize * s)}px`,
      fontStyle: 'bold',
      color: UI_COLORS.textDark,
      align: 'center',
      wordWrap: { width: (opts.width ?? 420) * s, useAdvancedWrap: true },
    })
    .setOrigin(0.5);
  const w = Math.max(label.width + 70 * s, 200 * s);
  const h = label.height + 56 * s;
  const panel = scene.add.image(0, 0, panelTexture(scene, w, h, 0xffffff, 0xf1e8ff, 40 * s));
  const tail = scene.add.graphics();
  tail.fillStyle(0xffffff, 1);
  if ((opts.tail ?? 'left') === 'left') {
    tail.fillTriangle(-w / 2 + 6 * s, -10 * s, -w / 2 - 34 * s, 18 * s, -w / 2 + 6 * s, 26 * s);
  } else {
    tail.fillTriangle(-24 * s, h / 2 - 6 * s, 24 * s, h / 2 - 6 * s, 0, h / 2 + 34 * s);
  }
  const c = scene.add.container(x, y, [tail, panel, label]);
  c.setSize(w, h);
  return c;
}
