/**
 * Playback Module
 *
 * Audio playback, scheduling, and transport control.
 *
 * @module playback
 */

// Engine
export { PlaybackEngine, createPlaybackEngine } from './engine';
export type { PlaybackEngineConfig, LoadedMusic } from './engine';

// Sampler
export { PianoSampler, createPianoSampler, createMetronomeSynth, playMetronomeClick } from './sampler';
export type { SamplerConfig } from './sampler';

// Scheduler utilities
export {
  beatsToSeconds,
  secondsToBeats,
  buildTimingEvents,
  getTotalDuration,
  calculateMetronomeSchedule,
  getMetronomeDebounceInterval,
  shouldAllowMetronomeClick,
  applyDots,
  calculateNoteSchedule,
} from './scheduler';
