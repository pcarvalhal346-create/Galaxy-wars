import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { ObjectiveProgress } from '../game/levels/LevelRun';
import type { LevelDefinition, Objective } from '../game/levels/types';
import type { GameLayout } from '../view/layout';
import { panelTexture } from './textures';

export function objectiveIcon(o: Objective): string {
  if (o.type === 'collect') return TEXTURE_KEYS.tile(o.element);
  if (o.type === 'score') return TEXTURE_KEYS.starFull;
  if (o.type === 'ice') return TEXTURE_KEYS.ice(2);
  return o.reaction === 'lightning' ? TEXTURE_KEYS.iconLightning : TEXTURE_KEYS.iconSteam;
}

interface ObjectiveSlot {
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
}

/** Zona superior: nível, objetivos, jogadas restantes, pontuação com barra de estrelas. */
export class Hud {
  private readonly panel: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly medal: Phaser.GameObjects.Image;
  private readonly movesLabel: Phaser.GameObjects.Text;
  private readonly movesValue: Phaser.GameObjects.Text;
  private readonly scoreLabel: Phaser.GameObjects.Text;
  private readonly scoreValue: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly barStars: Phaser.GameObjects.Image[] = [];
  private slots: ObjectiveSlot[] = [];
  private level: LevelDefinition | null = null;
  private layout: GameLayout | null = null;
  private score = 0;
  private barRect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    const text = (size: number, color: string = UI_COLORS.text) =>
      scene.add
        .text(0, 0, '', {
          fontFamily: FONT_FAMILY,
          fontSize: `${size}px`,
          fontStyle: 'normal',
          color,
          stroke: UI_COLORS.stroke,
          strokeThickness: Math.max(3, size * 0.16),
        })
        .setOrigin(0.5)
        .setDepth(depth + 2);
    this.panel = scene.add.image(0, 0, TEXTURE_KEYS.spark).setDepth(depth);
    this.title = text(34);
    this.medal = scene.add.image(0, 0, TEXTURE_KEYS.node('open')).setDepth(depth + 1);
    this.movesLabel = text(20).setText('JOGADAS');
    this.movesValue = text(72);
    this.scoreLabel = text(22, UI_COLORS.accent).setText('PONTOS');
    this.scoreValue = text(44);
    this.bar = scene.add.graphics().setDepth(depth + 1);
    for (let i = 0; i < 3; i++) this.barStars.push(scene.add.image(0, 0, TEXTURE_KEYS.starEmpty).setDepth(depth + 2));
  }

  setLevel(level: LevelDefinition): void {
    this.level = level;
    for (const s of this.slots) [s.icon, s.label, s.check].forEach((o) => o.destroy());
    this.slots = level.objectives.map((o) => ({
      icon: this.scene.add.image(0, 0, objectiveIcon(o)).setDepth(this.depth + 1),
      label: this.scene.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: 'normal', color: '#ffffff', stroke: UI_COLORS.stroke, strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(this.depth + 2),
      check: this.scene.add
        .text(0, 0, '✔', { fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: 'normal', color: '#5dff7a', stroke: '#145a2a', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(this.depth + 3)
        .setVisible(false),
    }));
    this.title.setText(`Nível ${level.id} · ${level.name}`);
    if (this.layout) this.relayout(this.layout);
  }

  setMoves(moves: number): void {
    if (this.movesValue.text === String(moves)) return;
    this.movesValue.setText(String(moves));
    this.movesValue.setColor(moves <= 3 ? '#ffd0d0' : '#ffffff');
    this.scene.tweens.add({ targets: this.movesValue, scale: { from: 1.3, to: 1 }, duration: 200, ease: 'Back.easeOut' });
  }

  setScore(score: number): void {
    this.score = score;
    this.scoreValue.setText(score.toLocaleString('pt-PT'));
    this.drawBar();
  }

  setObjectives(progress: readonly ObjectiveProgress[]): void {
    progress.forEach((p, i) => {
      const slot = this.slots[i];
      if (!slot) return;
      const text = p.objective.type === 'score' ? `${p.objective.target.toLocaleString('pt-PT')}` : `${p.current}/${p.objective.target}`;
      if (slot.label.text !== text && slot.label.text !== '') {
        this.scene.tweens.add({ targets: slot.icon, scale: { from: slot.icon.scale * 1.25, to: slot.icon.scale }, duration: 160 });
      }
      slot.label.setText(text);
      slot.check.setVisible(p.done);
      slot.label.setAlpha(p.done ? 0.6 : 1);
    });
  }

  /** Zona de uma parte do HUD (para o tutorial a realçar). */
  region(part: 'objectives' | 'moves' | 'score'): { x: number; y: number; width: number; height: number } | null {
    const pick = (objs: Phaser.GameObjects.Components.GetBounds[]) => {
      if (objs.length === 0) return null;
      const b = objs.map((o) => o.getBounds());
      const x0 = Math.min(...b.map((r) => r.x));
      const y0 = Math.min(...b.map((r) => r.y));
      const x1 = Math.max(...b.map((r) => r.right));
      const y1 = Math.max(...b.map((r) => r.bottom));
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    };
    if (part === 'objectives') return pick(this.slots.flatMap((s) => [s.icon, s.label]));
    if (part === 'moves') return pick([this.medal]);
    const r = pick([this.scoreLabel, this.scoreValue, ...this.barStars]);
    if (!r) return null;
    const { x, y, w, h } = this.barRect;
    const x0 = Math.min(r.x, x - h);
    const x1 = Math.max(r.x + r.width, x + w + h);
    const y1 = Math.max(r.y + r.height, y + h * 2);
    return { x: x0, y: r.y, width: x1 - x0, height: y1 - r.y };
  }

  /** Posição do ícone de um objetivo (para animações de peças a voar até ele). */
  objectiveTarget(index: number): { x: number; y: number } | null {
    const s = this.slots[index];
    return s ? { x: s.icon.x, y: s.icon.y } : null;
  }

  relayout(layout: GameLayout): void {
    this.layout = layout;
    const s = layout.uiScale;
    const { hud } = layout;
    const margin = 24 * s;
    const panelX = hud.x + margin;
    const panelW = hud.width - margin * 2;
    const panelY = hud.y + 70 * s;
    const panelH = hud.height - 82 * s;
    const key = panelTexture(this.scene, panelW, panelH, UI_COLORS.panelLight, UI_COLORS.panel, 40 * s);
    this.panel.setTexture(key).setPosition(panelX + panelW / 2, panelY + panelH / 2);

    this.title.setFontSize(Math.round(34 * s)).setStroke(UI_COLORS.stroke, 7 * s).setPosition(hud.x + hud.width / 2, hud.y + 36 * s);

    const cx = panelX + panelW / 2;
    const cy = panelY + panelH / 2;
    const medalR = Math.min(panelH * 0.62, 120 * s);
    this.medal.setPosition(cx, cy).setDisplaySize(medalR * 2, medalR * 2);
    this.movesLabel.setFontSize(Math.round(20 * s)).setStroke(UI_COLORS.stroke, 5 * s).setPosition(cx, cy - medalR * 0.5);
    this.movesValue.setFontSize(Math.round(70 * s)).setStroke(UI_COLORS.stroke, 10 * s).setPosition(cx, cy + medalR * 0.1);

    // Objetivos à esquerda.
    const leftW = panelW / 2 - medalR - 20 * s;
    const n = Math.max(1, this.slots.length);
    const slotW = leftW / n;
    const iconSize = Math.min(slotW * 0.62, panelH * 0.45);
    this.slots.forEach((slot, i) => {
      const x = panelX + 16 * s + slotW * (i + 0.5);
      slot.icon.setPosition(x, cy - panelH * 0.14).setDisplaySize(iconSize, iconSize);
      slot.label.setFontSize(Math.round(28 * s)).setStroke(UI_COLORS.stroke, 6 * s).setPosition(x, cy + panelH * 0.27);
      slot.check.setFontSize(Math.round(36 * s)).setPosition(x + iconSize * 0.38, cy - panelH * 0.02);
    });

    // Pontuação e barra de estrelas à direita.
    const rightX = cx + medalR + 20 * s;
    const rightW = panelX + panelW - 26 * s - rightX;
    this.scoreLabel.setFontSize(Math.round(22 * s)).setStroke(UI_COLORS.stroke, 5 * s).setPosition(rightX + rightW / 2, cy - panelH * 0.3);
    this.scoreValue.setFontSize(Math.round(42 * s)).setStroke(UI_COLORS.stroke, 8 * s).setPosition(rightX + rightW / 2, cy - panelH * 0.06);
    this.barRect = { x: rightX, y: cy + panelH * 0.18, w: rightW, h: 22 * s };
    this.drawBar();
  }

  private drawBar(): void {
    const { x, y, w, h } = this.barRect;
    const g = this.bar;
    g.clear();
    if (w <= 0 || !this.level) return;
    const max = this.level.stars[2];
    const t = Math.min(1, this.score / max);
    g.fillStyle(0x2a0f5a, 0.8).fillRoundedRect(x, y, w, h, h / 2);
    if (t > 0) g.fillStyle(UI_COLORS.accentNum, 1).fillRoundedRect(x, y, Math.max(h, w * t), h, h / 2);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(x + h * 0.3, y + h * 0.15, Math.max(0, w * t - h * 0.6), h * 0.3, h * 0.15);
    this.level.stars.forEach((threshold, i) => {
      const star = this.barStars[i];
      if (!star) return;
      const sx = x + w * Math.min(1, threshold / max);
      const lit = this.score >= threshold;
      star.setTexture(lit ? TEXTURE_KEYS.starFull : TEXTURE_KEYS.starEmpty).setPosition(Math.min(sx, x + w - h), y + h / 2).setDisplaySize(h * 2.2, h * 2.2);
    });
  }

  destroy(): void {
    for (const s of this.slots) [s.icon, s.label, s.check].forEach((o) => o.destroy());
    [this.panel, this.title, this.medal, this.movesLabel, this.movesValue, this.scoreLabel, this.scoreValue, this.bar, ...this.barStars].forEach((o) => o.destroy());
  }
}
