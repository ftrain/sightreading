/**
 * MusicXML Parser
 *
 * Parses MusicXML files into structured note data for practice.
 * Uses native DOM parsing for compatibility with both browser and Node.js environments.
 *
 * Handles multiple voices via backup/forward elements for proper time positioning.
 *
 * @module upload/parser
 */

import type { NoteData, TimeSignature, KeyInfo } from '../core/types';

// ============================================
// TYPES
// ============================================

/**
 * A note with its time position within the measure.
 */
export interface TimedNote extends NoteData {
  /** Start time in beats from measure start */
  startTime: number;
}

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

// Convert MusicXML duration to beats using divisions
function durationToBeats(duration: number, divisions: number): number {
  return duration / divisions;
}

// Convert MusicXML note type string to beat duration
function noteTypeStringToDuration(noteType: string, dots: number = 0): number {
  let baseDuration: number;

  switch (noteType) {
    case 'whole': baseDuration = 4; break;
    case 'half': baseDuration = 2; break;
    case 'quarter': baseDuration = 1; break;
    case 'eighth': baseDuration = 0.5; break;
    case '16th': baseDuration = 0.25; break;
    case '32nd': baseDuration = 0.125; break;
    case '64th': baseDuration = 0.0625; break;
    default: baseDuration = 1; break; // default to quarter
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

// ============================================
// MAIN PARSER
// ============================================

/**
 * Flatten timed notes into sequential notes by sorting and merging.
 * Notes at the same start time become chords.
 * Returns notes in playback order with correct durations.
 */
function flattenTimedNotes(timedNotes: TimedNote[]): NoteData[] {
  if (timedNotes.length === 0) return [];

  // Sort by start time
  const sorted = [...timedNotes].sort((a, b) => a.startTime - b.startTime);

  // Group notes by start time (notes at same time form chords or simultaneous events)
  const groups: Map<number, TimedNote[]> = new Map();
  for (const note of sorted) {
    const key = Math.round(note.startTime * 1000) / 1000; // Round to avoid float issues
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(note);
  }

  // Convert to sequential notes
  // For each time position, we take the shortest duration (the next event determines beat advance)
  const result: NoteData[] = [];
  const sortedTimes = Array.from(groups.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedTimes.length; i++) {
    const time = sortedTimes[i];
    const notesAtTime = groups.get(time)!;

    // Find the shortest duration at this time (this determines when we move to next beat)
    const shortestDuration = Math.min(...notesAtTime.map(n => n.duration));

    // For playback: take the first non-rest note as the primary, others as chords
    const nonRests = notesAtTime.filter(n => !n.isRest);
    const rests = notesAtTime.filter(n => n.isRest);

    if (nonRests.length > 0) {
      // Use shortest duration for the group
      const primary: NoteData = {
        step: nonRests[0].step,
        alter: nonRests[0].alter,
        octave: nonRests[0].octave,
        duration: shortestDuration,
        isRest: false,
      };

      // Preserve tie info from the primary note
      if (nonRests[0].tieStart) primary.tieStart = true;
      if (nonRests[0].tieEnd) primary.tieEnd = true;

      // Add additional notes as chord notes
      if (nonRests.length > 1) {
        primary.chordNotes = nonRests.slice(1).map(n => ({
          step: n.step,
          alter: n.alter,
          octave: n.octave,
          duration: shortestDuration,
          isRest: false,
        }));
      }

      result.push(primary);
    } else if (rests.length > 0) {
      // Only rests at this time
      result.push({
        step: 'C',
        alter: 0,
        octave: 4,
        duration: shortestDuration,
        isRest: true,
      });
    }
  }

  return result;
}

// ============================================
// DOM HELPERS
// ============================================

/**
 * Get text content of first matching child element.
 */
function getChildText(parent: Element, tagName: string): string | null {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent ?? null;
}

/**
 * Get numeric content of first matching child element.
 */
function getChildNumber(parent: Element, tagName: string): number | null {
  const text = getChildText(parent, tagName);
  return text !== null ? parseFloat(text) : null;
}

/**
 * Check if element has a child with given tag name.
 */
function hasChild(parent: Element, tagName: string): boolean {
  return parent.getElementsByTagName(tagName).length > 0;
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Parse a MusicXML string into structured data.
 *
 * Uses native DOM parsing for compatibility.
 *
 * Properly handles:
 * - Multiple voices via backup/forward elements
 * - Chord notes (notes with <chord/> element)
 * - Time signature and key signature
 */
export function parseMusicXML(xmlString: string): ParsedMusicXML {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`);
  }

  // Default values
  let divisions = 1;
  let timeSignature: TimeSignature = { beats: 4, beatType: 4 };
  let keySignature: KeyInfo = KEY_SIGNATURES['0'];

  // Get title from work or movement
  const workTitle = doc.querySelector('work work-title')?.textContent;
  const movementTitle = doc.querySelector('movement-title')?.textContent;
  const title = workTitle || movementTitle || undefined;

  const measures: MeasureData[] = [];

  // Get all parts
  const parts = doc.querySelectorAll('part');

  // For piano, we typically have one part with multiple staves
  // Process all parts together
  for (const part of parts) {
    const measureElements = part.querySelectorAll('measure');

    for (let measureIdx = 0; measureIdx < measureElements.length; measureIdx++) {
      const measureEl = measureElements[measureIdx];
      const measureNumber = measureIdx + 1;

      // Initialize or get existing measure data
      if (!measures[measureIdx]) {
        measures[measureIdx] = {
          number: measureNumber,
          rightHand: [],
          leftHand: [],
        };
      }

      // Collect timed notes for each hand
      const rightHandTimed: TimedNote[] = [];
      const leftHandTimed: TimedNote[] = [];

      // Track current time position within measure (in beats)
      let currentTime = 0;

      // Process all child elements in order
      for (const child of measureEl.children) {
        const tagName = child.tagName;

        // Attributes element (divisions, time, key, clefs)
        if (tagName === 'attributes') {
          const divEl = getChildNumber(child, 'divisions');
          if (divEl !== null) {
            divisions = divEl;
          }

          const timeEl = child.querySelector('time');
          if (timeEl) {
            const beats = getChildNumber(timeEl, 'beats');
            const beatType = getChildNumber(timeEl, 'beat-type');
            if (beats !== null && beatType !== null) {
              timeSignature = { beats, beatType };
            }
          }

          const keyEl = child.querySelector('key');
          if (keyEl) {
            const fifths = getChildNumber(keyEl, 'fifths');
            if (fifths !== null) {
              keySignature = KEY_SIGNATURES[String(fifths)] ?? KEY_SIGNATURES['0'];
            }
          }
        }

        // Backup element - moves time backwards
        if (tagName === 'backup') {
          const duration = getChildNumber(child, 'duration');
          if (duration !== null) {
            currentTime -= durationToBeats(duration, divisions);
            if (currentTime < 0) currentTime = 0;
          }
          continue;
        }

        // Forward element - moves time forward
        if (tagName === 'forward') {
          const duration = getChildNumber(child, 'duration');
          if (duration !== null) {
            currentTime += durationToBeats(duration, divisions);
          }
          continue;
        }

        // Note element
        if (tagName === 'note') {
          const isChord = hasChild(child, 'chord');
          const isRest = hasChild(child, 'rest');

          // Get staff (default to 1)
          const staffNum = getChildNumber(child, 'staff') ?? 1;

          // Get duration
          let duration: number;
          const typeEl = child.querySelector('type');
          const durationEl = getChildNumber(child, 'duration');

          if (typeEl?.textContent) {
            const noteType = typeEl.textContent;
            const dots = child.querySelectorAll('dot').length;
            duration = noteTypeStringToDuration(noteType, dots);
          } else if (durationEl !== null) {
            duration = durationToBeats(durationEl, divisions);
          } else {
            duration = 1; // Default to quarter note
          }

          // Detect ties - MusicXML uses <tie type="start"/> and <tie type="stop"/>
          const tieElements = child.getElementsByTagName('tie');
          let tieStart = false;
          let tieEnd = false;
          for (const tieEl of tieElements) {
            const tieType = tieEl.getAttribute('type');
            if (tieType === 'start') tieStart = true;
            if (tieType === 'stop') tieEnd = true;
          }

          // Calculate start time
          // Chord notes share the previous note's start time (don't advance time)
          const noteStartTime = isChord ? Math.max(0, currentTime - duration) : currentTime;

          if (isRest) {
            const timedNote: TimedNote = {
              step: 'C',
              alter: 0,
              octave: 4,
              duration,
              isRest: true,
              startTime: noteStartTime,
            };

            if (staffNum === 1) {
              rightHandTimed.push(timedNote);
            } else {
              leftHandTimed.push(timedNote);
            }
          } else {
            // Get pitch info
            const pitchEl = child.querySelector('pitch');
            if (pitchEl) {
              const step = (getChildText(pitchEl, 'step') ?? 'C').toUpperCase();
              const octave = getChildNumber(pitchEl, 'octave') ?? 4;
              const alter = getChildNumber(pitchEl, 'alter') ?? 0;

              const timedNote: TimedNote = {
                step,
                alter,
                octave,
                duration,
                isRest: false,
                startTime: noteStartTime,
                tieStart,
                tieEnd,
              };

              if (staffNum === 1) {
                rightHandTimed.push(timedNote);
              } else {
                leftHandTimed.push(timedNote);
              }
            }
          }

          // Advance time only for non-chord notes
          if (!isChord) {
            currentTime += duration;
          }
        }
      }

      // Flatten timed notes into sequential notes
      const flattenedRH = flattenTimedNotes(rightHandTimed);
      const flattenedLH = flattenTimedNotes(leftHandTimed);

      // Merge with existing measure data (in case multiple parts)
      measures[measureIdx].rightHand.push(...flattenedRH);
      measures[measureIdx].leftHand.push(...flattenedLH);
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
