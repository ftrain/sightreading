// Pedagogically-Sound Sight Reading Generator
// Designed with input from piano teaching methodology
//
// Philosophy:
// - Repetition is key to mastery
// - Progress should feel incremental and achievable
// - Each sub-level introduces ONE new concept
// - Folk and classical melodic patterns aid memorability
// - Musical coherence helps students understand phrasing
// - NEW KEYS RESET TO BASICS - introduce key with whole notes first
// - TEMPO is separate from note complexity - master slow before fast

import { generateFingering } from './fingeringEngine';
import type { Finger } from './core/types';

// Global setting for whether to include fingering in notation
let includeFingering = false;

export function setIncludeFingering(include: boolean): void {
  includeFingering = include;
}

export function getIncludeFingering(): boolean {
  return includeFingering;
}

// Key override for practice - null means use level default
let keyOverride: string | null = null;

export function setKeyOverride(key: string | null): void {
  keyOverride = key;
}

export function getKeyOverride(): string | null {
  return keyOverride;
}

export interface GeneratedMusic {
  xml: string;
  timeSignature: { beats: number; beatType: number };
  level: number;
  subLevel: number;
  lessonDescription: string;
  numMeasures: number;
  suggestedBpm: number;
  keyName: string;
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
}

// Level structure: Level 1a, 1b, 1c, 1d... 2a, 2b, 2c, 2d... etc.
// Each level has 4 sub-levels to master before advancing
interface LevelProgress {
  level: number;
  subLevel: number; // 0-3 (a, b, c, d)
  repetitions: number; // How many times this sub-level has been practiced
  currentBpm: number; // Current tempo being practiced
  bpmMastery: number; // How many successful plays at current BPM
}

const STORAGE_KEY = 'sightreading-progress';

function loadProgress(): LevelProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate and return saved progress
      return {
        level: Math.max(1, Math.min(20, parsed.level || 1)),
        subLevel: Math.max(0, Math.min(3, parsed.subLevel || 0)),
        repetitions: parsed.repetitions || 0,
        currentBpm: Math.max(20, Math.min(200, parsed.currentBpm || 30)),
        bpmMastery: parsed.bpmMastery || 0,
      };
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return {
    level: 1,
    subLevel: 0,
    repetitions: 0,
    currentBpm: 30,
    bpmMastery: 0,
  };
}

