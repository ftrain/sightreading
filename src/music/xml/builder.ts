/**
 * MusicXML Builder
 *
 * Generates MusicXML from NoteData arrays.
 * The XML is consumed by Verovio for rendering.
 *
 * @module music/xml/builder
 */

import type { NoteData, TimeSignature, KeyInfo, Finger } from '../../core/types';

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a unique ID for a note element.
 * Format: n{hand}{measureIndex}{noteIndex}
 * Examples: n-r-0-0, n-l-1-2
 */
function generateNoteId(hand: 'r' | 'l', measureIndex: number, noteIndex: number): string {
  return `n-${hand}-${measureIndex}-${noteIndex}`;
}

/**
 * Mapping from time (in beats) to SVG element IDs.
 * Used to link timing events to visual elements.
 */
export interface NoteIdMapping {
  /** Map from time in beats to array of note element IDs at that time */
  timeToIds: Map<number, string[]>;
}

// ============================================
// BEAM STATE TRACKING
// ============================================

interface BeamState {
  inBeam: boolean;
  beamNumber: number;
}

// ============================================
// NOTE TYPE MAPPING
// ============================================

/**
 * Convert duration in beats to MusicXML note type.
 *
 * @param duration - Duration in beats
 * @returns MusicXML type element string
 */
function getNoteType(duration: number): string {
  // Handle dotted notes
  if (duration === 3) return '<type>half</type>\n        <dot/>';
  if (duration === 1.5) return '<type>quarter</type>\n        <dot/>';
  if (duration === 0.75) return '<type>eighth</type>\n        <dot/>';

  // Standard durations
  if (duration >= 4) return '<type>whole</type>';
  if (duration >= 2) return '<type>half</type>';
  if (duration >= 1) return '<type>quarter</type>';
  if (duration >= 0.5) return '<type>eighth</type>';
  if (duration >= 0.25) return '<type>16th</type>';
  return '<type>16th</type>';
}

// ============================================
// NOTE XML GENERATION
// ============================================

/**
 * Check if a note's accidental is implied by the key signature.
 * If true, don't display the accidental (it's in the key).
 */
function isAccidentalInKey(step: string, alter: number, keyScale: string[]): boolean {
  // Build the expected note name with accidental
  let noteName = step;
  if (alter === 1) noteName += '#';
  else if (alter === -1) noteName += 'b';

  // Check if this note (with its accidental) is in the key's scale
  return keyScale.some(scaleNote => {
    // Normalize: scale might have F# and we're checking F with alter=1
    const scaleBase = scaleNote.charAt(0);
    const scaleAlter = scaleNote.includes('#') ? 1 : scaleNote.includes('b') ? -1 : 0;
    return scaleBase === step && scaleAlter === alter;
  });
}

/**
 * Generate XML for a single note or rest.
 *
 * @param note - Note data
 * @param staff - Staff number (1 = treble, 2 = bass)
 * @param divisions - MusicXML divisions per quarter note
 * @param beamState - Current beam state (modified in place)
 * @param nextNote - Next note for beam continuity
 * @param keyScale - Scale notes from key signature (to determine if accidental should show)
 * @param finger - Optional fingering number
 * @param noteId - Unique ID for this note element (for SVG mapping)
 */
