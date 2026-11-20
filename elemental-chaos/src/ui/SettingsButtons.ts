import type Phaser from 'phaser';
import { UI_COLORS } from '../config/theme';
import { settings } from '../storage/settings';
import { Button } from './Button';

const LEVELS = [0, 0.3, 0.6, 1];
const next = (v: number) => LEVELS[(LEVELS.findIndex((l) => Math.abs(l - v) < 0.05) + 1) % LEVELS.length] ?? 0.6;
const pct = (v: number) => (v <= 0 ? 'DESLIGADA' : `${Math.round(v * 100)}%`);

/** Botões de preferências (música, efeitos sonoros, efeitos visuais), empilhados a partir de `y`. */
export function settingsButtons(scene: Phaser.Scene, y: number, w: number, h: number, fs: number, s: number): Button[] {
  const gap = h + 18 * s;
  const music: Button = new Button(scene, 0, y, { width: w, height: h, label: '', fontSize: fs, color: UI_COLORS.blue, onClick: () => {
    settings.update({ musicVolume: next(settings.value.musicVolume) });
    refresh();
  } });
  const sfx: Button = new Button(scene, 0, y + gap, { width: w, height: h, label: '', fontSize: fs, color: UI_COLORS.blue, onClick: () => {
    settings.update({ sfxVolume: next(settings.value.sfxVolume) });
    refresh();
  } });
  const fx: Button = new Button(scene, 0, y + gap * 2, { width: w, height: h, label: '', fontSize: fs, color: UI_COLORS.blue, onClick: () => {
    settings.update({ reducedEffects: !settings.value.reducedEffects });
    refresh();
  } });
  // Mudar a resolução obriga a reiniciar o jogo (o progresso fica guardado).
  const quality: Button = new Button(scene, 0, y + gap * 3, { width: w, height: h, label: '', fontSize: fs, color: UI_COLORS.violet, onClick: () => {
    settings.update({ quality: settings.value.quality === 'fast' ? 'high' : 'fast', qualityLocked: true });
    window.location.reload();
  } });
  const refresh = () => {
    const v = settings.value;
    music.setLabel(`Música: ${pct(v.musicVolume).replace('DESLIGADA', 'DESLIGADA')}`);
    sfx.setLabel(`Sons: ${pct(v.sfxVolume).replace('DESLIGADA', 'DESLIGADOS')}`);
    fx.setLabel(`Efeitos reduzidos: ${v.reducedEffects ? 'SIM' : 'NÃO'}`);
    quality.setLabel(`Gráficos: ${v.quality === 'fast' ? 'RÁPIDOS' : 'ALTA QUALIDADE'}`);
  };
  refresh();
  return [music, sfx, fx, quality];
}
