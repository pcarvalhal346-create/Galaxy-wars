import type Phaser from 'phaser';
import { TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { LevelDefinition, Objective } from '../game/levels/types';
import { Button } from './Button';
import { objectiveIcon } from './Hud';
import { Modal } from './Modal';

export function objectiveText(o: Objective): string {
  switch (o.type) {
    case 'score':
      return `Faz ${o.target.toLocaleString('pt-PT')} pontos`;
    case 'collect':
      return `Recolhe ${o.target}`;
    case 'ice':
      return `Parte todo o gelo (${o.target})`;
    case 'reactions':
      return o.reaction === 'steam' ? `${o.target} explosões de vapor` : o.reaction === 'lightning' ? `${o.target} correntes elétricas` : `${o.target} reações`;
  }
}

/** Cartão de apresentação de um nível (objetivos, jogadas, dica) com botão Jogar. */
export function showLevelCard(
  scene: Phaser.Scene,
  depth: number,
  s: number,
  level: LevelDefinition,
  bestStars: number,
  onPlay: () => void,
  onClose: () => void,
): Modal {
  const w = Math.min(scene.scale.width - 50 * s, 820 * s);
  const h = 1000 * s;
  const m = new Modal(scene, depth, { title: `Nível ${level.id}`, width: w, height: h, scale: s, onClose });
  m.text(0, -h / 2 + 110 * s, level.name, 46, UI_COLORS.accent);

  for (let i = 0; i < 3; i++) {
    const star = scene.add.image((i - 1) * 110 * s, -h / 2 + 215 * s - (i === 1 ? 20 * s : 0), i < bestStars ? TEXTURE_KEYS.starFull : TEXTURE_KEYS.starEmpty);
    star.setDisplaySize(100 * s, 100 * s);
    m.add(star);
  }

  m.text(0, -h / 2 + 320 * s, 'OBJETIVOS', 30, '#ffe7ff');
  const n = level.objectives.length;
  level.objectives.forEach((o, i) => {
    const x = (i - (n - 1) / 2) * 300 * s;
    const icon = scene.add.image(x, -h / 2 + 420 * s, objectiveIcon(o)).setDisplaySize(110 * s, 110 * s);
    m.add(icon);
    m.text(x, -h / 2 + 510 * s, objectiveText(o), 28, '#ffffff', 280 * s);
  });

  m.text(0, -h / 2 + 600 * s, `${level.moves} jogadas`, 34, UI_COLORS.accent);
  if (level.tutorial) m.text(0, -h / 2 + 720 * s, level.tutorial, 27, '#ffffff', w * 0.84);
  m.add(new Button(scene, 0, h / 2 - 110 * s, { width: w * 0.62, height: 140 * s, label: 'JOGAR', fontSize: 60 * s, color: UI_COLORS.orange, onClick: onPlay }));
  return m;
}
