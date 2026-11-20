import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { HAND_TIP } from '../effects/mascotArt';
import { ELEMENTS, type ElementType } from '../game/core/types';
import type { GameLayout, Rect } from '../view/layout';
import { Button } from './Button';
import { panelTexture } from './textures';

export interface TutorialView {
  text: string;
  /** Zona a realçar (o resto escurece). */
  focus?: Rect | null;
  /** Mão a arrastar de um ponto para outro. */
  drag?: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  show?: ElementType | 'all';
  /** Botão "Continuar" (passos só de mensagem). */
  onContinue?: (() => void) | null;
  onSkip?: (() => void) | null;
}

/**
 * Camada do tutorial: escurece à volta do alvo, mostra a mão a fazer a jogada
 * e o balão da Lumi com a explicação. Não bloqueia o toque no tabuleiro
 * (só os botões são interativos), para o jogador fazer a jogada indicada.
 */
export class TutorialOverlay {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  get visible(): boolean {
    return this.objects.length > 0;
  }

  hide(): void {
    for (const t of this.tweens) t.stop();
    for (const o of this.objects) o.destroy();
    this.tweens = [];
    this.objects = [];
  }

  show(view: TutorialView, layout: GameLayout): void {
    this.hide();
    const s = layout.uiScale;
    const { width: W, height: H } = layout;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };

    // Escurecer à volta do alvo (4 retângulos) + moldura luminosa.
    if (view.focus) {
      const f = view.focus;
      const pad = 10 * s;
      const x0 = Math.max(0, f.x - pad);
      const y0 = Math.max(0, f.y - pad);
      const x1 = Math.min(W, f.x + f.width + pad);
      const y1 = Math.min(H, f.y + f.height + pad);
      const dim = add(this.scene.add.graphics().setDepth(this.depth));
      dim.fillStyle(0x12042a, 0.62);
      dim.fillRect(0, 0, W, y0);
      dim.fillRect(0, y1, W, H - y1);
      dim.fillRect(0, y0, x0, y1 - y0);
      dim.fillRect(x1, y0, W - x1, y1 - y0);
      const glow = add(this.scene.add.graphics().setDepth(this.depth));
      glow.lineStyle(6 * s, 0xfff3a0, 1).strokeRoundedRect(x0, y0, x1 - x0, y1 - y0, 18 * s);
      this.tweens.push(this.scene.tweens.add({ targets: glow, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 }));
    }

    // Mão a demonstrar o arrasto.
    if (view.drag) {
      const size = layout.cellSize * 1.25;
      const hand = add(this.scene.add.image(0, 0, TEXTURE_KEYS.hand).setDepth(this.depth + 3).setDisplaySize(size, size));
      hand.setOrigin(HAND_TIP.x, HAND_TIP.y);
      const { from, to } = view.drag;
      hand.setPosition(from.x, from.y);
      this.tweens.push(
        this.scene.tweens.chain({
          targets: hand,
          loop: -1,
          tweens: [
            { alpha: { from: 0, to: 1 }, scale: { from: hand.scale * 1.15, to: hand.scale }, duration: 220 },
            { x: to.x, y: to.y, duration: 620, ease: 'Sine.easeInOut', delay: 120 },
            { alpha: 0, duration: 220, delay: 180 },
            { x: from.x, y: from.y, duration: 1 },
          ],
        }) as unknown as Phaser.Tweens.Tween,
      );
    }

    // Balão da Lumi: em baixo, a não ser que tape o alvo (então vai para cima).
    const bw = Math.min(W - 40 * s, 980 * s);
    const bh = (view.onContinue ? 360 : 280) * s;
    const bottomY = H - bh / 2 - 30 * s;
    const focusBottom = view.focus ? view.focus.y + view.focus.height : 0;
    const by = view.focus && focusBottom > H - bh - 50 * s ? Math.max(bh / 2 + 30 * s, (view.focus.y ?? 0) - bh / 2 - 30 * s) : bottomY;
    const cx = W / 2;
    const panel = add(this.scene.add.image(cx, by, panelTexture(this.scene, bw, bh, 0xffffff, 0xeee4ff, 46 * s)).setDepth(this.depth + 1));
    panel.setInteractive(); // o balão não deixa tocar no que está por baixo dele
    const lumiSize = Math.min(bh * 0.95, 300 * s);
    const lumi = add(this.scene.add.image(cx - bw / 2 + lumiSize * 0.45, by - bh / 2 + lumiSize * 0.3, TEXTURE_KEYS.lumi('happy')).setDepth(this.depth + 2));
    lumi.setDisplaySize(lumiSize, lumiSize);
    this.tweens.push(this.scene.tweens.add({ targets: lumi, y: lumi.y - 12 * s, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    const textX = cx - bw / 2 + lumiSize * 0.95;
    const textW = bw - lumiSize * 0.95 - 40 * s;
    add(
      this.scene.add
        .text(textX, by - bh / 2 + 34 * s, view.text, {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(32 * s)}px`,
          fontStyle: 'bold',
          color: UI_COLORS.textDark,
          wordWrap: { width: textW, useAdvancedWrap: true },
          lineSpacing: 6 * s,
        })
        .setDepth(this.depth + 2),
    );

    if (view.show) {
      const list = view.show === 'all' ? [...ELEMENTS] : [view.show];
      const size = 86 * s;
      list.forEach((e, i) => {
        const x = textX + size / 2 + i * size * 1.1;
        const icon = add(this.scene.add.image(x, by - bh / 2 - size * 0.35, TEXTURE_KEYS.tile(e)).setDepth(this.depth + 2).setDisplaySize(size, size));
        this.tweens.push(this.scene.tweens.add({ targets: icon, y: icon.y - 10 * s, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      });
    }

    if (view.onContinue) {
      const btn = add(new Button(this.scene, cx + bw / 2 - 190 * s, by + bh / 2 - 70 * s, { width: 320 * s, height: 96 * s, label: 'Continuar', fontSize: 36 * s, color: UI_COLORS.green, onClick: view.onContinue }));
      btn.setDepth(this.depth + 3);
    }
    if (view.onSkip) {
      const skip = add(
        this.scene.add
          .text(cx - bw / 2 + 40 * s, by + bh / 2 - 46 * s, 'Saltar tutorial', {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.round(24 * s)}px`,
            fontStyle: 'bold',
            color: '#8a6ac8',
          })
          .setOrigin(0, 0.5)
          .setDepth(this.depth + 3),
      );
      skip.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, view.onSkip);
    }

    // Entrada suave.
    for (const o of this.objects) {
      const v = o as unknown as Phaser.GameObjects.Components.Alpha;
      if (typeof v.setAlpha === 'function' && o !== lumi) {
        const target = v.alpha;
        v.setAlpha(0);
        this.scene.tweens.add({ targets: o, alpha: target, duration: 200 });
      }
    }
  }

  destroy(): void {
    this.hide();
  }
}
