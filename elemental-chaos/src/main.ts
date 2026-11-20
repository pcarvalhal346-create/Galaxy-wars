import * as Phaser from 'phaser';
import { audio } from './audio/AudioEngine';
import { createGameConfig } from './config/phaserConfig';
import './style.css';

audio.install();
const game = new Phaser.Game(createGameConfig('game'));

if (import.meta.env.DEV) {
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}
