import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { MapScene } from '../scenes/MapScene';
import { TitleScene } from '../scenes/TitleScene';
import { settings } from '../storage/settings';
import { renderSize } from '../view/layout';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#5a2bb8',
    scale: {
      // EXPAND: a área visível acompanha a proporção do ecrã sem distorcer;
      // o layout é recalculado em cada resize a partir de scale.width/height.
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Qualidade "rápida" desenha menos pixels por frame (telemóveis mais lentos).
      ...renderSize(settings.value.quality),
    },
    input: { activePointers: 2 },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    scene: [BootScene, TitleScene, MapScene, GameScene],
  };
}
