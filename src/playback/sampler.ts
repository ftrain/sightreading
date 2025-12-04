/**
 * Audio Sampler Management
 *
 * Wraps Tone.js Sampler for piano playback.
 * Handles sample loading and note triggering.
 *
 * @module playback/sampler
 */

import * as Tone from 'tone';

// ============================================
// TYPES
// ============================================

export interface SamplerConfig {
  /** Base URL for audio samples */
  baseUrl?: string;
  /** Release time in seconds */
  release?: number;
  /** Callback when samples are loaded */
  onLoad?: () => void;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

const PIANO_SAMPLES: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3',
};

// ============================================
// PIANO SAMPLER CLASS
// ============================================

/**
 * Piano sampler using Salamander Grand Piano samples.
 */
export class PianoSampler {
  private sampler: Tone.Sampler | null = null;
  private isLoaded = false;
  private config: Required<SamplerConfig>;

  constructor(config: SamplerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      release: config.release ?? 2,
      onLoad: config.onLoad ?? (() => {}),
    };
  }

  /**
   * Initialize the sampler and load samples.
   * Must be called after user interaction (for Web Audio API).
   */
  async init(): Promise<void> {
    if (this.sampler) return;

    // Start Tone.js audio context
    await Tone.start();

    // Create sampler
    this.sampler = new Tone.Sampler({
      urls: PIANO_SAMPLES,
      release: this.config.release,
      baseUrl: this.config.baseUrl,
      onload: () => {
        this.isLoaded = true;
        this.config.onLoad();
      },
    }).toDestination();

    // Wait for samples to load
    await Tone.loaded();
  }

  /**
   * Check if sampler is loaded and ready.
   */
  get loaded(): boolean {
    return this.isLoaded && this.sampler !== null;
  }

  /**
   * Play a note.
   *
   * @param note - Note name with octave (e.g., 'C4', 'F#5')
   * @param duration - Duration string (e.g., '2n', '4n', '1m')
   * @param time - When to trigger (optional, defaults to now)
   */
  triggerAttackRelease(
    note: string | string[],
    duration: string | number,
    time?: number
  ): void {
    if (!this.sampler || !this.loaded) return;
    this.sampler.triggerAttackRelease(note, duration, time);
  }

  /**
   * Start a note (without automatic release).
   */
  triggerAttack(note: string | string[], time?: number): void {
    if (!this.sampler || !this.loaded) return;
    this.sampler.triggerAttack(note, time);
  }

  /**
   * Release a note.
   */
  triggerRelease(note: string | string[], time?: number): void {
    if (!this.sampler || !this.loaded) return;
    this.sampler.triggerRelease(note, time);
  }

  /**
   * Release all notes immediately.
   */
  releaseAll(): void {
    if (!this.sampler) return;
    this.sampler.releaseAll();
  }

  /**
   * Dispose of the sampler.
   */
  dispose(): void {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
      this.isLoaded = false;
    }
  }
}

// ============================================
// METRONOME SYNTH
// ============================================

/**
 * Create a metronome click synth.
 */
export function createMetronomeSynth(volume: number = -20): Tone.Synth {
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();

  synth.volume.value = volume;
  return synth;
}

/**
 * Play a metronome click.
 *
 * @param subdivision - 0 = main beat, 1-3 = subdivisions
 * @param baseVolume - Base volume in dB
 */
export function playMetronomeClick(subdivision: number, baseVolume: number = -20): void {
  const synth = createMetronomeSynth();

  let volume: number;
  let pitch: string;

  if (subdivision === 0) {
    // Main beat - start quieter
    volume = baseVolume - 6;
    pitch = 'G5';
  } else {
    // Subdivisions are quieter
    volume = baseVolume - 24;
    pitch = 'C5';
  }

  synth.volume.value = volume;
  synth.triggerAttackRelease(pitch, '32n');

  // Dispose after playing
  setTimeout(() => synth.dispose(), 500);
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create and initialize a piano sampler.
 */
export async function createPianoSampler(
  config?: SamplerConfig
): Promise<PianoSampler> {
  const sampler = new PianoSampler(config);
  await sampler.init();
  return sampler;
}
