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
 * Generate XML for a single note or rest.
 *
 * @param note - Note data
 * @param staff - Staff number (1 = treble, 2 = bass)
 * @param divisions - MusicXML divisions per quarter note
 * @param beamState - Current beam state (modified in place)
 * @param nextNote - Next note for beam continuity
 * @param finger - Optional fingering number
 */
function noteToXML(
  note: NoteData,
  staff: number,
  divisions: number,
  beamState: BeamState,
  nextNote: NoteData | null,
  finger?: Finger
): string {
  const dur = Math.round(note.duration * divisions);

  // Rest handling
  if (note.isRest) {
    beamState.inBeam = false;
    return `      <note>
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

  // Accidental display
  let accidentalXml = '';
  if (note.alter === 1) {
    accidentalXml = `        <accidental>sharp</accidental>\n`;
  } else if (note.alter === -1) {
    accidentalXml = `        <accidental>flat</accidental>\n`;
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
  let xml = `      <note>
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
}

/**
 * Build complete MusicXML from note arrays.
 *
 * @param rightHandNotes - Right hand note data
 * @param leftHandNotes - Left hand note data
 * @param options - Build options
 */
export function buildMusicXML(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[],
  options: MusicXMLOptions
): string {
  const divisions = options.divisions ?? 4;
  const beatsPerMeasure =
    options.timeSignature.beatType === 8
      ? options.timeSignature.beats / 2
      : options.timeSignature.beats;

  // Split notes into measures
  const rightHand = splitIntoMeasures(rightHandNotes, beatsPerMeasure);
  const leftHand = splitIntoMeasures(leftHandNotes, beatsPerMeasure);
  const numMeasures = Math.max(rightHand.length, leftHand.length);

  // Track fingering indices
  let rhFingerIdx = 0;
  let lhFingerIdx = 0;

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

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

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
      xml += noteToXML(note, 1, divisions, rhBeamState, nextNote, finger);
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
      xml += noteToXML(note, 2, divisions, lhBeamState, nextNote, finger);
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
</score-partwise>`;

  return xml;
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
