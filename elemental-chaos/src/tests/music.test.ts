import { describe, expect, it } from 'vitest';
import { BARS_PER_LOOP, buildBar, degreeToMidi, midiToHz, THEMES, type MusicTheme } from '../audio/music';

describe('música procedural', () => {
  const themes = Object.keys(THEMES) as MusicTheme[];

  it('cada compasso tem notas dentro do compasso e da escala do tema', () => {
    for (const theme of themes) {
      const spec = THEMES[theme];
      const inScale = new Set(spec.scale.map((s) => (spec.root + s) % 12));
      for (let bar = 0; bar < BARS_PER_LOOP; bar++) {
        const notes = buildBar(theme, bar);
        expect(notes.length).toBeGreaterThan(4);
        for (const n of notes) {
          expect(n.beat).toBeGreaterThanOrEqual(0);
          expect(n.beat).toBeLessThan(4);
          expect(n.dur).toBeGreaterThan(0);
          expect(n.vel).toBeGreaterThan(0);
          expect(n.vel).toBeLessThanOrEqual(1);
          expect(inScale.has(((n.midi % 12) + 12) % 12), `${theme} ${n.midi}`).toBe(true);
          expect(n.midi).toBeGreaterThan(20);
          expect(n.midi).toBeLessThan(100);
        }
      }
    }
  });

  it('é determinística', () => {
    expect(buildBar('storm', 3)).toEqual(buildBar('storm', 3));
  });

  it('conversões de nota', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(degreeToMidi(THEMES.menu, 7)).toBe(72);
    expect(degreeToMidi(THEMES.menu, -1)).toBe(59);
  });
});
