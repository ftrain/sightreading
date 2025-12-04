/**
 * Note Utility Functions
 *
 * Helper functions for note name conversion, MIDI calculations,
 * and note comparison. Used throughout the application.
 *
 * @module core/noteUtils
 */

import type { NoteData, ChordNote } from './types';

// ============================================
// NOTE NAME CONVERSION
// ============================================

/**
 * Convert NoteData to a display string like 'C4', 'F#5', 'Bb3'
 */
export function noteDataToString(note: NoteData | ChordNote): string {
  let name = note.step;
  if (note.alter === 1) name += '#';
  if (note.alter === -1) name += 'b';
  return `${name}${note.octave}`;
}

/**
 * Parse a note string like 'C#4' into components.
 * Returns null if invalid.
 */
export function parseNoteString(noteStr: string): { step: string; alter: number; octave: number } | null {
  const match = noteStr.match(/^([A-Ga-g])([#b]?)(\d+)$/);
  if (!match) return null;

  const step = match[1].toUpperCase();
  let alter = 0;
  if (match[2] === '#') alter = 1;
  if (match[2] === 'b') alter = -1;
  const octave = parseInt(match[3], 10);

  return { step, alter, octave };
}

/**
 * Convert NoteData to MIDI note number.
 * Middle C (C4) = 60
 */
export function noteDataToMidi(note: NoteData | ChordNote): number {
  const noteMap: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const base = noteMap[note.step] ?? 0;
  return (note.octave + 1) * 12 + base + note.alter;
}

/**
 * Convert MIDI note number to note name string.
 * Uses sharps by default.
 */
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Convert MIDI note number to NoteData (quarter note, not rest).
 */
export function midiToNoteData(midi: number, duration: number = 1): NoteData {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteName = noteNames[noteIndex];

  return {
    step: noteName[0],
    alter: noteName.includes('#') ? 1 : 0,
    octave,
    duration,
    isRest: false,
  };
}

// ============================================
// NOTE COMPARISON
// ============================================

/**
 * Normalize enharmonic equivalents for comparison.
 * Converts flats to sharps: Db→C#, Eb→D#, etc.
 */
export function normalizeNoteName(note: string): string {
  return note
    .replace('Db', 'C#')
    .replace('Eb', 'D#')
    .replace('Fb', 'E')
    .replace('Gb', 'F#')
    .replace('Ab', 'G#')
    .replace('Bb', 'A#')
    .replace('Cb', 'B');
}

/**
 * Check if two notes are enharmonically equivalent.
 */
export function notesAreEqual(note1: string, note2: string): boolean {
  return normalizeNoteName(note1) === normalizeNoteName(note2);
}

/**
 * Check if a played note matches any of the expected notes.
 */
export function noteMatchesAny(playedNote: string, expectedNotes: string[]): boolean {
  const normalizedPlayed = normalizeNoteName(playedNote);
  return expectedNotes.some((expected) => normalizeNoteName(expected) === normalizedPlayed);
}

// ============================================
// NOTE OPERATIONS
// ============================================

/**
 * Get all notes from a NoteData, including chord notes.
 * Returns array of note name strings.
 */
export function getAllNotesFromNoteData(note: NoteData): string[] {
  if (note.isRest) return [];

  const notes = [noteDataToString(note)];
  if (note.chordNotes) {
    for (const chordNote of note.chordNotes) {
      notes.push(noteDataToString(chordNote));
    }
  }
  return notes;
}

/**
 * Get the interval in semitones between two notes.
 */
export function getIntervalSemitones(note1: NoteData | ChordNote, note2: NoteData | ChordNote): number {
  return noteDataToMidi(note2) - noteDataToMidi(note1);
}

/**
 * Transpose a note by a number of semitones.
 */
export function transposeNote(note: NoteData, semitones: number): NoteData {
  const midi = noteDataToMidi(note) + semitones;
  const transposed = midiToNoteData(midi, note.duration);

  // Preserve chord notes if present
  if (note.chordNotes) {
    transposed.chordNotes = note.chordNotes.map((cn) => {
      const cnMidi = noteDataToMidi(cn) + semitones;
      const { step, alter, octave } = midiToNoteData(cnMidi);
      return { step, alter, octave };
    });
  }

  return transposed;
}

// ============================================
// DURATION HELPERS
// ============================================

/**
 * Get the note type name for a duration in beats.
 */
export function getDurationName(duration: number): string {
  if (duration >= 4) return 'whole';
  if (duration >= 3) return 'dotted half';
  if (duration >= 2) return 'half';
  if (duration >= 1.5) return 'dotted quarter';
  if (duration >= 1) return 'quarter';
  if (duration >= 0.75) return 'dotted eighth';
  if (duration >= 0.5) return 'eighth';
  if (duration >= 0.25) return 'sixteenth';
  return 'sixteenth';
}

/**
 * Check if a duration is dotted.
 */
export function isDottedDuration(duration: number): boolean {
  return duration === 3 || duration === 1.5 || duration === 0.75;
}

/**
 * Calculate total duration of a note array.
 */
export function getTotalDuration(notes: NoteData[]): number {
  return notes.reduce((sum, note) => sum + note.duration, 0);
}

// ============================================
// SCALE DEGREE HELPERS
// ============================================

/**
 * Convert a scale degree to a note in a given key.
 *
 * @param degree - Scale degree (1-8, can be higher for extended range)
 * @param scale - Array of note names in the scale ['C', 'D', 'E', ...]
 * @param baseOctave - Octave for degree 1
 */
export function scaleDegreeToNote(
  degree: number,
  scale: string[],
  baseOctave: number
): { step: string; alter: number; octave: number } {
  const normalizedDegree = ((degree - 1) % 7 + 7) % 7;
  const octaveOffset = Math.floor((degree - 1) / 7);
  const noteName = scale[normalizedDegree];

  const step = noteName[0];
  let alter = 0;
  if (noteName.includes('#')) alter = 1;
  if (noteName.includes('b')) alter = -1;

  return { step, alter, octave: baseOctave + octaveOffset };
}