function noteToXML(
  note: NoteData,
  staff: number,
  divisions: number,
  beamState: BeamState,
  nextNote: NoteData | null,
  keyScale: string[],
  finger?: Finger,
  noteId?: string
): string {
  const dur = Math.round(note.duration * divisions);
  const idAttr = noteId ? ` xml:id="${noteId}"` : '';

  // Rest handling
  if (note.isRest) {
    beamState.inBeam = false;
    return `      <note${idAttr}>
        <rest/>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
        <staff>${staff}</staff>
      </note>
`;
  }

  // Note pitch
  let alterXml = '';
  if (note.alter !== 0) {
    alterXml = `          <alter>${note.alter}</alter>\n`;
  }

  // Accidental display - only show if NOT in the key signature
  let accidentalXml = '';
  if (note.alter !== 0 && !isAccidentalInKey(note.step, note.alter, keyScale)) {
    if (note.alter === 1) {
      accidentalXml = `        <accidental>sharp</accidental>\n`;
    } else if (note.alter === -1) {
      accidentalXml = `        <accidental>flat</accidental>\n`;
    }
  }

  // Beam logic for eighth notes and shorter
  let beamXml = '';
  const isBeamable = note.duration <= 0.5;
  const nextIsBeamable = nextNote && !nextNote.isRest && nextNote.duration <= 0.5;

  if (isBeamable) {
    if (!beamState.inBeam && nextIsBeamable) {
      beamState.inBeam = true;
      beamState.beamNumber++;
      beamXml = `        <beam number="1">begin</beam>\n`;
    } else if (beamState.inBeam && nextIsBeamable) {
      beamXml = `        <beam number="1">continue</beam>\n`;
    } else if (beamState.inBeam && !nextIsBeamable) {
      beamState.inBeam = false;
      beamXml = `        <beam number="1">end</beam>\n`;
    }
  } else {
    beamState.inBeam = false;
  }

  // Fingering notation
  let fingeringXml = '';
  if (finger !== undefined) {
    const placement = staff === 1 ? 'above' : 'below';
    fingeringXml = `        <notations>
          <technical>
            <fingering placement="${placement}">${finger}</fingering>
          </technical>
        </notations>
`;
  }

  // Main note XML
  let xml = `      <note${idAttr}>
        <pitch>
          <step>${note.step}</step>
${alterXml}          <octave>${note.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${accidentalXml}${beamXml}        <staff>${staff}</staff>
${fingeringXml}      </note>
`;

  // Add chord notes if present
  if (note.chordNotes && note.chordNotes.length > 0) {
    for (const chordNote of note.chordNotes) {
      let chordAlterXml = '';
      if (chordNote.alter !== 0) {
        chordAlterXml = `          <alter>${chordNote.alter}</alter>\n`;
      }

      let chordAccidentalXml = '';
      if (chordNote.alter === 1) {
        chordAccidentalXml = `        <accidental>sharp</accidental>\n`;
      } else if (chordNote.alter === -1) {
        chordAccidentalXml = `        <accidental>flat</accidental>\n`;
      }

      xml += `      <note>
        <chord/>
        <pitch>
          <step>${chordNote.step}</step>
${chordAlterXml}          <octave>${chordNote.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${chordAccidentalXml}        <staff>${staff}</staff>
      </note>
`;
    }
  }

  return xml;
}

// ============================================
// MEASURE XML GENERATION
// ============================================

/**
 * Options for building MusicXML
 */
export interface MusicXMLOptions {
  /** Key signature */
  key: KeyInfo;
  /** Time signature */
  timeSignature: TimeSignature;
  /** MusicXML divisions (quarter notes = this many divisions) */
  divisions?: number;
  /** Fingering for right hand notes */
  rightHandFingering?: Finger[];
  /** Fingering for left hand notes */
  leftHandFingering?: Finger[];
  /** Whether to generate unique IDs for notes (for SVG mapping) */
  generateIds?: boolean;
  /** Add system breaks every N measures (0 = no breaks) */
  systemBreakEvery?: number;
}

/**
 * Result from building MusicXML
 */
export interface MusicXMLResult {
  /** The generated MusicXML string */
  xml: string;
  /** Mapping from time (in beats) to note element IDs */
  noteIdMapping: NoteIdMapping;
}

/**
 * Build complete MusicXML from note arrays.
 *
 * @param rightHandNotes - Right hand note data
 * @param leftHandNotes - Left hand note data
 * @param options - Build options
 * @returns MusicXMLResult with XML and note ID mapping
 */
