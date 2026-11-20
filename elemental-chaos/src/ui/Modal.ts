import * as Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import { IconButton } from './Button';
import { panelTexture } from './textures';

export interface ModalOptions {
  title: string;
  width: number;
  height: number;
  /** Escala de UI (layout.uiScale). */
  scale: number;
  /** Animação de entrada (desligar quando os tweens estão em pausa). */
  animate?: boolean;
  onClose?: () => void;
}

/**
 * Janela modal: escurece o fundo, bloqueia toques por trás e mostra um painel com título.
 * O conteúdo é adicionado com `add()` em coordenadas relativas ao centro do painel.
 */
export class Modal {
  readonly root: Phaser.GameObjects.Container;
  readonly width: number;
  readonly height: number;
  readonly s: number;
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, depth: number, opts: ModalOptions) {
    const { width: sw, height: sh } = scene.scale;
    this.width = opts.width;
    this.height = opts.height;
    this.s = opts.scale;
    const s = opts.scale;
    const shade = scene.add.rectangle(0, 0, sw, sh, 0x1a0636, 0.62).setOrigin(0).setInteractive();
    const content = scene.add.container(sw / 2, sh / 2);
    const panel = scene.add.image(0, 0, panelTexture(scene, opts.width, opts.height, 0xa77bff, 0x6a35d0, 44 * s));
    const ribbonW = Math.min(opts.width * 0.86, 620 * s);
    const ribbon = scene.add.image(0, -opts.height / 2, panelTexture(scene, ribbonW, 96 * s, 0xff7ac0, 0xd6267f, 40 * s));
    const title = scene.add
      .text(0, -opts.height / 2 - 4 * s, opts.title, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(44 * s)}px`,
        fontStyle: 'normal',
        color: '#ffffff',
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.round(9 * s),
      })
      .setOrigin(0.5);
    content.add([panel, ribbon, title]);
    if (opts.onClose) {
      const close = new IconButton(scene, opts.width / 2 - 20 * s, -opts.height / 2 + 10 * s, 92 * s, 'close', 0xff4f6e, () => {
        opts.onClose?.();
      });
      content.add(close);
    }
    this.root = scene.add.container(0, 0, [shade, content]).setDepth(depth);
    pinToScreen(this.root);
    if (opts.animate !== false) {
      content.setScale(0.7).setAlpha(0);
      scene.tweens.add({ targets: content, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.content = content;
  }

  private readonly content: Phaser.GameObjects.Container;

  add(obj: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.content.add(obj);
    for (const o of Array.isArray(obj) ? obj : [obj]) pinToScreen(o);
  }

  text(x: number, y: number, value: string, size: number, color: string = '#ffffff', wrap?: number): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, value, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(size * this.s)}px`,
        fontStyle: 'normal',
        color,
        align: 'center',
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.round(size * this.s * 0.16),
        ...(wrap ? { wordWrap: { width: wrap, useAdvancedWrap: true } } : {}),
      })
      .setOrigin(0.5);
    this.add(t);
    return t;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.root.destroy();
  }
}

/**
 * Fixa um objeto (e descendentes) ao ecrã, ignorando a rolagem da câmara.
 * Necessário também nos filhos de contentores para o input acertar com a câmara rolada.
 */
export function pinToScreen(obj: Phaser.GameObjects.GameObject): void {
  const o = obj as Phaser.GameObjects.GameObject & { setScrollFactor?: (x: number) => unknown; list?: Phaser.GameObjects.GameObject[] };
  o.setScrollFactor?.(0);
  if (Array.isArray(o.list)) for (const child of o.list) pinToScreen(child);
}
