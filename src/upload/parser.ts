/**
 * MusicXML Parser
 *
 * Parses MusicXML files into structured note data for practice.
 * Uses musicxml-interfaces for robust parsing.
 *
 * @module upload/parser
 */

import { parseScore, type Note as MXMLNote } from 'musicxml-interfaces';
import type { NoteData, TimeSignature, KeyInfo } from '../core/types';

// ============================================
// TYPES
// ============================================

export interface MeasureData {
  number: number;
  rightHand: NoteData[];
  leftHand: NoteData[];
}

export interface ParsedMusicXML {
  measures: MeasureData[];
  timeSignature: TimeSignature;
  keySignature: KeyInfo;
  title?: string;
}

// ============================================
// KEY SIGNATURE HELPERS
// ============================================

const KEY_SIGNATURES: Record<string, KeyInfo> = {
  '-7': { name: 'Cb major', fifths: -7, scale: ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'] },
  '-6': { name: 'Gb major', fifths: -6, scale: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
  '-5': { name: 'Db major', fifths: -5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  '-4': { name: 'Ab major', fifths: -4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  '-3': { name: 'Eb major', fifths: -3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  '-2': { name: 'Bb major', fifths: -2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  '-1': { name: 'F major', fifths: -1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
  '0': { name: 'C major', fifths: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  '1': { name: 'G major', fifths: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  '2': { name: 'D major', fifths: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  '3': { name: 'A major', fifths: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  '4': { name: 'E major', fifths: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  '5': { name: 'B major', fifths: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  '6': { name: 'F# major', fifths: 6, scale: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  '7': { name: 'C# major', fifths: 7, scale: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'] },
};

// ============================================
// DURATION CONVERSION
// ============================================

// Map MusicXML note types to beat durations
function noteTypeToDuration(noteType: number | undefined, dots: number = 0): number {
  // MusicXML note types: 1024=1024th, 512=512th, 256=256th, 128=128th, 64=64th,
  // 32=32nd, 16=16th, 8=eighth, 4=quarter, 2=half, 1=whole, etc.
  let baseDuration: number;

  switch (noteType) {
    case 1: baseDuration = 4; break;      // whole
    case 2: baseDuration = 2; break;      // half
    case 4: baseDuration = 1; break;      // quarter
    case 8: baseDuration = 0.5; break;    // eighth
    case 16: baseDuration = 0.25; break;  // 16th
    case 32: baseDuration = 0.125; break; // 32nd
    default: baseDuration = 1; break;     // default to quarter
  }

  // Apply dots
  let totalDuration = baseDuration;
  let dotValue = baseDuration / 2;
  for (let i = 0; i < dots; i++) {
    totalDuration += dotValue;
    dotValue /= 2;
  }

  return totalDuration;
}

// Convert MusicXML duration to beats using divisions
function durationToBeats(duration: number, divisions: number): number {
  return duration / divisions;
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Parse a MusicXML string into structured data.
 */
export function parseMusicXML(xmlString: string): ParsedMusicXML {
  const score = parseScore(xmlString);

  // Default values
  let divisions = 1;
  let timeSignature: TimeSignature = { beats: 4, beatType: 4 };
  let keySignature: KeyInfo = KEY_SIGNATURES['0'];

  // Get title from work or movement
  const title = score.work?.workTitle || score.movementTitle || undefined;

  const measures: MeasureData[] = [];

  // Process each measure (timewise format)
  if (score.measures) {
    for (let measureIdx = 0; measureIdx < score.measures.length; measureIdx++) {
      const measure = score.measures[measureIdx];
      const measureNumber = measureIdx + 1;

      const rightHand: NoteData[] = [];
      const leftHand: NoteData[] = [];

      // Process each part in the measure
      for (const partId of Object.keys(measure.parts)) {
        const part = measure.parts[partId];

        for (const item of part) {
          // Check for attributes (divisions, time signature, key)
          if ('divisions' in item && item.divisions) {
            divisions = item.divisions;
          }

          if ('times' in item && item.times) {
            for (const time of item.times) {
              if (time.beats && time.beatTypes) {
                timeSignature = {
                  beats: parseInt(time.beats[0], 10),
                  beatType: time.beatTypes[0],
                };
              }
            }
          }

          if ('keySignatures' in item && item.keySignatures) {
            for (const key of item.keySignatures) {
              if (key.fifths !== undefined) {
                keySignature = KEY_SIGNATURES[String(key.fifths)] ?? KEY_SIGNATURES['0'];
              }
            }
          }

          // Check for notes
          if ('pitch' in item || 'rest' in item) {
            const note = item as MXMLNote;

            // Skip chord notes (they share timing with previous note)
            if (note.chord) continue;

            // Determine staff (1 = treble/right hand, 2 = bass/left hand)
            const staff = note.staff ?? 1;

            // Get duration
            let duration: number;
            if (note.noteType?.duration !== undefined) {
              const dots = note.dots?.length ?? 0;
              duration = noteTypeToDuration(note.noteType.duration, dots);
            } else if (note.duration !== undefined) {
              duration = durationToBeats(note.duration, divisions);
            } else {
              duration = 1; // Default to quarter note
            }

            // Check if rest
            if (note.rest) {
              const noteData: NoteData = {
                step: 'C',
                alter: 0,
                octave: 4,
                duration,
                isRest: true,
              };

              if (staff === 1) {
                rightHand.push(noteData);
              } else {
                leftHand.push(noteData);
              }
            } else if (note.pitch) {
              // Get pitch info - step is a letter in musicxml-interfaces (may be lowercase)
              // MusicXML standard uses uppercase (C, D, E, F, G, A, B)
              const step = (note.pitch.step ?? 'C').toUpperCase();
              const octave = note.pitch.octave ?? 4;
              const alter = note.pitch.alter ?? 0;

              const noteData: NoteData = {
                step,
                alter,
                octave,
                duration,
                isRest: false,
              };

              if (staff === 1) {
                rightHand.push(noteData);
              } else {
                leftHand.push(noteData);
              }
            }
          }
        }
      }

      measures.push({
        number: measureNumber,
        rightHand,
        leftHand,
      });
    }
  }

  return {
    measures,
    timeSignature,
    keySignature,
    title,
  };
}

/**
 * Get notes for a range of measures (1-indexed, inclusive).
 */
export function getMeasureRange(
  parsed: ParsedMusicXML,
  startMeasure: number,
  endMeasure: number
): { rightHand: NoteData[]; leftHand: NoteData[] } {
  const rightHand: NoteData[] = [];
  const leftHand: NoteData[] = [];

  for (const measure of parsed.measures) {
    if (measure.number >= startMeasure && measure.number <= endMeasure) {
      rightHand.push(...measure.rightHand);
      leftHand.push(...measure.leftHand);
    }
  }

  return { rightHand, leftHand };
}

/**
 * Get notes for specific measure numbers.
 */
export function getMeasures(
  parsed: ParsedMusicXML,
  measureNumbers: number[]
): { rightHand: NoteData[]; leftHand: NoteData[] } {
  const rightHand: NoteData[] = [];
  const leftHand: NoteData[] = [];
  const measureSet = new Set(measureNumbers);

  for (const measure of parsed.measures) {
    if (measureSet.has(measure.number)) {
      rightHand.push(...measure.rightHand);
      leftHand.push(...measure.leftHand);
    }
  }

  return { rightHand, leftHand };
}
