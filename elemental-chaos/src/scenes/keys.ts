import type Phaser from 'phaser';

export const SCENES = { boot: 'Boot', title: 'Title', map: 'Map', game: 'Game' } as const;

export interface GameSceneData {
  levelId?: number;
  /** Mostrar o cartão do nível ao entrar (vindo de "Próximo nível"). */
  showIntro?: boolean;
}

/** Transição suave entre ecrãs (fade de câmara). */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  const cam = scene.cameras.main;
  if (scene.registry.get('transitioning') === true) return;
  scene.registry.set('transitioning', true);
  cam.fadeOut(200, 26, 6, 54);
  cam.once('camerafadeoutcomplete', () => {
    scene.registry.set('transitioning', false);
    scene.scene.start(key, data);
  });
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.registry.set('transitioning', false);
  scene.cameras.main.fadeIn(220, 26, 6, 54);
}
