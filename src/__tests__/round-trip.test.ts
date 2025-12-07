/**
 * Round-trip tests for MusicXML parsing and rendering
 *
 * Tests the complete pipeline:
 * 1. Parse original MusicXML
 * 2. Rebuild MusicXML from parsed data
 * 3. Re-parse rebuilt MusicXML
 * 4. Verify timing consistency for audio and visual display
 *
 * Uses real songs (Minuet in G) to test complex scenarios:
 * - Both hands with independent rhythms
 * - Mixed note durations (eighth, quarter, half, dotted half)
 * - Key signature with accidentals (G major has F#)
 * - Backup elements for two-staff coordination
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseMusicXML, getMeasureRange } from '../upload/parser';
import { buildMusicXML } from '../music/xml/builder';
import { getSongById } from '../songs';
import type { NoteData } from '../core/types';

// ============================================
// TIMING EVENT SIMULATION
// ============================================

interface TimingEvent {
  time: number;
  duration: number;
  pitches: string[];
}

/**
 * Convert NoteData to pitch string (e.g., "C4", "F#5")
 */
function noteDataToPitch(note: NoteData): string | null {
  if (note.isRest) return null;
  let pitchName = note.step;
  if (note.alter === 1) pitchName += '#';
  else if (note.alter === -1) pitchName += 'b';
  return `${pitchName}${note.octave}`;
}

