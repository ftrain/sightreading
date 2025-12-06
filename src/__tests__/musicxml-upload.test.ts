/**
 * End-to-end tests for MusicXML upload → parsing → rendering → playback.
 *
 * Tests the complete pipeline:
 * 1. Parse MusicXML with various features (voices, backup/forward, chords)
 * 2. Convert to internal NoteData representation
 * 3. Rebuild MusicXML via builder
 * 4. Verify timing events are correct for playback
 */

import { describe, it, expect } from 'vitest';
import { parseMusicXML, getMeasureRange } from '../upload/parser';
import { buildMusicXML } from '../music/xml/builder';
import type { NoteData } from '../core/types';

// ============================================
// TEST FIXTURES - Real MusicXML Examples
// ============================================

/**
 * Simple 4/4 measure with 4 quarter notes in treble clef.
 * No voices, no backup - baseline test.
 */
const SIMPLE_QUARTER_NOTES = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Two voices in right hand: whole note C + four quarter notes E.
 * Uses backup to write second voice.
 * This is the critical test case for the bug.
 */
const TWO_VOICES_WITH_BACKUP = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Two Voices Test</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- Voice 1: whole note C4 (4 beats) -->
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>whole</type>
        <voice>1</voice>
        <staff>1</staff>
      </note>
      <!-- Backup 4 beats to write voice 2 -->
      <backup><duration>16</duration></backup>
      <!-- Voice 2: four quarter notes E4 -->
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <!-- Left hand rest -->
      <backup><duration>16</duration></backup>
      <note><rest/><duration>16</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Chord notes using the <chord/> element.
 * C major chord (C-E-G) as quarter notes.
 */
const CHORD_NOTES = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- C major chord -->
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <!-- G major chord -->
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>B</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <!-- Two more quarter notes -->
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Mixed note values: whole, half, quarter in one measure.
 * Tests duration parsing accuracy.
 */
const MIXED_DURATIONS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- Half note (2 beats) -->
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>half</type><staff>1</staff></note>
      <!-- Two quarter notes (1 beat each) -->
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>8</duration></backup>
      <note><rest/><duration>8</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <!-- Whole note (4 beats) -->
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>8</duration><type>whole</type><staff>1</staff></note>
      <backup><duration>8</duration></backup>
      <note><rest/><duration>8</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Both hands playing simultaneously.
 * RH: quarter notes C-D-E-F
 * LH: half notes G-A
 */
const BOTH_HANDS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- Right hand: 4 quarter notes -->
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <!-- Backup to write left hand -->
      <backup><duration>8</duration></backup>
      <!-- Left hand: 2 half notes -->
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>half</type><staff>2</staff></note>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><type>half</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Complex example: two voices + both hands.
 * RH Voice 1: whole note
 * RH Voice 2: quarter notes
 * LH: half notes
 */
const COMPLEX_MULTIVOICE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Complex Multi-Voice</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>-1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- RH Voice 1: whole note C5 -->
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>16</duration>
        <type>whole</type>
        <voice>1</voice>
        <staff>1</staff>
      </note>
      <!-- Backup to beat 1 -->
      <backup><duration>16</duration></backup>
      <!-- RH Voice 2: 4 quarter notes -->
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <note>
        <pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
        <voice>2</voice>
        <staff>1</staff>
      </note>
      <!-- Backup to beat 1 for left hand -->
      <backup><duration>16</duration></backup>
      <!-- LH: 2 half notes -->
      <note>
        <pitch><step>F</step><octave>2</octave></pitch>
        <duration>8</duration>
        <type>half</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch><step>C</step><octave>3</octave></pitch>
        <duration>8</duration>
        <type>half</type>
        <staff>2</staff>
      </note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Forward element test - skip beats with forward instead of rest.
 */
const FORWARD_ELEMENT = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <!-- Beat 1: quarter note -->
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <!-- Skip beat 2 with forward -->
      <forward><duration>1</duration></forward>
      <!-- Beat 3: quarter note -->
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <!-- Beat 4: quarter note -->
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total duration of notes in beats.
 */
