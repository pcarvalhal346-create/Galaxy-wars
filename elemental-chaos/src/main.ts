import '@fontsource/lilita-one/400.css';
import '@fontsource/fredoka/600.css';
import * as Phaser from 'phaser';
import { audio } from './audio/AudioEngine';
import { createGameConfig } from './config/phaserConfig';
import { startPerfMonitor } from './utils/perfMonitor';
import './style.css';

audio.install();

// Jogo instalável e offline (PWA). Não se aplica dentro de iframes nem na app nativa.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.top === window && !('Capacitor' in window)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

/** Espera pelas fontes (no máximo 2,5 s) para o texto e o logótipo saírem logo com a letra certa. */
async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const wanted = Promise.all([document.fonts.load('48px "Lilita One"'), document.fonts.load('600 32px "Fredoka"')]);
  await Promise.race([wanted, new Promise((r) => setTimeout(r, 2500))]).catch(() => undefined);
}

void loadFonts().then(() => {
  const game = new Phaser.Game(createGameConfig('game'));
  startPerfMonitor(game);
  if (import.meta.env.DEV) {
    (window as unknown as { __game?: Phaser.Game }).__game = game;
    // Exportação dos ícones da app (usado pelo script de geração; só em desenvolvimento).
    void import('./effects/appArt').then((m) => {
      (window as unknown as { __appArt?: unknown }).__appArt = {
        icon: (size: number) => m.createAppIconCanvas(size).toDataURL('image/png'),
        splash: (size: number) => m.createSplashCanvas(size).toDataURL('image/png'),
      };
    });
  }
});

