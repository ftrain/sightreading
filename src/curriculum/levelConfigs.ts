/**
 * Level Configuration Data
 *
 * Data-driven configuration replacing 362-line switch statement.
 * Each level defines base config and sub-level variations.
 */

import type { KeyInfo } from '../core/types';

// Melodic pattern constants (scale degrees)
const STEP = {
  UP3: [1, 2, 3],
  DOWN3: [3, 2, 1],
  UP5: [1, 2, 3, 4, 5],
  DOWN5: [5, 4, 3, 2, 1],
  NEIGHBOR: [1, 2, 1],
  TRIAD_UP: [1, 3, 5],
  TRIAD_DOWN: [5, 3, 1],
  CG: [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]],
  CEG: [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]],
};

const PATTERNS = {
  stepwise: [[1, 2, 3], [3, 2, 1], [1, 2, 3, 2, 1], [5, 4, 3], [3, 4, 5], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [1, 2, 1], [3, 2, 3], [5, 6, 5]],
  triadic: [[1, 3, 5], [5, 3, 1], [1, 3, 5, 3], [5, 3, 1, 3], [1, 5, 3], [3, 1, 5]],
  folk: [[3, 2, 1, 2, 3, 3, 3], [1, 1, 5, 5, 6, 6, 5], [3, 2, 1], [3, 3, 4, 5, 5, 4, 3, 2], [1, 1, 1, 2, 3], [1, 2, 3, 1], [5, 4, 3, 4, 5, 5, 5]],
  classical: [[1, 5, 3, 5], [1, 3, 5, 3], [1, 5, 3, 5, 1, 5, 3, 5], [5, 4, 3, 2, 1], [1, 5, 3]],
  wide: [[1, 6], [6, 1], [1, 6, 1], [3, 8], [8, 3], [1, 7], [7, 1], [1, 8], [8, 1], [1, 3, 5, 8, 5, 3, 1]],
};

export type HandMode = 'right' | 'left' | 'both';

export interface LevelConfig {
  durations: number[];
  restProbability: number;
  accidentalProbability: number;
  maxInterval: number;
  key: KeyInfo;
  timeSignature: { beats: number; beatType: number };
  noteRange: number[];
  patterns: number[][];
  handMode: HandMode;
  suggestedBpm: number;
  chordProbability: number;
  chordTypes: 'none' | 'intervals' | 'triads' | 'all';
}

interface SubLevelDef {
  noteRange?: number[];
  patterns?: number[][];
  handMode?: HandMode;
  durations?: number[];
  restProbability?: number;
  maxInterval?: number;
  timeSignature?: { beats: number; beatType: number };
  suggestedBpm?: number;
}

interface LevelDef {
  base: Partial<LevelConfig>;
  sub: [SubLevelDef, SubLevelDef, SubLevelDef, SubLevelDef];
}