function totalDuration(notes: NoteData[]): number {
  return notes.reduce((sum, n) => sum + n.duration, 0);
}

/**
 * Build timing events like main.ts does.
 */
interface TimingEvent {
  time: number;
  duration: number;
  pitches: string[];
}

function noteDataToPitch(note: NoteData): string | null {
  if (note.isRest) return null;
  let pitchName = note.step;
  if (note.alter === 1) pitchName += '#';
  else if (note.alter === -1) pitchName += 'b';
  return `${pitchName}${note.octave}`;
}

function pitchToPitchString(pitch: { step: string; alter: number; octave: number }): string {
  let pitchName = pitch.step;
  if (pitch.alter === 1) pitchName += '#';
  else if (pitch.alter === -1) pitchName += 'b';
  return `${pitchName}${pitch.octave}`;
}

function buildTimingEvents(rightHandNotes: NoteData[], leftHandNotes: NoteData[]): TimingEvent[] {
  const roundTime = (t: number) => Math.round(t * 1000) / 1000;

  interface EventData {
    duration: number;
    pitches: string[];
  }
  const allEvents: Map<string, EventData> = new Map();

  // Process right hand notes
  let currentTime = 0;
  for (const note of rightHandNotes) {
    const timeKey = String(roundTime(currentTime));
    const pitch = noteDataToPitch(note);

    const existing = allEvents.get(timeKey);
    if (existing) {
      if (pitch) existing.pitches.push(pitch);
      if (note.duration < existing.duration) existing.duration = note.duration;
    } else {
      allEvents.set(timeKey, {
        duration: note.duration,
        pitches: pitch ? [pitch] : [],
      });
    }

    // Add chord note pitches
    if (note.chordNotes) {
      for (const chordNote of note.chordNotes) {
        const chordPitch = pitchToPitchString(chordNote);
        allEvents.get(timeKey)!.pitches.push(chordPitch);
      }
    }

    currentTime += note.duration;
  }

  // Process left hand notes
  currentTime = 0;
  for (const note of leftHandNotes) {
    const timeKey = String(roundTime(currentTime));
    const pitch = noteDataToPitch(note);

    const existing = allEvents.get(timeKey);
    if (existing) {
      if (pitch) existing.pitches.push(pitch);
      if (note.duration < existing.duration) existing.duration = note.duration;
    } else {
      allEvents.set(timeKey, {
        duration: note.duration,
        pitches: pitch ? [pitch] : [],
      });
    }

    // Add chord note pitches
    if (note.chordNotes) {
      for (const chordNote of note.chordNotes) {
        const chordPitch = pitchToPitchString(chordNote);
        allEvents.get(timeKey)!.pitches.push(chordPitch);
      }
    }

    currentTime += note.duration;
  }

  // Sort by time and build result
  const sortedTimes = Array.from(allEvents.keys())
    .map(k => parseFloat(k))
    .sort((a, b) => a - b);

  const result: TimingEvent[] = [];
  for (let i = 0; i < sortedTimes.length; i++) {
    const time = sortedTimes[i];
    const timeKey = String(time);
    const eventData = allEvents.get(timeKey)!;
    const nextTime = i < sortedTimes.length - 1 ? sortedTimes[i + 1] : time + eventData.duration;
    const duration = nextTime - time;
    result.push({ time, duration, pitches: eventData.pitches });
  }

  return result;
}

// ============================================
// TESTS
// ============================================

