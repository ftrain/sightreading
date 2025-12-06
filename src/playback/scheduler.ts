/**
 * Scheduling Utilities
 *
 * Pure functions for timing calculations.
 * No external dependencies, easy to test.
 *
 * @module playback/scheduler
 */

import type { NoteData, TimingEvent } from '../core/types';

// ============================================
// TIME CONVERSION
// ============================================

/**
 * Convert beat position to seconds.
 *
 * @param beats - Position in beats
 * @param bpm - Tempo in beats per minute
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return beats * secondsPerBeat;
}

/**
 * Convert seconds to beat position.
 *
 * @param seconds - Time in seconds
 * @param bpm - Tempo in beats per minute
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  const beatsPerSecond = bpm / 60;
  return seconds * beatsPerSecond;
}

// ============================================
// TIMING EVENT BUILDING
// ============================================

/**
 * Build timing events from note data.
 * Merges right and left hand into a unified timeline.
 *
 * @param rightHandNotes - Right hand notes
 * @param leftHandNotes - Left hand notes
 */
export function buildTimingEvents(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[]
): TimingEvent[] {
  // Map time positions to shortest duration at that position
  const allEvents: Map<number, number> = new Map();

  // Process right hand
  let currentTime = 0;
  for (const note of rightHandNotes) {
    const existing = allEvents.get(currentTime);
    if (existing === undefined || note.duration < existing) {
      allEvents.set(currentTime, note.duration);
    }
    currentTime += note.duration;
  }

  // Process left hand
  currentTime = 0;
  for (const note of leftHandNotes) {
    const existing = allEvents.get(currentTime);
    if (existing === undefined || note.duration < existing) {
      allEvents.set(currentTime, note.duration);
    }
    currentTime += note.duration;
  }

  // Convert to sorted array
  const sortedTimes = Array.from(allEvents.keys()).sort((a, b) => a - b);

  const events: TimingEvent[] = [];
  for (let i = 0; i < sortedTimes.length; i++) {
    const time = sortedTimes[i];
    const nextTime =
      i < sortedTimes.length - 1 ? sortedTimes[i + 1] : time + allEvents.get(time)!;
    const duration = nextTime - time;
    events.push({ time, duration, pitches: [] });
  }

  return events;
}

/**
 * Calculate total duration of timing events.
 */
export function getTotalDuration(events: TimingEvent[]): number {
  if (events.length === 0) return 0;
  const lastEvent = events[events.length - 1];
  return lastEvent.time + lastEvent.duration;
}

// ============================================
// METRONOME SCHEDULING
// ============================================

/**
 * Calculate metronome click schedule.
 *
 * @param totalBeats - Total number of beats
 * @returns Array of { time, subdivision } for each click
 */
export function calculateMetronomeSchedule(
  totalBeats: number
): { time: string; subdivision: number }[] {
  const schedule: { time: string; subdivision: number }[] = [];
  const totalSubdivisions = Math.ceil(totalBeats * 4);

  for (let sub = 0; sub < totalSubdivisions; sub++) {
    const beatNumber = Math.floor(sub / 4);
    const subInBeat = sub % 4;
    schedule.push({
      time: `0:${beatNumber}:${subInBeat}`,
      subdivision: subInBeat,
    });
  }

  return schedule;
}

/**
 * Calculate the minimum interval between metronome clicks to prevent double-clicks.
 *
 * @param bpm - Tempo in BPM
 * @returns Minimum interval in milliseconds
 */
export function getMetronomeDebounceInterval(bpm: number): number {
  // A subdivision is 1/4 of a beat (sixteenth note)
  // Use half that as minimum interval to catch duplicates
  return ((60 / bpm) / 4) * 1000 * 0.5;
}

/**
 * Check if a metronome click should be allowed based on debounce timing.
 */
export function shouldAllowMetronomeClick(
  currentTime: number,
  lastClickTime: number,
  bpm: number
): boolean {
  const minInterval = getMetronomeDebounceInterval(bpm);
  return currentTime - lastClickTime >= minInterval;
}

// ============================================
// DURATION HELPERS
// ============================================

/**
 * Calculate duration with dots applied.
 * Each dot adds half of the previous value.
 *
 * @param baseDuration - Base duration in beats
 * @param numDots - Number of dots
 */
export function applyDots(baseDuration: number, numDots: number): number {
  let dotMultiplier = 1;
  let dotValue = 0.5;
  for (let i = 0; i < numDots; i++) {
    dotMultiplier += dotValue;
    dotValue /= 2;
  }
  return baseDuration * dotMultiplier;
}

/**
 * Calculate note schedule times for playback.
 *
 * @param events - Timing events
 * @param countoffBeats - Number of countoff beats
 * @param bpm - Tempo
 */
export function calculateNoteSchedule(
  events: TimingEvent[],
  countoffBeats: number,
  bpm: number
): number[] {
  return events.map((event) =>
    beatsToSeconds(countoffBeats + event.time, bpm)
  );
}
