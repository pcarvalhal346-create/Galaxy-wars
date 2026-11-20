import type Phaser from 'phaser';
import { TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { ObjectiveProgress } from '../game/levels/LevelRun';
import { Button } from './Button';
import { objectiveIcon } from './Hud';
import { Modal } from './Modal';

export interface ResultInfo {
  won: boolean;
  levelId: number;
  stars: number;
  score: number;
  winBonus: number;
  progress: readonly ObjectiveProgress[];
  hasNext: boolean;
  reducedEffects: boolean;
}

export interface ResultActions {
  onNext(): void;
  onRetry(): void;
  onMap(): void;
}

/** Ecrã de vitória ou derrota. */
export function showResult(scene: Phaser.Scene, depth: number, s: number, info: ResultInfo, actions: ResultActions): Modal {
  const w = Math.min(scene.scale.width - 50 * s, 820 * s);
  const h = 900 * s;
  const m = new Modal(scene, depth, { title: info.won ? 'Nível concluído!' : 'Faltou pouco!', width: w, height: h, scale: s });

  if (info.won) {
    for (let i = 0; i < 3; i++) {
      const lit = i < info.stars;
      const size = (i === 1 ? 190 : 150) * s;
      const star = scene.add.image((i - 1) * 190 * s, -h / 2 + 200 * s - (i === 1 ? 30 * s : 0), lit ? TEXTURE_KEYS.starFull : TEXTURE_KEYS.starEmpty);
      star.setDisplaySize(size, size);
      m.add(star);
      if (lit && !info.reducedEffects) {
        star.setScale(0);
        scene.tweens.add({ targets: star, scaleX: size / star.width, scaleY: size / star.height, duration: 380, delay: 250 + i * 260, ease: 'Back.easeOut' });
      }
    }
    m.text(0, -h / 2 + 360 * s, 'PONTUAÇÃO', 30, '#ffe7ff');
    m.text(0, -h / 2 + 430 * s, info.score.toLocaleString('pt-PT'), 72, UI_COLORS.accent);
    if (info.winBonus > 0) m.text(0, -h / 2 + 510 * s, `Bónus de jogadas: +${info.winBonus.toLocaleString('pt-PT')}`, 28);
  } else {
    m.text(0, -h / 2 + 140 * s, 'Ficaste sem jogadas.', 36);
    const n = info.progress.length;
    info.progress.forEach((p, i) => {
      const x = (i - (n - 1) / 2) * 260 * s;
      m.add(scene.add.image(x, -h / 2 + 290 * s, objectiveIcon(p.objective)).setDisplaySize(120 * s, 120 * s));
      const label = p.objective.type === 'score' ? `${p.current.toLocaleString('pt-PT')}/${p.objective.target.toLocaleString('pt-PT')}` : `${p.current}/${p.objective.target}`;
      m.text(x, -h / 2 + 390 * s, label, 34, p.done ? '#7dff9a' : '#ffd0e0');
    });
    m.text(0, -h / 2 + 490 * s, `Pontuação: ${info.score.toLocaleString('pt-PT')}`, 32);
  }

  const bw = w * 0.7;
  const bh = 120 * s;
  if (info.won && info.hasNext) {
    m.add(new Button(scene, 0, h / 2 - 270 * s, { width: bw, height: bh, label: 'Próximo nível', fontSize: 46 * s, color: UI_COLORS.green, onClick: actions.onNext }));
  } else {
    m.add(new Button(scene, 0, h / 2 - 270 * s, { width: bw, height: bh, label: info.won ? 'Jogar outra vez' : 'Tentar outra vez', fontSize: 46 * s, color: UI_COLORS.orange, onClick: actions.onRetry }));
  }
  m.add(new Button(scene, 0, h / 2 - 120 * s, { width: bw, height: bh * 0.85, label: 'Mapa', fontSize: 40 * s, color: UI_COLORS.pink, onClick: actions.onMap }));
  return m;
}