describe('MusicXML Parser', () => {
  describe('Simple parsing', () => {
    it('parses simple quarter notes correctly', () => {
      const parsed = parseMusicXML(SIMPLE_QUARTER_NOTES);

      expect(parsed.measures).toHaveLength(1);
      expect(parsed.timeSignature).toEqual({ beats: 4, beatType: 4 });
      expect(parsed.keySignature.fifths).toBe(0);

      const rh = parsed.measures[0].rightHand;
      expect(rh).toHaveLength(4);
      expect(rh[0]).toMatchObject({ step: 'C', octave: 4, duration: 1 });
      expect(rh[1]).toMatchObject({ step: 'D', octave: 4, duration: 1 });
      expect(rh[2]).toMatchObject({ step: 'E', octave: 4, duration: 1 });
      expect(rh[3]).toMatchObject({ step: 'F', octave: 4, duration: 1 });
    });

    it('parses key signature correctly', () => {
      const parsed = parseMusicXML(MIXED_DURATIONS);
      expect(parsed.keySignature.fifths).toBe(1);
      expect(parsed.keySignature.name).toBe('G major');
    });

    it('extracts title from work element', () => {
      const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);
      expect(parsed.title).toBe('Two Voices Test');
    });
  });

  describe('Multiple voices with backup', () => {
    it('handles two voices using backup element', () => {
      const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);

      expect(parsed.measures).toHaveLength(1);
      const rh = parsed.measures[0].rightHand;

      // Should have 4 events (at times 0, 1, 2, 3)
      // Beat 0: C4 (whole) + E4 (quarter) → chord
      // Beat 1: E4 (quarter)
      // Beat 2: E4 (quarter)
      // Beat 3: E4 (quarter)
      expect(rh.length).toBe(4);

      // First event should be a chord (C + E at beat 0)
      expect(rh[0].step).toBe('C');
      expect(rh[0].chordNotes).toBeDefined();
      expect(rh[0].chordNotes!.length).toBe(1);
      expect(rh[0].chordNotes![0].step).toBe('E');

      // Duration should be 1 (quarter) not 4 (whole)
      expect(rh[0].duration).toBe(1);

      // Subsequent beats should be single quarter notes
      expect(rh[1].step).toBe('E');
      expect(rh[1].duration).toBe(1);
      expect(rh[2].step).toBe('E');
      expect(rh[3].step).toBe('E');
    });

    it('total duration matches time signature', () => {
      const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);
      const rh = parsed.measures[0].rightHand;

      // With proper parsing, total duration should be 4 beats (one measure of 4/4)
      const total = totalDuration(rh);
      expect(total).toBe(4);
    });
  });

  describe('Chord notes', () => {
    it('parses chord elements correctly', () => {
      const parsed = parseMusicXML(CHORD_NOTES);
      const rh = parsed.measures[0].rightHand;

      // 4 events: C chord, G chord, C, D
      expect(rh.length).toBe(4);

      // First chord: C-E-G
      expect(rh[0].step).toBe('C');
      expect(rh[0].chordNotes).toHaveLength(2);
      expect(rh[0].chordNotes![0].step).toBe('E');
      expect(rh[0].chordNotes![1].step).toBe('G');

      // Second chord: G-B-D
      expect(rh[1].step).toBe('G');
      expect(rh[1].chordNotes).toHaveLength(2);
    });
  });

  describe('Mixed durations', () => {
    it('parses different note values correctly', () => {
      const parsed = parseMusicXML(MIXED_DURATIONS);

      expect(parsed.measures).toHaveLength(2);

      const m1 = parsed.measures[0].rightHand;
      expect(m1[0].duration).toBe(2); // half note
      expect(m1[1].duration).toBe(1); // quarter
      expect(m1[2].duration).toBe(1); // quarter

      const m2 = parsed.measures[1].rightHand;
      expect(m2[0].duration).toBe(4); // whole note
    });
  });

  describe('Both hands', () => {
    it('parses both staves correctly', () => {
      const parsed = parseMusicXML(BOTH_HANDS);

      const rh = parsed.measures[0].rightHand;
      const lh = parsed.measures[0].leftHand;

      expect(rh.length).toBe(4);
      expect(lh.length).toBe(2);

      // RH: quarter notes
      expect(rh.every(n => n.duration === 1)).toBe(true);

      // LH: half notes
      expect(lh.every(n => n.duration === 2)).toBe(true);
    });
  });

  describe('Complex multi-voice', () => {
    it('handles complex voice + hand combinations', () => {
      const parsed = parseMusicXML(COMPLEX_MULTIVOICE);

      const rh = parsed.measures[0].rightHand;
      const lh = parsed.measures[0].leftHand;

      // RH should have 4 events (C5 whole + F4/G4/A4/Bb4 quarters merged by time)
      expect(rh.length).toBe(4);

      // First beat: C5 + F4
      expect(rh[0].step).toBe('C');
      expect(rh[0].octave).toBe(5);
      expect(rh[0].chordNotes).toBeDefined();
      expect(rh[0].chordNotes![0].step).toBe('F');

      // LH should have 2 half notes
      expect(lh.length).toBe(2);
      expect(lh[0].step).toBe('F');
      expect(lh[1].step).toBe('C');
    });

    it('parses accidentals from key signature', () => {
      const parsed = parseMusicXML(COMPLEX_MULTIVOICE);
      expect(parsed.keySignature.fifths).toBe(-1);
      expect(parsed.keySignature.name).toBe('F major');

      // Bb4 should have alter = -1
      const rh = parsed.measures[0].rightHand;
      const bbNote = rh[3]; // 4th beat
      expect(bbNote.step).toBe('B');
      expect(bbNote.alter).toBe(-1);
    });
  });

  describe('Forward element', () => {
    it('handles forward element for time skipping', () => {
      const parsed = parseMusicXML(FORWARD_ELEMENT);
      const rh = parsed.measures[0].rightHand;

      // Should have 3 notes (C at beat 0, E at beat 2, G at beat 3)
      // Forward skips beat 1
      expect(rh.length).toBe(3);
      expect(rh[0].step).toBe('C');
      expect(rh[1].step).toBe('E');
      expect(rh[2].step).toBe('G');
    });
  });
});