/**
 * Build timing events from note data - same logic as main.ts
 * This is what drives audio playback scheduling
 */
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

    // Add chord notes
    if (note.chordNotes) {
      for (const chordNote of note.chordNotes) {
        const chordPitch = noteDataToPitch(chordNote as NoteData);
        if (chordPitch) allEvents.get(timeKey)!.pitches.push(chordPitch);
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

    // Add chord notes
    if (note.chordNotes) {
      for (const chordNote of note.chordNotes) {
        const chordPitch = noteDataToPitch(chordNote as NoteData);
        if (chordPitch) allEvents.get(timeKey)!.pitches.push(chordPitch);
      }
    }

    currentTime += note.duration;
  }

  // Convert to sorted array
  const sortedTimes = Array.from(allEvents.keys()).map(Number).sort((a, b) => a - b);
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
// TEST DATA
// ============================================

let minuetInG: ReturnType<typeof getSongById>;

beforeAll(() => {
  minuetInG = getSongById('minuet-g');
});

// ============================================
// ROUND-TRIP TESTS
// ============================================

describe('Round-trip: Minuet in G', () => {
  describe('Parse original MusicXML', () => {
    it('parses with correct metadata', () => {
      const parsed = parseMusicXML(minuetInG!.xml);

      expect(parsed.title).toBe('Minuet in G Major');
      expect(parsed.keySignature.fifths).toBe(1); // G major
      expect(parsed.timeSignature.beats).toBe(3);
      expect(parsed.timeSignature.beatType).toBe(4);
      expect(parsed.measures.length).toBe(8);
    });

    it('extracts right hand notes with correct rhythm pattern', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand } = getMeasureRange(parsed, 1, 1);

      // Measure 1 RH: D5 (quarter), G4 A4 B4 C5 (eighths)
      expect(rightHand.length).toBe(5);
      expect(rightHand[0].duration).toBe(1); // quarter
      expect(rightHand[1].duration).toBe(0.5); // eighth
      expect(rightHand[2].duration).toBe(0.5);
      expect(rightHand[3].duration).toBe(0.5);
      expect(rightHand[4].duration).toBe(0.5);

      // Total duration should equal 3 beats (3/4 time)
      const totalDuration = rightHand.reduce((sum, n) => sum + n.duration, 0);
      expect(totalDuration).toBe(3);
    });

    it('extracts left hand notes with correct rhythm pattern', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { leftHand } = getMeasureRange(parsed, 1, 1);

      // Measure 1 LH: G3 (half), B3 (quarter)
      expect(leftHand.length).toBe(2);
      expect(leftHand[0].duration).toBe(2); // half
      expect(leftHand[1].duration).toBe(1); // quarter

      const totalDuration = leftHand.reduce((sum, n) => sum + n.duration, 0);
      expect(totalDuration).toBe(3);
    });

    it('handles F# correctly from G major key signature', () => {
      const parsed = parseMusicXML(minuetInG!.xml);

      // Measure 3 has F#5, Measure 7 has F#4
      const { rightHand: m3rh } = getMeasureRange(parsed, 3, 3);
      const fSharp = m3rh.find(n => n.step === 'F' && n.alter === 1);
      expect(fSharp).toBeDefined();
      expect(fSharp!.octave).toBe(5);

      const { rightHand: m7rh } = getMeasureRange(parsed, 7, 7);
      const fSharp4 = m7rh.find(n => n.step === 'F' && n.alter === 1);
      expect(fSharp4).toBeDefined();
      expect(fSharp4!.octave).toBe(4);
    });
  });

  describe('Build timing events (audio scheduling)', () => {
    it('creates correct number of timing events', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      // Should have events where RH and LH notes start
      expect(timingEvents.length).toBeGreaterThan(0);

      // Total duration should be 24 beats (8 measures × 3 beats)
      const lastEvent = timingEvents[timingEvents.length - 1];
      const totalDuration = lastEvent.time + lastEvent.duration;
      expect(totalDuration).toBe(24);
    });

    it('merges simultaneous notes from both hands', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      // At time 0, both D5 (RH) and G3 (LH) should play
      const firstEvent = timingEvents[0];
      expect(firstEvent.time).toBe(0);
      expect(firstEvent.pitches).toContain('D5');
      expect(firstEvent.pitches).toContain('G3');
    });

    it('has no duplicate events at the same time', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      // Check no duplicate times
      const times = timingEvents.map(e => e.time);
      const uniqueTimes = [...new Set(times)];
      expect(times.length).toBe(uniqueTimes.length);
    });

    it('events are in strictly ascending time order', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      for (let i = 1; i < timingEvents.length; i++) {
        expect(timingEvents[i].time).toBeGreaterThan(timingEvents[i - 1].time);
      }
    });

    it('durations bridge to next event with no gaps', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      // Each event's time + duration should equal the next event's time
      for (let i = 0; i < timingEvents.length - 1; i++) {
        const current = timingEvents[i];
        const next = timingEvents[i + 1];
        const expected = Math.round((current.time + current.duration) * 1000) / 1000;
        const actual = Math.round(next.time * 1000) / 1000;
        expect(actual).toBe(expected);
      }
    });
  });

  describe('Rebuild and re-parse (full round-trip)', () => {
    it('rebuilt MusicXML parses to same note count', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      // Rebuild MusicXML
      const result = buildMusicXML(rightHand, leftHand, {
        timeSignature: parsed.timeSignature,
        key: parsed.keySignature,
      });

      // Re-parse
      const reparsed = parseMusicXML(result.xml);
      const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

      expect(rh2.length).toBe(rightHand.length);
      expect(lh2.length).toBe(leftHand.length);
    });

    it('rebuilt MusicXML preserves note pitches', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const result = buildMusicXML(rightHand, leftHand, {
        timeSignature: parsed.timeSignature,
        key: parsed.keySignature,
      });

      const reparsed = parseMusicXML(result.xml);
      const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

      // Check all RH pitches match
      for (let i = 0; i < rightHand.length; i++) {
        expect(noteDataToPitch(rh2[i])).toBe(noteDataToPitch(rightHand[i]));
      }

      // Check all LH pitches match
      for (let i = 0; i < leftHand.length; i++) {
        expect(noteDataToPitch(lh2[i])).toBe(noteDataToPitch(leftHand[i]));
      }
    });

    it('rebuilt MusicXML preserves note durations', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      const result = buildMusicXML(rightHand, leftHand, {
        timeSignature: parsed.timeSignature,
        key: parsed.keySignature,
      });

      const reparsed = parseMusicXML(result.xml);
      const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

      // Check all RH durations match
      for (let i = 0; i < rightHand.length; i++) {
        expect(rh2[i].duration).toBe(rightHand[i].duration);
      }

      // Check all LH durations match
      for (let i = 0; i < leftHand.length; i++) {
        expect(lh2[i].duration).toBe(leftHand[i].duration);
      }
    });

    it('timing events match between original and rebuilt', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 8);

      // Build timing from original
      const originalTiming = buildTimingEvents(rightHand, leftHand);

      // Rebuild and reparse
      const result = buildMusicXML(rightHand, leftHand, {
        timeSignature: parsed.timeSignature,
        key: parsed.keySignature,
      });

      const reparsed = parseMusicXML(result.xml);
      const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

      // Build timing from rebuilt
      const rebuiltTiming = buildTimingEvents(rh2, lh2);

      // Should have same number of events
      expect(rebuiltTiming.length).toBe(originalTiming.length);

      // Each event should match
      for (let i = 0; i < originalTiming.length; i++) {
        expect(rebuiltTiming[i].time).toBeCloseTo(originalTiming[i].time, 3);
        expect(rebuiltTiming[i].duration).toBeCloseTo(originalTiming[i].duration, 3);

        // Pitches should be the same (order may vary)
        expect(rebuiltTiming[i].pitches.sort()).toEqual(originalTiming[i].pitches.sort());
      }
    });
  });

  describe('Audio/Visual timing consistency', () => {
    it('each beat has notes starting at expected positions', () => {
      const parsed = parseMusicXML(minuetInG!.xml);
      const { rightHand, leftHand } = getMeasureRange(parsed, 1, 1);

      const timingEvents = buildTimingEvents(rightHand, leftHand);

      // In measure 1:
      // Beat 0: D5 (RH quarter) + G3 (LH half)
      // Beat 1: G4 (RH eighth)
      // Beat 1.5: A4 (RH eighth)
      // Beat 2: B4 (RH eighth) + B3 (LH quarter)
      // Beat 2.5: C5 (RH eighth)

      const beat0 = timingEvents.find(e => e.time === 0);
      expect(beat0).toBeDefined();
      expect(beat0!.pitches).toContain('D5');
      expect(beat0!.pitches).toContain('G3');

      const beat1 = timingEvents.find(e => e.time === 1);
      expect(beat1).toBeDefined();
      expect(beat1!.pitches).toContain('G4');

      const beat1_5 = timingEvents.find(e => e.time === 1.5);
      expect(beat1_5).toBeDefined();
      expect(beat1_5!.pitches).toContain('A4');

      const beat2 = timingEvents.find(e => e.time === 2);
      expect(beat2).toBeDefined();
      expect(beat2!.pitches).toContain('B4');
      expect(beat2!.pitches).toContain('B3');

      const beat2_5 = timingEvents.find(e => e.time === 2.5);
      expect(beat2_5).toBeDefined();
      expect(beat2_5!.pitches).toContain('C5');
    });

    it('RH and LH total durations match per measure', () => {
      const parsed = parseMusicXML(minuetInG!.xml);

      for (let m = 1; m <= 8; m++) {
        const { rightHand, leftHand } = getMeasureRange(parsed, m, m);

        const rhDuration = rightHand.reduce((sum, n) => sum + n.duration, 0);
        const lhDuration = leftHand.reduce((sum, n) => sum + n.duration, 0);

        // Both hands should fill exactly 3 beats
        expect(rhDuration).toBeCloseTo(3, 3);
        expect(lhDuration).toBeCloseTo(3, 3);
      }
    });
  });
});

