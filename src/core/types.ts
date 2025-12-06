/**
 * Core Types for Music Learning Platform
 *
 * This module contains all shared types used across the application.
 * Import from here to ensure type consistency between modules.
 *
 * @module core/types
 */

// ============================================
// MUSIC PRIMITIVES
// ============================================

/**
 * Represents a single musical note or rest.
 * This is the fundamental unit of music data throughout the application.
 *
 * @example
 * // Middle C, quarter note
 * const note: NoteData = { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false };
 *
 * // C# half note with chord
 * const chord: NoteData = {
 *   step: 'C', alter: 1, octave: 4, duration: 2, isRest: false,
 *   chordNotes: [{ step: 'E', alter: 0, octave: 4 }]
 * };
 */
export interface NoteData {
  /** Note letter: 'C', 'D', 'E', 'F', 'G', 'A', 'B' */
  step: string;
  /** Accidental: -1 = flat, 0 = natural, 1 = sharp */
  alter: number;
  /** MIDI octave (middle C = C4, so octave 4) */
  octave: number;
  /** Duration in beats: 4 = whole, 2 = half, 1 = quarter, 0.5 = eighth */
  duration: number;
  /** True if this is a rest (step/alter/octave ignored) */
  isRest: boolean;
  /** Additional notes played simultaneously (for chords) */
  chordNotes?: ChordNote[];
}

/**
 * A note within a chord (no duration, shares parent's duration)
 */
export interface ChordNote {
  step: string;
  alter: number;
  octave: number;
}

/**
 * Time signature definition
 */
export interface TimeSignature {
  /** Number of beats per measure (top number) */
  beats: number;
  /** Note value that gets one beat (bottom number): 4 = quarter, 8 = eighth */
  beatType: number;
}

/**
 * Key signature information
 */
export interface KeyInfo {
  /** Display name: 'C major', 'G major', etc. */
  name: string;
  /** Key signature as fifths: -3 = 3 flats, 2 = 2 sharps, 0 = C major */
  fifths: number;
  /** Scale notes in order: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] */
  scale: string[];
}

// ============================================
// MUSIC GENERATION
// ============================================

/**
 * Configuration for a specific level's music generation.
 * Defines what musical elements are available at this difficulty.
 */
export interface LevelConfig {
  /** Available note durations in beats: [4, 2, 1] = whole, half, quarter */
  durations: number[];
  /** Probability of generating a rest (0-1) */
  restProbability: number;
  /** Probability of chromatic alterations (0-1) */
  accidentalProbability: number;
  /** Maximum melodic interval in scale degrees */
  maxInterval: number;
  /** Key signature for this level */
  key: KeyInfo;
  /** Time signature for this level */
  timeSignature: TimeSignature;
  /** Scale degrees available: [1, 2, 3, 4, 5] = first 5 notes of scale */
  noteRange: number[];
  /** Melodic patterns to use (arrays of scale degrees) */
  patterns: number[][];
  /** Which hand(s) are active */
  handMode: 'right' | 'left' | 'both';
  /** Suggested tempo in BPM */
  suggestedBpm: number;
  /** Probability of generating chords (0-1) */
  chordProbability: number;
  /** Types of chords allowed */
  chordTypes: 'none' | 'intervals' | 'triads' | 'all';
}

/**
 * Output from music generation containing all data needed for playback/display.
 */
export interface GeneratedMusic {
  /** MusicXML string for Verovio rendering */
  xml: string;
  /** Time signature used */
  timeSignature: TimeSignature;
  /** Current level number */
  level: number;
  /** Current sub-level (0-3 for a, b, c, d) */
  subLevel: number;
  /** Human-readable lesson description */
  lessonDescription: string;
  /** Number of measures generated */
  numMeasures: number;
  /** Suggested BPM for this level */
  suggestedBpm: number;
  /** Key name (e.g., 'C major') */
  keyName: string;
  /** Right hand notes (source of truth for timing) */
  rightHandNotes: NoteData[];
  /** Left hand notes (source of truth for timing) */
  leftHandNotes: NoteData[];
}

