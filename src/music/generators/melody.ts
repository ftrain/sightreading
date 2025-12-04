/**
 * Melody Generation
 *
 * Core algorithms for generating melodic content.
 * Used by procedural music sources.
 *
 * @module music/generators/melody
 */

import type { NoteData, LevelConfig } from '../../core/types';
import { scaleDegreeToNote } from './scales';
import { pick } from './patterns';

// ============================================
// CHORD GENERATION
// ============================================

/**
 * Basic intervals (2 notes together)
 */
const basicIntervals: number[][] = [
  [1, 3], // 3rd
  [1, 5], // 5th
  [3, 5], // 3rd to 5th
  [1, 8], // Octave
];

/**
 * Triads (3 notes together)
 */
const triadChords: number[][] = [
  [1, 3, 5], // Root position triad
  [1, 3, 8], // Open voicing
  [1, 5, 8], // Power chord + octave
];

/**
 * Get chord notes to add to a root note based on configuration.
 *
 * @param rootDegree - Scale degree of the root note
 * @param keyName - Key name
 * @param baseOctave - Base octave
 * @param chordTypes - Type of chords allowed
 */
export function getChordNotes(
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
    if (interval === 1) continue; // Skip root (already the melody note)

    // Calculate the actual scale degree for this chord tone
    const chordDegree = rootDegree + (interval - 1);
    const noteData = scaleDegreeToNote(chordDegree, keyName, baseOctave);
    chordNotes.push(noteData);
  }

  return chordNotes.length > 0 ? chordNotes : undefined;
}

// ============================================
// MELODY GENERATION
// ============================================

/**
 * Generate a melodic line based on configuration.
 *
 * @param config - Level configuration
 * @param beatsPerMeasure - Beats per measure
 * @param numMeasures - Number of measures to generate
 * @returns Array of measures, each containing notes
 */
export function generateMelody(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 4; // Right hand octave

  // Pick a melodic pattern to use as a motif
  const pattern = pick(config.patterns);
  let patternIndex = 0;

  const keyRoot = config.key.name.split(' ')[0];

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
        notes.push({
          step: '',
          alter: 0,
          octave: 0,
          duration: dur,
          isRest: true,
        });
        remainingBeats -= dur;
        continue;
      }

      // Get the next scale degree from the pattern
      let degree = pattern[patternIndex % pattern.length];
      patternIndex++;

      // Occasionally vary the pattern
      if (Math.random() < 0.2 && notes.length > 0) {
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

      const noteData = scaleDegreeToNote(degree, keyRoot, baseOctave);

      // Possibly add chord notes (for longer durations only)
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

// ============================================
// LEFT HAND / BASS GENERATION
// ============================================

/**
 * Generate left hand part based on configuration.
 * In 'left' mode, generates melodic content.
 * In 'both' mode, generates accompaniment.
 *
 * @param config - Level configuration
 * @param beatsPerMeasure - Beats per measure
 * @param numMeasures - Number of measures
 * @param level - Current level (for pattern selection)
 */
export function generateLeftHand(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number,
  level: number
): NoteData[][] {
  const isMelodicMode = config.handMode === 'left';
  const measures: NoteData[][] = [];
  const baseOctave = 3; // Left hand octave

  // Choose patterns based on mode
  let bassPatterns: number[][];
  if (isMelodicMode) {
    // Left hand as primary melody - use same patterns as right hand config
    bassPatterns = config.patterns;
  } else {
    // Both hands mode - use accompaniment patterns
    if (level <= 5) {
      bassPatterns = [[1], [1, 5], [1, 3, 5], [1, 5, 1, 5], [1, 3, 5, 3]];
    } else if (level <= 6) {
      bassPatterns = [
        [1, 2, 3, 2],
        [1, 3, 5, 3],
        [5, 4, 3, 2, 1],
        [1, 2, 3, 4, 5],
        [1, 5, 3, 5],
        [1, 3, 5, 3],
      ];
    } else {
      bassPatterns = [
        [1, 2, 3],
        [3, 2, 1],
        [1, 2, 3, 2, 1],
        [5, 4, 3],
        [3, 4, 5],
        [1, 5, 3, 5],
        [1, 3, 5, 3],
        [1, 5, 8, 5],
        [8, 7, 6, 5],
      ];
    }
  }

  const pattern = pick(bassPatterns);
  let patternIdx = 0;

  // In melodic mode, use config durations; in accompaniment mode, prefer longer notes
  const bassDurations = isMelodicMode
    ? config.durations
    : level <= 4
    ? [beatsPerMeasure]
    : level <= 6
    ? [2, 1]
    : config.durations;

  const keyRoot = config.key.name.split(' ')[0];

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      let availableDurations = bassDurations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      // In melodic mode, pick any; in accompaniment, prefer longer
      const dur = isMelodicMode
        ? Math.min(pick(availableDurations), remainingBeats)
        : Math.min(Math.max(...availableDurations), remainingBeats);

      // Occasional rest
      if (
        Math.random() < config.restProbability * (isMelodicMode ? 1 : 0.5) &&
        notes.length > 0
      ) {
        notes.push({
          step: '',
          alter: 0,
          octave: 0,
          duration: dur,
          isRest: true,
        });
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
// REST GENERATION
// ============================================

/**
 * Generate measures filled with rests.
 * Used when a hand is inactive.
 *
 * @param beatsPerMeasure - Duration of each measure rest
 * @param numMeasures - Number of measures
 */
export function generateRests(
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  return Array(numMeasures)
    .fill(null)
    .map(() => [
      {
        step: '',
        alter: 0,
        octave: 0,
        duration: beatsPerMeasure,
        isRest: true,
      },
    ]);
}
