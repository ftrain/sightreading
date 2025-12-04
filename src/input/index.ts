/**
 * Input Module
 *
 * User input handling - MIDI, keyboard, and performance tracking.
 *
 * @module input
 */

// MIDI
export { MidiHandler, createMidiHandler } from './midi';
export type { MidiDevice } from './midi';

// Performance tracking
export { PerformanceTracker, createPerformanceTracker } from './performance';
export type { PerformanceStats } from './performance';