function saveProgress(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

let progress: LevelProgress = loadProgress();

// Mastery requirements
const NOTE_MASTERY_THRESHOLD = 3; // Successful plays to advance sub-level
const BPM_MASTERY_THRESHOLD = 3; // Successful plays at tempo before suggesting increase
const BPM_INCREMENT = 5; // How much to increase tempo

// Mobile mode: 4 measures instead of 8
let mobileMode = false;

export function setMobileMode(mobile: boolean): void {
  mobileMode = mobile;
}

export function isMobileMode(): boolean {
  return mobileMode;
}

export function getLevel(): number {
  return progress.level;
}

export function getSubLevel(): number {
  return progress.subLevel;
}

export function getSubLevelLetter(): string {
  return ['a', 'b', 'c', 'd'][progress.subLevel] || 'a';
}

export function getFullLevelString(): string {
  return `${progress.level}${getSubLevelLetter()}`;
}

export function getCurrentBpm(): number {
  return progress.currentBpm;
}

export function getBpmMastery(): number {
  return progress.bpmMastery;
}

export function getSuggestedBpm(level: number): number {
  // Tempo recommendations based on pedagogical best practices
  // Beginners start VERY slow, build up gradually
  if (level <= 2) return 30; // Whole/half notes - very slow
  if (level <= 4) return 40; // Quarter notes introduction
  if (level <= 6) return 50; // Building complexity
  if (level <= 7) return 60; // Dotted notes
  if (level <= 8) return 55; // Eighth notes - slightly slower for precision
  if (level <= 9) return 50; // Dotted eighths - need time to feel the rhythm
  if (level <= 10) return 45; // Sixteenths - slow for accuracy
  // New keys reset to slower tempos
  if (level >= 11) {
    // Each new key level starts slower, then can build
    const keyLevel = level - 10; // 1, 2, 3...
    return 40 + (keyLevel * 5); // 45, 50, 55... but still moderate
  }
  return 60;
}

export function setLevel(level: number): void {
  progress.level = Math.max(1, Math.min(23, level)); // Expanded to 23 levels
  progress.subLevel = 0;
  progress.repetitions = 0;
  progress.currentBpm = getSuggestedBpm(progress.level);
  progress.bpmMastery = 0;
  saveProgress();
}

export function setSubLevel(subLevel: number): void {
  progress.subLevel = Math.max(0, Math.min(3, subLevel));
  progress.repetitions = 0;
  saveProgress();
}

export function setBpm(bpm: number): void {
  progress.currentBpm = Math.max(20, Math.min(200, bpm));
  progress.bpmMastery = 0;
  saveProgress();
}

// Called when user successfully completes a piece
export function incrementLevel(): void {
  progress.repetitions++;
  progress.bpmMastery++;

  // Need NOTE_MASTERY_THRESHOLD successful plays to advance
  if (progress.repetitions >= NOTE_MASTERY_THRESHOLD) {
    progress.repetitions = 0;
    progress.subLevel++;

    // If we've completed all sub-levels, advance to next level
    if (progress.subLevel >= 4) {
      progress.subLevel = 0;
      progress.level = Math.min(20, progress.level + 1);
      // Reset BPM to suggested for new level
      progress.currentBpm = getSuggestedBpm(progress.level);
      progress.bpmMastery = 0;
    }
  }
  saveProgress();
}

// Check if user should increase tempo
export function shouldIncreaseTempo(): boolean {
  return progress.bpmMastery >= BPM_MASTERY_THRESHOLD;
}

export function increaseTempo(): void {
  if (shouldIncreaseTempo()) {
    progress.currentBpm = Math.min(200, progress.currentBpm + BPM_INCREMENT);
    progress.bpmMastery = 0;
    saveProgress();
  }
}

export function resetProgress(): void {
  progress = {
    level: 1,
    subLevel: 0,
    repetitions: 0,
    currentBpm: 30,
    bpmMastery: 0,
  };
  saveProgress();
}

export function getRepetitionsRemaining(): number {
  return Math.max(0, NOTE_MASTERY_THRESHOLD - progress.repetitions);
}

export function getBpmMasteryRemaining(): number {
  return Math.max(0, BPM_MASTERY_THRESHOLD - progress.bpmMastery);
}

// ============================================
// EXPANDED LEVEL STRUCTURE
// ============================================
// Levels 1-7: C major foundation with INTERLEAVED hand practice
// Level 8+: One new key per level, resetting to basics each time
//
// PHILOSOPHY: Left hand and both-hands are introduced early and
// practiced throughout, not saved until the end. Each rhythmic
// concept is practiced in all three modes: RH, LH, then both.
//
// LEVEL 1: Middle C position, whole notes - RH ONLY
//   1a: Just C and G (two notes) - RH
//   1b: Add E (three notes - C major triad) - RH
//   1c: Add D and F (five-finger position) - RH
//   1d: All notes C-G with stepwise motion - RH
//
// LEVEL 2: Whole notes - LH ONLY (bass clef intro)
//   2a: Just C and G - LH
//   2b: C, E, G triad - LH
//   2c: C through G - LH
//   2d: Stepwise melodies - LH
//
// LEVEL 3: Whole notes - BOTH HANDS
//   3a: Simple coordination, sustained notes
//   3b: Alternating hands
//   3c: Both hands together
//   3d: Independent whole note patterns
//
// LEVEL 4: Half notes - RH then LH
//   4a: Half notes - RH
//   4b: Half notes - LH
//   4c: Mix whole/half - RH
//   4d: Mix whole/half - both hands
//
// LEVEL 5: Quarter notes - RH, LH, both
//   5a: Quarter notes stepwise - RH
//   5b: Quarter notes stepwise - LH
//   5c: Quarter + half - RH
//   5d: Quarter notes - both hands
//
// LEVEL 6: Rests and 3/4 time
//   6a: Quarter rests - RH
//   6b: Quarter rests - LH
//   6c: 3/4 time intro - RH
//   6d: 3/4 time - both hands
//
// LEVEL 7: Dotted notes and wider range
//   7a: Dotted half notes - RH
//   7b: Dotted half notes - LH
//   7c: Wider intervals (6ths) - RH
//   7d: Full range - both hands
//
// === NEW KEY LEVELS (each resets to basics) ===
//
// LEVEL 8: G MAJOR (1 sharp - F#)
//   8a: G major whole notes - RH
//   8b: G major whole notes - LH
//   8c: G major half notes - RH
//   8d: G major - both hands
//
// LEVEL 9: F MAJOR (1 flat - Bb)
//   9a-d: Same pattern as level 8
//
// LEVEL 10+: Continue with more keys...

export interface NoteData {
  step: string;
  alter: number;
  octave: number;
  duration: number;
  isRest: boolean;
  // For chords: additional notes played simultaneously
  chordNotes?: Array<{ step: string; alter: number; octave: number }>;
}

// ============================================
// FOLK AND CLASSICAL MELODIC PATTERNS
// ============================================
// These patterns are based on common melodic fragments from
// folk music and classical repertoire, adapted for beginners

// Stepwise patterns (scale fragments) - numbered from scale degree
const stepwisePatterns = [
  [1, 2, 3], // Do-Re-Mi
  [3, 2, 1], // Mi-Re-Do
  [1, 2, 3, 2, 1], // Up and back
  [5, 4, 3], // Sol-Fa-Mi
  [3, 4, 5], // Mi-Fa-Sol
  [1, 2, 3, 4, 5], // Scale ascending
  [5, 4, 3, 2, 1], // Scale descending
  [1, 2, 1], // Neighbor tone
  [3, 2, 3], // Upper neighbor
  [5, 6, 5], // Sol-La-Sol
];

// Triadic patterns (arpeggios)
const triadicPatterns = [
  [1, 3, 5], // C-E-G (major triad)
  [5, 3, 1], // G-E-C (descending)
  [1, 3, 5, 3], // Up and back
  [5, 3, 1, 3], // Down and up
  [1, 5, 3], // C-G-E
  [3, 1, 5], // E-C-G
];

// Folk melody fragments (simplified versions of famous melodies)
const folkPatterns = [
  // "Mary Had a Little Lamb" fragment
  [3, 2, 1, 2, 3, 3, 3],
  // "Twinkle Twinkle" opening
  [1, 1, 5, 5, 6, 6, 5],
  // "Hot Cross Buns"
  [3, 2, 1],
  // "Merrily We Roll Along"
  [3, 2, 1, 2, 3, 3, 3],
  // "Ode to Joy" fragment
  [3, 3, 4, 5, 5, 4, 3, 2],
  // "Au Clair de la Lune" fragment
  [1, 1, 1, 2, 3, 2, 1, 3, 2, 2, 1],
  // "Frère Jacques" fragment
  [1, 2, 3, 1],
  // "Row Row Row Your Boat" fragment
  [1, 1, 1, 2, 3],
  // "London Bridge" fragment
  [5, 4, 3, 4, 5, 5, 5],
];

// Classical patterns (simplified versions)
const classicalPatterns = [
  // Bach-style bass patterns
  [1, 5, 3, 5],
  [1, 3, 5, 3],
  // Mozart-style Alberti bass
  [1, 5, 3, 5, 1, 5, 3, 5],
  // Beethoven "Für Elise" fragment (simplified)
  [5, 4, 5, 4, 5, 2, 4, 3, 1],
  // Chopin nocturne bass
  [1, 5, 3],
  // Simple cadential pattern
  [5, 4, 3, 2, 1],
];

// Larger interval patterns (6ths, 7ths, octaves)
const wideIntervalPatterns = [
  // 6ths
  [1, 6], [6, 1], [1, 6, 1],
  [3, 8], [8, 3], // 6th from 3 to high 1
  // 7ths
  [1, 7], [7, 1], [2, 8],
  [1, 7, 5, 3, 1], // 7th down to tonic
  // Octaves
  [1, 8], [8, 1], [1, 8, 1],
  [5, 5, 8, 8], // Repeated then octave jump
  // Combined larger leaps
  [1, 5, 8], // Arpeggio to octave
  [8, 5, 3, 1], // Descending from octave
  [1, 3, 5, 8, 5, 3, 1], // Full octave arpeggio
];

// ============================================
// CHORD PATTERNS (Simultaneous notes)
// ============================================
// Chords are represented as arrays of scale degrees played together

// Basic intervals (2 notes together)
const basicIntervals: number[][] = [
  [1, 3], // 3rd
  [1, 5], // 5th
  [3, 5], // 3rd to 5th
  [1, 8], // Octave
];

// Triads (3 notes together)
const triadChords: number[][] = [
  [1, 3, 5], // Root position triad
  [1, 3, 8], // Open voicing
  [1, 5, 8], // Power chord + octave
];


// ============================================
// SCALES AND KEYS (Circle of Fifths)
// ============================================
interface KeyInfo {
  name: string;
  fifths: number; // Key signature (positive = sharps, negative = flats)
  scale: string[];
}

const keys: Record<string, KeyInfo> = {
  C: { name: 'C major', fifths: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  G: { name: 'G major', fifths: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  F: { name: 'F major', fifths: -1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
  D: { name: 'D major', fifths: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  Bb: { name: 'Bb major', fifths: -2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  A: { name: 'A major', fifths: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  Eb: { name: 'Eb major', fifths: -3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  E: { name: 'E major', fifths: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  Ab: { name: 'Ab major', fifths: -4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  B: { name: 'B major', fifths: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  Db: { name: 'Db major', fifths: -5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
};

// Order of key introduction (alternating sharps and flats)
const keyProgression = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db'];

function getKeyForLevel(level: number): KeyInfo {
  if (level <= 10) {
    return keys['C'];
  }
  // Level 11 = G, Level 12 = F, Level 13 = D, etc.
  const keyIndex = Math.min(level - 10, keyProgression.length - 1);
  return keys[keyProgression[keyIndex]];
}

// ============================================
// LESSON DESCRIPTIONS
// ============================================
function getLessonDescription(level: number, subLevel: number): string {
  const subLabels = ['a', 'b', 'c', 'd'];
  const sub = subLabels[subLevel];

  // C major foundation levels (1-7) with interleaved hands
  const cMajorDescriptions: Record<string, string> = {
    // Level 1: Right hand whole notes
    '1a': 'C and G — whole notes (RH)',
    '1b': 'C, E, G triad — whole notes (RH)',
    '1c': 'C through G — whole notes (RH)',
    '1d': 'Stepwise — whole notes (RH)',
    // Level 2: Left hand whole notes (bass clef intro)
    '2a': 'C and G — whole notes (LH)',
    '2b': 'C, E, G triad — whole notes (LH)',
    '2c': 'C through G — whole notes (LH)',
    '2d': 'Stepwise — whole notes (LH)',
    // Level 3: Both hands whole notes
    '3a': 'Simple coordination — whole notes',
    '3b': 'Triad patterns — whole notes',
    '3c': 'Stepwise — whole notes',
    '3d': 'Full patterns — whole notes',
    // Level 4: Half notes
    '4a': 'Half notes (RH)',
    '4b': 'Half notes (LH)',
    '4c': 'Whole and half notes (RH)',
    '4d': 'Whole and half notes — both hands',
    // Level 5: Quarter notes
    '5a': 'Quarter notes — stepwise (RH)',
    '5b': 'Quarter notes — stepwise (LH)',
    '5c': 'Quarter and half notes (RH)',
    '5d': 'Quarter notes — both hands',
    // Level 6: Rests and 3/4 time
    '6a': 'Quarter rests (RH)',
    '6b': 'Quarter rests (LH)',
    '6c': '3/4 time signature (RH)',
    '6d': '3/4 time — both hands',
    // Level 7: Dotted notes and wider range
    '7a': 'Dotted half notes (RH)',
    '7b': 'Dotted half notes (LH)',
    '7c': 'Wider intervals — 6ths (RH)',
    '7d': 'Full range — both hands',
    // Level 8: Eighth notes
    '8a': 'Eighth notes — stepwise (RH)',
    '8b': 'Eighth notes — stepwise (LH)',
    '8c': 'Eighth and quarter notes (RH)',
    '8d': 'Eighth notes — both hands',
    // Level 9: Dotted eighths
    '9a': 'Dotted eighth rhythms (RH)',
    '9b': 'Dotted eighth rhythms (LH)',
    '9c': 'Syncopated patterns (RH)',
    '9d': 'Dotted eighths — both hands',
    // Level 10: Sixteenth notes
    '10a': 'Sixteenth notes — stepwise (RH)',
    '10b': 'Sixteenth notes — stepwise (LH)',
    '10c': 'Mixed rhythms (RH)',
    '10d': 'Sixteenth notes — both hands',
  };

  if (level <= 10) {
    return cMajorDescriptions[`${level}${sub}`] || `Level ${level}${sub}`;
  }

  // New key levels (11+) with interleaved hands
  const keyInfo = getKeyForLevel(level);
  const keyDescriptions = [
    'whole notes (RH)',
    'whole notes (LH)',
    'quarter notes (RH)',
    'both hands',
  ];

  return `${keyInfo.name} — ${keyDescriptions[subLevel]}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaleDegreeToNote(
  degree: number,
  keyName: string,
  baseOctave: number
): { step: string; alter: number; octave: number } {
  const keyInfo = keys[keyName] || keys['C'];
  const scale = keyInfo.scale;
  const normalizedDegree = ((degree - 1) % 7 + 7) % 7;
  const octaveOffset = Math.floor((degree - 1) / 7);
  const noteName = scale[normalizedDegree];

  const step = noteName[0];
  let alter = 0;
  if (noteName.includes('#')) alter = 1;
  if (noteName.includes('b')) alter = -1;

  return { step, alter, octave: baseOctave + octaveOffset };
}

// ============================================
// LEVEL-SPECIFIC CONFIGURATION
// ============================================
interface LevelConfig {
  durations: number[];
  restProbability: number;
  accidentalProbability: number;
  maxInterval: number;
  key: KeyInfo;
  timeSignature: { beats: number; beatType: number };
  noteRange: number[]; // Scale degrees to use
  patterns: number[][]; // Which melodic patterns to use
  handMode: 'right' | 'left' | 'both'; // Which hand(s) to practice
  suggestedBpm: number;
  // Chord/harmony settings
  chordProbability: number; // 0-1, probability of a chord instead of single note
  chordTypes: 'none' | 'intervals' | 'triads' | 'all'; // Which chord types to use
}

function getLevelConfig(level: number, subLevel: number): LevelConfig {
  // Use key override if set, otherwise use level default
  const keyInfo = keyOverride && keys[keyOverride] ? keys[keyOverride] : getKeyForLevel(level);

  // Default configuration
  const config: LevelConfig = {
    durations: [4],
    restProbability: 0,
    accidentalProbability: 0,
    maxInterval: 2,
    key: keyInfo,
    timeSignature: { beats: 4, beatType: 4 },
    noteRange: [1, 3, 5],
    patterns: stepwisePatterns.slice(0, 3),
    handMode: 'right', // Default to right hand
    suggestedBpm: getSuggestedBpm(level),
    chordProbability: 0,
    chordTypes: 'none',
  };

  // ========================================
  // C MAJOR FOUNDATION (Levels 1-7)
  // Hands are interleaved: RH → LH → Both
  // ========================================

  if (level === 1) {
    // LEVEL 1: Whole notes - RIGHT HAND ONLY
    config.durations = [4];
    config.restProbability = 0;
    config.maxInterval = 2;
    config.suggestedBpm = 30;
    config.handMode = 'right';

    switch (subLevel) {
      case 0: // 1a: Just C and G - RH
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
        break;
      case 1: // 1b: Add E - RH
        config.noteRange = [1, 3, 5];
        config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
        break;
      case 2: // 1c: C through G - RH
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
        break;
      case 3: // 1d: Stepwise - RH
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = stepwisePatterns;
        break;
    }
  } else if (level === 2) {
    // LEVEL 2: Whole notes - LEFT HAND ONLY (bass clef intro)
    config.durations = [4];
    config.restProbability = 0;
    config.maxInterval = 2;
    config.suggestedBpm = 30;
    config.handMode = 'left';

    switch (subLevel) {
      case 0: // 2a: Just C and G - LH
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
        break;
      case 1: // 2b: C, E, G - LH
        config.noteRange = [1, 3, 5];
        config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
        break;
      case 2: // 2c: C through G - LH
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
        break;
      case 3: // 2d: Stepwise - LH
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = stepwisePatterns;
        break;
    }
  } else if (level === 3) {
    // LEVEL 3: Whole notes - BOTH HANDS
    config.durations = [4];
    config.restProbability = 0;
    config.maxInterval = 2;
    config.suggestedBpm = 30;
    config.handMode = 'both';
    config.noteRange = [1, 2, 3, 4, 5];

    switch (subLevel) {
      case 0: // 3a: Simple coordination
        config.patterns = [[1, 5], [5, 1]];
        break;
      case 1: // 3b: Triads
        config.patterns = triadicPatterns.slice(0, 3);
        break;
      case 2: // 3c: Stepwise
        config.patterns = stepwisePatterns.slice(0, 5);
        break;
      case 3: // 3d: Full patterns
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
    }
  } else if (level === 4) {
    // LEVEL 4: Half notes - RH, LH, then both
    config.noteRange = [1, 2, 3, 4, 5];
    config.suggestedBpm = 30;

    switch (subLevel) {
      case 0: // 4a: Half notes - RH
        config.handMode = 'right';
        config.durations = [2];
        config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
        break;
      case 1: // 4b: Half notes - LH
        config.handMode = 'left';
        config.durations = [2];
        config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
        break;
      case 2: // 4c: Mix whole/half - RH
        config.handMode = 'right';
        config.durations = [4, 2];
        config.patterns = [...stepwisePatterns.slice(0, 5), ...triadicPatterns.slice(0, 3)];
        break;
      case 3: // 4d: Mix whole/half - both hands
        config.handMode = 'both';
        config.durations = [4, 2];
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
    }
  } else if (level === 5) {
    // LEVEL 5: Quarter notes - RH, LH, then both
    config.noteRange = [1, 2, 3, 4, 5, 6];
    config.suggestedBpm = 40;

    switch (subLevel) {
      case 0: // 5a: Quarter notes - RH
        config.handMode = 'right';
        config.durations = [1];
        config.maxInterval = 1;
        config.patterns = stepwisePatterns;
        break;
      case 1: // 5b: Quarter notes - LH
        config.handMode = 'left';
        config.durations = [1];
        config.maxInterval = 1;
        config.patterns = stepwisePatterns;
        break;
      case 2: // 5c: Quarter + half - RH
        config.handMode = 'right';
        config.durations = [1, 2];
        config.patterns = [...folkPatterns.slice(0, 3)];
        break;
      case 3: // 5d: Quarter notes - both hands
        config.handMode = 'both';
        config.durations = [1, 2];
        config.patterns = [...folkPatterns.slice(0, 5)];
        break;
    }
  } else if (level === 6) {
    // LEVEL 6: Rests and 3/4 time
    config.noteRange = [1, 2, 3, 4, 5, 6];
    config.durations = [1, 2];
    config.suggestedBpm = 40;

    switch (subLevel) {
      case 0: // 6a: Quarter rests - RH
        config.handMode = 'right';
        config.restProbability = 0.15;
        config.patterns = stepwisePatterns;
        break;
      case 1: // 6b: Quarter rests - LH
        config.handMode = 'left';
        config.restProbability = 0.15;
        config.patterns = stepwisePatterns;
        break;
      case 2: // 6c: 3/4 time - RH
        config.handMode = 'right';
        config.timeSignature = { beats: 3, beatType: 4 };
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
        break;
      case 3: // 6d: 3/4 time - both hands
        config.handMode = 'both';
        config.timeSignature = { beats: 3, beatType: 4 };
        config.restProbability = 0.1;
        config.durations = [4, 2, 1];
        config.patterns = folkPatterns;
        break;
    }
  } else if (level === 7) {
    // LEVEL 7: Dotted notes and wider range
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.suggestedBpm = 50;

    switch (subLevel) {
      case 0: // 7a: Dotted half notes - RH
        config.handMode = 'right';
        config.durations = [3, 2, 1]; // 3 = dotted half
        config.patterns = stepwisePatterns;
        break;
      case 1: // 7b: Dotted half notes - LH
        config.handMode = 'left';
        config.durations = [3, 2, 1];
        config.patterns = stepwisePatterns;
        break;
      case 2: // 7c: Wider intervals (6ths) - RH
        config.handMode = 'right';
        config.durations = [2, 1];
        config.maxInterval = 6;
        config.patterns = [[1, 6], [6, 1], [1, 3, 5], [3, 8], ...triadicPatterns];
        break;
      case 3: // 7d: Full range - both hands
        config.handMode = 'both';
        config.durations = [3, 2, 1];
        config.maxInterval = 6;
        config.patterns = [...folkPatterns, ...wideIntervalPatterns.slice(0, 5)];
        break;
    }
  } else if (level === 8) {
    // LEVEL 8: Eighth notes
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.suggestedBpm = 55;

    switch (subLevel) {
      case 0: // 8a: Eighth notes - RH stepwise
        config.handMode = 'right';
        config.durations = [0.5];
        config.maxInterval = 2;
        config.patterns = stepwisePatterns;
        break;
      case 1: // 8b: Eighth notes - LH stepwise
        config.handMode = 'left';
        config.durations = [0.5];
        config.maxInterval = 2;
        config.patterns = stepwisePatterns;
        break;
      case 2: // 8c: Eighth and quarter notes - RH
        config.handMode = 'right';
        config.durations = [0.5, 1];
        config.maxInterval = 3;
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 3)];
        break;
      case 3: // 8d: Eighth notes - both hands
        config.handMode = 'both';
        config.durations = [0.5, 1];
        config.maxInterval = 3;
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 5)];
        break;
    }
  } else if (level === 9) {
    // LEVEL 9: Dotted eighth rhythms
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.suggestedBpm = 50;

    switch (subLevel) {
      case 0: // 9a: Dotted eighths - RH
        config.handMode = 'right';
        config.durations = [0.75, 0.5, 1]; // dotted eighth, eighth, quarter
        config.maxInterval = 2;
        config.patterns = stepwisePatterns;
        break;
      case 1: // 9b: Dotted eighths - LH
        config.handMode = 'left';
        config.durations = [0.75, 0.5, 1];
        config.maxInterval = 2;
        config.patterns = stepwisePatterns;
        break;
      case 2: // 9c: Syncopated patterns - RH
        config.handMode = 'right';
        config.durations = [0.75, 0.5, 1, 2];
        config.maxInterval = 4;
        config.patterns = [...folkPatterns, ...triadicPatterns];
        break;
      case 3: // 9d: Dotted eighths - both hands
        config.handMode = 'both';
        config.durations = [0.75, 0.5, 1];
        config.maxInterval = 4;
        config.patterns = [...folkPatterns, ...classicalPatterns.slice(0, 5)];
        break;
    }
  } else if (level === 10) {
    // LEVEL 10: Sixteenth notes
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.suggestedBpm = 45;

    switch (subLevel) {
      case 0: // 10a: Sixteenth notes - RH stepwise
        config.handMode = 'right';
        config.durations = [0.25];
        config.maxInterval = 1; // Very stepwise for fast notes
        config.patterns = stepwisePatterns.slice(0, 5);
        break;
      case 1: // 10b: Sixteenth notes - LH stepwise
        config.handMode = 'left';
        config.durations = [0.25];
        config.maxInterval = 1;
        config.patterns = stepwisePatterns.slice(0, 5);
        break;
      case 2: // 10c: Mixed rhythms - RH
        config.handMode = 'right';
        config.durations = [0.25, 0.5, 1];
        config.maxInterval = 2;
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 3)];
        break;
      case 3: // 10d: Sixteenth notes - both hands
        config.handMode = 'both';
        config.durations = [0.25, 0.5, 1];
        config.maxInterval = 2;
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 5)];
        break;
    }
  }

  // ========================================
  // NEW KEY LEVELS (Level 11+)
  // Each key: RH whole → LH whole → RH varied → Both hands
  // ========================================

  else if (level >= 11) {
    config.key = keyInfo;
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8]; // Full octave in new key

    // Sub-level determines hand and rhythmic complexity
    switch (subLevel) {
      case 0: // xa: Whole notes - RH (learn the key)
        config.handMode = 'right';
        config.durations = [4];
        config.restProbability = 0;
        config.patterns = stepwisePatterns;
        config.suggestedBpm = 35;
        break;
      case 1: // xb: Whole notes - LH
        config.handMode = 'left';
        config.durations = [4];
        config.restProbability = 0;
        config.patterns = stepwisePatterns;
        config.suggestedBpm = 35;
        break;
      case 2: // xc: Half/quarter notes - RH
        config.handMode = 'right';
        config.durations = [1, 2];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
        config.suggestedBpm = 45;
        break;
      case 3: // xd: Full variety - both hands
        config.handMode = 'both';
        config.durations = [1, 2];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns, ...classicalPatterns];
        config.suggestedBpm = 50;
        break;
    }

    // Higher key levels can be slightly more challenging
    if (level >= 15) {
      config.maxInterval = 4;
    }
    if (level >= 17) {
      config.maxInterval = 5;
    }
  }

  return config;
}

// ============================================
// MELODY GENERATION
// ============================================
interface BeamState {
  inBeam: boolean;
  beamNumber: number;
}

/**
 * Get chord notes to add to a root note based on configuration
 */
function getChordNotes(
  rootDegree: number,
  keyName: string,
  baseOctave: number,
  chordTypes: 'none' | 'intervals' | 'triads' | 'all'
): Array<{ step: string; alter: number; octave: number }> | undefined {
  if (chordTypes === 'none') return undefined;

  // Choose chord type based on configuration
  let availableChords: number[][];
  switch (chordTypes) {
    case 'intervals':
      availableChords = basicIntervals;
      break;
    case 'triads':
      availableChords = [...basicIntervals, ...triadChords];
      break;
    case 'all':
      availableChords = [...basicIntervals, ...triadChords];
      break;
    default:
      return undefined;
  }

  // Pick a random chord pattern
  const chordPattern = pick(availableChords);

  // Convert chord degrees to actual notes (relative to root)
  const chordNotes: Array<{ step: string; alter: number; octave: number }> = [];
  for (const interval of chordPattern) {
    if (interval === 1) continue; // Skip interval 1 (the root is already the melody note)

    // Calculate the actual scale degree for this chord tone
    // The interval is relative to scale degree 1, so we offset by root
    const chordDegree = rootDegree + (interval - 1);

    const noteData = scaleDegreeToNote(chordDegree, keyName, baseOctave);
    chordNotes.push(noteData);
  }

  return chordNotes.length > 0 ? chordNotes : undefined;
}

function generateMelody(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 4;

  // Pick a melodic pattern to use as a motif
  const pattern = pick(config.patterns);
  let patternIndex = 0;

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      // Pick duration that fits
      let availableDurations = config.durations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      let dur = pick(availableDurations);
      dur = Math.min(dur, remainingBeats);

      // Decide if this is a rest
      if (Math.random() < config.restProbability && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      // Get the next scale degree from the pattern
      let degree = pattern[patternIndex % pattern.length];
      patternIndex++;

      // Occasionally vary the pattern
      if (Math.random() < 0.2 && notes.length > 0) {
        // Small random adjustment
        degree = degree + pick([-1, 0, 0, 1]);
      }

      // Keep in the allowed note range
      const minDegree = Math.min(...config.noteRange);
      const maxDegree = Math.max(...config.noteRange);
      degree = Math.max(minDegree, Math.min(maxDegree, degree));

      // Apply chromatic accidental? (only in levels that allow it)
      let extraAlter = 0;
      if (Math.random() < config.accidentalProbability) {
        extraAlter = pick([-1, 1]);
      }

      const keyRoot = config.key.name.split(' ')[0];
      const noteData = scaleDegreeToNote(degree, keyRoot, baseOctave);

      // Possibly add chord notes (for longer durations only - not on eighth notes)
      let chordNotes: Array<{ step: string; alter: number; octave: number }> | undefined;
      if (config.chordProbability > 0 && dur >= 1 && Math.random() < config.chordProbability) {
        chordNotes = getChordNotes(degree, keyRoot, baseOctave, config.chordTypes);
      }

      notes.push({
        ...noteData,
        alter: noteData.alter + extraAlter,
        duration: dur,
        isRest: false,
        chordNotes,
      });

      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

function generateLeftHand(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  // In 'left' mode, use the same melodic patterns as right hand
  // In 'both' mode, use simpler accompaniment patterns
  const isMelodicMode = config.handMode === 'left';

  const measures: NoteData[][] = [];
  const baseOctave = 3;

  // Choose patterns based on mode
  let bassPatterns: number[][];
  if (isMelodicMode) {
    // Left hand as primary melody - use same patterns as right hand config
    bassPatterns = config.patterns;
  } else {
    // Both hands mode - use accompaniment patterns
    if (progress.level <= 5) {
      // Simple harmonic patterns
      bassPatterns = [[1], [1, 5], [1, 3, 5], [1, 5, 1, 5], [1, 3, 5, 3]];
    } else if (progress.level <= 6) {
      // More melodic bass lines
      bassPatterns = [
        [1, 2, 3, 2], // Stepwise
        [1, 3, 5, 3],
        [5, 4, 3, 2, 1], // Descending scale
        [1, 2, 3, 4, 5], // Ascending scale
        ...classicalPatterns.slice(0, 3),
      ];
    } else {
      // Fully melodic bass with wider range
      bassPatterns = [
        ...stepwisePatterns.slice(0, 5),
        ...classicalPatterns,
        [1, 5, 8, 5], // Octave reach
        [8, 7, 6, 5], // High descending
      ];
    }
  }

  const pattern = pick(bassPatterns);
  let patternIdx = 0;

  // In melodic mode, use config durations; in accompaniment mode, prefer longer notes
  const bassDurations = isMelodicMode
    ? config.durations
    : progress.level <= 4 ? [beatsPerMeasure] : progress.level <= 6 ? [2, 1] : config.durations;

  const keyRoot = config.key.name.split(' ')[0];

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      let availableDurations = bassDurations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      // In melodic mode, pick any available duration; in accompaniment, prefer longer
      const dur = isMelodicMode
        ? Math.min(pick(availableDurations), remainingBeats)
        : Math.min(Math.max(...availableDurations), remainingBeats);

      // Occasional rest
      if (Math.random() < config.restProbability * (isMelodicMode ? 1 : 0.5) && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      // Get next scale degree from pattern
      let degree = pattern[patternIdx % pattern.length];
      patternIdx++;

      // Occasionally vary (same as melody generation)
      if (isMelodicMode && Math.random() < 0.2 && notes.length > 0) {
        degree = degree + pick([-1, 0, 0, 1]);
      }

      // Keep in allowed range
      const minDegree = Math.min(...config.noteRange);
      const maxDegree = Math.max(...config.noteRange);
      degree = Math.max(minDegree, Math.min(maxDegree, degree));

      const noteData = scaleDegreeToNote(degree, keyRoot, baseOctave);
      notes.push({
        ...noteData,
        duration: dur,
        isRest: false,
      });

      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

// ============================================
// MUSICXML GENERATION
// ============================================

// Regenerate XML from existing notes (for fingering toggle without changing music)
export function regenerateXMLFromNotes(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[],
  timeSignature: { beats: number; beatType: number }
): string {
  const config = getLevelConfig(progress.level, progress.subLevel);
  const divisions = 4;
  const beatsPerMeasure = timeSignature.beatType === 8
    ? timeSignature.beats / 2
    : timeSignature.beats;

  // Split notes back into measures based on duration
  const splitIntoMeasures = (notes: NoteData[]): NoteData[][] => {
    const measures: NoteData[][] = [];
    let currentMeasure: NoteData[] = [];
    let currentBeats = 0;

    for (const note of notes) {
      currentMeasure.push(note);
      currentBeats += note.duration;
      if (currentBeats >= beatsPerMeasure - 0.01) {
        measures.push(currentMeasure);
        currentMeasure = [];
        currentBeats = 0;
      }
    }
    if (currentMeasure.length > 0) {
      measures.push(currentMeasure);
    }
    return measures;
  };

  const rightHand = splitIntoMeasures(rightHandNotes);
  const leftHand = splitIntoMeasures(leftHandNotes);
  const numMeasures = Math.max(rightHand.length, leftHand.length);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name print-object="no"></part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  // Calculate fingering for both hands
  const rhFingering = includeFingering ? generateFingering(rightHandNotes, 'right') : null;
  const lhFingering = includeFingering ? generateFingering(leftHandNotes, 'left') : null;

  let rhFingerIdx = 0;
  let lhFingerIdx = 0;

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

    if (m === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${config.key.fifths}</fifths></key>
        <time><beats>${timeSignature.beats}</beats><beat-type>${timeSignature.beatType}</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
`;
    }

    // Right hand (staff 1)
    const rhMeasure = rightHand[m] || [];
    const rhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < rhMeasure.length; i++) {
      const note = rhMeasure[i];
      const nextNote = i < rhMeasure.length - 1 ? rhMeasure[i + 1] : null;
      let finger: Finger | undefined;
      if (rhFingering && !note.isRest) {
        finger = rhFingering.notes[rhFingerIdx]?.finger;
        rhFingerIdx++;
      }
      xml += noteToXML(note, 1, divisions, rhBeamState, nextNote, finger);
    }

    // Backup to write left hand
    const rhDuration = rhMeasure.reduce((sum, n) => sum + n.duration, 0);
    xml += `      <backup><duration>${Math.round(rhDuration * divisions)}</duration></backup>
`;

    // Left hand (staff 2)
    const lhMeasure = leftHand[m] || [];
    const lhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < lhMeasure.length; i++) {
      const note = lhMeasure[i];
      const nextNote = i < lhMeasure.length - 1 ? lhMeasure[i + 1] : null;
      let finger: Finger | undefined;
      if (lhFingering && !note.isRest) {
        finger = lhFingering.notes[lhFingerIdx]?.finger;
        lhFingerIdx++;
      }
      xml += noteToXML(note, 2, divisions, lhBeamState, nextNote, finger);
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
</score-partwise>`;

  return xml;
}

export function generateMusicXML(): GeneratedMusic {
  const config = getLevelConfig(progress.level, progress.subLevel);

  // Mobile mode: 4 measures, Desktop: 8 measures
  // Always 4 measures for clean spacing (8 was too cramped with eighth notes)
  const numMeasures = 4;

  const beatsPerMeasure =
    config.timeSignature.beatType === 8
      ? config.timeSignature.beats / 2
      : config.timeSignature.beats;

  // Generate hands based on handMode
  let rightHand: NoteData[][];
  let leftHand: NoteData[][];

  if (config.handMode === 'right') {
    // Right hand melody, left hand rests
    rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
    leftHand = Array(numMeasures)
      .fill(null)
      .map(() => [{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);
  } else if (config.handMode === 'left') {
    // Left hand melody, right hand rests
    rightHand = Array(numMeasures)
      .fill(null)
      .map(() => [{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);
    leftHand = generateLeftHand(config, beatsPerMeasure, numMeasures);
  } else {
    // Both hands
    rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
    leftHand = generateLeftHand(config, beatsPerMeasure, numMeasures);
  }

  const divisions = 4;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name print-object="no"></part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  // Calculate fingering for both hands (flatten all notes first)
  const allRhNotes = rightHand.flat();
  const allLhNotes = leftHand.flat();
  const rhFingering = includeFingering ? generateFingering(allRhNotes, 'right') : null;
  const lhFingering = includeFingering ? generateFingering(allLhNotes, 'left') : null;

  // Track fingering index across measures
  let rhFingerIdx = 0;
  let lhFingerIdx = 0;

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

    if (m === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${config.key.fifths}</fifths></key>
        <time><beats>${config.timeSignature.beats}</beats><beat-type>${config.timeSignature.beatType}</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
`;
    }

    // Right hand (staff 1)
    const rhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < rightHand[m].length; i++) {
      const note = rightHand[m][i];
      const nextNote = i < rightHand[m].length - 1 ? rightHand[m][i + 1] : null;
      // Get fingering for this note (skip rests in fingering array)
      let finger: Finger | undefined;
      if (rhFingering && !note.isRest) {
        finger = rhFingering.notes[rhFingerIdx]?.finger;
        rhFingerIdx++;
      }
      xml += noteToXML(note, 1, divisions, rhBeamState, nextNote, finger);
    }

    // Backup to write left hand
    const rhDuration = rightHand[m].reduce((sum, n) => sum + n.duration, 0);
    xml += `      <backup><duration>${Math.round(rhDuration * divisions)}</duration></backup>
`;

    // Left hand (staff 2)
    const lhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < leftHand[m].length; i++) {
      const note = leftHand[m][i];
      const nextNote = i < leftHand[m].length - 1 ? leftHand[m][i + 1] : null;
      // Get fingering for this note (skip rests in fingering array)
      let finger: Finger | undefined;
      if (lhFingering && !note.isRest) {
        finger = lhFingering.notes[lhFingerIdx]?.finger;
        lhFingerIdx++;
      }
      xml += noteToXML(note, 2, divisions, lhBeamState, nextNote, finger);
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
</score-partwise>`;

  // Flatten notes for analysis
  const rightHandNotes = rightHand.flat();
  const leftHandNotes = leftHand.flat();

  return {
    xml,
    timeSignature: config.timeSignature,
    level: progress.level,
    subLevel: progress.subLevel,
    lessonDescription: getLessonDescription(progress.level, progress.subLevel),
    numMeasures,
    suggestedBpm: config.suggestedBpm,
    keyName: config.key.name,
    rightHandNotes,
    leftHandNotes,
  };
}

function noteToXML(
  note: NoteData,
  staff: number,
  divisions: number,
  beamState: BeamState,
  nextNote: NoteData | null,
  finger?: Finger
): string {
  const dur = Math.round(note.duration * divisions);

  if (note.isRest) {
    beamState.inBeam = false;
    return `      <note>
        <rest/>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
        <staff>${staff}</staff>
      </note>
`;
  }

  let alterXml = '';
  if (note.alter !== 0) {
    alterXml = `          <alter>${note.alter}</alter>\n`;
  }

  let accidentalXml = '';
  if (note.alter === 1) {
    accidentalXml = `        <accidental>sharp</accidental>\n`;
  } else if (note.alter === -1) {
    accidentalXml = `        <accidental>flat</accidental>\n`;
  }

  // Beam logic for eighth notes and shorter
  let beamXml = '';
  const isBeamable = note.duration <= 0.5;
  const nextIsBeamable = nextNote && !nextNote.isRest && nextNote.duration <= 0.5;

  if (isBeamable) {
    if (!beamState.inBeam && nextIsBeamable) {
      beamState.inBeam = true;
      beamState.beamNumber++;
      beamXml = `        <beam number="1">begin</beam>\n`;
    } else if (beamState.inBeam && nextIsBeamable) {
      beamXml = `        <beam number="1">continue</beam>\n`;
    } else if (beamState.inBeam && !nextIsBeamable) {
      beamState.inBeam = false;
      beamXml = `        <beam number="1">end</beam>\n`;
    }
  } else {
    beamState.inBeam = false;
  }

  // Fingering notation (optional)
  let fingeringXml = '';
  if (finger !== undefined && includeFingering) {
    // placement: above for treble (staff 1), below for bass (staff 2)
    const placement = staff === 1 ? 'above' : 'below';
    fingeringXml = `        <notations>
          <technical>
            <fingering placement="${placement}">${finger}</fingering>
          </technical>
        </notations>
`;
  }

  // Main note XML
  let xml = `      <note>
        <pitch>
          <step>${note.step}</step>
${alterXml}          <octave>${note.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${accidentalXml}${beamXml}        <staff>${staff}</staff>
${fingeringXml}      </note>
`;

  // Add chord notes if present (they get <chord/> element to indicate simultaneity)
  if (note.chordNotes && note.chordNotes.length > 0) {
    for (const chordNote of note.chordNotes) {
      let chordAlterXml = '';
      if (chordNote.alter !== 0) {
        chordAlterXml = `          <alter>${chordNote.alter}</alter>\n`;
      }

      let chordAccidentalXml = '';
      if (chordNote.alter === 1) {
        chordAccidentalXml = `        <accidental>sharp</accidental>\n`;
      } else if (chordNote.alter === -1) {
        chordAccidentalXml = `        <accidental>flat</accidental>\n`;
      }

      xml += `      <note>
        <chord/>
        <pitch>
          <step>${chordNote.step}</step>
${chordAlterXml}          <octave>${chordNote.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${chordAccidentalXml}        <staff>${staff}</staff>
      </note>
`;
    }
  }

  return xml;
}

function getNoteType(duration: number): string {
  // Handle dotted notes: dotted half = 3, dotted quarter = 1.5, dotted eighth = 0.75
  if (duration === 3) return '<type>half</type>\n        <dot/>';
  if (duration === 1.5) return '<type>quarter</type>\n        <dot/>';
  if (duration === 0.75) return '<type>eighth</type>\n        <dot/>';

  // Standard durations
  if (duration >= 4) return '<type>whole</type>';
  if (duration >= 2) return '<type>half</type>';
  if (duration >= 1) return '<type>quarter</type>';
  if (duration >= 0.5) return '<type>eighth</type>';
  if (duration >= 0.25) return '<type>16th</type>';
  return '<type>16th</type>';
}
