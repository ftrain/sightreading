/**
 * Core Module - Shared Types, Events, and Utilities
 *
 * This module exports all core functionality needed across the application.
 * Import from here for consistent types and utilities.
 *
 * @module core
 *
 * @example
 * import { NoteData, EventEmitter, noteDataToString } from './core';
 */

// Types
export * from './types';

// Events
export { EventEmitter, createAppEvents } from './events';
export type {
  AppEvents,
  PlaybackBeatEvent,
  PlaybackStateEvent,
  PieceCompleteEvent,
  MidiInputEvent,
  NoteMatchEvent,
  ProgressEvent,
} from './events';

// Note utilities
export {
  noteDataToString,
  parseNoteString,
  noteDataToMidi,
  midiToNoteName,
  midiToNoteData,
  normalizeNoteName,
  notesAreEqual,
  noteMatchesAny,
  getAllNotesFromNoteData,
  getIntervalSemitones,
  transposeNote,
  getDurationName,
  isDottedDuration,
  getTotalDuration,
  scaleDegreeToNote,
} from './noteUtils';