describe('MusicXML Builder roundtrip', () => {
  it('rebuilds parsed music into valid MusicXML', () => {
    const parsed = parseMusicXML(SIMPLE_QUARTER_NOTES);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const rebuilt = buildMusicXML(rightHand, leftHand, {
      timeSignature: parsed.timeSignature,
      key: parsed.keySignature,
    });

    expect(rebuilt).toContain('<?xml version="1.0"');
    expect(rebuilt).toContain('<score-partwise');
    expect(rebuilt).toContain('<measure number="1">');
  });

  it('preserves note structure through roundtrip', () => {
    const original = parseMusicXML(MIXED_DURATIONS);
    const { rightHand, leftHand } = getMeasureRange(original, 1, 2);

    const rebuilt = buildMusicXML(rightHand, leftHand, {
      timeSignature: original.timeSignature,
      key: original.keySignature,
    });

    // Check that key features are preserved
    expect(rebuilt).toContain('<type>half</type>');
    expect(rebuilt).toContain('<type>quarter</type>');
    expect(rebuilt).toContain('<type>whole</type>');
    expect(rebuilt).toContain('<fifths>1</fifths>');
  });
});

describe('Timing Events for Playback', () => {
  it('generates correct timing events from simple notes', () => {
    const parsed = parseMusicXML(SIMPLE_QUARTER_NOTES);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // 4 events at times 0, 1, 2, 3
    expect(events.length).toBe(4);
    expect(events[0].time).toBe(0);
    expect(events[1].time).toBe(1);
    expect(events[2].time).toBe(2);
    expect(events[3].time).toBe(3);

    // Each should have duration 1
    expect(events.every(e => e.duration === 1)).toBe(true);

    // Pitches
    expect(events[0].pitches).toContain('C4');
    expect(events[1].pitches).toContain('D4');
    expect(events[2].pitches).toContain('E4');
    expect(events[3].pitches).toContain('F4');
  });

  it('generates correct timing for two voices', () => {
    const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // Should have 4 events (beats 0, 1, 2, 3)
    expect(events.length).toBe(4);

    // Beat 0 should have both C4 and E4
    expect(events[0].time).toBe(0);
    expect(events[0].pitches).toContain('C4');
    expect(events[0].pitches).toContain('E4');

    // Duration should be 1 (shortest note determines beat advance)
    expect(events[0].duration).toBe(1);
  });

  it('generates correct timing for both hands', () => {
    const parsed = parseMusicXML(BOTH_HANDS);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // RH: quarters at 0, 1, 2, 3
    // LH: halves at 0, 2
    // Combined events at: 0, 1, 2, 3
    expect(events.length).toBe(4);

    // Beat 0: C4 (RH) + G2 (LH)
    expect(events[0].pitches).toContain('C4');
    expect(events[0].pitches).toContain('G2');

    // Beat 1: D4 (RH only)
    expect(events[1].pitches).toContain('D4');
    expect(events[1].pitches).not.toContain('G2');

    // Beat 2: E4 (RH) + A2 (LH)
    expect(events[2].pitches).toContain('E4');
    expect(events[2].pitches).toContain('A2');
  });

  it('generates correct timing for chords', () => {
    const parsed = parseMusicXML(CHORD_NOTES);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // 4 events
    expect(events.length).toBe(4);

    // Beat 0: C major chord (C4, E4, G4)
    expect(events[0].pitches).toContain('C4');
    expect(events[0].pitches).toContain('E4');
    expect(events[0].pitches).toContain('G4');
    expect(events[0].pitches.length).toBe(3);

    // Beat 1: G major chord (G3, B3, D4)
    expect(events[1].pitches).toContain('G3');
    expect(events[1].pitches).toContain('B3');
    expect(events[1].pitches).toContain('D4');
  });

  it('no duplicate events at same time', () => {
    const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // Check no duplicate times
    const times = events.map(e => e.time);
    const uniqueTimes = new Set(times);
    expect(uniqueTimes.size).toBe(times.length);
  });

  it('events are in ascending time order', () => {
    const parsed = parseMusicXML(COMPLEX_MULTIVOICE);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    for (let i = 1; i < events.length; i++) {
      expect(events[i].time).toBeGreaterThan(events[i - 1].time);
    }
  });

  it('total event duration equals measure duration', () => {
    const parsed = parseMusicXML(BOTH_HANDS);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    const events = buildTimingEvents(rightHand, leftHand);

    // Sum of all durations should equal 4 beats (one 4/4 measure)
    const totalDur = events.reduce((sum, e) => sum + e.duration, 0);
    expect(totalDur).toBe(4);
  });
});

