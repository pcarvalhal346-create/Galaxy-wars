import type Phaser from 'phaser';

/**
 * Promessa que resolve quando o tween termina. Se a cena for encerrada a meio,
 * a promessa nunca resolve — o que, de propósito, interrompe a cadeia de animações
 * sem tocar em objetos já destruídos.
 */
export function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => scene.time.delayedCall(ms, () => resolve()));
}
