// Scheduling utilities for metronome and note timing

/**
 * Calculate duration with dots applied.
 * Each dot adds half of the previous value.
 * 1 dot = 1.5x, 2 dots = 1.75x, etc.
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
 * Calculate the minimum interval between metronome clicks to prevent double-clicks.
 * Returns half a subdivision duration in milliseconds.
 */
export function getMetronomeDebounceInterval(bpm: number): number {
  // A subdivision is 1/4 of a beat (sixteenth note)
  // We use half that as the minimum interval to catch duplicates
  return (60 / bpm / 4) * 1000 * 0.5;
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

/**
 * Convert beat position to seconds for precise Tone.js scheduling.
 * This avoids issues with bars:beats:sixteenths notation for fractional positions.
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return beats * secondsPerBeat;
}

/**
 * Calculate note schedule times for a sequence of beat groups.
 * Returns an array of times in seconds when each note should trigger.
 */
export function calculateNoteSchedule(
  beatGroups: { duration: number }[],
  countoffBeats: number,
  bpm: number
): number[] {
  const times: number[] = [];
  let currentTimeInBeats = countoffBeats;

  for (const group of beatGroups) {
    times.push(beatsToSeconds(currentTimeInBeats, bpm));
    currentTimeInBeats += group.duration;
  }

  return times;
}

/**
 * Calculate the end time of a piece in seconds.
 */
export function calculatePieceEndTime(
  beatGroups: { duration: number }[],
  countoffBeats: number,
  bpm: number
): number {
  let totalDuration = 0;
  for (const group of beatGroups) {
    totalDuration += group.duration;
  }
  return beatsToSeconds(countoffBeats + totalDuration, bpm);
}

/**
 * Calculate metronome click times using bars:beats:sixteenths format.
 * Returns array of { time: string, subdivision: number } for scheduling.
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
