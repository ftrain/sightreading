/**
 * Scales and Keys
 *
 * Key signature data and scale utilities for music generation.
 * Follows the circle of fifths for pedagogical key progression.
 *
 * @module music/generators/scales
 */

import type { KeyInfo } from '../../core/types';

// ============================================
// KEY DEFINITIONS
// ============================================

/**
 * Complete key information for all major keys.
 * Organized by circle of fifths.
 */
export const KEYS: Record<string, KeyInfo> = {
  // No sharps/flats
  C: {
    name: 'C major',
    fifths: 0,
    scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  },
  // Sharp keys
  G: {
    name: 'G major',
    fifths: 1,
    scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  },
  D: {
    name: 'D major',
    fifths: 2,
    scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  },
  A: {
    name: 'A major',
    fifths: 3,
    scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  },
  E: {
    name: 'E major',
    fifths: 4,
    scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  },
  B: {
    name: 'B major',
    fifths: 5,
    scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  },
  // Flat keys
  F: {
    name: 'F major',
    fifths: -1,
    scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  },
  Bb: {
    name: 'Bb major',
    fifths: -2,
    scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  },
  Eb: {
    name: 'Eb major',
    fifths: -3,
    scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  },
  Ab: {
    name: 'Ab major',
    fifths: -4,
    scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  },
  Db: {
    name: 'Db major',
    fifths: -5,
    scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  },
};

/**
 * Order of key introduction in the curriculum.
 * Alternates sharps and flats for balanced learning.
 */
export const KEY_PROGRESSION = [
  'C',   // 0 accidentals
  'G',   // 1 sharp
  'F',   // 1 flat
  'D',   // 2 sharps
  'Bb',  // 2 flats
  'A',   // 3 sharps
  'Eb',  // 3 flats
  'E',   // 4 sharps
  'Ab',  // 4 flats
  'B',   // 5 sharps
  'Db',  // 5 flats
];

// ============================================
// KEY LOOKUP FUNCTIONS
// ============================================

/**
 * Get key information by name.
 *
 * @param keyName - Key name ('C', 'G', 'Bb', etc.)
 * @returns KeyInfo or C major as default
 */
export function getKey(keyName: string): KeyInfo {
  return KEYS[keyName] || KEYS['C'];
}

/**
 * Get the key appropriate for a given level.
 * Levels 1-7 use C major, level 8+ introduces new keys.
 *
 * @param level - Level number (1-20)
 */
export function getKeyForLevel(level: number): KeyInfo {
  if (level <= 7) {
    return KEYS['C'];
  }
  // Level 8 = G, Level 9 = F, Level 10 = D, etc.
  const keyIndex = Math.min(level - 7, KEY_PROGRESSION.length - 1);
  return KEYS[KEY_PROGRESSION[keyIndex]];
}

/**
 * Get all available key names.
 */
export function getAvailableKeys(): string[] {
  return Object.keys(KEYS);
}

// ============================================
// SCALE DEGREE FUNCTIONS
// ============================================

/**
 * Convert a scale degree to a note in a given key.
 *
 * @param degree - Scale degree (1-8, can extend higher)
 * @param keyName - Key name ('C', 'G', etc.)
 * @param baseOctave - Octave for degree 1
 */
export function scaleDegreeToNote(
  degree: number,
  keyName: string,
  baseOctave: number
): { step: string; alter: number; octave: number } {
  const keyInfo = KEYS[keyName] || KEYS['C'];
  const scale = keyInfo.scale;

  // Handle degrees outside 1-7 range
  const normalizedDegree = ((degree - 1) % 7 + 7) % 7;
  const octaveOffset = Math.floor((degree - 1) / 7);

  const noteName = scale[normalizedDegree];

  // Parse note name
  const step = noteName[0];
  let alter = 0;
  if (noteName.includes('#')) alter = 1;
  if (noteName.includes('b')) alter = -1;

  return { step, alter, octave: baseOctave + octaveOffset };
}

/**
 * Get the scale degree of a note in a given key.
 * Returns null if note is not diatonic to the key.
 *
 * @param step - Note letter ('C', 'D', etc.)
 * @param alter - Accidental (-1, 0, 1)
 * @param keyName - Key name
 */
export function getNoteScaleDegree(
  step: string,
  alter: number,
  keyName: string
): number | null {
  const keyInfo = KEYS[keyName] || KEYS['C'];

  // Build note name
  let noteName = step;
  if (alter === 1) noteName += '#';
  if (alter === -1) noteName += 'b';

  const index = keyInfo.scale.indexOf(noteName);
  return index === -1 ? null : index + 1;
}

// ============================================
// KEY SIGNATURE HELPERS
// ============================================

/**
 * Get the accidentals for a key signature.
 *
 * @param keyName - Key name
 * @returns Array of accidental notes (e.g., ['F#'] for G major)
 */
export function getKeySignatureAccidentals(keyName: string): string[] {
  const keyInfo = KEYS[keyName] || KEYS['C'];
  const accidentals: string[] = [];

  for (const note of keyInfo.scale) {
    if (note.includes('#') || note.includes('b')) {
      accidentals.push(note);
    }
  }

  return accidentals;
}

/**
 * Check if a note needs an accidental in a given key.
 *
 * @param step - Note letter
 * @param alter - Accidental
 * @param keyName - Key name
 */
export function needsAccidental(
  step: string,
  alter: number,
  keyName: string
): boolean {
  const keyInfo = KEYS[keyName] || KEYS['C'];

  // Build note name
  let noteName = step;
  if (alter === 1) noteName += '#';
  if (alter === -1) noteName += 'b';

  // Check if this exact spelling is in the scale
  return !keyInfo.scale.includes(noteName);
}

/**
 * Get the relative minor key name.
 *
 * @param majorKeyName - Major key name
 */
export function getRelativeMinor(majorKeyName: string): string {
  const minorMap: Record<string, string> = {
    C: 'Am', G: 'Em', D: 'Bm', A: 'F#m', E: 'C#m', B: 'G#m',
    F: 'Dm', Bb: 'Gm', Eb: 'Cm', Ab: 'Fm', Db: 'Bbm',
  };
  return minorMap[majorKeyName] || 'Am';
}

/**
 * Get a human-readable description of a key's accidentals.
 *
 * @param keyName - Key name
 */
export function getKeyDescription(keyName: string): string {
  const keyInfo = KEYS[keyName];
  if (!keyInfo) return 'Unknown key';

  const fifths = keyInfo.fifths;
  if (fifths === 0) return 'No sharps or flats';
  if (fifths > 0) return `${fifths} sharp${fifths !== 1 ? 's' : ''}`;
  return `${Math.abs(fifths)} flat${Math.abs(fifths) !== 1 ? 's' : ''}`;
}
