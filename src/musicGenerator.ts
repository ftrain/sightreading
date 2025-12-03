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

import { generateFingering, type Finger } from './fingeringEngine';

// Global setting for whether to include fingering in notation
let includeFingering = false;

export function setIncludeFingering(include: boolean): void {
  includeFingering = include;
}

export function getIncludeFingering(): boolean {
  return includeFingering;
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

let progress: LevelProgress = {
  level: 1,
  subLevel: 0,
  repetitions: 0,
  currentBpm: 30,
  bpmMastery: 0,
};

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
  if (level <= 7) return 60; // Eighth notes need slightly faster
  // New keys reset to slower tempos
  if (level >= 8) {
    // Each new key level starts slower, then can build
    const keyLevel = level - 7; // 1, 2, 3...
    return 40 + (keyLevel * 5); // 45, 50, 55... but still moderate
  }
  return 60;
}

export function setLevel(level: number): void {
  progress.level = Math.max(1, Math.min(20, level)); // Expanded to 20 levels
  progress.subLevel = 0;
  progress.repetitions = 0;
  progress.currentBpm = getSuggestedBpm(progress.level);
  progress.bpmMastery = 0;
}

export function setSubLevel(subLevel: number): void {
  progress.subLevel = Math.max(0, Math.min(3, subLevel));
  progress.repetitions = 0;
}

export function setBpm(bpm: number): void {
  progress.currentBpm = Math.max(20, Math.min(200, bpm));
  progress.bpmMastery = 0;
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
}

// Check if user should increase tempo
export function shouldIncreaseTempo(): boolean {
  return progress.bpmMastery >= BPM_MASTERY_THRESHOLD;
}

