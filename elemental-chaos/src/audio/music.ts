/**
 * Composição procedural da música (puro, sem Web Audio): cada tema tem tonalidade, escala,
 * andamento e progressão próprios. Gera os eventos de nota de cada compasso de forma
 * determinística, para a música soar igual sempre e poder ser testada.
 */
export type MusicTheme = 'menu' | 'meadow' | 'lagoon' | 'volcano' | 'storm' | 'frost';
export type Voice = 'pad' | 'bass' | 'arp' | 'bell';

export interface NoteEvent {
  /** Início em tempos (0 ≤ beat < 4). */
  readonly beat: number;
  readonly midi: number;
  /** Duração em tempos. */
  readonly dur: number;
  readonly voice: Voice;
  /** Intensidade 0..1. */
  readonly vel: number;
}

interface ThemeSpec {
  readonly root: number; // MIDI da tónica
  readonly scale: readonly number[]; // intervalos em semitons
  readonly bpm: number;
  /** Graus (índices da escala) da progressão, um acorde por compasso. */
  readonly progression: readonly number[];
  readonly arpDensity: number; // notas de arpejo por compasso (4 ou 8)
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

export const THEMES: Readonly<Record<MusicTheme, ThemeSpec>> = {
  menu: { root: 60, scale: MAJOR, bpm: 92, progression: [0, 4, 5, 3, 0, 4, 3, 4], arpDensity: 8 },
  meadow: { root: 67, scale: MAJOR, bpm: 100, progression: [0, 3, 4, 0, 5, 3, 1, 4], arpDensity: 8 },
  lagoon: { root: 62, scale: MAJOR, bpm: 84, progression: [0, 5, 3, 4, 0, 5, 1, 4], arpDensity: 4 },
  volcano: { root: 57, scale: MINOR, bpm: 108, progression: [0, 5, 6, 4, 0, 3, 6, 4], arpDensity: 8 },
  frost: { root: 65, scale: MAJOR, bpm: 88, progression: [0, 5, 3, 4, 0, 2, 3, 4], arpDensity: 8 },
  storm: { root: 64, scale: MINOR, bpm: 112, progression: [0, 6, 5, 6, 0, 3, 4, 4], arpDensity: 8 },
};

export const BARS_PER_LOOP = 8;

/** Nota MIDI do grau `degree` da escala (pode ultrapassar a oitava). */
export function degreeToMidi(spec: ThemeSpec, degree: number): number {
  const n = spec.scale.length;
  const octave = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return spec.root + octave * 12 + (spec.scale[idx] as number);
}

/** Eventos de nota de um compasso. */
export function buildBar(theme: MusicTheme, bar: number): NoteEvent[] {
  const spec = THEMES[theme];
  const chordDegree = spec.progression[bar % spec.progression.length] ?? 0;
  const chord = [0, 2, 4].map((d) => degreeToMidi(spec, chordDegree + d));
  const notes: NoteEvent[] = [];

  // Pad: acorde sustentado, uma oitava abaixo.
  for (const m of chord) notes.push({ beat: 0, midi: m - 12, dur: 4, voice: 'pad', vel: 0.5 });
  // Baixo: tónica do acorde nos tempos 1 e 3.
  const bass = (chord[0] as number) - 24;
  notes.push({ beat: 0, midi: bass, dur: 1.5, voice: 'bass', vel: 0.8 });
  notes.push({ beat: 2, midi: bass, dur: 1.5, voice: 'bass', vel: 0.6 });

  // Arpejo: padrão que varia de compasso para compasso (determinístico).
  const step = 4 / spec.arpDensity;
  const patterns = [
    [0, 1, 2, 3, 2, 1, 2, 3],
    [0, 2, 1, 3, 0, 2, 1, 4],
    [2, 1, 0, 1, 2, 3, 4, 3],
  ];
  const pattern = patterns[bar % patterns.length] as number[];
  for (let i = 0; i < spec.arpDensity; i++) {
    const deg = chordDegree + (pattern[i % pattern.length] as number);
    notes.push({ beat: i * step, midi: degreeToMidi(spec, deg) + 12, dur: step * 0.9, voice: 'arp', vel: i % 4 === 0 ? 0.7 : 0.45 });
  }
  // Sino: uma nota de melodia a cada dois compassos, para dar "brilho mágico".
  if (bar % 2 === 1) notes.push({ beat: 2.5, midi: degreeToMidi(spec, chordDegree + 4) + 12, dur: 1.5, voice: 'bell', vel: 0.5 });
  return notes;
}

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
