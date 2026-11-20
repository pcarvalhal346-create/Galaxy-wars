import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../view/layout';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0f2a',
    scale: {
      // EXPAND: a área visível acompanha a proporção do ecrã sem distorcer;
      // o layout é recalculado em cada resize a partir de scale.width/height.
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: REFERENCE_WIDTH,
      height: REFERENCE_HEIGHT,
    },
    input: { activePointers: 2 },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    scene: [BootScene, GameScene],
  };
}