describe('Full Pipeline Integration', () => {
  it('processes two-voice MusicXML correctly end-to-end', () => {
    // This is the key regression test for the original bug

    // 1. Parse
    const parsed = parseMusicXML(TWO_VOICES_WITH_BACKUP);

    // 2. Extract notes
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    // 3. Verify measure fits in 4/4 (not overflowing into extra measure)
    expect(totalDuration(rightHand)).toBe(4);

    // 4. Build timing events
    const events = buildTimingEvents(rightHand, leftHand);

    // 5. Verify 4 timing events (one per beat)
    expect(events.length).toBe(4);

    // 6. Verify beat 0 plays both voices simultaneously
    expect(events[0].pitches.length).toBe(2);
    expect(events[0].pitches).toContain('C4');
    expect(events[0].pitches).toContain('E4');

    // 7. Rebuild MusicXML
    const rebuilt = buildMusicXML(rightHand, leftHand, {
      timeSignature: parsed.timeSignature,
      key: parsed.keySignature,
    });

    // 8. Verify only 1 measure in rebuilt XML
    const measureCount = (rebuilt.match(/<measure number="/g) || []).length;
    expect(measureCount).toBe(1);
  });

  it('processes complex multi-voice piece correctly', () => {
    const parsed = parseMusicXML(COMPLEX_MULTIVOICE);
    const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

    // RH total should be 4 beats
    expect(totalDuration(rightHand)).toBe(4);

    // LH total should be 4 beats
    expect(totalDuration(leftHand)).toBe(4);

    const events = buildTimingEvents(rightHand, leftHand);

    // Beat 0 should have: C5 (RH voice 1), F4 (RH voice 2), F2 (LH)
    expect(events[0].pitches).toContain('C5');
    expect(events[0].pitches).toContain('F4');
    expect(events[0].pitches).toContain('F2');

    // Beat 2 should have: G4 (RH), A2 (new LH note)
    // Actually beat 2 for LH is C3, since F2 is half note (beats 0-1), C3 is half note (beats 2-3)
    expect(events[2].pitches).toContain('A4');
    expect(events[2].pitches).toContain('C3');
  });
});
