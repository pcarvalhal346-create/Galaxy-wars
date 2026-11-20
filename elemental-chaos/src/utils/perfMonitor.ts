import type Phaser from 'phaser';
import { settings } from '../storage/settings';

/**
 * Vigia os FPS reais. Se o jogo correr abaixo de 40 FPS durante ~5 s seguidos, muda a
 * qualidade para "rápida" (menos pixels). A mudança aplica-se ao recarregar, num momento seguro
 * (ecrã inicial ou mapa), e só se o jogador não tiver escolhido a qualidade à mão.
 */
const THRESHOLD = 40;
const WINDOW = 5;
let samples: number[] = [];
let pendingReload = false;

export function startPerfMonitor(game: Phaser.Game): void {
  window.setInterval(() => {
    if (document.hidden) return;
    const s = settings.value;
    if (s.qualityLocked || s.quality === 'fast' || pendingReload) return;
    samples.push(game.loop.actualFps);
    if (samples.length > WINDOW) samples.shift();
    // Ignora os primeiros segundos (carregamento) e exige uma janela completa.
    if (performance.now() < 8000 || samples.length < WINDOW) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (avg < THRESHOLD) {
      settings.update({ quality: 'fast' });
      pendingReload = true;
      samples = [];
    }
  }, 1000);
}

/** Chamado no ecrã inicial e no mapa: aplica a mudança de qualidade pendente. */
export function applyPendingQuality(): boolean {
  if (!pendingReload) return false;
  window.location.reload();
  return true;
}