// ============================================
// PLAYBACK & TIMING
// ============================================

/**
 * A scheduled event during playback.
 * Used by PlaybackEngine to schedule note triggers.
 */
export interface TimingEvent {
  /** Start time in beats from beginning of piece */
  time: number;
  /** Duration in beats */
  duration: number;
  /** Pitches to play at this time (e.g., ['C4', 'E4', 'G4']) */
  pitches: string[];
}

/**
 * A beat event emitted during playback.
 * UI components subscribe to these for visual updates.
 */
export interface BeatEvent {
  /** Index of the current beat/note group */
  beatIndex: number;
  /** Time in seconds when this beat fires */
  timeInSeconds: number;
  /** Notes active at this beat (for highlighting) */
  activeNotes: NoteData[];
}

/**
 * Playback transport state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'counting-off';

// ============================================
// USER PROGRESS
// ============================================

/**
 * User's progress through the curriculum.
 * Persisted to localStorage.
 */
export interface LevelProgress {
  /** Current level (1-20) */
  level: number;
  /** Current sub-level (0-3 for a, b, c, d) */
  subLevel: number;
  /** Successful plays at this sub-level */
  repetitions: number;
  /** Current practice tempo */
  currentBpm: number;
  /** Successful plays at current BPM */
  bpmMastery: number;
}

// ============================================
// FINGERING
// ============================================

/** Piano finger numbers: 1=thumb, 2=index, 3=middle, 4=ring, 5=pinky */
export type Finger = 1 | 2 | 3 | 4 | 5;

/** Which hand */
export type Hand = 'left' | 'right';

/**
 * Fingering suggestion for a single note
 */
export interface FingeringResult {
  finger: Finger;
  hand: Hand;
  note: string;
  midiNote: number;
}

/**
 * Complete fingering analysis for a passage
 */
export interface FingeringSuggestion {
  notes: FingeringResult[];
  /** Difficulty rating 1-3 */
  difficulty: number;
  /** Pedagogical tips */
  tips: string[];
  /** Hand position name (e.g., 'C Position') */
  position?: string;
}

// ============================================
// MIDI INPUT
// ============================================

/**
 * A MIDI note event (note on or note off)
 */
export interface MidiNoteEvent {
  /** Note name with octave: 'C4', 'F#5' */
  noteName: string;
  /** MIDI note number (0-127) */
  midiNumber: number;
  /** Velocity (0-127), 0 = note off */
  velocity: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Performance result for a played note
 */
export type NoteMatchResult = 'correct' | 'wrong' | 'early' | 'late' | 'missed';

// ============================================
// LESSONS & CURRICULUM
// ============================================

/**
 * A single step within a lesson.
 * Each step has music to practice and optional explanation.
 */
export interface LessonStep {
  /** Unique identifier for this step */
  id: string;
  /** Music to practice in this step */
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
  timeSignature: TimeSignature;
  key: KeyInfo;
  /** Suggested tempo */
  bpm: number;
  /** Optional explanation/commentary */
  explanation?: string;
  /** Learning objectives for this step */
  objectives?: string[];
  /** Number of successful plays required to advance */
  masteryRequired?: number;
}

/**
 * A complete lesson (sequence of steps)
 */
export interface Lesson {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Optional description */
  description?: string;
  /** Ordered list of steps */
  steps: LessonStep[];
  /** Index of current step */
  currentStepIndex: number;
}

/**
 * Types of lessons the platform supports
 */
export type LessonType =
  | 'sight-reading'    // Procedurally generated exercises
  | 'piece-study'      // Walk through an existing piece
  | 'technique'        // Focus on specific technique (scales, arpeggios)
  | 'theory';          // Theory concepts with examples