describe('Round-trip: All built-in songs', () => {
  const songIds = ['mary-lamb', 'twinkle', 'ode-to-joy', 'happy-birthday', 'minuet-g'];

  songIds.forEach(songId => {
    describe(songId, () => {
      it('round-trips without data loss', () => {
        const song = getSongById(songId);
        expect(song).toBeDefined();

        const parsed = parseMusicXML(song!.xml);
        const { rightHand, leftHand } = getMeasureRange(parsed, 1, parsed.measures.length);

        // Rebuild
        const result = buildMusicXML(rightHand, leftHand, {
          timeSignature: parsed.timeSignature,
          key: parsed.keySignature,
        });

        // Reparse
        const reparsed = parseMusicXML(result.xml);
        const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

        // Same counts
        expect(rh2.length).toBe(rightHand.length);
        expect(lh2.length).toBe(leftHand.length);

        // Same total duration
        const originalRhDuration = rightHand.reduce((sum, n) => sum + n.duration, 0);
        const rebuiltRhDuration = rh2.reduce((sum, n) => sum + n.duration, 0);
        expect(rebuiltRhDuration).toBeCloseTo(originalRhDuration, 3);

        const originalLhDuration = leftHand.reduce((sum, n) => sum + n.duration, 0);
        const rebuiltLhDuration = lh2.reduce((sum, n) => sum + n.duration, 0);
        expect(rebuiltLhDuration).toBeCloseTo(originalLhDuration, 3);
      });

      it('produces identical timing events after round-trip', () => {
        const song = getSongById(songId);
        const parsed = parseMusicXML(song!.xml);
        const { rightHand, leftHand } = getMeasureRange(parsed, 1, parsed.measures.length);

        const originalTiming = buildTimingEvents(rightHand, leftHand);

        const result = buildMusicXML(rightHand, leftHand, {
          timeSignature: parsed.timeSignature,
          key: parsed.keySignature,
        });

        const reparsed = parseMusicXML(result.xml);
        const { rightHand: rh2, leftHand: lh2 } = getMeasureRange(reparsed, 1, reparsed.measures.length);

        const rebuiltTiming = buildTimingEvents(rh2, lh2);

        expect(rebuiltTiming.length).toBe(originalTiming.length);

        for (let i = 0; i < originalTiming.length; i++) {
          expect(rebuiltTiming[i].time).toBeCloseTo(originalTiming[i].time, 3);
          expect(rebuiltTiming[i].duration).toBeCloseTo(originalTiming[i].duration, 3);
        }
      });
    });
  });
});
