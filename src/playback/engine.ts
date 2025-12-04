/**
 * Playback Engine
 *
 * Manages audio playback using Tone.js.
 * Decoupled from UI - emits events for visual updates.
 *
 * @module playback/engine
 */

import * as Tone from 'tone';
import type { NoteData, TimingEvent, PlaybackState, TimeSignature } from '../core/types';
import { EventEmitter, type PlaybackBeatEvent, type PlaybackStateEvent, type PieceCompleteEvent } from '../core/events';
import { PianoSampler, playMetronomeClick } from './sampler';
import { buildTimingEvents, beatsToSeconds, shouldAllowMetronomeClick, getTotalDuration } from './scheduler';

// ============================================
// TYPES
// ============================================

export interface PlaybackEngineConfig {
  /** Initial BPM */
  bpm?: number;
  /** Enable metronome */
  metronome?: boolean;
  /** Metronome volume in dB */
  metronomeVolume?: number;
  /** Time signature for countoff */
  timeSignature?: TimeSignature;
}

export interface LoadedMusic {
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
  timeSignature: TimeSignature;
}

// ============================================
// PLAYBACK ENGINE CLASS
// ============================================

/**
 * Playback engine for scheduling and playing music.
 *
 * @example
 * const engine = new PlaybackEngine({ bpm: 60 });
 * await engine.init();
 *
 * engine.onBeat.on((event) => {
 *   console.log('Beat:', event.beatIndex);
 *   // Update UI highlighting here
 * });
 *
 * engine.load({
 *   rightHandNotes: [...],
 *   leftHandNotes: [...],
 *   timeSignature: { beats: 4, beatType: 4 }
 * });
 *
 * engine.play();
 */
export class PlaybackEngine {
  // Configuration
  private config: Required<PlaybackEngineConfig>;

  // State
  private state: PlaybackState = 'stopped';
  private isInitialized = false;

  // Audio
  private sampler: PianoSampler | null = null;
  private scheduledEvents: number[] = [];

  // Timing
  private timingEvents: TimingEvent[] = [];
  private loadedMusic: LoadedMusic | null = null;

  // Debounce
  private lastMetronomeTime = 0;
  private lastAdvanceBeatTime = 0;

  // Events
  readonly onBeat = new EventEmitter<PlaybackBeatEvent>();
  readonly onStateChange = new EventEmitter<PlaybackStateEvent>();
  readonly onComplete = new EventEmitter<PieceCompleteEvent>();

  constructor(config: PlaybackEngineConfig = {}) {
    this.config = {
      bpm: config.bpm ?? 60,
      metronome: config.metronome ?? true,
      metronomeVolume: config.metronomeVolume ?? -20,
      timeSignature: config.timeSignature ?? { beats: 4, beatType: 4 },
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize audio (must be called after user interaction).
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    this.sampler = new PianoSampler();
    await this.sampler.init();

    this.isInitialized = true;
  }

  /**
   * Check if engine is initialized.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================
  // MUSIC LOADING
  // ============================================

  /**
   * Load music for playback.
   */
  load(music: LoadedMusic): void {
    this.loadedMusic = music;
    this.config.timeSignature = music.timeSignature;
    this.timingEvents = buildTimingEvents(music.rightHandNotes, music.leftHandNotes);
  }

  /**
   * Get the loaded timing events.
   */
  getTimingEvents(): TimingEvent[] {
    return [...this.timingEvents];
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Set tempo.
   */
  setBpm(bpm: number): void {
    this.config.bpm = Math.max(20, Math.min(200, bpm));
    Tone.getTransport().bpm.value = this.config.bpm;
  }

  /**
   * Get current tempo.
   */
  get bpm(): number {
    return this.config.bpm;
  }

  /**
   * Toggle metronome.
   */
  setMetronome(enabled: boolean): void {
    this.config.metronome = enabled;
  }

  /**
   * Set metronome volume.
   */
  setMetronomeVolume(volume: number): void {
    this.config.metronomeVolume = volume;
  }

  // ============================================
  // TRANSPORT CONTROL
  // ============================================

  /**
   * Start playback.
   */
  async play(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.state === 'playing') return;

    const previousState = this.state;
    this.setState('counting-off');

    // Reset transport
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    this.scheduledEvents = [];
    transport.position = 0;
    transport.bpm.value = this.config.bpm;

    // Reset debounce
    this.lastMetronomeTime = 0;
    this.lastAdvanceBeatTime = 0;

    // Schedule music
    this.scheduleMusic();

    // Start transport
    transport.start();

    this.setState('playing');
    this.onStateChange.emit({ state: 'playing', previousState });
  }

  /**
   * Stop playback.
   */
  stop(): void {
    const previousState = this.state;
    this.setState('stopped');

    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.scheduledEvents = [];
    Tone.getTransport().seconds = 0;

    this.lastMetronomeTime = 0;

    if (this.sampler) {
      this.sampler.releaseAll();
    }

    this.onStateChange.emit({ state: 'stopped', previousState });
  }

  /**
   * Get current playback state.
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Check if currently playing.
   */
  get isPlaying(): boolean {
    return this.state === 'playing' || this.state === 'counting-off';
  }

  // ============================================
  // SCHEDULING
  // ============================================

  private scheduleMusic(): void {
    const events = this.timingEvents;
    const countoffTotal = this.config.timeSignature.beats;
    const totalDuration = getTotalDuration(events);
    const totalBeats = countoffTotal + totalDuration;
    const totalSubdivisions = Math.ceil(totalBeats * 4);

    // Track countoff progress
    let countoffBeats = 0;

    // Schedule metronome clicks
    for (let sub = 0; sub < totalSubdivisions; sub++) {
      const beatNumber = Math.floor(sub / 4);
      const subInBeat = sub % 4;
      const time = `0:${beatNumber}:${subInBeat}`;

      const eventId = Tone.getTransport().schedule(() => {
        // Metronome click
        if (this.config.metronome) {
          const now = performance.now();
          if (shouldAllowMetronomeClick(now, this.lastMetronomeTime, this.config.bpm)) {
            this.lastMetronomeTime = now;
            playMetronomeClick(subInBeat, this.config.metronomeVolume);
          }
        }

        // Countoff updates
        if (subInBeat === 0 && beatNumber < countoffTotal) {
          const displayNumber = countoffTotal - beatNumber;
          this.onBeat.emit({
            beatIndex: -1,
            timeInSeconds: 0,
            isCountoff: true,
            countoffRemaining: displayNumber,
          });

          countoffBeats = beatNumber + 1;
          if (countoffBeats >= countoffTotal) {
            this.setState('playing');
          }
        }
      }, time);

      this.scheduledEvents.push(eventId);
    }

    // Schedule note events
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const timeInBeats = countoffTotal + event.time;
      const timeInSeconds = beatsToSeconds(timeInBeats, this.config.bpm);

      const beatIdx = i;
      const eventId = Tone.getTransport().schedule(() => {
        this.advanceBeat(beatIdx);
      }, timeInSeconds);

      this.scheduledEvents.push(eventId);
    }

    // Schedule end of piece
    const endTimeInSeconds = beatsToSeconds(countoffTotal + totalDuration, this.config.bpm);
    const endEventId = Tone.getTransport().schedule(() => {
      this.onPieceComplete();
    }, endTimeInSeconds);

    this.scheduledEvents.push(endEventId);
  }

