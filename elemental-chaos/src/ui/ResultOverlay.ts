import type Phaser from 'phaser';
import { TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { ObjectiveProgress } from '../game/levels/LevelRun';
import { Button } from './Button';
import { objectiveIcon } from './Hud';
import { Modal } from './Modal';
import { createSpeechBubble } from './SpeechBubble';

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
  const w = Math.min(scene.scale.width - 50 * s, 860 * s);
  const h = 1180 * s;
  const m = new Modal(scene, depth, { title: info.won ? 'Nível concluído!' : 'Faltou pouco!', width: w, height: h, scale: s });
  const top = -h / 2;

  // A Lumi reage ao resultado: sorri e festeja na vitória, fica triste na derrota.
  const lumiSize = 330 * s;
  const lumiY = top + (info.won ? 470 : 300) * s;
  const lumi = scene.add.image(-w / 2 + lumiSize * 0.55, lumiY, TEXTURE_KEYS.lumi(info.won ? 'happy' : 'sad')).setDisplaySize(lumiSize, lumiSize);
  m.add(lumi);
  const bubble = createSpeechBubble(scene, -w / 2 + lumiSize + 190 * s, lumiY - 60 * s, info.won ? 'Bom trabalho!' : 'Tenta novamente!', s, { width: 330, fontSize: 46 });
  m.add(bubble);
  if (!info.reducedEffects) {
    if (info.won) scene.tweens.add({ targets: lumi, y: lumiY - 30 * s, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    else scene.tweens.add({ targets: lumi, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    bubble.setScale(0);
    scene.tweens.add({ targets: bubble, scale: 1, duration: 300, delay: 350, ease: 'Back.easeOut' });
  }

  if (info.won) {
    for (let i = 0; i < 3; i++) {
      const lit = i < info.stars;
      const size = (i === 1 ? 180 : 140) * s;
      const star = scene.add.image((i - 1) * 180 * s, top + 190 * s - (i === 1 ? 26 * s : 0), lit ? TEXTURE_KEYS.starFull : TEXTURE_KEYS.starEmpty);
      star.setDisplaySize(size, size);
      m.add(star);
      if (lit && !info.reducedEffects) {
        star.setScale(0);
        scene.tweens.add({ targets: star, scaleX: size / star.width, scaleY: size / star.height, duration: 380, delay: 250 + i * 260, ease: 'Back.easeOut' });
      }
    }
    m.text(0, top + 680 * s, 'PONTUAÇÃO', 30, '#ffe7ff');
    m.text(0, top + 750 * s, info.score.toLocaleString('pt-PT'), 72, UI_COLORS.accent);
    if (info.winBonus > 0) m.text(0, top + 825 * s, `Bónus de jogadas: +${info.winBonus.toLocaleString('pt-PT')}`, 28);
  } else {
    m.text(0, top + 510 * s, 'Ficaste sem jogadas.', 34);
    const n = info.progress.length;
    info.progress.forEach((p, i) => {
      const x = (i - (n - 1) / 2) * 250 * s;
      m.add(scene.add.image(x, top + 630 * s, objectiveIcon(p.objective)).setDisplaySize(110 * s, 110 * s));
      const label = p.objective.type === 'score' ? `${p.current.toLocaleString('pt-PT')}/${p.objective.target.toLocaleString('pt-PT')}` : `${p.current}/${p.objective.target}`;
      m.text(x, top + 725 * s, label, 32, p.done ? '#7dff9a' : '#ffd0e0');
    });
    m.text(0, top + 810 * s, `Pontuação: ${info.score.toLocaleString('pt-PT')}`, 30);
  }

  const bw = w * 0.7;
  const bh = 115 * s;
  if (info.won && info.hasNext) {
    m.add(new Button(scene, 0, h / 2 - 245 * s, { width: bw, height: bh, label: 'Próximo nível', fontSize: 46 * s, color: UI_COLORS.green, onClick: actions.onNext }));
  } else {
    m.add(new Button(scene, 0, h / 2 - 245 * s, { width: bw, height: bh, label: info.won ? 'Jogar outra vez' : 'Tentar outra vez', fontSize: 46 * s, color: UI_COLORS.orange, onClick: actions.onRetry }));
  }
  m.add(new Button(scene, 0, h / 2 - 105 * s, { width: bw, height: bh * 0.85, label: 'Mapa', fontSize: 40 * s, color: UI_COLORS.pink, onClick: actions.onMap }));
  return m;
}