const KEYS: Record<string, KeyInfo> = {
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

const KEY_ORDER = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db'];

export function getKeyForLevel(level: number): KeyInfo {
  if (level <= 10) return KEYS.C;
  const idx = Math.min(level - 10, KEY_ORDER.length - 1);
  return KEYS[KEY_ORDER[idx]];
}

export function getKeyByName(name: string): KeyInfo | undefined {
  return KEYS[name];
}

// Level definitions: levels 1-10 (C major foundation)
const LEVEL_DEFS: Record<number, LevelDef> = {
  1: { // Whole notes - RH only
    base: { durations: [4], suggestedBpm: 30, handMode: 'right', maxInterval: 2 },
    sub: [
      { noteRange: [1, 5], patterns: STEP.CG as number[][] },
      { noteRange: [1, 3, 5], patterns: STEP.CEG as number[][] },
      { noteRange: [1, 2, 3, 4, 5], patterns: [STEP.UP3, STEP.DOWN3, STEP.UP5] },
      { noteRange: [1, 2, 3, 4, 5], patterns: PATTERNS.stepwise },
    ],
  },
  2: { // Whole notes - LH only
    base: { durations: [4], suggestedBpm: 30, handMode: 'left', maxInterval: 2 },
    sub: [
      { noteRange: [1, 5], patterns: STEP.CG as number[][] },
      { noteRange: [1, 3, 5], patterns: STEP.CEG as number[][] },
      { noteRange: [1, 2, 3, 4, 5], patterns: [STEP.UP3, STEP.DOWN3, STEP.UP5] },
      { noteRange: [1, 2, 3, 4, 5], patterns: PATTERNS.stepwise },
    ],
  },
  3: { // Whole notes - both hands
    base: { durations: [4], suggestedBpm: 30, handMode: 'both', maxInterval: 2, noteRange: [1, 2, 3, 4, 5] },
    sub: [
      { patterns: [[1, 5], [5, 1]] },
      { patterns: PATTERNS.triadic.slice(0, 3) },
      { patterns: PATTERNS.stepwise.slice(0, 5) },
      { patterns: [...PATTERNS.stepwise, ...PATTERNS.triadic] },
    ],
  },
  4: { // Half notes - RH, LH, then both
    base: { noteRange: [1, 2, 3, 4, 5], suggestedBpm: 30 },
    sub: [
      { handMode: 'right', durations: [2], patterns: [[1, 5], [5, 1], STEP.TRIAD_UP] },
      { handMode: 'left', durations: [2], patterns: [[1, 5], [5, 1], STEP.TRIAD_UP] },
      { handMode: 'right', durations: [4, 2], patterns: [...PATTERNS.stepwise.slice(0, 5), ...PATTERNS.triadic.slice(0, 3)] },
      { handMode: 'both', durations: [4, 2], patterns: [...PATTERNS.stepwise, ...PATTERNS.triadic] },
    ],
  },
  5: { // Quarter notes
    base: { noteRange: [1, 2, 3, 4, 5, 6], suggestedBpm: 40 },
    sub: [
      { handMode: 'right', durations: [1], maxInterval: 1, patterns: PATTERNS.stepwise },
      { handMode: 'left', durations: [1], maxInterval: 1, patterns: PATTERNS.stepwise },
      { handMode: 'right', durations: [1, 2], patterns: PATTERNS.folk.slice(0, 3) },
      { handMode: 'both', durations: [1, 2], patterns: PATTERNS.folk.slice(0, 5) },
    ],
  },
  6: { // Rests and 3/4
    base: { noteRange: [1, 2, 3, 4, 5, 6], durations: [1, 2], suggestedBpm: 40 },
    sub: [
      { handMode: 'right', restProbability: 0.15, patterns: PATTERNS.stepwise },
      { handMode: 'left', restProbability: 0.15, patterns: PATTERNS.stepwise },
      { handMode: 'right', timeSignature: { beats: 3, beatType: 4 }, restProbability: 0.1, patterns: [...PATTERNS.folk.slice(0, 5), ...PATTERNS.triadic] },
      { handMode: 'both', timeSignature: { beats: 3, beatType: 4 }, restProbability: 0.1, durations: [4, 2, 1], patterns: PATTERNS.folk },
    ],
  },
  7: { // Dotted notes + wider range
    base: { noteRange: [1, 2, 3, 4, 5, 6, 7, 8], suggestedBpm: 50 },
    sub: [
      { handMode: 'right', durations: [3, 2, 1], patterns: PATTERNS.stepwise },
      { handMode: 'left', durations: [3, 2, 1], patterns: PATTERNS.stepwise },
      { handMode: 'right', durations: [2, 1], maxInterval: 6, patterns: [[1, 6], [6, 1], STEP.TRIAD_UP, [3, 8], ...PATTERNS.triadic] },
      { handMode: 'both', durations: [3, 2, 1], maxInterval: 6, patterns: [...PATTERNS.folk, ...PATTERNS.wide.slice(0, 5)] },
    ],
  },
  8: { // Eighth notes
    base: { noteRange: [1, 2, 3, 4, 5, 6, 7, 8], suggestedBpm: 55 },
    sub: [
      { handMode: 'right', durations: [0.5], maxInterval: 2, patterns: PATTERNS.stepwise },
      { handMode: 'left', durations: [0.5], maxInterval: 2, patterns: PATTERNS.stepwise },
      { handMode: 'right', durations: [0.5, 1], maxInterval: 3, patterns: [...PATTERNS.stepwise, ...PATTERNS.folk.slice(0, 3)] },
      { handMode: 'both', durations: [0.5, 1], maxInterval: 3, patterns: [...PATTERNS.stepwise, ...PATTERNS.folk.slice(0, 5)] },
    ],
  },
  9: { // Dotted eighths
    base: { noteRange: [1, 2, 3, 4, 5, 6, 7, 8], suggestedBpm: 50 },
    sub: [
      { handMode: 'right', durations: [0.75, 0.5, 1], maxInterval: 2, patterns: PATTERNS.stepwise },
      { handMode: 'left', durations: [0.75, 0.5, 1], maxInterval: 2, patterns: PATTERNS.stepwise },
      { handMode: 'right', durations: [0.75, 0.5, 1, 2], maxInterval: 4, patterns: [...PATTERNS.folk, ...PATTERNS.triadic] },
      { handMode: 'both', durations: [0.75, 0.5, 1], maxInterval: 4, patterns: [...PATTERNS.folk, ...PATTERNS.classical.slice(0, 5)] },
    ],
  },
  10: { // Sixteenths
    base: { noteRange: [1, 2, 3, 4, 5, 6, 7, 8], suggestedBpm: 45 },
    sub: [
      { handMode: 'right', durations: [0.25], maxInterval: 1, patterns: PATTERNS.stepwise.slice(0, 5) },
      { handMode: 'left', durations: [0.25], maxInterval: 1, patterns: PATTERNS.stepwise.slice(0, 5) },
      { handMode: 'right', durations: [0.25, 0.5, 1], maxInterval: 2, patterns: [...PATTERNS.stepwise, ...PATTERNS.folk.slice(0, 3)] },
      { handMode: 'both', durations: [0.25, 0.5, 1], maxInterval: 2, patterns: [...PATTERNS.stepwise, ...PATTERNS.folk.slice(0, 5)] },
    ],
  },
};

// Sub-level definitions for new key levels (11+)
const NEW_KEY_SUBS: [SubLevelDef, SubLevelDef, SubLevelDef, SubLevelDef] = [
  { handMode: 'right', durations: [4], suggestedBpm: 35, patterns: PATTERNS.stepwise },
  { handMode: 'left', durations: [4], suggestedBpm: 35, patterns: PATTERNS.stepwise },
  { handMode: 'right', durations: [1, 2], restProbability: 0.1, suggestedBpm: 45, patterns: [...PATTERNS.folk.slice(0, 5), ...PATTERNS.triadic] },
  { handMode: 'both', durations: [1, 2], restProbability: 0.1, suggestedBpm: 50, patterns: [...PATTERNS.folk, ...PATTERNS.classical] },
];

const DEFAULT_CONFIG: LevelConfig = {
  durations: [4],
  restProbability: 0,
  accidentalProbability: 0,
  maxInterval: 2,
  key: KEYS.C,
  timeSignature: { beats: 4, beatType: 4 },
  noteRange: [1, 3, 5],
  patterns: PATTERNS.stepwise.slice(0, 3),
  handMode: 'right',
  suggestedBpm: 30,
  chordProbability: 0,
  chordTypes: 'none',
};

export function getLevelConfig(level: number, subLevel: number, keyOverride?: string | null): LevelConfig {
  const key = keyOverride && KEYS[keyOverride] ? KEYS[keyOverride] : getKeyForLevel(level);

  // Handle levels 11+ (new keys)
  if (level >= 11) {
    const sub = NEW_KEY_SUBS[subLevel] || NEW_KEY_SUBS[0];
    return {
      ...DEFAULT_CONFIG,
      key,
      noteRange: [1, 2, 3, 4, 5, 6, 7, 8],
      maxInterval: level >= 17 ? 5 : level >= 15 ? 4 : 2,
      ...sub,
    };
  }

  // Levels 1-10
  const def = LEVEL_DEFS[level];
  if (!def) return { ...DEFAULT_CONFIG, key };

  const sub = def.sub[subLevel] || def.sub[0];
  return {
    ...DEFAULT_CONFIG,
    ...def.base,
    ...sub,
    key,
  };
}

// Lesson descriptions
const DESCRIPTIONS: Record<string, string> = {
  '1a': 'C and G — whole notes (RH)', '1b': 'C, E, G triad — whole notes (RH)', '1c': 'C through G — whole notes (RH)', '1d': 'Stepwise — whole notes (RH)',
  '2a': 'C and G — whole notes (LH)', '2b': 'C, E, G triad — whole notes (LH)', '2c': 'C through G — whole notes (LH)', '2d': 'Stepwise — whole notes (LH)',
  '3a': 'Simple coordination — whole notes', '3b': 'Triad patterns — whole notes', '3c': 'Stepwise — whole notes', '3d': 'Full patterns — whole notes',
  '4a': 'Half notes (RH)', '4b': 'Half notes (LH)', '4c': 'Whole and half notes (RH)', '4d': 'Whole and half notes — both hands',
  '5a': 'Quarter notes — stepwise (RH)', '5b': 'Quarter notes — stepwise (LH)', '5c': 'Quarter and half notes (RH)', '5d': 'Quarter notes — both hands',
  '6a': 'Quarter rests (RH)', '6b': 'Quarter rests (LH)', '6c': '3/4 time signature (RH)', '6d': '3/4 time — both hands',
  '7a': 'Dotted half notes (RH)', '7b': 'Dotted half notes (LH)', '7c': 'Wider intervals — 6ths (RH)', '7d': 'Full range — both hands',
  '8a': 'Eighth notes — stepwise (RH)', '8b': 'Eighth notes — stepwise (LH)', '8c': 'Eighth and quarter notes (RH)', '8d': 'Eighth notes — both hands',
  '9a': 'Dotted eighth rhythms (RH)', '9b': 'Dotted eighth rhythms (LH)', '9c': 'Syncopated patterns (RH)', '9d': 'Dotted eighths — both hands',
  '10a': 'Sixteenth notes — stepwise (RH)', '10b': 'Sixteenth notes — stepwise (LH)', '10c': 'Mixed rhythms (RH)', '10d': 'Sixteenth notes — both hands',
};

const SUB_LABELS = ['a', 'b', 'c', 'd'];
const KEY_SUB_DESC = ['whole notes (RH)', 'whole notes (LH)', 'quarter notes (RH)', 'both hands'];

export function getLessonDescription(level: number, subLevel: number): string {
  if (level <= 10) {
    return DESCRIPTIONS[`${level}${SUB_LABELS[subLevel]}`] || `Level ${level}${SUB_LABELS[subLevel]}`;
  }
  const key = getKeyForLevel(level);
  return `${key.name} — ${KEY_SUB_DESC[subLevel]}`;
}

export function getSuggestedBpm(level: number): number {
  if (level <= 2) return 30;
  if (level <= 4) return 40;
  if (level <= 6) return 50;
  if (level <= 7) return 60;
  if (level <= 8) return 55;
  if (level <= 9) return 50;
  if (level <= 10) return 45;
  return 40 + (level - 10) * 5;
}