  private advanceBeat(beatIndex: number): void {
    // Debounce
    const now = performance.now();
    if (now - this.lastAdvanceBeatTime < 50) return;
    this.lastAdvanceBeatTime = now;

    if (beatIndex >= this.timingEvents.length) return;

    // Get notes at this beat for audio playback
    const activeNotes = this.getNotesAtBeat(beatIndex);

    // Play notes via sampler
    if (this.sampler?.loaded) {
      for (const note of activeNotes) {
        if (!note.isRest) {
          const pitch = this.noteDataToPitch(note);
          if (pitch) {
            this.sampler.triggerAttackRelease(pitch, '2n');
          }
        }
      }
    }

    // Emit beat event
    const event = this.timingEvents[beatIndex];
    this.onBeat.emit({
      beatIndex,
      timeInSeconds: beatsToSeconds(event.time, this.config.bpm),
      isCountoff: false,
    });
  }

  private onPieceComplete(): void {
    if (this.state !== 'playing') return;

    this.onComplete.emit({
      hadMistakes: false, // Determined by performance tracker
      notesPlayed: this.timingEvents.length,
      correctNotes: this.timingEvents.length,
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private setState(state: PlaybackState): void {
    this.state = state;
  }

  private getNotesAtBeat(beatIndex: number): NoteData[] {
    if (!this.loadedMusic) return [];

    const event = this.timingEvents[beatIndex];
    const beatTime = event.time;

    const notes: NoteData[] = [];

    // Find notes in right hand at this time
    let time = 0;
    for (const note of this.loadedMusic.rightHandNotes) {
      if (Math.abs(time - beatTime) < 0.01) {
        notes.push(note);
        break;
      }
      time += note.duration;
      if (time > beatTime) break;
    }

    // Find notes in left hand at this time
    time = 0;
    for (const note of this.loadedMusic.leftHandNotes) {
      if (Math.abs(time - beatTime) < 0.01) {
        notes.push(note);
        break;
      }
      time += note.duration;
      if (time > beatTime) break;
    }

    return notes;
  }

  private noteDataToPitch(note: NoteData): string | null {
    if (note.isRest) return null;
    let name = note.step;
    if (note.alter === 1) name += '#';
    if (note.alter === -1) name += 'b';
    return `${name}${note.octave}`;
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stop();
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
    this.onBeat.clear();
    this.onStateChange.clear();
    this.onComplete.clear();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create and initialize a playback engine.
 */
export async function createPlaybackEngine(
  config?: PlaybackEngineConfig
): Promise<PlaybackEngine> {
  const engine = new PlaybackEngine(config);
  await engine.init();
  return engine;
}
