/**
 * MIDI Parser
 *
 * Parses MIDI files into structured note data for practice.
 * Converts MIDI events to the same ParsedMusicXML format used by the practice session.
 *
 * Note: MIDI files don't contain enharmonic spelling information (C# vs Db),
 * so we use a simple algorithm to pick the most likely spelling based on
 * key signature heuristics.
 *
 * @module upload/midi-parser
 */

import { Midi } from '@tonejs/midi';
import type { NoteData, TimeSignature, KeyInfo } from '../core/types';
import type { ParsedMusicXML, MeasureData } from './parser';

// ============================================
// CONSTANTS
// ============================================

// Default key signature (C major) when none specified
const DEFAULT_KEY: KeyInfo = {
  name: 'C major',
  fifths: 0,
  scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
};

// Map from MIDI pitch class (0-11) to note name
// Using sharps by default; will adjust based on key signature
const PITCH_CLASS_TO_SHARP: string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const PITCH_CLASS_TO_FLAT: string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
];

// Key signatures by fifths value (using string keys for TypeScript compatibility)
const KEY_SIGNATURES: Record<string, KeyInfo> = {
  [-7]: { name: 'Cb major', fifths: -7, scale: ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'] },
  [-6]: { name: 'Gb major', fifths: -6, scale: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
  [-5]: { name: 'Db major', fifths: -5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  [-4]: { name: 'Ab major', fifths: -4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  [-3]: { name: 'Eb major', fifths: -3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  [-2]: { name: 'Bb major', fifths: -2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  [-1]: { name: 'F major', fifths: -1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
  [0]: { name: 'C major', fifths: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  [1]: { name: 'G major', fifths: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  [2]: { name: 'D major', fifths: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  [3]: { name: 'A major', fifths: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  [4]: { name: 'E major', fifths: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  [5]: { name: 'B major', fifths: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  [6]: { name: 'F# major', fifths: 6, scale: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  [7]: { name: 'C# major', fifths: 7, scale: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'] },
};

// ============================================
// MIDI NUMBER CONVERSION
// ============================================

/**
 * Convert a MIDI note number to step/octave/alter.
 * Uses flat/sharp preference based on key signature.
 */
function midiToNote(midi: number, useFlats: boolean): { step: string; octave: number; alter: number } {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = midi % 12;

  const noteName = useFlats ? PITCH_CLASS_TO_FLAT[pitchClass] : PITCH_CLASS_TO_SHARP[pitchClass];

  // Parse the note name
  const step = noteName.charAt(0);
  let alter = 0;
  if (noteName.includes('#')) {
    alter = 1;
  } else if (noteName.includes('b')) {
    alter = -1;
  }

  return { step, octave, alter };
}

/**
 * Determine if we should use flats based on key signature.
 */
function shouldUseFlats(keyFifths: number): boolean {
  return keyFifths < 0;
}

// ============================================
// MIDI PARSING
// ============================================

/**
 * Parse a MIDI file into the same structure as MusicXML.
 *
 * @param arrayBuffer - The MIDI file as an ArrayBuffer
 * @returns Parsed data compatible with ProgressivePracticeSession
 */
export function parseMidi(arrayBuffer: ArrayBuffer): ParsedMusicXML {
  const midi = new Midi(arrayBuffer);

  // Get time signature (default to 4/4)
  let timeSignature: TimeSignature = { beats: 4, beatType: 4 };
  if (midi.header.timeSignatures.length > 0) {
    const ts = midi.header.timeSignatures[0];
    timeSignature = {
      beats: ts.timeSignature[0],
      beatType: ts.timeSignature[1],
    };
  }

  // Get key signature (default to C major)
  let keySignature: KeyInfo = DEFAULT_KEY;
  if (midi.header.keySignatures.length > 0) {
    const ks = midi.header.keySignatures[0];
    const fifths = ks.key;
    keySignature = KEY_SIGNATURES[String(fifths)] ?? DEFAULT_KEY;
  }

  const useFlats = shouldUseFlats(keySignature.fifths);

  // Calculate beats per measure
  const beatsPerMeasure = timeSignature.beatType === 8
    ? timeSignature.beats / 2
    : timeSignature.beats;

  // Collect all notes from all tracks
  interface TimedNote {
    midi: number;
    startTime: number; // in beats
    duration: number; // in beats
  }

  const allNotes: TimedNote[] = [];
  const ppq = midi.header.ppq; // Pulses per quarter note

  for (const track of midi.tracks) {
    for (const note of track.notes) {
      // Convert ticks to beats
      const startBeats = note.ticks / ppq;
      const durationBeats = note.durationTicks / ppq;

      allNotes.push({
        midi: note.midi,
        startTime: startBeats,
        duration: durationBeats,
      });
    }
  }

  // Sort by start time
  allNotes.sort((a, b) => a.startTime - b.startTime);

  if (allNotes.length === 0) {
    return {
      measures: [],
      timeSignature,
      keySignature,
      title: midi.name || undefined,
    };
  }

  // Find total duration in measures
  const lastNote = allNotes[allNotes.length - 1];
  const totalBeats = lastNote.startTime + lastNote.duration;
  const numMeasures = Math.ceil(totalBeats / beatsPerMeasure);

  // Split notes into measures and hands (above/below middle C)
  // Middle C is MIDI 60
  const SPLIT_POINT = 60;

  const measures: MeasureData[] = [];

  for (let m = 0; m < numMeasures; m++) {
    const measureStart = m * beatsPerMeasure;
    const measureEnd = (m + 1) * beatsPerMeasure;

    // Get notes that start in this measure
    const measureNotes = allNotes.filter(n =>
      n.startTime >= measureStart && n.startTime < measureEnd
    );

    // Split into right hand (above split point) and left hand (below)
    const rightHandNotes: NoteData[] = [];
    const leftHandNotes: NoteData[] = [];

    // Group notes by start time for chord detection
    const notesByTime = new Map<number, TimedNote[]>();
    for (const note of measureNotes) {
      const key = Math.round(note.startTime * 1000) / 1000;
      if (!notesByTime.has(key)) {
        notesByTime.set(key, []);
      }
      notesByTime.get(key)!.push(note);
    }

    // Convert to NoteData, handling chords
    for (const [, notes] of notesByTime) {
      // Split by hand
      const rhNotes = notes.filter(n => n.midi >= SPLIT_POINT);
      const lhNotes = notes.filter(n => n.midi < SPLIT_POINT);

      // Process right hand
      if (rhNotes.length > 0) {
        // Sort by pitch (lowest first as primary)
        rhNotes.sort((a, b) => a.midi - b.midi);

        // Quantize duration to standard note values
        const duration = quantizeDuration(rhNotes[0].duration);

        const { step, octave, alter } = midiToNote(rhNotes[0].midi, useFlats);

        const primary: NoteData = {
          step,
          octave,
          alter,
          duration,
          isRest: false,
        };

        // Add additional notes as chord
        if (rhNotes.length > 1) {
          primary.chordNotes = rhNotes.slice(1).map(n => {
            const { step, octave, alter } = midiToNote(n.midi, useFlats);
            return { step, octave, alter, duration, isRest: false };
          });
        }

        rightHandNotes.push(primary);
      }

      // Process left hand
      if (lhNotes.length > 0) {
        lhNotes.sort((a, b) => a.midi - b.midi);

        const duration = quantizeDuration(lhNotes[0].duration);
        const { step, octave, alter } = midiToNote(lhNotes[0].midi, useFlats);

        const primary: NoteData = {
          step,
          octave,
          alter,
          duration,
          isRest: false,
        };

        if (lhNotes.length > 1) {
          primary.chordNotes = lhNotes.slice(1).map(n => {
            const { step, octave, alter } = midiToNote(n.midi, useFlats);
            return { step, octave, alter, duration, isRest: false };
          });
        }

        leftHandNotes.push(primary);
      }
    }

    // Fill gaps with rests (simplified - just check if measure is empty)
    if (rightHandNotes.length === 0) {
      rightHandNotes.push({
        step: 'C',
        alter: 0,
        octave: 5,
        duration: beatsPerMeasure,
        isRest: true,
      });
    }

    if (leftHandNotes.length === 0) {
      leftHandNotes.push({
        step: 'C',
        alter: 0,
        octave: 3,
        duration: beatsPerMeasure,
        isRest: true,
      });
    }

    measures.push({
      number: m + 1,
      rightHand: rightHandNotes,
      leftHand: leftHandNotes,
    });
  }

  return {
    measures,
    timeSignature,
    keySignature,
    title: midi.name || undefined,
  };
}

/**
 * Quantize a duration in beats to the nearest standard note value.
 */
function quantizeDuration(beats: number): number {
  // Standard durations: 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125
  const standardDurations = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125];

  let closest = standardDurations[0];
  let minDiff = Math.abs(beats - closest);

  for (const d of standardDurations) {
    const diff = Math.abs(beats - d);
    if (diff < minDiff) {
      minDiff = diff;
      closest = d;
    }
  }

  return closest;
}

/**
 * Check if a file is a MIDI file by its extension.
 */
export function isMidiFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mid') || lower.endsWith('.midi');
}
