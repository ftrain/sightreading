/**
 * Music Generators Module
 *
 * Algorithms and data for generating musical content.
 *
 * @module music/generators
 */

// Patterns
export {
  stepwisePatterns,
  triadicPatterns,
  folkPatterns,
  classicalPatterns,
  wideIntervalPatterns,
  basicIntervals,
  triadChords,
  getPatternsForLevel,
  getAccompanimentPatterns,
  pick,
} from './patterns';

// Scales
export {
  KEYS,
  KEY_PROGRESSION,
  getKey,
  getKeyForLevel,
  getAvailableKeys,
  scaleDegreeToNote,
  getNoteScaleDegree,
  getKeySignatureAccidentals,
  needsAccidental,
  getRelativeMinor,
  getKeyDescription,
} from './scales';

// Melody generation
export {
  generateMelody,
  generateLeftHand,
  generateRests,
  getChordNotes,
} from './melody';