export function increaseTempo(): void {
  if (shouldIncreaseTempo()) {
    progress.currentBpm = Math.min(200, progress.currentBpm + BPM_INCREMENT);
    progress.bpmMastery = 0;
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
// Levels 1-7: C major foundation
// Level 8+: One new key per level, resetting to basics each time
//
// LEVEL 1: Middle C position (C-G), whole notes only
//   1a: Just C and G (two notes)
//   1b: Add E (three notes - C major triad)
//   1c: Add D and F (five-finger position)
//   1d: All notes C-G with focus on stepwise motion
//
// LEVEL 2: Half notes introduction
//   2a: Half notes only, C and G
//   2b: Half notes, C-E-G (triad outline)
//   2c: Mix of whole and half notes
//   2d: Longer phrases with whole/half
//
// LEVEL 3: Quarter notes introduction
//   3a: Quarter notes in simple patterns (stepwise)
//   3b: Quarter notes with small skips
//   3c: Mix of quarter and half notes
//   3d: Full rhythmic variety (whole, half, quarter)
//
// LEVEL 4: Rests introduction
//   4a: Quarter rests only
//   4b: Half rests
//   4c: Mix of rest types
//   4d: Musical phrases with rests
//
// LEVEL 5: Accidentals (chromatic notes, still in C)
//   5a: F# only (leading tone to G)
//   5b: Bb only (common chromatic note)
//   5c: Both F# and Bb
//   5d: All common chromatic alterations
//
// LEVEL 6: Left hand focus (still C major)
//   6a: Bass clef reading, C-G
//   6b: Longer bass patterns
//   6c: Both hands with simple coordination
//   6d: Hands together practice
//
// LEVEL 7: Eighth notes (still C major)
//   7a: Paired eighths on beats
//   7b: Eighth note patterns
//   7c: Mix with quarters
//   7d: Syncopation introduction
//
// === NEW KEY LEVELS (each resets to basics) ===
//
// LEVEL 8: G MAJOR (1 sharp - F#)
//   8a: G major scale, WHOLE NOTES only, stepwise
//   8b: G major, half notes
//   8c: G major, quarter notes
//   8d: G major, full rhythmic variety
//
// LEVEL 9: F MAJOR (1 flat - Bb)
//   9a: F major scale, whole notes only
//   9b: F major, half notes
//   9c: F major, quarter notes
//   9d: F major, full rhythmic variety
//
// LEVEL 10: D MAJOR (2 sharps - F#, C#)
//   10a: D major scale, whole notes only
//   10b: D major, half notes
//   10c: D major, quarter notes
//   10d: D major, full rhythmic variety
//
// LEVEL 11: Bb MAJOR (2 flats - Bb, Eb)
//   11a: Bb major scale, whole notes only
//   11b: Bb major, half notes
//   11c: Bb major, quarter notes
//   11d: Bb major, full rhythmic variety
//
// LEVEL 12: A MAJOR (3 sharps)
// LEVEL 13: Eb MAJOR (3 flats)
// LEVEL 14: E MAJOR (4 sharps)
// LEVEL 15: Ab MAJOR (4 flats)
// ... and so on

export interface NoteData {
  step: string;
  alter: number;
  octave: number;
  duration: number;
  isRest: boolean;
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
  if (level <= 7) {
    return keys['C'];
  }
  // Level 8 = G, Level 9 = F, Level 10 = D, etc.
  const keyIndex = Math.min(level - 7, keyProgression.length - 1);
  return keys[keyProgression[keyIndex]];
}

// ============================================
// LESSON DESCRIPTIONS
// ============================================
function getLessonDescription(level: number, subLevel: number): string {
  const subLabels = ['a', 'b', 'c', 'd'];
  const sub = subLabels[subLevel];

  // C major foundation levels (1-7)
  const cMajorDescriptions: Record<string, string> = {
    '1a': 'C and G only - whole notes',
    '1b': 'C, E, and G - whole notes',
    '1c': 'C through G - whole notes',
    '1d': 'Stepwise melodies - whole notes',
    '2a': 'Half notes - C and G',
    '2b': 'Half notes - C, E, G triad',
    '2c': 'Mixing whole and half notes',
    '2d': 'Longer phrases',
    '3a': 'Quarter notes - stepwise',
    '3b': 'Quarter notes - with skips',
    '3c': 'Quarter and half notes mixed',
    '3d': 'Full rhythmic variety',
    '4a': 'Quarter rests',
    '4b': 'Half rests',
    '4c': 'Mixed rests',
    '4d': 'Musical phrasing with rests',
    '5a': 'Introducing F#',
    '5b': 'Introducing Bb',
    '5c': 'F# and Bb together',
    '5d': 'Chromatic neighbor tones',
    '6a': 'Bass clef reading',
    '6b': 'Bass patterns',
    '6c': 'Simple coordination',
    '6d': 'Hands together',
    '7a': 'Paired eighth notes',
    '7b': 'Eighth note patterns',
    '7c': 'Mixing eighths and quarters',
    '7d': 'Syncopation basics',
  };

  if (level <= 7) {
    return cMajorDescriptions[`${level}${sub}`] || `Level ${level}${sub}`;
  }

  // New key levels (8+)
  const keyInfo = getKeyForLevel(level);
  const rhythmDescriptions = [
    'whole notes - learn the key',
    'half notes',
    'quarter notes',
    'full rhythmic variety',
  ];

  return `${keyInfo.name} - ${rhythmDescriptions[subLevel]}`;
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
  includeLeftHand: boolean;
  suggestedBpm: number;
}

function getLevelConfig(level: number, subLevel: number): LevelConfig {
  const keyInfo = getKeyForLevel(level);

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
    includeLeftHand: level >= 6,
    suggestedBpm: getSuggestedBpm(level),
  };

  // ========================================
  // C MAJOR FOUNDATION (Levels 1-7)
  // ========================================

  if (level === 1) {
    config.durations = [4];
    config.restProbability = 0;
    config.maxInterval = 2;
    config.suggestedBpm = 30;

    switch (subLevel) {
      case 0: // 1a: Just C and G
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
        break;
      case 1: // 1b: Add E
        config.noteRange = [1, 3, 5];
        config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
        break;
      case 2: // 1c: C through G
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
        break;
      case 3: // 1d: All with stepwise focus
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = stepwisePatterns;
        break;
    }
  } else if (level === 2) {
    config.noteRange = [1, 2, 3, 4, 5];
    config.suggestedBpm = 30;

    switch (subLevel) {
      case 0:
        config.durations = [2];
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1]];
        break;
      case 1:
        config.durations = [2];
        config.patterns = triadicPatterns;
        break;
      case 2:
        config.durations = [4, 2];
        config.patterns = [...stepwisePatterns.slice(0, 5), ...triadicPatterns.slice(0, 3)];
        break;
      case 3:
        config.durations = [4, 2, 2];
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
    }
  } else if (level === 3) {
    config.noteRange = [1, 2, 3, 4, 5, 6];
    config.suggestedBpm = 40;

    switch (subLevel) {
      case 0:
        config.durations = [1];
        config.maxInterval = 1;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.durations = [1];
        config.maxInterval = 2;
        config.patterns = [...stepwisePatterns, ...triadicPatterns.slice(0, 3)];
        break;
      case 2:
        config.durations = [1, 2];
        config.patterns = [...folkPatterns.slice(0, 3)];
        break;
      case 3:
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns.slice(0, 5)];
        break;
    }
  } else if (level === 4) {
    config.noteRange = [1, 2, 3, 4, 5, 6];
    config.durations = [1, 2];
    config.suggestedBpm = 40;

    switch (subLevel) {
      case 0:
        config.restProbability = 0.15;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.restProbability = 0.2;
        config.durations = [2, 1];
        config.patterns = folkPatterns.slice(0, 4);
        break;
      case 2:
        config.restProbability = 0.15;
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
        break;
      case 3:
        config.restProbability = 0.12;
        config.durations = [4, 2, 1];
        config.patterns = folkPatterns;
        break;
    }
  } else if (level === 5) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.durations = [2, 1];
    config.suggestedBpm = 50;

    switch (subLevel) {
      case 0:
        config.accidentalProbability = 0.05;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.accidentalProbability = 0.08;
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
      case 2:
        config.accidentalProbability = 0.1;
        config.restProbability = 0.1;
        config.patterns = folkPatterns;
        break;
      case 3:
        config.accidentalProbability = 0.12;
        config.restProbability = 0.1;
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns, ...classicalPatterns.slice(0, 3)];
        break;
    }
  } else if (level === 6) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.durations = [2, 1];
    config.includeLeftHand = true;
    config.suggestedBpm = 50;

    switch (subLevel) {
      case 0:
        config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
        break;
      case 1:
        config.patterns = [...classicalPatterns.slice(0, 2), ...triadicPatterns];
        break;
      case 2:
        config.patterns = [...folkPatterns.slice(0, 3), ...classicalPatterns.slice(0, 3)];
        break;
      case 3:
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
    }
  } else if (level === 7) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.includeLeftHand = true;
    config.suggestedBpm = 60;

    switch (subLevel) {
      case 0:
        config.durations = [0.5, 0.5, 1]; // Pairs of eighths
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.durations = [0.5, 1];
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 3)];
        break;
      case 2:
        config.durations = [0.5, 1, 2];
        config.restProbability = 0.08;
        config.patterns = folkPatterns;
        break;
      case 3:
        config.durations = [0.5, 1, 2, 4];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
    }
  }

  // ========================================
  // NEW KEY LEVELS (Level 8+)
  // Each key resets to basics: whole notes → half → quarter → full
  // ========================================

  else if (level >= 8) {
    config.key = keyInfo;
    config.includeLeftHand = true;
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8]; // Full octave in new key

    // Sub-level determines rhythmic complexity (RESET for each new key!)
    switch (subLevel) {
      case 0: // xa: Whole notes - learn the key
        config.durations = [4];
        config.restProbability = 0;
        config.patterns = stepwisePatterns;
        config.suggestedBpm = 35;
        break;
      case 1: // xb: Half notes
        config.durations = [2];
        config.restProbability = 0;
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        config.suggestedBpm = 40;
        break;
      case 2: // xc: Quarter notes
        config.durations = [1, 2];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
        config.suggestedBpm = 50;
        break;
      case 3: // xd: Full variety
        config.durations = [0.5, 1, 2];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns, ...classicalPatterns];
        config.suggestedBpm = 60;
        break;
    }

    // Higher key levels can be slightly more challenging
    if (level >= 12) {
      config.maxInterval = 4;
    }
    if (level >= 14) {
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

      const noteData = scaleDegreeToNote(degree, config.key.name.split(' ')[0], baseOctave);
      notes.push({
        ...noteData,
        alter: noteData.alter + extraAlter,
        duration: dur,
        isRest: false,
      });

      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

function generateBass(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  if (!config.includeLeftHand) {
    // Return empty measures with whole rests
    return Array(numMeasures)
      .fill(null)
      .map(() => [{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);
  }

  const measures: NoteData[][] = [];
  const baseOctave = 3;

  // Bass patterns - simpler than melody
  const bassPatterns = [[1], [1, 5], [1, 3, 5], [1, 5, 1, 5], [1, 3, 5, 3]];
  const pattern = pick(bassPatterns);
  let patternIdx = 0;

  // Bass uses longer notes at earlier levels
  const bassDurations =
    progress.level <= 4 ? [beatsPerMeasure] : progress.level <= 6 ? [2, 1] : config.durations;

  const keyRoot = config.key.name.split(' ')[0];

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      let availableDurations = bassDurations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      // Bass prefers longer notes
      const dur = Math.min(Math.max(...availableDurations), remainingBeats);

      // Occasional rest
      if (Math.random() < config.restProbability * 0.5 && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      const degree = pattern[patternIdx % pattern.length];
      patternIdx++;

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
export function generateMusicXML(): GeneratedMusic {
  const config = getLevelConfig(progress.level, progress.subLevel);

  // Mobile mode: 4 measures, Desktop: 8 measures
  const numMeasures = mobileMode ? 4 : 8;

  const beatsPerMeasure =
    config.timeSignature.beatType === 8
      ? config.timeSignature.beats / 2
      : config.timeSignature.beats;

  const rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
  const leftHand = generateBass(config, beatsPerMeasure, numMeasures);

  const divisions = 4;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  // System break position depends on number of measures
  const systemBreakMeasure = mobileMode ? numMeasures + 1 : 5; // No break in mobile, or at measure 5

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

    // Add system break at appropriate position (not needed for 4-bar mobile)
    if (m === systemBreakMeasure - 1 && !mobileMode) {
      xml += `      <print new-system="yes"/>
`;
    }

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

  return `      <note>
        <pitch>
          <step>${note.step}</step>
${alterXml}          <octave>${note.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${accidentalXml}${beamXml}        <staff>${staff}</staff>
${fingeringXml}      </note>
`;
}

function getNoteType(duration: number): string {
  if (duration >= 4) return '<type>whole</type>';
  if (duration >= 2) return '<type>half</type>';
  if (duration >= 1) return '<type>quarter</type>';
  if (duration >= 0.5) return '<type>eighth</type>';
  if (duration >= 0.25) return '<type>16th</type>';
  return '<type>16th</type>';
}