export function buildMusicXML(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[],
  options: MusicXMLOptions
): MusicXMLResult {
  const divisions = options.divisions ?? 4;
  const beatsPerMeasure =
    options.timeSignature.beatType === 8
      ? options.timeSignature.beats / 2
      : options.timeSignature.beats;
  const generateIds = options.generateIds ?? true; // Default to generating IDs
  const systemBreakEvery = options.systemBreakEvery ?? 0; // 0 = no breaks

  // Split notes into measures
  const rightHand = splitIntoMeasures(rightHandNotes, beatsPerMeasure);
  const leftHand = splitIntoMeasures(leftHandNotes, beatsPerMeasure);
  const numMeasures = Math.max(rightHand.length, leftHand.length);

  // Track fingering indices
  let rhFingerIdx = 0;
  let lhFingerIdx = 0;

  // Track note IDs mapping (time in beats -> note IDs)
  const timeToIds: Map<number, string[]> = new Map();
  const roundTime = (t: number) => Math.round(t * 1000) / 1000;

  // Helper to add ID to mapping
  const addIdToMapping = (time: number, id: string) => {
    const key = roundTime(time);
    const existing = timeToIds.get(key) || [];
    existing.push(id);
    timeToIds.set(key, existing);
  };

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name print-object="no"></part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  // Track cumulative time for each hand
  let rhCumulativeTime = 0;
  let lhCumulativeTime = 0;

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

    // Add system break at start of measures 5, 9, 13, etc. (when systemBreakEvery is set)
    // m is 0-indexed, so m=4 is measure 5, m=8 is measure 9, etc.
    if (systemBreakEvery > 0 && m > 0 && m % systemBreakEvery === 0) {
      xml += `      <print new-system="yes"/>
`;
    }

    // First measure: add attributes
    if (m === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${options.key.fifths}</fifths></key>
        <time><beats>${options.timeSignature.beats}</beats><beat-type>${options.timeSignature.beatType}</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
`;
    }

    // Right hand (staff 1)
    const rhMeasure = rightHand[m] || [];
    const rhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < rhMeasure.length; i++) {
      const note = rhMeasure[i];
      const nextNote = i < rhMeasure.length - 1 ? rhMeasure[i + 1] : null;
      let finger: Finger | undefined;
      if (options.rightHandFingering && !note.isRest) {
        finger = options.rightHandFingering[rhFingerIdx];
        rhFingerIdx++;
      }

      // Generate ID and add to mapping
      const noteId = generateIds ? generateNoteId('r', m, i) : undefined;
      if (noteId) {
        addIdToMapping(rhCumulativeTime, noteId);
      }

      xml += noteToXML(note, 1, divisions, rhBeamState, nextNote, options.key.scale, finger, noteId);
      rhCumulativeTime += note.duration;
    }

    // Backup to write left hand
    const rhDuration = rhMeasure.reduce((sum, n) => sum + n.duration, 0);
    xml += `      <backup><duration>${Math.round(rhDuration * divisions)}</duration></backup>
`;

    // Left hand (staff 2)
    const lhMeasure = leftHand[m] || [];
    const lhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < lhMeasure.length; i++) {
      const note = lhMeasure[i];
      const nextNote = i < lhMeasure.length - 1 ? lhMeasure[i + 1] : null;
      let finger: Finger | undefined;
      if (options.leftHandFingering && !note.isRest) {
        finger = options.leftHandFingering[lhFingerIdx];
        lhFingerIdx++;
      }

      // Generate ID and add to mapping
      const noteId = generateIds ? generateNoteId('l', m, i) : undefined;
      if (noteId) {
        addIdToMapping(lhCumulativeTime, noteId);
      }

      xml += noteToXML(note, 2, divisions, lhBeamState, nextNote, options.key.scale, finger, noteId);
      lhCumulativeTime += note.duration;
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
</score-partwise>`;

  return {
    xml,
    noteIdMapping: { timeToIds }
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Split a flat array of notes into measures.
 *
 * @param notes - Flat array of notes
 * @param beatsPerMeasure - Duration of each measure
 */
function splitIntoMeasures(notes: NoteData[], beatsPerMeasure: number): NoteData[][] {
  const measures: NoteData[][] = [];
  let currentMeasure: NoteData[] = [];
  let currentBeats = 0;

  for (const note of notes) {
    currentMeasure.push(note);
    currentBeats += note.duration;

    // Small tolerance for floating point
    if (currentBeats >= beatsPerMeasure - 0.01) {
      measures.push(currentMeasure);
      currentMeasure = [];
      currentBeats = 0;
    }
  }

  // Add remaining notes
  if (currentMeasure.length > 0) {
    measures.push(currentMeasure);
  }

  return measures;
}

/**
 * Calculate the number of measures in a note array.
 */
export function countMeasures(notes: NoteData[], beatsPerMeasure: number): number {
  const totalBeats = notes.reduce((sum, n) => sum + n.duration, 0);
  return Math.ceil(totalBeats / beatsPerMeasure);
}
