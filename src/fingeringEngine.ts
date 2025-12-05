// Piano Fingering Engine v2
// Completely rewritten for pedagogical clarity
//
// Philosophy:
// - Beginners learn in FIXED HAND POSITIONS
// - Each note's finger is determined by its distance from the position root
// - PREDICTABILITY over algorithmic "optimization"
// - Same relative position = same finger, always
// - No chaotic jumping between fingers
//
// How it works:
// 1. Find the lowest note in the passage (position root)
// 2. Map each note to a finger based on semitone distance from root
// 3. For notes beyond a 5th: extend with pinky (RH) or thumb (LH)
// 4. Left hand mirrors right hand (inverted)

import { Note } from 'tonal';
import type { Finger, Hand, FingeringResult, FingeringSuggestion } from './core/types';

// ============================================
// CORE FINGERING LOGIC
// ============================================

/**
 * Maps semitone interval from position root to finger number.
 *
 * The standard 5-finger position covers these intervals:
 * - 0 semitones (unison/root) → finger 1
 * - 2 semitones (major 2nd) → finger 2
 * - 4 semitones (major 3rd) → finger 3
 * - 5 semitones (perfect 4th) → finger 4
 * - 7 semitones (perfect 5th) → finger 5
 *
 * Chromatic notes (1, 3, 6 semitones) are assigned to the nearest position finger.
 * Notes beyond a 5th (8+ semitones) all use finger 5 (extension).
 */
function intervalToFinger(semitones: number, hand: Hand): Finger {
  // Ensure non-negative
  semitones = Math.max(0, semitones);

  let finger: Finger;

  // Map semitones to finger using natural 5-finger position boundaries
  // C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8...
  if (semitones === 0) {
    finger = 1;      // Root note
  } else if (semitones <= 2) {
    finger = 2;      // Half-step or whole-step above root (2nd)
  } else if (semitones <= 4) {
    finger = 3;      // Minor or major 3rd
  } else if (semitones <= 6) {
    finger = 4;      // Perfect 4th or tritone
  } else {
    finger = 5;      // 5th and everything beyond
  }

  // Left hand: invert the fingering
  // LH pinky on low notes, thumb on high notes
  if (hand === 'left') {
    finger = (6 - finger) as Finger;
  }

  return finger;
}

/**
 * Get position name from MIDI note number
 */
function getPositionName(midiNote: number): string {
  const pitchClass = midiNote % 12;
  const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `${noteNames[pitchClass]} Position`;
}

// ============================================
// MAIN FINGERING FUNCTION
// ============================================

export function generateFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand = 'right'
): FingeringSuggestion {
  // Filter out rests
  const playableNotes = notes.filter(n => !n.isRest);

  if (playableNotes.length === 0) {
    return { notes: [], difficulty: 0, tips: [] };
  }

  // Convert to MIDI note numbers
  const midiNotes = playableNotes.map(n => {
    let noteName = n.step;
    if (n.alter === 1) noteName += '#';
    if (n.alter === -1) noteName += 'b';
    return Note.midi(`${noteName}${n.octave}`) || 60;
  });

  // Find the range of notes
  const minNote = Math.min(...midiNotes);
  const maxNote = Math.max(...midiNotes);
  const range = maxNote - minNote;

  // Use the lowest note as the position root
  // This gives predictable fingering: each note's finger depends
  // only on its distance from the lowest note
  const positionRoot = minNote;

  // Map each note to a finger based on interval from position root
  const fingeringPath: Finger[] = midiNotes.map(midi => {
    const interval = midi - positionRoot;
    return intervalToFinger(interval, hand);
  });

  // Determine position name
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

  // Calculate difficulty based on range
  let difficulty: number;
  if (range <= 7) {
    difficulty = 1; // Fits in 5-finger position
  } else if (range <= 12) {
    difficulty = 2; // Octave - requires extension
  } else {
    difficulty = 3; // More than octave - challenging
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

  // Add specific tips based on note patterns
  const uniqueFingers = new Set(fingeringPath);
  if (uniqueFingers.size <= 3) {
    tips.push('Simple pattern: only a few fingers needed');
  }

  // Check for repeated pinky stretches
  const pinkyCount = fingeringPath.filter(f =>
    (hand === 'right' && f === 5) || (hand === 'left' && f === 1)
  ).length;
  if (pinkyCount > fingeringPath.length * 0.3 && range > 7) {
    tips.push('Frequent stretches: relax hand between notes');
  }

  return { notes: result, difficulty, tips, position: positionName };
}

// ============================================
// HELPER EXPORTS
// ============================================

export function formatFingeringDisplay(suggestion: FingeringSuggestion): string {
  return suggestion.notes.map(n => n.finger).join(' ');
}

export function getSimpleFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand
): string {
  return formatFingeringDisplay(generateFingering(notes, hand));
}

export function fingerName(finger: Finger): string {
  const names: Record<Finger, string> = {
    1: 'thumb', 2: 'index', 3: 'middle', 4: 'ring', 5: 'pinky',
  };
  return names[finger];
}
