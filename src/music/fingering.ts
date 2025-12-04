/**
 * Piano Fingering Engine
 *
 * Generates fingering suggestions based on hand position.
 * Designed for pedagogical clarity and predictability.
 *
 * Philosophy:
 * - Beginners learn in FIXED HAND POSITIONS
 * - Each note's finger is determined by its distance from the position root
 * - PREDICTABILITY over algorithmic "optimization"
 * - Same relative position = same finger, always
 *
 * @module music/fingering
 */

import { Note } from 'tonal';
import type { NoteData, Finger, Hand, FingeringResult, FingeringSuggestion } from '../core/types';

// ============================================
// CORE FINGERING LOGIC
// ============================================

/**
 * Maps semitone interval from position root to finger number.
 *
 * The standard 5-finger position covers:
 * - 0 semitones (root) → finger 1
 * - 2 semitones (major 2nd) → finger 2
 * - 4 semitones (major 3rd) → finger 3
 * - 5 semitones (perfect 4th) → finger 4
 * - 7 semitones (perfect 5th) → finger 5
 */
function intervalToFinger(semitones: number, hand: Hand): Finger {
  semitones = Math.max(0, semitones);

  let finger: Finger;

  if (semitones === 0) {
    finger = 1; // Root note
  } else if (semitones <= 2) {
    finger = 2; // 2nd
  } else if (semitones <= 4) {
    finger = 3; // 3rd
  } else if (semitones <= 6) {
    finger = 4; // 4th or tritone
  } else {
    finger = 5; // 5th and beyond
  }

  // Left hand: invert the fingering
  if (hand === 'left') {
    finger = (6 - finger) as Finger;
  }

  return finger;
}

/**
 * Get position name from MIDI note number.
 */
function getPositionName(midiNote: number): string {
  const pitchClass = midiNote % 12;
  const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `${noteNames[pitchClass]} Position`;
}

// ============================================
// MAIN FINGERING FUNCTION
// ============================================

/**
 * Generate fingering suggestions for a sequence of notes.
 *
 * @param notes - Array of note data
 * @param hand - Which hand ('left' or 'right')
 * @returns Fingering suggestion with notes, difficulty, and tips
 */
export function generateFingering(
  notes: NoteData[],
  hand: Hand = 'right'
): FingeringSuggestion {
  // Filter out rests
  const playableNotes = notes.filter((n) => !n.isRest);

  if (playableNotes.length === 0) {
    return { notes: [], difficulty: 0, tips: [] };
  }

  // Convert to MIDI note numbers
  const midiNotes = playableNotes.map((n) => {
    let noteName = n.step;
    if (n.alter === 1) noteName += '#';
    if (n.alter === -1) noteName += 'b';
    return Note.midi(`${noteName}${n.octave}`) || 60;
  });

  // Find the range
  const minNote = Math.min(...midiNotes);
  const maxNote = Math.max(...midiNotes);
  const range = maxNote - minNote;

  // Use lowest note as position root
  const positionRoot = minNote;

  // Map each note to a finger
  const fingeringPath: Finger[] = midiNotes.map((midi) => {
    const interval = midi - positionRoot;
    return intervalToFinger(interval, hand);
  });

  const positionName = getPositionName(positionRoot);

  // Build result array
  const result: FingeringResult[] = playableNotes.map((note, i) => {
    let noteName = note.step;
    if (note.alter === 1) noteName += '#';
    if (note.alter === -1) noteName += 'b';

    return {
      finger: fingeringPath[i],
      hand,
      note: `${noteName}${note.octave}`,
      midiNote: midiNotes[i],
    };
  });

  // Calculate difficulty
  let difficulty: number;
  if (range <= 7) {
    difficulty = 1; // Fits in 5-finger position
  } else if (range <= 12) {
    difficulty = 2; // Octave - requires extension
  } else {
    difficulty = 3; // More than octave
  }

  // Generate tips
  const tips: string[] = [];
  if (range <= 7) {
    tips.push(`${positionName}: keep fingers in place`);
  } else if (range <= 12) {
    tips.push(`${positionName}: extend for high/low notes`);
  } else {
    tips.push('Wide range: watch for position shifts');
  }

  // Check patterns
  const uniqueFingers = new Set(fingeringPath);
  if (uniqueFingers.size <= 3) {
    tips.push('Simple pattern: only a few fingers needed');
  }

  // Check for frequent stretches
  const pinkyCount = fingeringPath.filter(
    (f) => (hand === 'right' && f === 5) || (hand === 'left' && f === 1)
  ).length;
  if (pinkyCount > fingeringPath.length * 0.3 && range > 7) {
    tips.push('Frequent stretches: relax hand between notes');
  }

  return { notes: result, difficulty, tips, position: positionName };
}

// ============================================
// HELPER EXPORTS
// ============================================

/**
 * Format fingering as a simple string of numbers.
 */
export function formatFingeringDisplay(suggestion: FingeringSuggestion): string {
  return suggestion.notes.map((n) => n.finger).join(' ');
}

/**
 * Get simple fingering string for notes.
 */
export function getSimpleFingering(notes: NoteData[], hand: Hand): string {
  return formatFingeringDisplay(generateFingering(notes, hand));
}

/**
 * Get finger name.
 */
export function fingerName(finger: Finger): string {
  const names: Record<Finger, string> = {
    1: 'thumb',
    2: 'index',
    3: 'middle',
    4: 'ring',
    5: 'pinky',
  };
  return names[finger];
}

/**
 * Extract fingering arrays from suggestion for MusicXML building.
 */
export function extractFingeringArrays(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[],
  includeFingering: boolean
): { rightHandFingering?: Finger[]; leftHandFingering?: Finger[] } {
  if (!includeFingering) {
    return {};
  }

  const rhSuggestion = generateFingering(rightHandNotes, 'right');
  const lhSuggestion = generateFingering(leftHandNotes, 'left');

  return {
    rightHandFingering: rhSuggestion.notes.map((n) => n.finger),
    leftHandFingering: lhSuggestion.notes.map((n) => n.finger),
  };
}
